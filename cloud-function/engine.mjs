// engine.mjs — the honest two-layer engine, ported verbatim from src/lib/real-engine.ts (main)
// to plain ESM JavaScript so it runs as a Cloud Functions (2nd gen) HTTP function with the
// long timeout the live multi-agent web-search runs need.
//
// LAYER 1 — REALITY: the three agents (ChatGPT / Claude / Gemini) really web-search an UNBIASED
//   user query (we never mention the focal brand). Multi-run → mention-rate + position.
// LAYER 2 — CONTROLLED LIFT: grounded in that real competitor set, we inject the brand's signals
//   into a controlled web_search and measure the causal lift.
//
// Reads the API keys from the environment: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY.

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const jsonExtract = (t) => t.match(/\{[\s\S]*\}/)?.[0] || "{}";
// Force a ranked top-10 so position is a clean, intuitive metric ("#7 of 10" / "unranked").
const topAsk = (q) => `Give me a numbered TOP 10 — the ten best — for this shopper: "${q}". Reply with the ranked list of brand or store names, best first, numbered 1 to 10.`;

// A tiny async semaphore: bounds how many wrapped calls run at once (FIFO queue for the rest).
function makeLimiter(max) {
  let active = 0;
  const queue = [];
  return async function limit(fn) {
    if (active >= max) await new Promise((r) => queue.push(r));
    active++;
    try { return await fn(); } finally { active--; queue.shift()?.(); }
  };
}
// Anthropic is the shared bottleneck: Claude's web search AND every internal extraction/scoring
// call hit it. Cap concurrent Anthropic calls so two runs back-to-back don't burst past the rate limit.
const anthropicLimit = makeLimiter(Number(process.env.ANTHROPIC_CONCURRENCY) || 4);

// fetch with a HARD per-attempt timeout + gentle retry on transient 429/529/5xx.
async function aFetch(url, opts, tries = 3, timeoutMs = 150000) {
  let last = null;
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
      if (i === tries - 1) throw e;
    }
    await new Promise((res) => setTimeout(res, 700 * (i + 1) + Math.floor(Math.random() * 500)));
  }
  if (last) return last;
  throw new Error("aFetch: no response");
}
const anthropicFetch = (url, opts) => anthropicLimit(() => aFetch(url, opts));

// One plain Claude JSON call (no tools) — used to extract the brand list from a natural answer.
async function claudeJSON(system, user, maxTokens = 800, model = "claude-opus-4-8") {
  const r = await anthropicFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`claude-json ${r.status}`);
  const j = await r.json();
  return (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

// ---- Native (REAL) web search per agent — the agent really searches and answers ----

async function claudeSearch(query, extra = "") {
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];
  const messages = [{ role: "user", content: query + extra }];
  for (let hop = 0; hop < 5; hop++) {
    const r = await anthropicFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 4000, messages, tools }),
    });
    if (!r.ok) return `ERR claude ${r.status}`;
    const j = await r.json();
    messages.push({ role: "assistant", content: j.content });
    if (j.stop_reason !== "pause_turn") return (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  }
  return "ERR claude pause-loop";
}

async function openaiSearch(query, extra = "") {
  const r = await aFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.5", input: query + extra, tools: [{ type: "web_search" }] }),
  });
  if (!r.ok) return `ERR openai ${r.status}`;
  const j = await r.json();
  if (typeof j.output_text === "string" && j.output_text) return j.output_text;
  const texts = (j.output || []).flatMap((o) => (o.content || []).filter((c) => c.type === "output_text").map((c) => c.text || ""));
  return texts.join("") || "ERR openai empty";
}

async function geminiSearch(query, extra = "") {
  const r = await aFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: query + extra }] }], tools: [{ google_search: {} }] }),
  });
  if (!r.ok) return `ERR gemini ${r.status}`;
  const j = await r.json();
  const parts = j.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("") || "ERR gemini empty";
}

export const AGENTS = [
  { name: "ChatGPT", model: "gpt-5.5", run: openaiSearch },
  { name: "Claude", model: "claude-opus-4-8", run: claudeSearch },
  { name: "Gemini", model: "gemini-pro-latest", run: geminiSearch },
];

// ---- Extract the ordered brand list from a natural answer (no forced list) ----

export async function extractBrands(answer) {
  if (!answer || answer.length < 20 || answer.startsWith("ERR ")) return [];
  const sys =
    `You read an AI shopping assistant's answer and extract the brands or retailers it recommends to the shopper, ` +
    `in order of prominence (the one it pushes hardest / lists first comes first). ` +
    `Output ONLY JSON: {"brands":["...", ...]}. Rules: include only real, purchasable brands or stores — not generic advice, not product categories, not cities or countries; ` +
    `dedupe; keep the assistant's own ordering; at most 15 names.`;
  try {
    const o = JSON.parse(jsonExtract(await claudeJSON(sys, `Answer:\n${answer.slice(0, 6000)}\n\nExtract the ordered brand list as JSON.`)));
    return Array.isArray(o.brands) ? o.brands.map((x) => String(x)).filter(Boolean).slice(0, 15) : [];
  } catch {
    return [];
  }
}

const focalTokenOf = (focal) => norm(focal).split(/\s+/)[0] || norm(focal);
const matchesFocal = (b, token) => { const nb = norm(b); return nb.length >= 2 && (nb.includes(token) || token.includes(nb)); };
const posOf = (brands, token) => { const i = brands.findIndex((b) => matchesFocal(b, token)); return i >= 0 ? i + 1 : null; };

// One real run: native search (+ optional injected content) → extract ordered brands → locate focal.
async function oneRealRun(agent, query, token, extra = "") {
  try {
    const answer = await agent.run(topAsk(query), extra);
    const ranked = await extractBrands(answer);
    return { agent: agent.name, model: agent.model, ranked, pos: posOf(ranked, token), ok: ranked.length > 0, answer: answer.slice(0, 600) };
  } catch {
    return { agent: agent.name, model: agent.model, ranked: [], pos: null, ok: false };
  }
}

const mean = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);
const stdev = (xs) => { if (xs.length < 2) return xs.length ? 0 : null; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return +Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length).toFixed(1); };

// Build one agent's summary from its raw runs (shared by the all-agents and single-agent paths).
function buildAgentBaseline(a, runs) {
  const ok = runs.filter((r) => r.ok);
  const present = ok.filter((r) => r.pos != null).map((r) => r.pos);
  const okP = ok.filter((r) => r.pos != null);
  const ap = mean(present) ?? 0;
  const repr = okP.length ? okP.reduce((b, r) => (Math.abs(r.pos - ap) < Math.abs(b.pos - ap) ? r : b)) : (ok[0] ?? null);
  return { name: a.name, model: a.model, runs, mentionRate: ok.length ? +(present.length / ok.length).toFixed(2) : 0, avgPos: mean(present), posStdev: stdev(present), topList: repr ? repr.ranked : [] };
}

// The 3 agents on a REAL web search (+ optional injected content), N times each, in parallel.
async function runNative(query, token, extra, N) {
  const jobs = AGENTS.flatMap((a) => Array.from({ length: N }, () => oneRealRun(a, query, token, extra)));
  const all = await Promise.all(jobs);
  const agents = AGENTS.map((a) => buildAgentBaseline(a, all.filter((r) => r.agent === a.name)));
  const okAll = all.filter((r) => r.ok);
  const presentAll = okAll.filter((r) => r.pos != null).map((r) => r.pos);
  const mentionRate = okAll.length ? +(presentAll.length / okAll.length).toFixed(2) : 0;
  const avgPos = mean(presentAll);
  const tally = new Map();
  const display = new Map();
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
export async function runRealBaseline(focal, query, N = 5) {
  const token = focalTokenOf(focal);
  const nr = await runNative(query, token, "", N);
  return { focal, focalToken: token, query, N, agents: nr.agents, mentionRate: nr.mentionRate, avgPos: nr.avgPos, competitors: nr.competitors };
}

// One agent, N real runs (+ optional injected content). Powers the progressive per-agent UI.
export async function runAgentBaseline(agentName, query, focal, N = 2, extra = "") {
  const agent = AGENTS.find((a) => a.name === agentName);
  if (!agent) throw new Error(`unknown agent ${agentName}`);
  const token = focalTokenOf(focal);
  const runs = await Promise.all(Array.from({ length: N }, () => oneRealRun(agent, query, token, extra)));
  return buildAgentBaseline(agent, runs);
}

// ============================================================================
// LAYER 2 — LIFT via INJECTION ON THE REAL SEARCH (anchored to the baseline).
// ============================================================================

const LEVER_BRIEF = {
  specs:
    "a product-page spec block for the brand. NAME the exact spec fields shoppers in THIS category compare and tell the brand to publish them on its product page (e.g. running shoes -> heel-to-toe drop, weight, stack height, support/pronation type, cushioning level, outsole/upper material, sizing/width, price; phones -> chipset, RAM, battery mAh, screen size/refresh, camera MP, weight, price). List the actual field names with the brand's plausible values. Frame it as \"add these fields to your product page\".",
  reviews:
    "a customer-reviews result for the brand — an aggregate star rating and a count, plus the concrete, category-specific strength reviewers in THIS category single out (e.g. arch support, durability, true-to-size fit). Make the strength specific to the query, not generic.",
  community:
    "a real community post recommending the brand for this EXACT need. NAME the specific real subreddit(s)/forum(s) where shoppers in THIS category actually ask (e.g. running shoes -> r/RunningShoeGeeks, r/running, r/AdvancedRunning; mechanical keyboards -> r/MechanicalKeyboards; skincare -> r/SkincareAddiction) and write the post as it would read there, in that community's voice, naming the subreddit and the angle.",
  comparison:
    "an honest, specific head-to-head of the brand vs {LEADER} — the REAL category leader for this query (the brand AI assistants rank #1). Compare on the concrete attributes shoppers weigh; concede where {LEADER} wins and state exactly where the brand wins for THIS shopper. Use {LEADER} by name; do not say \"the leader\" generically.",
  editorial:
    "a best-of guide entry that lists the brand among its picks. NAME the specific real publications/round-ups that AI assistants actually cite for THIS category (e.g. running shoes -> RunRepeat, Runner's World, Wirecutter, Believe in the Run; tech -> Wirecutter, Rtings, The Verge; mattresses -> Wirecutter, Sleep Foundation) and say which to prioritize earning a mention in first. Reference the real outlet by name; never say \"a best-of guide\" generically.",
  authority:
    "an independent expert assessment of the brand. NAME the specific KIND of independent tester/lab/expert that has real authority in THIS category (e.g. running shoes -> a gait-analysis lab, a podiatrist/sports-medicine clinic, a biomechanics tester; electronics -> an independent lab like Rtings-style bench testing; food -> a registered dietitian) so the brand knows whose endorsement to pursue. Use a GENERIC source for the actual claim ('independent lab testing', 'a sports podiatrist') — NEVER a fabricated named score, rating, or quote.",
};
const fillBrief = (brief, competitors) =>
  brief
    .replace(/\{LEADER\}/g, competitors[0] || "the category leader")
    .replace(/\{RIVALS\}/g, competitors.slice(0, 6).join(", ") || "the leading brands");
export const WRITABLE = ["specs", "reviews", "comparison", "community"];

async function generateVersions(leverId, brand, query, competitors, k) {
  const brief = fillBrief(LEVER_BRIEF[leverId] || "a search result that makes the brand more credible for this query", competitors);
  const leader = competitors[0] || "";
  const compLine = competitors.length
    ? `The REAL competitor set AI assistants rank for this query (most-cited first) is: ${competitors.slice(0, 8).join(", ")}.` +
      (leader ? ` The current category leader (ranked #1) is ${leader} — when relevant, name it specifically.` : "")
    : "";
  const system =
    `You help a brand become legible to AI shopping assistants. The brand is "${brand}", for the shopper query "${query}". ` +
    compLine + " " +
    `Generate ${k} DIFFERENT, realistic versions of ${brief} ` +
    `Each is a short snippet (1-3 sentences) the brand could honestly publish or earn. Vary the angle and specifics. ` +
    `BE SPECIFIC AND NAMED — this is the whole point: name the actual subreddit / publication / spec field / the real leading competitor for THIS query using your knowledge of the category's real sources. NEVER write generic placeholders like "a popular forum", "leading review sites", "the category leader", "relevant specs" — name the real thing. A recommendation a marketer cannot act on (because it names nothing) is a failure. ` +
    `BRAND SAFETY (hard): naming a real subreddit, publication, spec field, or competitor is REQUIRED and fine. Fabricating a RESULT is forbidden — never invent a specific named third-party score or award (no "Vogue named it #1", no "RunRepeat 88/100"), no fabricated audited review counts, no invented quotes. Honest, publishable content only. ` +
    `Respond with ONLY JSON: {"versions":[{"label":"2-4 word tag","content":"the snippet"}]}.`;
  try {
    const o = JSON.parse(jsonExtract(await claudeJSON(system, `Generate ${k} versions.`)));
    return Array.isArray(o.versions) ? o.versions.slice(0, k).map((v) => ({ label: String(v.label || "version"), content: String(v.content || "") })).filter((v) => v.content) : [];
  } catch {
    return [];
  }
}

// Fast proxy scorer — pick the best wording per lever; the final lift is measured live.
async function quickScore(focal, query, competitors, content) {
  const sys = `You are a shopping assistant. Rank the brands/stores for the shopper, best first, judging only on the evidence. Reply with a numbered list of names.`;
  const user = `Shopper's question: "${query}"\nBrands people usually recommend here: ${competitors.slice(0, 8).join(", ")}.\nThe brand "${focal}" has published this content: "${content}"\nGive your ranked top 10, best first (include ${focal} only where the evidence places it).`;
  try {
    return posOf(await extractBrands(await claudeJSON(sys, user, 700)), focalTokenOf(focal));
  } catch {
    return null;
  }
}

async function optimizeLever(focal, query, competitors, leverId, k) {
  const versions = await generateVersions(leverId, focal, query, competitors, WRITABLE.includes(leverId) ? k : 1);
  const tested = await Promise.all(versions.map(async (v) => {
    const scores = [await quickScore(focal, query, competitors, v.content)];
    const present = scores.filter((p) => p != null);
    return { ...v, mentionRate: +(present.length / scores.length).toFixed(2), pos: mean(present) };
  }));
  const score = (t) => t.mentionRate * 100 - (t.pos ?? 99);
  const best = tested.length ? tested.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
  return { lever: leverId, versions: tested, best };
}

// Optimize the selected levers and assemble the injection note + the "write this" data.
export async function optimizeContent(focal, query, competitors, levers, k = 2) {
  const items = (await Promise.all(levers.map((l) => optimizeLever(focal, query, competitors, l, k)))).filter((it) => it.best);
  const injected = items.length
    ? `\n\n--- Additionally, the following content about ${focal} has recently been published online and may appear in your research. Weigh it alongside everything else you find:\n` +
      items.map((it) => `• ${it.best.content}`).join("\n")
    : "";
  return { injected, iterations: items.filter((it) => WRITABLE.includes(it.lever)) };
}

export async function runTreatment(focal, query, competitors, levers, N = 3, k = 2) {
  const { injected, iterations } = await optimizeContent(focal, query, competitors, levers, k);
  const nr = await runNative(query, focalTokenOf(focal), injected, N);
  return { agents: nr.agents, mentionRate: nr.mentionRate, avgPos: nr.avgPos, iterations, injected };
}

// The whole product flow: real baseline → real competitors → injected real-search lift.
export async function runFull(focal, query, levers, N = 3, k = 2) {
  const baseline = await runRealBaseline(focal, query, N);
  const treatment = await runTreatment(focal, query, baseline.competitors.map((c) => c.name), levers, N, k);
  return { baseline, treatment };
}
