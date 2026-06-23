// Controlled web search — the REAL run, now for ANY brand. Each studied agent
// (ChatGPT / Claude / Gemini) actually searches via a web_search tool, and WE control
// what that tool returns: baseline = the focal brand is invisible; each enabled lever
// makes one of its real (or earnable) signals legible. The agent then recommends, live,
// and we read where it ranks the focal brand.
//
// The "controlled environment" is a Corpus. For the flagship brand (361) it is hand-built
// from REAL, verified facts. For any other brand it is GENERATED on demand by an agent from
// just (brand, query) — same pattern we use to generate per-lever content, extended to the
// whole environment. Pure module (no framework imports) so it runs locally and in tests.

type Result = { title: string; snippet: string };

// A controlled information environment for one (brand, query).
export type Corpus = {
  focal: string; // display name, e.g. "Sézane"
  focalToken: string; // normalized match token, e.g. "sezane"
  category: string; // what the shopper is choosing, e.g. "French contemporary womenswear"
  noun: string; // the single thing to recommend, e.g. "clothing brand"
  brands: string[]; // display names, focal + competitors (what agents must rank)
  competitors: Result[]; // x5, focal absent
  guideTitle: string; guideBase: string; guideFocal: string; // gatekeeper 1: expert ranked guide
  bestOfTitle: string; bestOfBase: string; bestOfFocal: string; // gatekeeper 2: editorial best-of
  communityTitle: string; communityBase: string; communityLead: string; communityFocalDefault: string; // gatekeeper 3
  official: Result;
  specsTitle: string; specsDefault: string;
  reviewsTitle: string; reviewsDefault: string;
  authorityTitle: string; authorityDefault: string;
  comparisonTitle: string; comparisonDefault: string;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// ---- The flagship 361 corpus: hand-built from REAL, verified facts (kept identical & fast) ----
const CORPUS_361: Corpus = {
  focal: "361 Degrees",
  focalToken: "361",
  category: "stability running shoes",
  noun: "running shoe",
  brands: ["361 Degrees", "Brooks", "ASICS", "Hoka", "Saucony", "New Balance"],
  competitors: [
    { title: "Brooks Adrenaline GTS 25 review (RunRepeat)", snippet: "CoreScore 90/100, GuideRails support, 4.5/5 across 1,800+ reviews; a top, widely recommended overpronation pick." },
    { title: "ASICS GT-2000 13 review", snippet: "Long-trusted stability shoe with 3D Guidance; 4.4/5 across 2,000+ reviews." },
    { title: "Hoka Arahi 7 review", snippet: "Lightweight stability with J-Frame support; 4.3/5 across 1,500+ reviews." },
    { title: "Saucony Tempus review", snippet: "Stability via a PWRRUN PB frame; 4.3/5 across 900+ reviews." },
    { title: "New Balance 860v14 review", snippet: "Dual-density medial post; 4.4/5 across 1,800+ reviews." },
  ],
  guideTitle: "Best stability running shoes, lab-tested (RunRepeat)",
  guideBase: "Top picks: 1) Brooks Adrenaline GTS 25 (CoreScore 90, best overall), 2) ASICS GT-2000 13, 3) Hoka Arahi 7, 4) Saucony Tempus, 5) New Balance 860v14.",
  guideFocal: "Tested stability shoes (alphabetical; see each page for its score): 361 Degrees Phoenix 2 (standout durability, locked-in stability), ASICS GT-2000 13, Brooks Adrenaline GTS 25 (CoreScore 90), Hoka Arahi 7, Saucony Tempus.",
  bestOfTitle: "Best stability running shoes 2026 (Runner's World)",
  bestOfBase: "Editors' picks: Brooks Adrenaline GTS 25, ASICS Gel-Kayano 31, Hoka Arahi 7.",
  bestOfFocal: "Editors' picks now include the 361 Degrees Phoenix 2 (a value pick with standout durability), alongside the Brooks Adrenaline GTS 25, ASICS Gel-Kayano 31 and Hoka Arahi 7.",
  communityTitle: "r/RunningShoeGeeks: best stability shoes for flat feet",
  communityBase: "Top comments name Brooks Adrenaline and ASICS GT-2000 as the go-to for flat feet; Hoka Arahi if you want lighter.",
  communityLead: "Top comments name Brooks Adrenaline and ASICS GT-2000 as the classics;",
  communityFocalDefault: "several runners also flag the 361 Phoenix 2 ('600 miles in, the most durable and stable daily trainer I have run, underrated for flat feet').",
  official: { title: "361 Degrees Phoenix 2 (official site)", snippet: "Premium stability and cushioning for your daily miles." },
  specsTitle: "361 Degrees Phoenix 2 spec sheet",
  specsDefault: "26/34 mm stack, 8 mm drop, 9.9 oz, dual-density PRIMO + ENGAGE midsole, widths Standard and Wide (2E), $150.",
  reviewsTitle: "361 Phoenix 2 owner reviews",
  reviewsDefault: "4.5/5; owners praise standout durability ('built like a tank') and locked-in, non-intrusive stability. Made by 361, a US$1.4 billion global brand.",
  authorityTitle: "361 Degrees stability review (Doctors of Running)",
  authorityDefault: "Independent expert lab rates it 88.8% overall with 9.5/10 for stability (both testers), among the best-supported daily trainers tested.",
  comparisonTitle: "361 Phoenix 2 vs Brooks Adrenaline GTS 25",
  comparisonDefault: "The 361 is lighter and more durable than the Brooks at the same $150, with comparable stability; the Brooks has the larger review base.",
};

// Controlled result set for the enabled levers. Gatekeeper levers (editorial/community)
// make the focal brand VISIBLE in the trusted sources but do NOT pre-rank it (the agent decides).
// `overrides` lets the iteration swap a writable lever's focal content for a generated version.
export function servedFor(corpus: Corpus, levers: string[], overrides: Record<string, string> = {}): Result[] {
  const on = (l: string) => levers.includes(l);
  const c = (l: string, def: string) => overrides[l] ?? def;
  const out: Result[] = [];
  // Gatekeeper 1 — expert ranked guide.
  out.push({ title: corpus.guideTitle, snippet: on("editorial") ? corpus.guideFocal : corpus.guideBase });
  // Gatekeeper 2 — editorial best-of.
  out.push({ title: corpus.bestOfTitle, snippet: on("editorial") ? corpus.bestOfFocal : corpus.bestOfBase });
  // Gatekeeper 3 — community (its focal comment is overridable/writable).
  out.push({ title: corpus.communityTitle, snippet: on("community") ? `${corpus.communityLead} ${c("community", corpus.communityFocalDefault)}` : corpus.communityBase });
  out.push(...corpus.competitors);
  out.push(corpus.official);
  if (on("specs")) out.push({ title: corpus.specsTitle, snippet: c("specs", corpus.specsDefault) });
  if (on("reviews")) out.push({ title: corpus.reviewsTitle, snippet: c("reviews", corpus.reviewsDefault) });
  if (on("authority")) out.push({ title: corpus.authorityTitle, snippet: c("authority", corpus.authorityDefault) });
  if (on("comparison")) out.push({ title: corpus.comparisonTitle, snippet: c("comparison", corpus.comparisonDefault) });
  return out;
}

// ---- Agent runners (the studied models), parameterized by a per-corpus system prompt ----

const buildSystem = (corpus: Corpus) =>
  `You are a person's AI shopping assistant with live web access. Use the web_search tool to research the options for the shopper's query, then recommend the best ${corpus.noun}. ` +
  `Judge ONLY on the evidence in the search results, not on which brand is more famous. ` +
  `When done, respond with ONLY a JSON object, no other prose: {"ranked": [brand names you recommend, best first], "top": "the single best brand"}. ` +
  `Use these exact brand names: ${corpus.brands.join(", ")}.`;
const TOOL_DESC = "Search the web. Returns result snippets (title, snippet).";
const TOOL_SCHEMA = { type: "object", properties: { query: { type: "string" } }, required: ["query"] };

function parseRanked(text: string): string[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const o = JSON.parse(m[0]);
    return Array.isArray(o.ranked) ? o.ranked.map((x: unknown) => String(x)) : [];
  } catch {
    return [];
  }
}
// Focal rank within a ranking (1-based); n+1 if the focal brand is not ranked at all.
const focalRankOf = (ranked: string[], token: string, n: number) => {
  const i = ranked.findIndex((b) => { const nb = norm(b); return nb.length >= 2 && (nb.includes(token) || token.includes(nb)); });
  return i >= 0 ? i + 1 : n + 1;
};
const toolResult = (served: Result[]) => JSON.stringify({ results: served });

// Claude — real tool-use loop over a web_search tool we control.
async function runClaude(query: string, served: Result[], system: string): Promise<string> {
  const tools = [{ name: "web_search", description: TOOL_DESC, input_schema: TOOL_SCHEMA }];
  const messages: unknown[] = [{ role: "user", content: `Shopper's question: "${query}"` }];
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 1200, system, tools, messages }),
    });
    if (!r.ok) throw new Error(`claude ${r.status}`);
    const j = await r.json();
    messages.push({ role: "assistant", content: j.content });
    if (j.stop_reason !== "tool_use") return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    const toolResults = (j.content || []).filter((b: { type: string }) => b.type === "tool_use").map((b: { id: string }) => ({ type: "tool_result", tool_use_id: b.id, content: toolResult(served) }));
    messages.push({ role: "user", content: toolResults });
  }
  return "";
}

// ChatGPT — OpenAI function-calling loop.
async function runOpenAI(query: string, served: Result[], system: string): Promise<string> {
  const tools = [{ type: "function", function: { name: "web_search", description: TOOL_DESC, parameters: TOOL_SCHEMA } }];
  const messages: unknown[] = [{ role: "system", content: system }, { role: "user", content: `Shopper's question: "${query}"` }];
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-5.5", messages, tools, max_completion_tokens: 1600 }),
    });
    if (!r.ok) throw new Error(`openai ${r.status}`);
    const j = await r.json();
    const msg = j.choices?.[0]?.message;
    messages.push(msg);
    if (!msg?.tool_calls?.length) return msg?.content || "";
    for (const tc of msg.tool_calls) messages.push({ role: "tool", tool_call_id: tc.id, content: toolResult(served) });
  }
  return "";
}

// Gemini — function-calling loop.
async function runGemini(query: string, served: Result[], system: string): Promise<string> {
  const tools = [{ functionDeclarations: [{ name: "web_search", description: TOOL_DESC, parameters: TOOL_SCHEMA }] }];
  const contents: unknown[] = [{ role: "user", parts: [{ text: `Shopper's question: "${query}"` }] }];
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, tools, generationConfig: { maxOutputTokens: 1600 } }),
    });
    if (!r.ok) throw new Error(`gemini ${r.status}`);
    const j = await r.json();
    const parts = j.candidates?.[0]?.content?.parts || [];
    contents.push({ role: "model", parts });
    const calls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);
    if (!calls.length) return parts.map((p: { text?: string }) => p.text || "").join("");
    contents.push({ role: "user", parts: calls.map((c: { functionCall: { name: string } }) => ({ functionResponse: { name: c.functionCall.name, response: { results: served } } })) });
  }
  return "";
}

const AGENTS = [
  { name: "ChatGPT", model: "gpt-5.5", run: runOpenAI },
  { name: "Claude", model: "claude-opus-4-8", run: runClaude },
  { name: "Gemini", model: "gemini-pro-latest", run: runGemini },
];

// One plain Claude JSON call (no tools) — used to generate the corpus and per-lever content.
async function claudeJSON(system: string, user: string, maxTokens = 900): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`claude-gen ${r.status}`);
  const j = await r.json();
  return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
}
const jsonExtract = (t: string) => t.match(/\{[\s\S]*\}/)?.[0] || "{}";

// ---- Build a controlled environment for ANY brand (generated once, then cached) ----

const CORPUS_CACHE = new Map<string, Corpus>();

const CORPUS_SYSTEM =
  `You design a CONTROLLED EXPERIMENT that measures how AI shopping assistants rank brands. ` +
  `Given a focal brand and a shopper query, produce a realistic set of web-search results (a "corpus") an AI assistant would read while researching the query. This models an information environment for measurement; it is not published advertising. ` +
  `Return ONLY JSON with this exact shape:\n` +
  `{"focal":"<focal brand display name, properly capitalized/accented>",` +
  `"category":"<short noun phrase for what the shopper is choosing, e.g. 'stability running shoes' or 'French contemporary womenswear brands'>",` +
  `"noun":"<the single thing to recommend, e.g. 'running shoe' or 'clothing brand'>",` +
  `"competitors":[{"name":"<real competitor brand for this query, NOT the focal>","title":"<realistic review/page title>","snippet":"<1-2 sentence review with a plausible rating and a concrete merit>"} x EXACTLY 5],` +
  `"guide":{"title":"<an expert/editorial ranked-guide title with a plausible outlet for this category>","base":"<snippet ranking ONLY the 5 competitors, best first (focal ABSENT)>","focal":"<the SAME guide now INCLUDING the focal brand among the tested picks, listed NEUTRALLY (alphabetical or 'also tested') with a genuine merit, but NOT declared the winner>"},` +
  `"bestOf":{"title":"<an editorial best-of title, plausible outlet>","base":"<editors' picks naming ONLY the competitors>","focal":"<editors' picks that now ALSO include the focal brand as a value/notable pick alongside the competitors>"},` +
  `"community":{"title":"<a forum/Reddit thread title relevant to the query>","base":"<top comments naming the competitors as the go-to (focal ABSENT)>","lead":"<the same thread's lead clause naming the competitors, ending so a focal mention can follow>","focalDefault":"<one realistic community comment recommending the focal brand for this need>"},` +
  `"official":{"title":"<focal brand official-site title>","snippet":"<short, plausibly-true brand self-description>"},` +
  `"levers":{"specsTitle":"<title>","specs":"<a product-detail/spec result for the focal brand: the concrete attributes shoppers in THIS category compare>","reviewsTitle":"<title>","reviews":"<a customer-reviews result for the focal brand: a rating, a review count, a concrete strength>","authorityTitle":"<title>","authority":"<an independent expert/editorial assessment of the focal brand; use a GENERIC source ('an independent review', 'testers') — do NOT invent a specific named third-party score or award>","comparisonTitle":"<title>","comparison":"<an honest head-to-head: focal brand vs the category leader, fair and specific>"}}\n` +
  `RULES: (1) The corpus must make the focal brand WINNABLE on evidence but never PRE-RANK it (no circular "we put it #1 so it ranks #1"); at baseline the focal brand is simply absent from the gatekeepers and the levers add its genuine signals. (2) Competitors must be the REAL leading brands for this query. (3) Realistic and specific; plausible ratings/specs are fine (modeled environment) but do NOT attribute a fabricated score to a real named organization.`;

// Map the generated JSON to a Corpus (defensive: fall back to sane strings on missing fields).
function corpusFromJSON(brand: string, j: any): Corpus {
  const focal = String(j.focal || brand);
  const competitors: Result[] = Array.isArray(j.competitors) ? j.competitors.slice(0, 5).map((c: any) => ({ title: String(c.title || c.name || "Competitor review"), snippet: String(c.snippet || "") })) : [];
  const compNames: string[] = Array.isArray(j.competitors) ? j.competitors.slice(0, 5).map((c: any) => String(c.name || c.title || "")).filter(Boolean) : [];
  const L = j.levers || {};
  return {
    focal,
    focalToken: norm(focal).split(/\s+/)[0] || norm(focal),
    category: String(j.category || brand),
    noun: String(j.noun || "brand"),
    brands: [focal, ...compNames],
    competitors,
    guideTitle: String(j.guide?.title || `Best ${j.category || "options"}, reviewed`),
    guideBase: String(j.guide?.base || ""),
    guideFocal: String(j.guide?.focal || ""),
    bestOfTitle: String(j.bestOf?.title || `Best ${j.category || "options"} (editorial)`),
    bestOfBase: String(j.bestOf?.base || ""),
    bestOfFocal: String(j.bestOf?.focal || ""),
    communityTitle: String(j.community?.title || "Community thread"),
    communityBase: String(j.community?.base || ""),
    communityLead: String(j.community?.lead || j.community?.base || ""),
    communityFocalDefault: String(j.community?.focalDefault || ""),
    official: { title: String(j.official?.title || `${focal} (official site)`), snippet: String(j.official?.snippet || "") },
    specsTitle: String(L.specsTitle || `${focal} details`),
    specsDefault: String(L.specs || ""),
    reviewsTitle: String(L.reviewsTitle || `${focal} customer reviews`),
    reviewsDefault: String(L.reviews || ""),
    authorityTitle: String(L.authorityTitle || `${focal} expert review`),
    authorityDefault: String(L.authority || ""),
    comparisonTitle: String(L.comparisonTitle || `${focal} vs the category leader`),
    comparisonDefault: String(L.comparison || ""),
  };
}

// Generate (or look up) the controlled environment for a brand+query. 361 uses the verified
// hand-built corpus; everything else is generated once and cached for the session so the
// before-run and the after-run share the SAME environment.
export async function getCorpus(brand: string, query: string): Promise<Corpus> {
  if (norm(brand).includes("361")) return CORPUS_361;
  const key = `${norm(brand)}|${norm(query)}`;
  const hit = CORPUS_CACHE.get(key);
  if (hit) return hit;
  const out = await claudeJSON(CORPUS_SYSTEM, `Focal brand: "${brand}"\nShopper query: "${query}"\nProduce the corpus JSON.`, 2600);
  const corpus = corpusFromJSON(brand, JSON.parse(jsonExtract(out)));
  CORPUS_CACHE.set(key, corpus);
  return corpus;
}

// ---- The iteration: an agent GENERATES content versions for a writable lever, we test which lifts the brand most ----

const LEVER_BRIEF: Record<string, string> = {
  specs: "a product-detail or spec-sheet search result for the brand's product — the concrete attributes shoppers in this category actually compare (e.g. materials/fit/sizing/price, or stack/drop/weight, or dimensions/specs)",
  reviews: "an owner/customer reviews-and-quality search result for the brand (a rating, a review count, a concrete strength or durability note)",
  authority: "an independent expert assessment of the brand — use a GENERIC source ('an independent review', 'testers'); do NOT invent a specific named third-party score",
  community: "a community forum thread (like Reddit) where real users discuss and recommend the brand for this exact need",
  editorial: "an editorial best-of guide result that now lists the brand among its tested picks",
  comparison: "an honest head-to-head comparison pitting the brand against the category leader",
};

export type Version = { label: string; content: string };

// Generate K realistic, brand-safe content versions for a writable lever (works for ANY brand/category).
export async function generateVersions(leverId: string, brand: string, query: string, category: string, k = 2): Promise<Version[]> {
  const brief = LEVER_BRIEF[leverId] || "a web search result that makes the brand more credible for this query";
  const system =
    `You help a brand become legible to AI shopping assistants by making its real signals visible in the search results those assistants read. ` +
    `The brand is "${brand}" in the category "${category}", for the shopper query "${query}". ` +
    `Generate ${k} DIFFERENT, realistic versions of ${brief}. ` +
    `Each version is a short search-result snippet (1 to 3 sentences) the brand could realistically earn or publish. Vary the angle, specifics and wording so we can test which one moves the agents most. ` +
    `BRAND SAFETY (critical): never invent a specific named third-party score or endorsement (do NOT write things like "RunRepeat scored it 88/100" or "Vogue named it #1") — those must be earned, not written. Generate content the brand can honestly publish or encourage: its own specs/details, an honest comparison, the kind of genuine owner or community experience it would realistically earn. No fabricated attributions, no fake review counts presented as audited fact. ` +
    `Respond with ONLY JSON: {"versions":[{"label":"a 2-4 word tag","content":"the snippet"}]}.`;
  try {
    const o = JSON.parse(jsonExtract(await claudeJSON(system, `Generate ${k} versions.`)));
    return Array.isArray(o.versions) ? o.versions.slice(0, k).map((v: { label?: string; content?: string }) => ({ label: String(v.label || "version"), content: String(v.content || "") })).filter((v: Version) => v.content) : [];
  } catch {
    return [];
  }
}

// Fast single-shot rank (one agent, no tool loop) — used to score content versions quickly.
async function quickRank(corpus: Corpus, query: string, served: Result[]): Promise<number> {
  const sys = `You are a shopping assistant. Given these web search results, rank the brands for the shopper, best first, judging on the evidence (not fame). Respond with ONLY JSON: {"ranked":[brand names best first]}. Brands: ${corpus.brands.join(", ")}.`;
  const user = `Query: "${query}"\n\nResults:\n${served.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`).join("\n")}\n\nJSON ranking:`;
  try {
    return focalRankOf(parseRanked(await claudeJSON(sys, user)), corpus.focalToken, corpus.brands.length);
  } catch {
    return corpus.brands.length + 1;
  }
}

export type LeverIteration = { lever: string; versions: { label: string; content: string; rank: number }[]; best: { label: string; content: string; rank: number } | null };

// For a writable lever: generate K content versions, quick-test each in isolation, return the winner (lowest focal rank).
export async function iterateLever(corpus: Corpus, leverId: string, brand: string, query: string, k = 2): Promise<LeverIteration> {
  const versions = await generateVersions(leverId, brand, query, corpus.category, k);
  const tested = await Promise.all(
    versions.map(async (v) => {
      const served = servedFor(corpus, [leverId], { [leverId]: v.content });
      const runs = await Promise.all([quickRank(corpus, query, served), quickRank(corpus, query, served)]);
      return { ...v, rank: +(runs.reduce((a, b) => a + b, 0) / runs.length).toFixed(1) };
    }),
  );
  const best = tested.length ? tested.reduce((a, b) => (b.rank < a.rank ? b : a)) : null;
  return { lever: leverId, versions: tested, best };
}

// Writable levers (the brand creates this content) get the "write exactly this" iteration.
// Earnable levers (authority, editorial) keep their default — you earn them, you don't write them.
export const WRITABLE = ["specs", "reviews", "comparison", "community"];

export type SandboxRun = { final: ControlledRun; iterations: LeverIteration[] };

// The full sandbox re-test: build the environment, iterate each selected writable lever to its best
// content, then run the 3 agents live with the winning content applied (earnable levers use default).
export async function runSandbox(brand: string, query: string, levers: string[], k = 2): Promise<SandboxRun> {
  const corpus = await getCorpus(brand, query);
  const iterations = await Promise.all(levers.filter((l) => WRITABLE.includes(l)).map((l) => iterateLever(corpus, l, brand, query, k)));
  const overrides: Record<string, string> = {};
  for (const it of iterations) if (it.best) overrides[it.lever] = it.best.content;
  const final = await runControlled(corpus, query, levers, overrides);
  return { final, iterations };
}

export type AgentLive = { name: string; model: string } & ({ ok: true; rank: number; ranked: string[]; top: string } | { ok: false });
export type ControlledRun = { agents: AgentLive[]; served: Result[]; avgRank: number | null; top1: number | null; focal: string; brands: string[]; liveCount: number };

// Run the controlled search live across all three agents (in parallel) against a given corpus.
export async function runControlled(corpus: Corpus, query: string, levers: string[], overrides: Record<string, string> = {}): Promise<ControlledRun> {
  const served = servedFor(corpus, levers, overrides);
  const system = buildSystem(corpus);
  const n = corpus.brands.length;
  const agents: AgentLive[] = await Promise.all(
    AGENTS.map(async (a): Promise<AgentLive> => {
      try {
        const ranked = parseRanked(await a.run(query, served, system));
        if (!ranked.length) return { name: a.name, model: a.model, ok: false };
        return { name: a.name, model: a.model, ok: true, rank: focalRankOf(ranked, corpus.focalToken, n), ranked, top: ranked[0] || "" };
      } catch {
        return { name: a.name, model: a.model, ok: false };
      }
    }),
  );
  const ok = agents.filter((r): r is Extract<AgentLive, { ok: true }> => r.ok);
  const avgRank = ok.length ? +(ok.reduce((s, r) => s + r.rank, 0) / ok.length).toFixed(1) : null;
  const matchesFocal = (b: string) => { const nb = norm(b); return nb.length >= 2 && (nb.includes(corpus.focalToken) || corpus.focalToken.includes(nb)); };
  const top1 = ok.length ? +(ok.filter((r) => matchesFocal(r.top)).length / ok.length).toFixed(2) : null;
  return { agents, served, avgRank, top1, focal: corpus.focal, brands: corpus.brands, liveCount: ok.length };
}

// Convenience entry for the live baseline/levered run from a brand+query (builds/looks up the corpus).
export async function runLiveRank(brand: string, query: string, levers: string[]): Promise<ControlledRun> {
  const corpus = await getCorpus(brand, query);
  return runControlled(corpus, query, levers);
}
