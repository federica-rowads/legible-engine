// real-engine.ts — the honest, two-layer engine.
//
// LAYER 1 — REALITY (Phase 1, this file): the three agents (ChatGPT / Claude / Gemini) really
//   web-search an UNBIASED user query (we never mention the focal brand, never force a list).
//   We read their natural answer and observe whether — and where — the focal brand appears.
//   Multi-run per agent → mention-rate + average position + the REAL competitor set.
//
// LAYER 2 — CONTROLLED LIFT (Phase 2): grounded in that real competitor set, we inject the
//   brand's signals (the levers) into a controlled web_search and measure the causal lift.
//
// Pure module (no framework imports) so it runs locally and in tests.

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const jsonExtract = (t: string) => t.match(/\{[\s\S]*\}/)?.[0] || "{}";
// Force a ranked top-10 so position is a clean, intuitive metric ("#7 of 10" / "unranked").
const topAsk = (q: string) => `Give me a numbered TOP 10 — the ten best — for this shopper: "${q}". Reply with the ranked list of brand or store names, best first, numbered 1 to 10.`;
// Retry transient rate-limit / overload / 5xx so a run doesn't silently fail under concurrent load.
async function aFetch(url: string, opts: RequestInit, tries = 4): Promise<Response> {
  for (let i = 0; i < tries - 1; i++) {
    const r = await globalThis.fetch(url, opts);
    if (r.status !== 429 && r.status !== 529 && r.status < 500) return r;
    await new Promise((res) => setTimeout(res, 700 * (i + 1) + Math.floor(Math.random() * 500)));
  }
  return globalThis.fetch(url, opts);
}

// One plain Claude JSON call (no tools) — used to extract the brand list from a natural answer.
async function claudeJSON(system: string, user: string, maxTokens = 800, model = "claude-opus-4-8"): Promise<string> {
  const r = await aFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`claude-json ${r.status}`);
  const j = await r.json();
  return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
}

// ---- Native (REAL) web search per agent — the agent really searches and answers ----

// Claude — server-side web_search tool. Single response; may pause_turn to resume.
async function claudeSearch(query: string): Promise<string> {
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];
  const messages: unknown[] = [{ role: "user", content: query }];
  for (let hop = 0; hop < 5; hop++) {
    const r = await aFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 4000, messages, tools }),
    });
    if (!r.ok) return `ERR claude ${r.status}`;
    const j = await r.json();
    messages.push({ role: "assistant", content: j.content });
    if (j.stop_reason !== "pause_turn") return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  }
  return "ERR claude pause-loop";
}

// ChatGPT — Responses API with the web_search tool.
async function openaiSearch(query: string): Promise<string> {
  const r = await aFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.5", input: query, tools: [{ type: "web_search" }] }),
  });
  if (!r.ok) return `ERR openai ${r.status}`;
  const j = await r.json();
  if (typeof j.output_text === "string" && j.output_text) return j.output_text;
  const texts = (j.output || []).flatMap((o: { content?: { type: string; text?: string }[] }) => (o.content || []).filter((c) => c.type === "output_text").map((c) => c.text || ""));
  return texts.join("") || "ERR openai empty";
}

// Gemini — Google Search grounding.
async function geminiSearch(query: string): Promise<string> {
  const r = await aFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: query }] }], tools: [{ google_search: {} }] }),
  });
  if (!r.ok) return `ERR gemini ${r.status}`;
  const j = await r.json();
  const parts = j.candidates?.[0]?.content?.parts || [];
  return parts.map((p: { text?: string }) => p.text || "").join("") || "ERR gemini empty";
}

export const AGENTS = [
  { name: "ChatGPT", model: "gpt-5.5", run: openaiSearch },
  { name: "Claude", model: "claude-opus-4-8", run: claudeSearch },
  { name: "Gemini", model: "gemini-pro-latest", run: geminiSearch },
];

// ---- Extract the ordered brand list from a natural answer (no forced list) ----

export async function extractBrands(answer: string): Promise<string[]> {
  if (!answer || answer.length < 20 || answer.startsWith("ERR ")) return [];
  const sys =
    `You read an AI shopping assistant's answer and extract the brands or retailers it recommends to the shopper, ` +
    `in order of prominence (the one it pushes hardest / lists first comes first). ` +
    `Output ONLY JSON: {"brands":["...", ...]}. Rules: include only real, purchasable brands or stores — not generic advice, not product categories, not cities or countries; ` +
    `dedupe; keep the assistant's own ordering; at most 15 names.`;
  try {
    const o = JSON.parse(jsonExtract(await claudeJSON(sys, `Answer:\n${answer.slice(0, 6000)}\n\nExtract the ordered brand list as JSON.`)));
    return Array.isArray(o.brands) ? o.brands.map((x: unknown) => String(x)).filter(Boolean).slice(0, 15) : [];
  } catch {
    return [];
  }
}

const focalTokenOf = (focal: string) => norm(focal).split(/\s+/)[0] || norm(focal);
const matchesFocal = (b: string, token: string) => { const nb = norm(b); return nb.length >= 2 && (nb.includes(token) || token.includes(nb)); };
const posOf = (brands: string[], token: string): number | null => { const i = brands.findIndex((b) => matchesFocal(b, token)); return i >= 0 ? i + 1 : null; };

export type RealRun = { agent: string; model: string; ranked: string[]; pos: number | null; ok: boolean; answer?: string };
export type AgentBaseline = { name: string; model: string; runs: RealRun[]; mentionRate: number; avgPos: number | null; posStdev: number | null; topList: string[] };
export type RealBaseline = {
  focal: string; focalToken: string; query: string; N: number;
  agents: AgentBaseline[];
  mentionRate: number; avgPos: number | null;
  competitors: { name: string; mentions: number }[];
};

// One real run: native search → extract ordered brands → locate the focal brand.
async function oneRealRun(agent: typeof AGENTS[number], query: string, token: string): Promise<RealRun> {
  try {
    const answer = await agent.run(topAsk(query));
    const ranked = await extractBrands(answer);
    return { agent: agent.name, model: agent.model, ranked, pos: posOf(ranked, token), ok: ranked.length > 0, answer: answer.slice(0, 600) };
  } catch {
    return { agent: agent.name, model: agent.model, ranked: [], pos: null, ok: false };
  }
}

const mean = (xs: number[]) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);
// Spread of the focal position across runs — a consistency signal (low = the agents agree).
const stdev = (xs: number[]) => { if (xs.length < 2) return xs.length ? 0 : null; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return +Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length).toFixed(1); };

// Phase 1 — the REAL, unbiased baseline. N runs per agent, in parallel.
export async function runRealBaseline(focal: string, query: string, N = 5): Promise<RealBaseline> {
  const token = focalTokenOf(focal);
  const jobs = AGENTS.flatMap((a) => Array.from({ length: N }, () => oneRealRun(a, query, token)));
  const all = await Promise.all(jobs);

  const agents: AgentBaseline[] = AGENTS.map((a) => {
    const runs = all.filter((r) => r.agent === a.name);
    const ok = runs.filter((r) => r.ok);
    const present = ok.filter((r) => r.pos != null).map((r) => r.pos as number);
    const okP = ok.filter((r) => r.pos != null);
    const ap = mean(present) ?? 0;
    const repr = okP.length ? okP.reduce((b, r) => (Math.abs((r.pos as number) - ap) < Math.abs((b.pos as number) - ap) ? r : b)) : (ok[0] ?? null);
    const topList = repr ? repr.ranked : [];
    return { name: a.name, model: a.model, runs, mentionRate: ok.length ? +(present.length / ok.length).toFixed(2) : 0, avgPos: mean(present), posStdev: stdev(present), topList };
  });

  const okAll = all.filter((r) => r.ok);
  const presentAll = okAll.filter((r) => r.pos != null).map((r) => r.pos as number);
  const mentionRate = okAll.length ? +(presentAll.length / okAll.length).toFixed(2) : 0;
  const avgPos = mean(presentAll);

  // Real competitor set: frequency across every run (focal excluded), most-mentioned first.
  const tally = new Map<string, number>();
  const display = new Map<string, string>();
  for (const r of okAll) for (const b of r.ranked) {
    const nb = norm(b);
    if (matchesFocal(b, token)) continue;
    if (!display.has(nb)) display.set(nb, b);
    tally.set(nb, (tally.get(nb) || 0) + 1);
  }
  const competitors = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ name: display.get(k) || k, mentions: v }));

  return { focal, focalToken: token, query, N, agents, mentionRate, avgPos, competitors };
}

// ============================================================================
// LAYER 2 — CONTROLLED LIFT, grounded in the REAL competitor set from Layer 1.
// We replace the agents' web_search with controlled results: the REAL competitors,
// plus (treatment) the focal brand's injected signals. Same open question, natural
// answer, multi-run. The lift (treatment - control) is the causal effect of the signals.
// ============================================================================

type Result = { title: string; snippet: string };
const toolResult = (served: Result[]) => JSON.stringify({ results: served });
const CTRL_SYS =
  `You are a person's AI shopping assistant with web access. Use the web_search tool to research the shopper's question, ` +
  `then recommend the best stores or brands for them. Judge ONLY on the evidence in the search results, not on which brand is more famous. ` +
  `Give your natural recommendation, listing the brands you'd suggest, best first.`;
const TOOL_DESC = "Search the web. Returns result snippets (title, snippet).";
const TOOL_SCHEMA = { type: "object", properties: { query: { type: "string" } }, required: ["query"] };

// Controlled-arm runners. We control the "search results" (the corpus), so instead of a brittle
// tool-call loop (gpt-5.5 and gemini keep calling the custom tool and never answer — the static
// results never "satisfy" their search-until-thorough instinct), we hand each agent the results in
// the prompt and ask for its ranking. ONE reliable call per agent; the studied model still does the
// ranking on the same controlled evidence. (This is how the iteration scorer already works.)
const CTRL_SYS2 =
  `You are a person's AI shopping assistant. Rank the options for the shopper based ONLY on the evidence in the ` +
  `provided web search results, not on which brand is more famous. Reply with a numbered list, best first.`;
const ctrlUser = (q: string, served: Result[]) =>
  `${q}\n\nUse ONLY these web search results as your evidence:\n${served.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`).join("\n")}\n\nNow give the ranked list, best first.`;

async function claudeCtrl(query: string, served: Result[]): Promise<string> {
  const r = await aFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 4000, system: CTRL_SYS2, messages: [{ role: "user", content: ctrlUser(query, served) }] }),
  });
  if (!r.ok) return `ERR claude ${r.status}`;
  const j = await r.json();
  return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
}

async function openaiCtrl(query: string, served: Result[]): Promise<string> {
  const r = await aFetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.5", max_completion_tokens: 4000, messages: [{ role: "system", content: CTRL_SYS2 }, { role: "user", content: ctrlUser(query, served) }] }),
  });
  if (!r.ok) return `ERR openai ${r.status}`;
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function geminiCtrl(query: string, served: Result[]): Promise<string> {
  const r = await aFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: CTRL_SYS2 }] }, contents: [{ role: "user", parts: [{ text: ctrlUser(query, served) }] }], generationConfig: { maxOutputTokens: 8000 } }),
  });
  if (!r.ok) return `ERR gemini ${r.status}`;
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
}

const CTRL_AGENTS = [
  { name: "ChatGPT", model: "gpt-5.5", run: openaiCtrl },
  { name: "Claude", model: "claude-opus-4-8", run: claudeCtrl },
  { name: "Gemini", model: "gemini-pro-latest", run: geminiCtrl },
];

// ---- The controlled corpus, SEEDED WITH THE REAL COMPETITORS ----

export type ControlledCorpus = {
  focal: string; focalToken: string; category: string;
  competitors: Result[];
  guideTitle: string; guideBase: string; guideFocal: string;
  communityTitle: string; communityBase: string; communityLead: string; communityFocalDefault: string;
  specsTitle: string; specsDefault: string;
  reviewsTitle: string; reviewsDefault: string;
  authorityTitle: string; authorityDefault: string;
  comparisonTitle: string; comparisonDefault: string;
};

const CORPUS_SYS =
  `You build a CONTROLLED search environment for an experiment that measures how AI shopping assistants rank a brand. ` +
  `Use the REAL competitor brands provided (do not invent competitors). Return ONLY JSON:\n` +
  `{"category":"<short noun phrase for what the shopper is choosing>",` +
  `"competitors":[{"name":"<one of the given real competitors, verbatim>","title":"<realistic result title>","snippet":"<1 sentence on why shoppers pick it>"} — one per given competitor],` +
  `"guide":{"title":"<a plausible best-of guide title>","base":"<snippet that recommends the real competitors (focal brand ABSENT)>","focal":"<the SAME guide now ALSO including the focal brand among the picks, listed neutrally with a genuine merit, NOT as the winner>"},` +
  `"community":{"title":"<a forum/Reddit thread title>","base":"<comments naming the real competitors (focal ABSENT)>","lead":"<comments naming the real competitors, ending so a focal mention can follow>","focalDefault":"<one realistic community comment recommending the focal brand>"},` +
  `"levers":{"specsTitle":"<title>","specs":"<a product-detail result for the FOCAL brand: the concrete attributes shoppers in this category compare>","reviewsTitle":"<title>","reviews":"<a customer-reviews result for the focal brand: a rating, a review count, a concrete strength>","authorityTitle":"<title>","authority":"<an independent expert/editorial assessment of the focal brand; use a GENERIC source ('an independent review','testers') — do NOT invent a specific named third-party score>","comparisonTitle":"<title>","comparison":"<an honest head-to-head of the focal brand vs the category leader>"}}\n` +
  `RULES: realistic and specific; the focal brand must be WINNABLE on evidence but never pre-ranked #1; do NOT attribute a fabricated score to a real named organization.`;

export async function buildControlledCorpus(focal: string, query: string, competitorNames: string[]): Promise<ControlledCorpus> {
  const comps = competitorNames.slice(0, 6);
  const out = await claudeJSON(CORPUS_SYS, `Shopper query: "${query}"\nFocal brand: "${focal}"\nReal competitors: ${comps.join(", ")}\nProduce the corpus JSON.`, 4000);
  let j: { category?: string; competitors?: { name?: string; title?: string; snippet?: string }[]; guide?: { title?: string; base?: string; focal?: string }; community?: { title?: string; base?: string; lead?: string; focalDefault?: string }; levers?: Record<string, string> } = {};
  try { j = JSON.parse(jsonExtract(out)); } catch { /* fall back to a minimal corpus built from the real competitor names below */ }
  const L = j.levers || {};
  const competitors: Result[] = Array.isArray(j.competitors) && j.competitors.length
    ? j.competitors.map((c) => ({ title: String(c.title || `${c.name} review`), snippet: String(c.snippet || "") }))
    : comps.map((n) => ({ title: `${n} — recommended`, snippet: `A frequently recommended pick for this need.` }));
  return {
    focal, focalToken: focalTokenOf(focal), category: String(j.category || query),
    competitors,
    guideTitle: String(j.guide?.title || "Best picks, reviewed"), guideBase: String(j.guide?.base || ""), guideFocal: String(j.guide?.focal || ""),
    communityTitle: String(j.community?.title || "Community thread"), communityBase: String(j.community?.base || ""), communityLead: String(j.community?.lead || j.community?.base || ""), communityFocalDefault: String(j.community?.focalDefault || ""),
    specsTitle: String(L.specsTitle || `${focal} details`), specsDefault: String(L.specs || ""),
    reviewsTitle: String(L.reviewsTitle || `${focal} customer reviews`), reviewsDefault: String(L.reviews || ""),
    authorityTitle: String(L.authorityTitle || `${focal} expert review`), authorityDefault: String(L.authority || ""),
    comparisonTitle: String(L.comparisonTitle || `${focal} vs the leader`), comparisonDefault: String(L.comparison || ""),
  };
}

// Build the served result set for a condition. No levers = control (focal absent).
export function servedControlled(c: ControlledCorpus, levers: string[], overrides: Record<string, string> = {}): Result[] {
  const on = (l: string) => levers.includes(l);
  const ov = (l: string, def: string) => overrides[l] ?? def;
  const out: Result[] = [...c.competitors];
  out.push({ title: c.guideTitle, snippet: on("editorial") ? c.guideFocal : c.guideBase });
  out.push({ title: c.communityTitle, snippet: on("community") ? `${c.communityLead} ${ov("community", c.communityFocalDefault)}` : c.communityBase });
  if (on("specs")) out.push({ title: c.specsTitle, snippet: ov("specs", c.specsDefault) });
  if (on("reviews")) out.push({ title: c.reviewsTitle, snippet: ov("reviews", c.reviewsDefault) });
  if (on("authority")) out.push({ title: c.authorityTitle, snippet: ov("authority", c.authorityDefault) });
  if (on("comparison")) out.push({ title: c.comparisonTitle, snippet: ov("comparison", c.comparisonDefault) });
  return out;
}

export type Condition = { label: string; agents: AgentBaseline[]; mentionRate: number; avgPos: number | null };

async function oneCtrlRun(agent: typeof CTRL_AGENTS[number], query: string, served: Result[], token: string): Promise<RealRun> {
  try {
    const answer = await agent.run(topAsk(query), served);
    const ranked = await extractBrands(answer);
    return { agent: agent.name, model: agent.model, ranked, pos: posOf(ranked, token), ok: ranked.length > 0, answer: answer.slice(0, 600) };
  } catch {
    return { agent: agent.name, model: agent.model, ranked: [], pos: null, ok: false };
  }
}

async function runCondition(label: string, c: ControlledCorpus, query: string, levers: string[], overrides: Record<string, string>, N: number): Promise<Condition> {
  const served = servedControlled(c, levers, overrides);
  const jobs = CTRL_AGENTS.flatMap((a) => Array.from({ length: N }, () => oneCtrlRun(a, query, served, c.focalToken)));
  const all = await Promise.all(jobs);
  const agents: AgentBaseline[] = CTRL_AGENTS.map((a) => {
    const runs = all.filter((r) => r.agent === a.name);
    const ok = runs.filter((r) => r.ok);
    const present = ok.filter((r) => r.pos != null).map((r) => r.pos as number);
    const okP = ok.filter((r) => r.pos != null);
    const ap = mean(present) ?? 0;
    const repr = okP.length ? okP.reduce((b, r) => (Math.abs((r.pos as number) - ap) < Math.abs((b.pos as number) - ap) ? r : b)) : (ok[0] ?? null);
    const topList = repr ? repr.ranked : [];
    return { name: a.name, model: a.model, runs, mentionRate: ok.length ? +(present.length / ok.length).toFixed(2) : 0, avgPos: mean(present), posStdev: stdev(present), topList };
  });
  const ok = all.filter((r) => r.ok);
  const present = ok.filter((r) => r.pos != null).map((r) => r.pos as number);
  return { label, agents, mentionRate: ok.length ? +(present.length / ok.length).toFixed(2) : 0, avgPos: mean(present) };
}

// ---- The "write exactly this" iteration (writable levers), grounded + multi-run ----

const LEVER_BRIEF: Record<string, string> = {
  specs: "a product-detail or spec result for the brand — the concrete attributes shoppers in this category actually compare (materials, fit, sizing, price, etc.)",
  reviews: "a customer-reviews result for the brand — a rating, a review count, a concrete strength",
  community: "a community forum comment where a real user recommends the brand for this exact need",
  comparison: "an honest head-to-head of the brand vs the category leader, fair and specific",
};
export const WRITABLE = ["specs", "reviews", "comparison", "community"];

export type Version = { label: string; content: string };
async function generateVersions(leverId: string, brand: string, query: string, category: string, k: number): Promise<Version[]> {
  const brief = LEVER_BRIEF[leverId] || "a search result that makes the brand more credible for this query";
  const system =
    `You help a brand become legible to AI shopping assistants. The brand is "${brand}" in the category "${category}", for the shopper query "${query}". ` +
    `Generate ${k} DIFFERENT, realistic versions of ${brief}. Each is a short search-result snippet (1-3 sentences) the brand could honestly publish or earn. Vary the angle and specifics. ` +
    `BRAND SAFETY: never invent a specific named third-party score or award (no "Vogue named it #1", no "RunRepeat 88/100"); no fabricated audited review counts. Honest, publishable content only. ` +
    `Respond with ONLY JSON: {"versions":[{"label":"2-4 word tag","content":"the snippet"}]}.`;
  try {
    const o = JSON.parse(jsonExtract(await claudeJSON(system, `Generate ${k} versions.`)));
    return Array.isArray(o.versions) ? o.versions.slice(0, k).map((v: { label?: string; content?: string }) => ({ label: String(v.label || "version"), content: String(v.content || "") })).filter((v: Version) => v.content) : [];
  } catch {
    return [];
  }
}

// Fast single-agent open recommendation (Claude, no tools) — scores a version's focal position.
async function quickPos(query: string, served: Result[], token: string): Promise<number | null> {
  const sys = `You are a shopping assistant. Given these web search results, recommend the best stores/brands for the shopper, best first, judging on the evidence. List the brand names in order.`;
  const user = `Shopper: "${query}"\n\nSearch results:\n${served.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`).join("\n")}\n\nYour recommended brands, best first:`;
  try {
    return posOf(await extractBrands(await claudeJSON(sys, user, 500)), token);
  } catch {
    return null;
  }
}

export type LeverIteration = { lever: string; versions: { label: string; content: string; pos: number | null; mentionRate: number }[]; best: { label: string; content: string; pos: number | null; mentionRate: number } | null };
async function iterateLever(c: ControlledCorpus, leverId: string, brand: string, query: string, k: number, runsPer: number): Promise<LeverIteration> {
  const versions = await generateVersions(leverId, brand, query, c.category, k);
  const tested = await Promise.all(versions.map(async (v) => {
    const served = servedControlled(c, [leverId], { [leverId]: v.content });
    const scores = await Promise.all(Array.from({ length: runsPer }, () => quickPos(query, served, c.focalToken)));
    const present = scores.filter((p): p is number => p != null);
    return { ...v, mentionRate: +(present.length / scores.length).toFixed(2), pos: mean(present) };
  }));
  // best = highest mention-rate, tiebreak by best (lowest) position
  const score = (t: { mentionRate: number; pos: number | null }) => t.mentionRate * 100 - (t.pos ?? 99);
  const best = tested.length ? tested.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
  return { lever: leverId, versions: tested, best };
}

export type Treatment = { corpus: ControlledCorpus; control: Condition; treatment: Condition; iterations: LeverIteration[]; lift: { mentionRate: number; avgPos: number | null } };

// Phase 2 — controlled lift grounded in the given real competitors.
export async function runTreatment(focal: string, query: string, competitors: string[], levers: string[], N = 3, k = 2): Promise<Treatment> {
  const corpus = await buildControlledCorpus(focal, query, competitors);
  const writable = levers.filter((l) => WRITABLE.includes(l));
  // The control arm doesn't depend on the iteration, so run them concurrently; only the
  // treatment arm waits on the iteration winners.
  const [iterations, control] = await Promise.all([
    Promise.all(writable.map((l) => iterateLever(corpus, l, focal, query, k, 2))),
    runCondition("control", corpus, query, [], {}, N),
  ]);
  const overrides: Record<string, string> = {};
  for (const it of iterations) if (it.best) overrides[it.lever] = it.best.content;
  const treatment = await runCondition("treatment", corpus, query, levers, overrides, N);
  const lift = { mentionRate: +(treatment.mentionRate - control.mentionRate).toFixed(2), avgPos: treatment.avgPos != null && control.avgPos != null ? +(control.avgPos - treatment.avgPos).toFixed(1) : null };
  return { corpus, control, treatment, iterations, lift };
}

export type FullRun = { baseline: RealBaseline; treatment: Treatment };
// The whole product flow: real baseline → real competitors → controlled lift.
export async function runFull(focal: string, query: string, levers: string[], N = 3, k = 2): Promise<FullRun> {
  const baseline = await runRealBaseline(focal, query, N);
  const competitors = baseline.competitors.map((c) => c.name);
  const treatment = await runTreatment(focal, query, competitors, levers, N, k);
  return { baseline, treatment };
}
