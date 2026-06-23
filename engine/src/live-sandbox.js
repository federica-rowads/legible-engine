// Legible — CONTROLLED WEB SEARCH (Marco's "control the web_search tool").
//
// The agent really *searches* (it calls a web_search tool), but WE control what
// the search returns. BEFORE = the real web's view: competitors fill the ranked
// lab guides, the editorial best-ofs and the community consensus, and the focal
// brand is invisible. SANDBOX = we make the focal's REAL signals legible, one
// lever at a time, and re-run — live. Crucially, the highest-leverage levers
// (editorial, community) put the focal INTO the gatekeeper sources the agents
// rank from; the others add standalone signals. This is the controlled
// information environment from the brief, on the realistic search surface, and
// it lets us MEASURE every lever (incl. the research-backed ones).
//
//   node src/live-sandbox.js --levers=none --n=5 --agents=claude
//   node src/live-sandbox.js --levers=editorial --n=5 --agents=all
//   node src/live-sandbox.js --levers=all --n=5 --agents=all
import "./lib/env.js";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { extract } from "./lib/extractor.js";

const client = new Anthropic({ maxRetries: 8 });
const MODEL = process.env.LEGIBLE_AGENT_MODEL || "claude-opus-4-8";
const FOCAL = "361 Degrees";
const BRANDS = ["361 Degrees", "Brooks", "ASICS", "Saucony", "Hoka", "New Balance"];
const ALL_LEVERS = ["specs", "reviews", "authority", "community", "editorial", "comparison"];

// Competitor result pages — always returned (the real, entrenched web).
const COMPETITORS = [
  { title: "Brooks Adrenaline GTS 25 review — RunRepeat", url: "runrepeat.com/brooks-adrenaline-gts-25",
    snippet: "CoreScore 90/100. GuideRails holistic support; rated 4.5/5 across 1,800+ reviews. A top, widely recommended overpronation pick." },
  { title: "ASICS GT-2000 13 review", url: "runrepeat.com/asics-gt-2000-13",
    snippet: "Long-trusted stability shoe with 3D Guidance; 4.4/5 across 2,000+ reviews; frequently named a top overpronation pick." },
  { title: "Hoka Arahi 7 review", url: "runrepeat.com/hoka-arahi-7",
    snippet: "Lightweight stability with J-Frame support; 4.3/5 across 1,500+ reviews." },
  { title: "Saucony Tempus review", url: "runrepeat.com/saucony-tempus",
    snippet: "Stability via a PWRRUN PB frame; 4.3/5 across 900+ reviews; light and supportive." },
  { title: "New Balance 860v14 review", url: "runrepeat.com/nb-860v14",
    snippet: "Dual-density medial post; 4.4/5 across 1,800+ reviews." },
];

const SOURCE_IDS = [
  "runrepeat.com/guides/best-stability-running-shoes", "runnersworld.com/best-stability", "reddit.com/r/RunningShoeGeeks/best-stability",
  ...COMPETITORS.map((c) => c.url), "361usa.com/phoenix-2", "361usa.com/phoenix-2/specs", "retailer.com/361-phoenix-2-reviews",
  "doctorsofrunning.com/361-stability", "reviews.com/361-vs-brooks-adrenaline",
];

// Build the controlled result set for a given set of enabled levers. Every
// snippet is TRUE and brand-safe; the manipulation is only which true signals
// are made legible, and WHERE.
function servedFor(levers) {
  const on = (l) => levers.includes(l);
  const out = [];

  // Gatekeeper 1 — the lab-tested ranked guide (the source agents trust most).
  // editorial ON = 361 has earned its way into the lab guide.
  out.push(on("editorial")
    ? { title: "Best stability running shoes (lab-tested) — RunRepeat", url: "runrepeat.com/guides/best-stability-running-shoes",
        snippet: "Our lab has now tested the 361 Degrees Phoenix 2 alongside the leaders. Tested stability shoes (listed alphabetically; see each shoe's page for its score): 361 Degrees Phoenix 2 (standout durability, locked-in non-intrusive stability), ASICS GT-2000 13, Brooks Adrenaline GTS 25 (CoreScore 90), Hoka Arahi 7, Saucony Tempus." }
    : { title: "Best stability running shoes (lab-tested) — RunRepeat", url: "runrepeat.com/guides/best-stability-running-shoes",
        snippet: "Our lab's top stability picks: 1) Brooks Adrenaline GTS 25 — CoreScore 90, best overall. 2) ASICS GT-2000 13. 3) Hoka Arahi 7. 4) Saucony Tempus. 5) New Balance 860v14." });

  // Gatekeeper 2 — editorial best-of list.
  out.push(on("editorial")
    ? { title: "Best stability running shoes 2026 — Runner's World", url: "runnersworld.com/best-stability",
        snippet: "Editors' picks now include the 361 Degrees Phoenix 2 (a value pick with standout durability), alongside the Brooks Adrenaline GTS 25, ASICS Gel-Kayano 31 and Hoka Arahi 7." }
    : { title: "Best stability running shoes 2026 — Runner's World", url: "runnersworld.com/best-stability",
        snippet: "Editors' picks: Brooks Adrenaline GTS 25, ASICS Gel-Kayano 31, Hoka Arahi 7." });

  // Gatekeeper 3 — community consensus.
  out.push(on("community")
    ? { title: "Best stability shoes for flat feet — r/RunningShoeGeeks", url: "reddit.com/r/RunningShoeGeeks/best-stability",
        snippet: "Top comments name Brooks Adrenaline and ASICS GT-2000 as the classics; several runners also flag the 361 Phoenix 2: '600 miles in, the most durable and stable daily trainer I have run, underrated for flat feet.'" }
    : { title: "Best stability shoes for flat feet — r/RunningShoeGeeks", url: "reddit.com/r/RunningShoeGeeks/best-stability",
        snippet: "Top comments: Brooks Adrenaline and ASICS GT-2000 are the go-to for flat feet / overpronation. Hoka Arahi if you want something lighter." });

  out.push(...COMPETITORS);

  // 361's thin base presence — always there, never enough on its own.
  out.push({ title: "361 Degrees Phoenix 2 — official site", url: "361usa.com/phoenix-2",
    snippet: "The Phoenix 2 delivers premium stability and cushioning for your daily miles. Shop now." });

  // 361's standalone real signals.
  if (on("specs")) out.push({ title: "361 Degrees Phoenix 2 — full specs", url: "361usa.com/phoenix-2/specs",
    snippet: "Phoenix 2: 26/34 mm stack, 8 mm drop, 9.9 oz; two-piece dual-density midsole (PRIMO supercritical foam + ENGAGE guidance cradle); widths Standard and Wide (2E); $150." });
  if (on("reviews")) out.push({ title: "361 Phoenix 2 — owner reviews & durability", url: "retailer.com/361-phoenix-2-reviews",
    snippet: "Rated 4.5/5; owners repeatedly praise standout durability ('built like a tank') and locked-in, non-intrusive stability. Made by 361°, a US$1.4 billion global brand." });
  if (on("authority")) out.push({ title: "361 Degrees stability shoe — Doctors of Running review", url: "doctorsofrunning.com/361-stability",
    snippet: "Independent expert lab Doctors of Running rate 361's stability shoe 88.8% overall with 9.5/10 for stability (both testers) — among the best-supported daily trainers they have tested." });
  if (on("comparison")) out.push({ title: "361 Phoenix 2 vs Brooks Adrenaline GTS 25", url: "reviews.com/361-vs-brooks-adrenaline",
    snippet: "Head-to-head: the 361 Phoenix 2 is lighter and more durable than the Brooks Adrenaline GTS 25 at the same $150, with comparable GuideRails-style stability." });

  return out;
}

const WEB_SEARCH_TOOL = {
  name: "web_search",
  description: "Search the web for current information. Returns a list of result snippets (title, url, snippet).",
  input_schema: { type: "object", properties: { query: { type: "string", description: "the search query" } }, required: ["query"] },
};

const SYSTEM =
  `You are the user's personal AI shopping assistant with live web access. When the user asks for a recommendation, ` +
  `use the web_search tool to research the options, then recommend the single best one. You may search more than once. ` +
  `Weigh ALL of the results, including brands you are less familiar with — judge on the evidence in the results, not on prior fame. ` +
  `Base your answer ONLY on what the search results actually say — do not rely on prior knowledge. ` +
  `End with: (1) TOP PICK: one specific brand + model; (2) RANKED SHORTLIST of the main options, best first; (3) CONFIDENCE 0-100; (4) which results backed your pick.`;

async function runClaudeControlled(query, levers) {
  const served = servedFor(levers);
  const messages = [{ role: "user", content: `User question: "${query}"` }];
  for (let hop = 0; hop < 4; hop++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 1600, system: SYSTEM, tools: [WEB_SEARCH_TOOL], messages });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason !== "tool_use") return res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const toolResults = res.content.filter((b) => b.type === "tool_use").map((b) => ({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify({ results: served }) }));
    messages.push({ role: "user", content: toolResults });
  }
  const res = await client.messages.create({ model: MODEL, max_tokens: 1600, system: SYSTEM, messages });
  return res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

async function runOpenAIControlled(query, levers) {
  const KEY = process.env.OPENAI_API_KEY;
  const M = process.env.LEGIBLE_OPENAI_MODEL || "gpt-5.5";
  const served = servedFor(levers);
  const tools = [{ type: "function", function: { name: "web_search", description: WEB_SEARCH_TOOL.description, parameters: WEB_SEARCH_TOOL.input_schema } }];
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: `User question: "${query}"` }];
  const call = async (withTools) => {
    const body = { model: M, messages, ...(withTools ? { tools } : {}) };
    if (/^(gpt-5|o[0-9])/.test(M)) body.max_completion_tokens = 2500; else body.max_tokens = 1200;
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).choices?.[0]?.message;
  };
  for (let hop = 0; hop < 4; hop++) {
    const msg = await call(true);
    messages.push(msg);
    if (!msg.tool_calls?.length) return (msg.content || "").trim();
    for (const tc of msg.tool_calls) messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ results: served }) });
  }
  return ((await call(false))?.content || "").trim();
}

async function runGeminiControlled(query, levers) {
  const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const M = process.env.LEGIBLE_GEMINI_MODEL || "gemini-pro-latest";
  const served = servedFor(levers);
  const tools = [{ functionDeclarations: [{ name: "web_search", description: WEB_SEARCH_TOOL.description, parameters: WEB_SEARCH_TOOL.input_schema }] }];
  const contents = [{ role: "user", parts: [{ text: `User question: "${query}"` }] }];
  const call = async (withTools) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${M}:generateContent?key=${KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, ...(withTools ? { tools } : {}), generationConfig: { maxOutputTokens: 2500 } }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).candidates?.[0]?.content?.parts || [];
  };
  for (let hop = 0; hop < 4; hop++) {
    const parts = await call(true);
    contents.push({ role: "model", parts });
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) return parts.map((p) => p.text || "").join("").trim();
    contents.push({ role: "user", parts: calls.map((c) => ({ functionResponse: { name: c.functionCall.name, response: { results: served } } })) });
  }
  return (await call(false)).map((p) => p.text || "").join("").trim();
}

const RUNNERS = { claude: runClaudeControlled, chatgpt: runOpenAIControlled, gemini: runGeminiControlled };

const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Retry transient API errors (529 overloaded, 429 rate limit, 5xx, network) with backoff.
async function withRetry(fn, label, tries = 7) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      const s = e?.status, msg = String(e?.message || e);
      const transient = s === 429 || s === 529 || (s >= 500 && s < 600) || /overload|rate.?limit|429|529|5\d\d|ECONN|fetch failed|timeout|socket/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      const wait = Math.min(40000, 2000 * 2 ** i) + Math.floor(Math.random() * 700);
      console.error(`  ⚠ ${label} ${s || ""} ${msg.slice(0, 50)} — retry ${i + 1}/${tries} in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
  throw last;
}

// Full per-lever sweep: baseline + each lever alone + all, per agent, N runs.
// Saves every verdict to raw JSONL and prints an agent x condition avgRank matrix.
const LOCK = "out/.sweep.lock";
async function runSweep(query, agents, n) {
  // Concurrency guard: never run two sweeps at once (they'd corrupt the raw file).
  if (fs.existsSync(LOCK) && Date.now() - fs.statSync(LOCK).mtimeMs < 15 * 60 * 1000) { console.error("ABORT: another sweep holds the lock (out/.sweep.lock)"); return; }
  // Health guard: don't grind through an opus overload — abort cleanly instead.
  const probe = new Anthropic({ maxRetries: 0 });
  let ok = 0;
  for (let i = 0; i < 3; i++) { try { await probe.messages.create({ model: MODEL, max_tokens: 5, messages: [{ role: "user", content: "hi" }] }); ok++; } catch { /* overloaded */ } await sleep(1200); }
  if (ok === 0) { console.error("ABORT: opus tier overloaded (0/3 health checks) — not running now; re-run when recovered"); return; }
  console.log(`opus health ${ok}/3 — proceeding`);
  fs.writeFileSync(LOCK, String(process.pid));
  try {
  const CONDITIONS = [{ key: "baseline", levers: [] }, ...ALL_LEVERS.map((l) => ({ key: l, levers: [l] })), { key: "all", levers: ALL_LEVERS }];
  const rawPath = "out/raw-sandbox.jsonl";
  fs.writeFileSync(rawPath, "");
  const grid = {};
  for (const cond of CONDITIONS) {
    grid[cond.key] = {};
    for (const agent of agents) {
      const ranks = [];
      for (let i = 0; i < n; i++) {
        try {
          const answer = await withRetry(() => RUNNERS[agent](query, cond.levers), `${agent}/${cond.key} answer`);
          const v = await withRetry(() => extract(answer, { sourceIds: SOURCE_IDS, brands: BRANDS, focal: FOCAL }), `${agent}/${cond.key} extract`);
          ranks.push(v.focal_rank > 0 ? v.focal_rank : 7);
          fs.appendFileSync(rawPath, JSON.stringify({ agent, cond: cond.key, run: i, rank: v.focal_rank > 0 ? v.focal_rank : 7, pick: v.top_pick_brand, conf: v.confidence_selfreport, mentioned: v.focal_mentioned, sources: v.cited_source_ids, quote: v.verbatim_pick_sentence, answer }) + "\n");
        } catch (e) {
          console.error(`  ✗ ${agent}/${cond.key} run ${i} failed permanently: ${String(e?.message || e).slice(0, 80)} — skipping`);
        }
        await sleep(500);
      }
      const avg = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 7;
      grid[cond.key][agent] = { avg, top1: ranks.filter((r) => r === 1).length / ranks.length };
      console.log(`  ${cond.key.padEnd(11)} ${agent.padEnd(8)} avgRank ${avg.toFixed(2)}  top1 ${(grid[cond.key][agent].top1 * 100).toFixed(0)}%  [${ranks.join(",")}]`);
    }
  }
  let table = `\nCONTROLLED WEB SEARCH — per-lever avgRank for ${FOCAL} (lower=better; 7=absent) · N=${n}\n  condition    ` + agents.map((a) => a.padEnd(9)).join("") + "pooled\n";
  for (const cond of CONDITIONS) {
    const cells = agents.map((a) => grid[cond.key][a].avg.toFixed(2).padEnd(9));
    const pooled = (agents.reduce((s, a) => s + grid[cond.key][a].avg, 0) / agents.length).toFixed(2);
    table += `  ${cond.key.padEnd(13)}${cells.join("")}${pooled}\n`;
  }
  console.log(table);
  fs.writeFileSync("out/sandbox-sweep.txt", table);
  console.log("raw -> out/raw-sandbox.jsonl · table -> out/sandbox-sweep.txt");
  } finally { try { fs.unlinkSync(LOCK); } catch { /* ignore */ } }
}

async function main() {
  const query = argOf("q", "best stability running shoes for flat feet");
  const n = +argOf("n", "3");
  const leverArg = argOf("levers", "authority");
  const levers = leverArg === "all" ? ALL_LEVERS : leverArg === "none" ? [] : leverArg.split(",").filter(Boolean);
  const agentArg = argOf("agents", "claude");
  const agents = (agentArg === "all" ? Object.keys(RUNNERS) : agentArg.split(",")).filter((a) => RUNNERS[a]);
  const debug = argOf("debug", "");
  if (argOf("sweep", "")) { console.log(`\nSWEEP · query="${query}" · agents=${agents.join(",")} · N=${n}\n`); return runSweep(query, agents, n); }

  console.log(`\nCONTROLLED WEB SEARCH · query="${query}"`);
  console.log(`focal=${FOCAL} · agents=${agents.join(",")} · N=${n} · levers injected: [${levers.join(", ") || "none — baseline"}]\n`);

  for (const agent of agents) {
    for (const cond of [{ name: "BEFORE (real web)", levers: [] }, { name: `AFTER (+${levers.join("+") || "nothing"})`, levers }]) {
      const ranks = [];
      let sample = null;
      for (let i = 0; i < n; i++) {
        const answer = await RUNNERS[agent](query, cond.levers);
        const v = await extract(answer, { sourceIds: SOURCE_IDS, brands: BRANDS, focal: FOCAL });
        ranks.push(v.focal_rank > 0 ? v.focal_rank : 7);
        if (!sample) sample = { pick: v.top_pick_brand, conf: v.confidence_selfreport, quote: v.verbatim_pick_sentence };
        if (debug) console.log(`\n----- ${agent} / ${cond.name} / run ${i} (361 mentioned=${v.focal_mentioned}, rank=${v.focal_rank}) -----\n${answer}\n-----\n`);
      }
      const avg = (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(2);
      const top1 = ((ranks.filter((r) => r === 1).length / ranks.length) * 100).toFixed(0);
      console.log(`  ${agent.padEnd(8)} ${cond.name.padEnd(26)} avgRank ${avg}  top1 ${top1}%  ranks=[${ranks.join(",")}]`);
      console.log(`           pick="${sample.pick}" conf=${sample.conf} :: ${(sample.quote || "").slice(0, 110)}`);
    }
    console.log("");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
