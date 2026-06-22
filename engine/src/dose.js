// THE TIPPING POINT, per engine — start from a Brooks-favorable environment
// (the incumbent wins 100% in every engine), then add ONE real dissenting
// independent voice at a time and watch how fast EACH agent abandons the
// incumbent. Query held constant; only the count of real dissent grows.
// The per-engine divergence = the "flip cost": winning the agent is N games.
//
//   node src/dose.js --n=6 --agents=claude,chatgpt,gemini
import "./lib/env.js"; // FIRST — loads .env before any client / agent registry reads env
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus } from "./lib/load.js";
import { buildEnvironment } from "./lib/environment.js";
import { buildPrompt } from "./lib/prompt.js";
import { extract } from "./lib/extractor.js";
import { aggregate } from "./lib/metrics.js";
import { selectAgents } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const N = parseInt(argOf("n", "6"), 10);
const CONC = parseInt(argOf("conc", "5"), 10);
const agents = selectAgents(argOf("agents", "all"));

const corpus = loadCorpus();
const QUERY = "Best stability running shoes for overpronation under $150"; // Brooks-favorable framing

// Brooks-favorable base (incumbent wins here), then real dissenting independent
// voices added one at a time. Every id is a real corpus item (no-fabrication guard).
const BASE = ["brooks-overpronation-solutions", "brooks-adrenaline-gts-25-pdp", "runrepeat-overpronation-guide"];
const DISSENT = [
  "believeintherun-gts25",                // editorial: prefers ASICS Kayano / Saucony Guide
  "running-saucony-nb-or-brooks",         // community: tight three-way, not Brooks-dominant
  "running-flat-feet-prefers-newbalance"  // community: picks New Balance
];
const levels = [
  { id: "dose-0", label: "0 dissent (Brooks-favorable)", source_ids: BASE },
  ...DISSENT.map((_, i) => ({
    id: `dose-${i + 1}`,
    label: `+${i + 1} dissenting voice${i ? "s" : ""}`,
    source_ids: [...BASE, ...DISSENT.slice(0, i + 1)]
  }))
];

const pct = (x) => (x == null ? "  —" : (x * 100).toFixed(0).padStart(3) + "%");
async function runPool(n, worker, conc) {
  const out = new Array(n); let i = 0;
  const next = async () => { while (i < n) { const idx = i++; try { out[idx] = await worker(); } catch (e) { out[idx] = { __error: String(e?.message || e) }; } } };
  await Promise.all(Array.from({ length: Math.min(conc, n) }, next));
  return out;
}

console.log("─".repeat(72) + `\n THE TIPPING POINT, per engine · N=${N} · agents=[${agents.map((a) => a.id).join(", ")}]\n` + "─".repeat(72));
console.log(`  query (held constant): "${QUERY}"`);
console.log(`  incumbent: Brooks — start favorable, add real dissent one voice at a time\n`);

// curves[agentId] = [ {label, brooksTop1, brooksASoV, modalTop, n}, ... ] over dose levels
const curves = {};
for (const agent of agents) {
  curves[agent.id] = [];
  for (const lvl of levels) {
    const env = buildEnvironment(lvl, corpus);
    const { system, user } = buildPrompt(QUERY, env);
    const raws = await runPool(N, async () => ({ verdict: await extract(await agent.run({ system, user }), { sourceIds: lvl.source_ids }) }), CONC);
    const ok = raws.filter((r) => r && !r.__error);
    const agg = aggregate(ok.map((r) => r.verdict));
    curves[agent.id].push({ id: lvl.id, label: lvl.label, n: ok.length, brooksTop1: agg.brooksTop1, brooksASoV: agg.brooksASoV, modalTop: agg.modalTop });
    process.stdout.write(`\r  ${agent.id} · ${lvl.label.padEnd(30)} `);
  }
}
process.stdout.write("\n");

// ── per-engine tipping table ─────────────────────────────────────────────────
console.log("\n" + "─".repeat(72) + "\n RESULT — how fast each engine abandons the incumbent (Brooks #1 rate)\n" + "─".repeat(72));
console.log("  dissent".padEnd(34) + agents.map((a) => a.id.padStart(9)).join(""));
levels.forEach((lvl, li) => {
  console.log("  " + lvl.label.padEnd(32) + agents.map((a) => pct(curves[a.id][li].brooksTop1).padStart(9)).join(""));
});

// tipping point = first dose where Brooks #1 drops below 50%
const tip = (curve) => { const i = curve.findIndex((c) => (c.brooksTop1 ?? 1) < 0.5); return i < 0 ? `never (within +${DISSENT.length})` : curve[i].label; };
console.log("\n  tipping point (Brooks #1 < 50%):");
for (const a of agents) console.log("    " + a.id.padEnd(10) + tip(curves[a.id]));
console.log("\n  → the dose where each engine flips IS its flip cost. They differ → winning the agent is N different games.\n");

fs.writeFileSync(
  path.join(__dirname, "..", "out", "dose.json"),
  JSON.stringify({ query: QUERY, n: N, generatedAt: new Date().toISOString(), agents: agents.map((a) => ({ id: a.id, model: a.model })), levels: levels.map((l) => l.label), curves }, null, 2)
);
console.log("  → out/dose.json\n");
