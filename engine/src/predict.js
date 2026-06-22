// THE PREDICTION LOOP — the centerpiece.
// Measure baseline → pre-register a prediction → inject ONE real-data move
// (a spec comparison table) → re-run the real agent → compare predicted vs actual.
//
//   node src/predict.js                                   (baseline overpronation)
//   node src/predict.js --base=cov-flatfeet-framing \
//        --query="Best running shoes for flat feet under $150" --n=9   (the rescue)
import "./lib/env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus, loadConditions } from "./lib/load.js";
import { buildEnvironment } from "./lib/environment.js";
import { buildPrompt } from "./lib/prompt.js";
import { extract } from "./lib/extractor.js";
import { aggregate } from "./lib/metrics.js";
import { loadSpecs, buildComparisonTable } from "./lib/table.js";
import { AGENTS } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};
const BASE = argOf("base", "auth-owned-editorial-community");
const N = parseInt(argOf("n", "6"), 10);
const CONC = parseInt(argOf("conc", "5"), 10);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\n  Missing ANTHROPIC_API_KEY.\n");
  process.exit(1);
}

const corpus = loadCorpus();
const conditions = loadConditions();
const specs = loadSpecs();
const QUERY = argOf("query", conditions.queries[0]);
const agent = AGENTS.claude;

const findLevel = (id) => {
  for (const d of conditions.dimensions) for (const l of d.levels) if (l.id === id) return l;
  return null;
};
const baseLevel = findLevel(BASE);
if (!baseLevel) {
  console.error(`unknown --base="${BASE}". options: ${conditions.dimensions.flatMap((d) => d.levels.map((l) => l.id)).join(", ")}`);
  process.exit(1);
}

const pct = (x) => (x == null ? " —" : (x * 100).toFixed(0) + "%");
const banner = (t) => console.log("\n" + "─".repeat(72) + "\n " + t + "\n" + "─".repeat(72));

async function runPool(items, worker, conc) {
  const out = new Array(items.length);
  let i = 0, done = 0;
  const next = async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await worker(); } catch (e) { out[idx] = { __error: String((e && e.message) || e) }; }
      done++; process.stdout.write(`\r    ${done}/${items.length}   `);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, next));
  process.stdout.write("\n");
  return out;
}

async function runArm(env, sourceIds, n) {
  const { system, user } = buildPrompt(QUERY, env);
  const raws = await runPool(
    Array.from({ length: n }),
    async () => {
      const answer = await agent.run({ system, user });
      const verdict = await extract(answer, { sourceIds });
      return { answer, verdict };
    },
    CONC
  );
  const ok = raws.filter((r) => r && !r.__error);
  return { agg: aggregate(ok.map((r) => r.verdict)), raws: ok };
}

banner(`PREDICTION LOOP · base=${BASE} · N=${N} · agent=${agent.model}`);
console.log(`  query (held constant): "${QUERY}"`);

// STEP 1 — baseline (prose, full real footprint)
console.log("\n  STEP 1 — measure baseline (prose)…");
const baseEnv = buildEnvironment(baseLevel, corpus);
const base = await runArm(baseEnv, baseLevel.source_ids, N);
console.log(`    Brooks: top-1 ${pct(base.agg.brooksTop1)} · ASoV ${pct(base.agg.brooksASoV)} · modal-top ${base.agg.modalTop}`);

// STEP 2-3 — PRE-REGISTER the prediction (direction UP), before the move
const predLow = Math.min(0.95, base.agg.brooksASoV + 0.05);
const predHigh = Math.min(0.98, base.agg.brooksASoV + 0.25);
banner("STEP 2-3 — PRE-REGISTERED PREDICTION (declared before the move)");
console.log(`  Prediction: injecting ONE real spec comparison table raises Brooks' ASoV`);
console.log(`  from ${pct(base.agg.brooksASoV)} → ~${pct(predLow)}–${pct(predHigh)} (direction: UP),`);
console.log(`  because the grid foregrounds Brooks' real wins: in-budget $140 vs Saucony Tempus $159.95`);
console.log(`  (over the $150 cap), widest fit, and the most true-to-size votes (1,951 vs ASICS' 118).`);

// STEP 4-5 — inject the real-data move + re-run
console.log("\n  STEP 4-5 — inject the real comparison table + re-run…");
const moveEnv = baseEnv + "\n\n" + buildComparisonTable(specs, corpus);
const moveSourceIds = [...new Set([...baseLevel.source_ids, ...specs.shoes.map((s) => s.sourceId)])];
const move = await runArm(moveEnv, moveSourceIds, N);
console.log(`    Brooks: top-1 ${pct(move.agg.brooksTop1)} · ASoV ${pct(move.agg.brooksASoV)} · modal-top ${move.agg.modalTop}`);

// STEP 6 — predicted vs actual
const dAsov = move.agg.brooksASoV - base.agg.brooksASoV;
const dTop1 = move.agg.brooksTop1 - base.agg.brooksTop1;
const dirMatch = dAsov > 0.005;
const inBand = move.agg.brooksASoV >= predLow - 0.02;
const sauB = base.agg.asov["Saucony"], sauM = move.agg.asov["Saucony"];
banner("STEP 6 — PREDICTED vs ACTUAL");
console.log(`  Brooks ASoV : ${pct(base.agg.brooksASoV)}  →  ${pct(move.agg.brooksASoV)}   (Δ ${dAsov * 100 >= 0 ? "+" : ""}${(dAsov * 100).toFixed(0)} pts)`);
console.log(`  Brooks top-1: ${pct(base.agg.brooksTop1)}  →  ${pct(move.agg.brooksTop1)}   (Δ ${dTop1 * 100 >= 0 ? "+" : ""}${(dTop1 * 100).toFixed(0)} pts)`);
console.log(`  Predicted   : UP, ~${pct(predLow)}–${pct(predHigh)}`);
console.log(`\n  Direction predicted (UP): ${dirMatch ? "🟢 MATCHED" : "⚪ missed"}    landed near band: ${inBand ? "🟢 yes" : "≈"}`);
console.log(`  Side-effect: Saucony (over-budget) ASoV ${pct(sauB)} → ${pct(sauM)} ${sauM - sauB < -0.005 ? "(down ✓ as expected)" : ""}`);

const out = {
  base: BASE, query: QUERY, n: N, agent: agent.model, generatedAt: new Date().toISOString(),
  prediction: { direction: "up", bandLow: predLow, bandHigh: predHigh },
  baseline: base.agg, move: move.agg,
  deltaBrooksASoV: dAsov, deltaBrooksTop1: dTop1, directionMatched: dirMatch, inBand
};
const OUT = path.join(__dirname, "..", "out");
fs.mkdirSync(OUT, { recursive: true });
const slug = BASE.replace(/[^a-z0-9]+/gi, "-");
fs.writeFileSync(path.join(OUT, `predict-${slug}.json`), JSON.stringify(out, null, 2));
console.log(`\n  → out/predict-${slug}.json\n`);
