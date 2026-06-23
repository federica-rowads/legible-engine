// Controlled web search — the REAL run. Each studied agent (ChatGPT / Claude /
// Gemini) actually searches via a web_search tool, and WE control what that tool
// returns: baseline = the focal brand is invisible; each enabled lever makes one of
// its real (or earnable) signals legible. The agent then recommends, live, and we
// read where it ranks the focal brand. Same controlled environment as the N=5 sweep,
// run on demand. Pure module (no framework imports) so it runs locally and in tests.

const FOCAL = "361 Degrees";
const BRANDS = ["361 Degrees", "Brooks", "ASICS", "Hoka", "Saucony", "New Balance"];

type Result = { title: string; snippet: string };

const COMPETITORS: Result[] = [
  { title: "Brooks Adrenaline GTS 25 review (RunRepeat)", snippet: "CoreScore 90/100, GuideRails support, 4.5/5 across 1,800+ reviews; a top, widely recommended overpronation pick." },
  { title: "ASICS GT-2000 13 review", snippet: "Long-trusted stability shoe with 3D Guidance; 4.4/5 across 2,000+ reviews." },
  { title: "Hoka Arahi 7 review", snippet: "Lightweight stability with J-Frame support; 4.3/5 across 1,500+ reviews." },
  { title: "Saucony Tempus review", snippet: "Stability via a PWRRUN PB frame; 4.3/5 across 900+ reviews." },
  { title: "New Balance 860v14 review", snippet: "Dual-density medial post; 4.4/5 across 1,800+ reviews." },
];

// Controlled result set for the enabled levers. Gatekeeper levers (editorial/community)
// make 361 VISIBLE in the trusted sources but do NOT pre-rank it (the agent decides).
// `overrides` lets the iteration swap a lever's focal content for a generated version.
export function servedFor(levers: string[], overrides: Record<string, string> = {}): Result[] {
  const on = (l: string) => levers.includes(l);
  const c = (l: string, def: string) => overrides[l] ?? def;
  const out: Result[] = [];
  // Gatekeeper 1 — lab-tested ranked guide (editorial puts 361 INTO it, with overridable wording).
  out.push(on("editorial")
    ? { title: "Best stability running shoes, lab-tested (RunRepeat)", snippet: `Tested stability shoes (alphabetical; see each page for its score): ${c("editorial", "361 Degrees Phoenix 2 (standout durability, locked-in stability)")}, ASICS GT-2000 13, Brooks Adrenaline GTS 25 (CoreScore 90), Hoka Arahi 7, Saucony Tempus.` }
    : { title: "Best stability running shoes, lab-tested (RunRepeat)", snippet: "Top picks: 1) Brooks Adrenaline GTS 25 (CoreScore 90, best overall), 2) ASICS GT-2000 13, 3) Hoka Arahi 7, 4) Saucony Tempus, 5) New Balance 860v14." });
  // Gatekeeper 2 — editorial best-of.
  out.push(on("editorial")
    ? { title: "Best stability running shoes 2026 (Runner's World)", snippet: "Editors' picks now include the 361 Degrees Phoenix 2 (a value pick with standout durability), alongside the Brooks Adrenaline GTS 25, ASICS Gel-Kayano 31 and Hoka Arahi 7." }
    : { title: "Best stability running shoes 2026 (Runner's World)", snippet: "Editors' picks: Brooks Adrenaline GTS 25, ASICS Gel-Kayano 31, Hoka Arahi 7." });
  // Gatekeeper 3 — community (its 361 comment is overridable).
  out.push(on("community")
    ? { title: "r/RunningShoeGeeks: best stability shoes for flat feet", snippet: `Top comments name Brooks Adrenaline and ASICS GT-2000 as the classics; ${c("community", "several runners also flag the 361 Phoenix 2 ('600 miles in, the most durable and stable daily trainer I have run, underrated for flat feet')")}.` }
    : { title: "r/RunningShoeGeeks: best stability shoes for flat feet", snippet: "Top comments name Brooks Adrenaline and ASICS GT-2000 as the go-to for flat feet; Hoka Arahi if you want lighter." });
  out.push(...COMPETITORS);
  out.push({ title: "361 Degrees Phoenix 2 (official site)", snippet: "Premium stability and cushioning for your daily miles." });
  if (on("specs")) out.push({ title: "361 Degrees Phoenix 2 spec sheet", snippet: c("specs", "26/34 mm stack, 8 mm drop, 9.9 oz, dual-density PRIMO + ENGAGE midsole, widths Standard and Wide (2E), $150.") });
  if (on("reviews")) out.push({ title: "361 Phoenix 2 owner reviews", snippet: c("reviews", "4.5/5; owners praise standout durability ('built like a tank') and locked-in, non-intrusive stability. Made by 361, a US$1.4 billion global brand.") });
  if (on("authority")) out.push({ title: "361 Degrees stability review (Doctors of Running)", snippet: c("authority", "Independent expert lab rates it 88.8% overall with 9.5/10 for stability (both testers), among the best-supported daily trainers tested.") });
  if (on("comparison")) out.push({ title: "361 Phoenix 2 vs Brooks Adrenaline GTS 25", snippet: c("comparison", "The 361 is lighter and more durable than the Brooks at the same $150, with comparable stability; the Brooks has the larger review base.") });
  return out;
}

const SYSTEM =
  `You are a person's AI shopping assistant with live web access. Use the web_search tool to research the options for the shopper's query, then recommend the best running shoe. ` +
  `Judge ONLY on the evidence in the search results, not on which brand is more famous. ` +
  `When done, respond with ONLY a JSON object, no other prose: {"ranked": [brand names you recommend, best first], "top": "the single best brand"}. ` +
  `Use these exact brand names: 361 Degrees, Brooks, ASICS, Hoka, Saucony, New Balance.`;
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
const focalRank = (ranked: string[]) => { const i = ranked.findIndex((b) => /361/.test(b)); return i >= 0 ? i + 1 : 7; };
const toolResult = (served: Result[]) => JSON.stringify({ results: served });

// Claude — real tool-use loop over a web_search tool we control.
async function runClaude(query: string, served: Result[]): Promise<string> {
  const tools = [{ name: "web_search", description: TOOL_DESC, input_schema: TOOL_SCHEMA }];
  const messages: unknown[] = [{ role: "user", content: `Shopper's question: "${query}"` }];
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 1200, system: SYSTEM, tools, messages }),
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
async function runOpenAI(query: string, served: Result[]): Promise<string> {
  const tools = [{ type: "function", function: { name: "web_search", description: TOOL_DESC, parameters: TOOL_SCHEMA } }];
  const messages: unknown[] = [{ role: "system", content: SYSTEM }, { role: "user", content: `Shopper's question: "${query}"` }];
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
async function runGemini(query: string, served: Result[]): Promise<string> {
  const tools = [{ functionDeclarations: [{ name: "web_search", description: TOOL_DESC, parameters: TOOL_SCHEMA }] }];
  const contents: unknown[] = [{ role: "user", parts: [{ text: `Shopper's question: "${query}"` }] }];
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, tools, generationConfig: { maxOutputTokens: 1600 } }),
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

// ---- The iteration: an agent GENERATES content versions for a lever, we test which lifts the brand most ----

const LEVER_BRIEF: Record<string, string> = {
  specs: "a machine-readable spec-sheet search result for the brand's product (stack, drop, weight, support tech, widths, price)",
  reviews: "an owner-reviews-and-durability search result for the brand (a rating, a review count, a concrete durability note)",
  authority: "an independent expert lab review search result for the brand (name a real-type lab, give a score, say what it praised)",
  community: "a running-community forum thread (like r/RunningShoeGeeks) where real runners discuss and recommend the brand for this exact need",
  editorial: "an editorial best-of guide result (like Runner's World or a lab guide) that now lists the brand among its tested picks",
  comparison: "an honest head-to-head comparison page pitting the brand against the category leader",
};

// One plain Claude JSON call (no tools) — used to generate content variations.
async function claudeJSON(system: string, user: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 900, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`claude-gen ${r.status}`);
  const j = await r.json();
  return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
}

export type Version = { label: string; content: string };

// Generate K realistic, brand-safe content versions for a lever (works for ANY brand).
export async function generateVersions(leverId: string, brand: string, query: string, k = 2): Promise<Version[]> {
  const brief = LEVER_BRIEF[leverId] || "a web search result that makes the brand more credible for this query";
  const system =
    `You help a brand become legible to AI shopping assistants by making its real signals visible in the search results those assistants read. ` +
    `Generate ${k} DIFFERENT, realistic versions of ${brief}, for the brand "${brand}" and the shopper query "${query}". ` +
    `Each version is a short search-result snippet (1 to 3 sentences) the brand could realistically earn or publish. Vary the angle, specifics and wording so we can test which one moves the agents most. ` +
    `BRAND SAFETY (critical): never invent a specific named third-party score or endorsement (do NOT write things like "RunRepeat scored it 88/100" or "Doctors of Running rated it 9/10") — those must be earned, not written. Generate content the brand can honestly publish or encourage: its own specs, an honest comparison, the kind of genuine owner or community experience it would realistically earn. No fabricated attributions, no fake review counts presented as fact. ` +
    `Respond with ONLY JSON: {"versions":[{"label":"a 2-4 word tag","content":"the snippet"}]}.`;
  try {
    const o = JSON.parse(claudeJSONExtract(await claudeJSON(system, `Generate ${k} versions.`)));
    return Array.isArray(o.versions) ? o.versions.slice(0, k).map((v: { label?: string; content?: string }) => ({ label: String(v.label || "version"), content: String(v.content || "") })).filter((v: Version) => v.content) : [];
  } catch {
    return [];
  }
}
const claudeJSONExtract = (t: string) => t.match(/\{[\s\S]*\}/)?.[0] || "{}";

// Fast single-shot rank (one agent, no tool loop) — used to score content versions quickly.
async function quickRank(query: string, served: Result[]): Promise<number> {
  const sys = `You are a shopping assistant. Given these web search results, rank the brands for the shopper, best first, judging on the evidence (not fame). Respond with ONLY JSON: {"ranked":[brand names best first]}. Brands: 361 Degrees, Brooks, ASICS, Hoka, Saucony, New Balance.`;
  const user = `Query: "${query}"\n\nResults:\n${served.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`).join("\n")}\n\nJSON ranking:`;
  try {
    return focalRank(parseRanked(await claudeJSON(sys, user)));
  } catch {
    return 7;
  }
}

export type LeverIteration = { lever: string; versions: { label: string; content: string; rank: number }[]; best: { label: string; content: string; rank: number } | null };

// For a writable lever: generate K content versions, quick-test each, return the winner (lowest focal rank).
export async function iterateLever(leverId: string, brand: string, query: string, baseLevers: string[], k = 2): Promise<LeverIteration> {
  const versions = await generateVersions(leverId, brand, query, k);
  // Test each version in ISOLATION (only this lever on) so the content's own effect shows,
  // averaged over 2 quick runs to reduce noise and break ties. baseLevers kept for signature parity.
  void baseLevers;
  const tested = await Promise.all(
    versions.map(async (v) => {
      const served = servedFor([leverId], { [leverId]: v.content });
      const runs = await Promise.all([quickRank(query, served), quickRank(query, served)]);
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

// The full sandbox re-test: iterate each selected writable lever to its best content, then run
// the 3 agents live with the winning content applied (earnable levers use their default).
export async function runSandbox(brand: string, query: string, levers: string[], k = 2): Promise<SandboxRun> {
  const iterations = await Promise.all(levers.filter((l) => WRITABLE.includes(l)).map((l) => iterateLever(l, brand, query, levers, k)));
  const overrides: Record<string, string> = {};
  for (const it of iterations) if (it.best) overrides[it.lever] = it.best.content;
  const final = await runControlled(query, levers, overrides);
  return { final, iterations };
}

export type AgentLive = { name: string; model: string } & ({ ok: true; rank: number; ranked: string[]; top: string } | { ok: false });
export type ControlledRun = { agents: AgentLive[]; served: Result[]; avgRank: number | null; top1: number | null; focal: string; brands: string[]; liveCount: number };

// Run the controlled search live across all three agents (in parallel).
export async function runControlled(query: string, levers: string[], overrides: Record<string, string> = {}): Promise<ControlledRun> {
  const served = servedFor(levers, overrides);
  const agents: AgentLive[] = await Promise.all(
    AGENTS.map(async (a): Promise<AgentLive> => {
      try {
        const ranked = parseRanked(await a.run(query, served));
        if (!ranked.length) return { name: a.name, model: a.model, ok: false };
        return { name: a.name, model: a.model, ok: true, rank: focalRank(ranked), ranked, top: ranked[0] || "" };
      } catch {
        return { name: a.name, model: a.model, ok: false };
      }
    }),
  );
  const ok = agents.filter((r): r is Extract<AgentLive, { ok: true }> => r.ok);
  const avgRank = ok.length ? +(ok.reduce((s, r) => s + r.rank, 0) / ok.length).toFixed(1) : null;
  const top1 = ok.length ? +(ok.filter((r) => /361/.test(r.top)).length / ok.length).toFixed(2) : null;
  return { agents, served, avgRank, top1, focal: FOCAL, brands: BRANDS, liveCount: ok.length };
}
