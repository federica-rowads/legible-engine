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
// A tiny async semaphore: bounds how many wrapped calls run at once (FIFO queue for the rest).
function makeLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((r) => queue.push(r));
    active++;
    try { return await fn(); } finally { active--; queue.shift()?.(); }
  };
}
// Anthropic is the shared bottleneck: Claude's web search AND every internal extraction/scoring
// call hit it. Cap concurrent Anthropic calls so two runs back-to-back don't burst past the rate
// limit and stack long backoffs (the "stuck searching forever" symptom). OpenAI/Gemini run free.
const anthropicLimit = makeLimiter(Number(process.env.ANTHROPIC_CONCURRENCY) || 4);

// fetch with a HARD per-attempt timeout + gentle retry on transient 429/529/5xx. The timeout means
// a wedged call fails fast (its run is dropped) instead of hanging the whole analysis indefinitely.
async function aFetch(url: string, opts: RequestInit, tries = 3, timeoutMs = 150000): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await globalThis.fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(timer);
      if (r.status !== 429 && r.status !== 529 && r.status < 500) return r;
      last = r;
    } catch (e) {
      clearTimeout(timer);
      if (i === tries - 1) throw e; // out of retries: propagate (caught upstream as a failed run)
    }
    await new Promise((res) => setTimeout(res, 700 * (i + 1) + Math.floor(Math.random() * 500)));
  }
  if (last) return last;
  throw new Error("aFetch: no response");
}
// Anthropic calls go through the concurrency cap; OpenAI/Gemini use aFetch directly.
const anthropicFetch = (url: string, opts: RequestInit) => anthropicLimit(() => aFetch(url, opts));

// One plain Claude JSON call (no tools) — used to extract the brand list from a natural answer.
async function claudeJSON(system: string, user: string, maxTokens = 800, model = "claude-opus-4-8"): Promise<string> {
  const r = await anthropicFetch("https://api.anthropic.com/v1/messages", {
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
// `extra` = optional injected content (the brand's optimized signals), appended so the agent
// weighs it alongside what it really finds on the web. Empty for the baseline.
async function claudeSearch(query: string, extra = ""): Promise<string> {
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];
  const messages: unknown[] = [{ role: "user", content: query + extra }];
  for (let hop = 0; hop < 5; hop++) {
    const r = await anthropicFetch("https://api.anthropic.com/v1/messages", {
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
async function openaiSearch(query: string, extra = ""): Promise<string> {
  const r = await aFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.5", input: query + extra, tools: [{ type: "web_search" }] }),
  });
  if (!r.ok) return `ERR openai ${r.status}`;
  const j = await r.json();
  if (typeof j.output_text === "string" && j.output_text) return j.output_text;
  const texts = (j.output || []).flatMap((o: { content?: { type: string; text?: string }[] }) => (o.content || []).filter((c) => c.type === "output_text").map((c) => c.text || ""));
  return texts.join("") || "ERR openai empty";
}

// Gemini — Google Search grounding.
async function geminiSearch(query: string, extra = ""): Promise<string> {
  const r = await aFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: query + extra }] }], tools: [{ google_search: {} }] }),
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

// One real run: native search (+ optional injected content) → extract ordered brands → locate focal.
async function oneRealRun(agent: typeof AGENTS[number], query: string, token: string, extra = ""): Promise<RealRun> {
  try {
    const answer = await agent.run(topAsk(query), extra);
    const ranked = await extractBrands(answer);
    return { agent: agent.name, model: agent.model, ranked, pos: posOf(ranked, token), ok: ranked.length > 0, answer: answer.slice(0, 600) };
  } catch {
    return { agent: agent.name, model: agent.model, ranked: [], pos: null, ok: false };
  }
}

const mean = (xs: number[]) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);
// Spread of the focal position across runs — a consistency signal (low = the agents agree).
const stdev = (xs: number[]) => { if (xs.length < 2) return xs.length ? 0 : null; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return +Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length).toFixed(1); };

// Build one agent's summary from its raw runs (shared by the all-agents and single-agent paths).
function buildAgentBaseline(a: { name: string; model: string }, runs: RealRun[]): AgentBaseline {
  const ok = runs.filter((r) => r.ok);
  const present = ok.filter((r) => r.pos != null).map((r) => r.pos as number);
  const okP = ok.filter((r) => r.pos != null);
  const ap = mean(present) ?? 0;
  const repr = okP.length ? okP.reduce((b, r) => (Math.abs((r.pos as number) - ap) < Math.abs((b.pos as number) - ap) ? r : b)) : (ok[0] ?? null);
  return { name: a.name, model: a.model, runs, mentionRate: ok.length ? +(present.length / ok.length).toFixed(2) : 0, avgPos: mean(present), posStdev: stdev(present), topList: repr ? repr.ranked : [] };
}

export type NativeResult = { agents: AgentBaseline[]; mentionRate: number; avgPos: number | null; competitors: { name: string; mentions: number }[] };

// The 3 agents on a REAL web search (+ optional injected content), N times each, in parallel.
// extra = "" → the unbiased baseline. extra = <the brand's optimized signals> → the treatment.
// Both arms use the same real search, so the treatment is anchored to reality (no clean room).
async function runNative(query: string, token: string, extra: string, N: number): Promise<NativeResult> {
  const jobs = AGENTS.flatMap((a) => Array.from({ length: N }, () => oneRealRun(a, query, token, extra)));
  const all = await Promise.all(jobs);
  const agents: AgentBaseline[] = AGENTS.map((a) => buildAgentBaseline(a, all.filter((r) => r.agent === a.name)));
  const okAll = all.filter((r) => r.ok);
  const presentAll = okAll.filter((r) => r.pos != null).map((r) => r.pos as number);
  const mentionRate = okAll.length ? +(presentAll.length / okAll.length).toFixed(2) : 0;
  const avgPos = mean(presentAll);
  const tally = new Map<string, number>();
  const display = new Map<string, string>();
  for (const r of okAll) for (const b of r.ranked) {
    const nb = norm(b);
    if (matchesFocal(b, token)) continue;
    if (!display.has(nb)) display.set(nb, b);
    tally.set(nb, (tally.get(nb) || 0) + 1);
  }
  const competitors = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ name: display.get(k) || k, mentions: v }));
  return { agents, mentionRate, avgPos, competitors };
}

// Layer 1 — the REAL, unbiased baseline (no injection). N runs per agent.
export async function runRealBaseline(focal: string, query: string, N = 5): Promise<RealBaseline> {
  const token = focalTokenOf(focal);
  const nr = await runNative(query, token, "", N);
  return { focal, focalToken: token, query, N, agents: nr.agents, mentionRate: nr.mentionRate, avgPos: nr.avgPos, competitors: nr.competitors };
}

// One agent, N real runs (+ optional injected content). Powers the progressive per-agent UI:
// the UI fires this once per agent and renders each card the moment it resolves. extra = "" is a
// baseline run; extra = <injected content> is that agent's treatment run.
export async function runAgentBaseline(agentName: string, query: string, focal: string, N = 2, extra = ""): Promise<AgentBaseline> {
  const agent = AGENTS.find((a) => a.name === agentName);
  if (!agent) throw new Error(`unknown agent ${agentName}`);
  const token = focalTokenOf(focal);
  const runs = await Promise.all(Array.from({ length: N }, () => oneRealRun(agent, query, token, extra)));
  return buildAgentBaseline(agent, runs);
}

// ============================================================================
// LAYER 2 — LIFT via INJECTION ON THE REAL SEARCH (anchored to the baseline).
// The treatment is the SAME real web search as the baseline, plus the brand's optimized
// content injected into the prompt — so the agent weighs it alongside what it really finds.
// Both arms use real search, so the "before" is the real baseline itself (no clean room).
// ============================================================================

const LEVER_BRIEF: Record<string, string> = {
  specs: "a product-detail or spec result for the brand — the concrete attributes shoppers in this category actually compare (materials, fit, sizing, price, etc.)",
  reviews: "a customer-reviews result for the brand — a rating, a review count, a concrete strength",
  community: "a community forum comment where a real user recommends the brand for this exact need",
  comparison: "an honest head-to-head of the brand vs the category leader, fair and specific",
  editorial: "an editorial best-of guide entry that lists the brand among its picks",
  authority: "an independent expert assessment of the brand — use a GENERIC source ('an independent review', 'testers'), never a fabricated named score",
};
export const WRITABLE = ["specs", "reviews", "comparison", "community"];

export type Version = { label: string; content: string };
async function generateVersions(leverId: string, brand: string, query: string, k: number): Promise<Version[]> {
  const brief = LEVER_BRIEF[leverId] || "a search result that makes the brand more credible for this query";
  const system =
    `You help a brand become legible to AI shopping assistants. The brand is "${brand}", for the shopper query "${query}". ` +
    `Generate ${k} DIFFERENT, realistic versions of ${brief}. Each is a short snippet (1-3 sentences) the brand could honestly publish or earn. Vary the angle and specifics. ` +
    `BRAND SAFETY: never invent a specific named third-party score or award (no "Vogue named it #1", no "RunRepeat 88/100"); no fabricated audited review counts. Honest, publishable content only. ` +
    `Respond with ONLY JSON: {"versions":[{"label":"2-4 word tag","content":"the snippet"}]}.`;
  try {
    const o = JSON.parse(jsonExtract(await claudeJSON(system, `Generate ${k} versions.`)));
    return Array.isArray(o.versions) ? o.versions.slice(0, k).map((v: { label?: string; content?: string }) => ({ label: String(v.label || "version"), content: String(v.content || "") })).filter((v: Version) => v.content) : [];
  } catch {
    return [];
  }
}

// Fast proxy scorer — given the real competitors + a candidate content snippet, where does the brand
// land? Used ONLY to pick the best wording per lever; the final lift is measured live (real search).
async function quickScore(focal: string, query: string, competitors: string[], content: string): Promise<number | null> {
  const sys = `You are a shopping assistant. Rank the brands/stores for the shopper, best first, judging only on the evidence. Reply with a numbered list of names.`;
  const user = `Shopper's question: "${query}"\nBrands people usually recommend here: ${competitors.slice(0, 8).join(", ")}.\nThe brand "${focal}" has published this content: "${content}"\nGive your ranked top 10, best first (include ${focal} only where the evidence places it).`;
  try {
    return posOf(await extractBrands(await claudeJSON(sys, user, 700)), focalTokenOf(focal));
  } catch {
    return null;
  }
}

export type LeverIteration = { lever: string; versions: { label: string; content: string; pos: number | null; mentionRate: number }[]; best: { label: string; content: string; pos: number | null; mentionRate: number } | null };

// For one lever: generate K content versions (1 for earnable levers), score each, keep the best.
async function optimizeLever(focal: string, query: string, competitors: string[], leverId: string, k: number): Promise<LeverIteration> {
  const versions = await generateVersions(leverId, focal, query, WRITABLE.includes(leverId) ? k : 1);
  const tested = await Promise.all(versions.map(async (v) => {
    const scores = [await quickScore(focal, query, competitors, v.content)];
    const present = scores.filter((p): p is number => p != null);
    return { ...v, mentionRate: +(present.length / scores.length).toFixed(2), pos: mean(present) };
  }));
  const score = (t: { mentionRate: number; pos: number | null }) => t.mentionRate * 100 - (t.pos ?? 99);
  const best = tested.length ? tested.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
  return { lever: leverId, versions: tested, best };
}

export type Treatment = { agents: AgentBaseline[]; mentionRate: number; avgPos: number | null; iterations: LeverIteration[]; injected: string };

// Layer 2 — optimize each selected lever, inject the winners into a REAL search, measure the lift.
export type OptimizedContent = { injected: string; iterations: LeverIteration[] };
// Optimize the selected levers and assemble the injection note + the "write this" data. Split out
// so the progressive UI can run this once, then fire the per-agent treatment runs against `injected`.
export async function optimizeContent(focal: string, query: string, competitors: string[], levers: string[], k = 2): Promise<OptimizedContent> {
  const items = (await Promise.all(levers.map((l) => optimizeLever(focal, query, competitors, l, k)))).filter((it) => it.best);
  const injected = items.length
    ? `\n\n--- Additionally, the following content about ${focal} has recently been published online and may appear in your research. Weigh it alongside everything else you find:\n` +
      items.map((it) => `• ${it.best!.content}`).join("\n")
    : "";
  // The "write exactly this" panel shows the writable levers only.
  return { injected, iterations: items.filter((it) => WRITABLE.includes(it.lever)) };
}

export async function runTreatment(focal: string, query: string, competitors: string[], levers: string[], N = 3, k = 2): Promise<Treatment> {
  const { injected, iterations } = await optimizeContent(focal, query, competitors, levers, k);
  const nr = await runNative(query, focalTokenOf(focal), injected, N);
  return { agents: nr.agents, mentionRate: nr.mentionRate, avgPos: nr.avgPos, iterations, injected };
}

export type FullRun = { baseline: RealBaseline; treatment: Treatment };
// The whole product flow: real baseline → real competitors → injected real-search lift.
export async function runFull(focal: string, query: string, levers: string[], N = 3, k = 2): Promise<FullRun> {
  const baseline = await runRealBaseline(focal, query, N);
  const treatment = await runTreatment(focal, query, baseline.competitors.map((c) => c.name), levers, N, k);
  return { baseline, treatment };
}
