// THE FLIP — the acting moment. Inject ONE real asset (a head-to-head spec table,
// every cell a verbatim real number) into the baseline footprint, hold the query
// constant, and measure the recommendation shift PER ENGINE. The point: the same
// move has a different effect in each engine — winning the agent is N games.
//
//   node src/flip.js --n=6 --agents=claude,chatgpt,gemini
import "./lib/env.js"; // FIRST
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus } from "./lib/load.js";
import { buildEnvironment } from "./lib/environment.js";
import { buildPrompt } from "./lib/prompt.js";
import { extract } from "./lib/extractor.js";
import { canon } from "./lib/metrics.js";
import { selectAgents } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const N = parseInt(argOf("n", "6"), 10);
const CONC = parseInt(argOf("conc", "5"), 10);
const agents = selectAgents(argOf("agents", "all"));
const corpus = loadCorpus();
const QUERY = "Best stability running shoes for overpronation under $150";

// Baseline = the full real footprint (owned + editorial + community).
const BASELINE = [
  "brooks-adrenaline-gts-25-pdp", "brooks-adrenaline-gts-series", "brooks-overpronation-solutions",
  "brooks-adrenaline-gts-evolution", "runrepeat-overpronation-guide", "believeintherun-gts25",
  "marathonhandbook-adrenaline-vs-kayano", "askrsg-new-runner-flat-pronated",
  "askrsg-overpronation-flatfeet-midfoot", "rsg-shoes-for-flat-feet-overpronation",
  "running-flat-feet-prefers-newbalance", "running-saucony-nb-or-brooks"
];
// The move = a head-to-head spec table (6 real structured-spec sources). Pure
// restructuring of real numbers — no review, no endorsement, no fabricated claim.
const TABLE = ["brooks-adrenaline-gts-23", "brooks-ghost-16", "hoka-arahi-7", "asics-gt-2000-13", "saucony-tempus-1", "nb-860v14"];

const CONDS = [
  { id: "baseline", label: "Baseline (full real footprint)", source_ids: BASELINE },
  { id: "move", label: "+ head-to-head spec table (real specs only)", source_ids: [...BASELINE, ...TABLE] }
];
const BRANDS = ["Brooks", "Hoka", "ASICS", "Saucony", "New Balance"];

async function runPool(n, worker, conc) {
  const out = new Array(n); let i = 0;
  const next = async () => { while (i < n) { const idx = i++; try { out[idx] = await worker(); } catch (e) { out[idx] = { __error: String(e?.message || e) }; } } };
  await Promise.all(Array.from({ length: Math.min(conc, n) }, next));
  return out;
}

function summarize(verdicts) {
  const v = verdicts.filter(Boolean);
  const n = v.length || 1;
  const top1 = {}, second = {}, mention = {};
  for (const b of BRANDS) { top1[b] = 0; second[b] = 0; mention[b] = 0; }
  for (const x of v) {
    const ranked = (x.ranked_brands || []).map(canon);
    const t = canon(x.top_pick_brand) || ranked[0];
    if (top1[t] != null) top1[t]++;
    const s = ranked[1]; if (second[s] != null) second[s]++;
    for (const b of BRANDS) if (ranked.includes(b)) mention[b]++;
  }
  const norm = (o) => Object.fromEntries(Object.entries(o).map(([k, val]) => [k, val / n]));
  return { n: v.length, top1: norm(top1), second: norm(second), mention: norm(mention) };
}

console.log("─".repeat(72) + `\n THE FLIP — one real asset, measured per engine · N=${N} · [${agents.map((a) => a.id).join(", ")}]\n` + "─".repeat(72));
console.log(`  query (held constant): "${QUERY}"`);
console.log(`  move: inject a head-to-head spec table (6 real spec sources) into the baseline\n`);

const data = {}; // data[agentId][condId] = summary
for (const agent of agents) {
  data[agent.id] = {};
  for (const cond of CONDS) {
    const env = buildEnvironment(cond, corpus);
    const { system, user } = buildPrompt(QUERY, env);
    const raws = await runPool(N, async () => ({ verdict: await extract(await agent.run({ system, user }), { sourceIds: cond.source_ids }) }), CONC);
    data[agent.id][cond.id] = summarize(raws.map((r) => (r && !r.__error ? r.verdict : null)));
    process.stdout.write(`\r  ${agent.id} · ${cond.id}        `);
  }
}
process.stdout.write("\n");

const pct = (x) => (x == null ? "  —" : (x * 100).toFixed(0).padStart(3) + "%");
for (const agent of agents) {
  const b = data[agent.id].baseline, m = data[agent.id].move;
  console.log("\n" + "═".repeat(52) + "\n " + agent.id.toUpperCase());
  console.log("  Brooks #1:    " + pct(b.top1.Brooks) + " → " + pct(m.top1.Brooks));
  console.log("  the alternative slot (#2) — who the agent names as the runner-up:");
  for (const br of ["Saucony", "ASICS", "Hoka", "New Balance"]) {
    const d = m.second[br] - b.second[br];
    if (b.second[br] || m.second[br]) console.log("    " + br.padEnd(12) + pct(b.second[br]) + " → " + pct(m.second[br]) + (Math.abs(d) >= 0.001 ? "   " + (d > 0 ? "▲" : "▼") + pct(Math.abs(d)) : ""));
  }
}

fs.writeFileSync(
  path.join(__dirname, "..", "out", "flip.json"),
  JSON.stringify({ query: QUERY, n: N, generatedAt: new Date().toISOString(), agents: agents.map((a) => ({ id: a.id, model: a.model })), conditions: CONDS.map((c) => ({ id: c.id, label: c.label })), data }, null, 2)
);
console.log("\n  → out/flip.json\n");
