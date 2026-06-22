// Legible — experiment runner.
// Vary the environment, hold the query constant (coverage is the deliberate
// exception: it varies one query word), run real agents N times per condition,
// extract a structured verdict, and compute ASoV + the flip.
//
//   node src/run.js --dim=coverage --n=6           (default)
//   node src/run.js --dim=source-authority --n=9
//   node src/run.js --dim=all --n=9 --agents=claude,chatgpt,gemini,perplexity
import "./lib/env.js"; // FIRST — loads .env before any client / agent registry reads env
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus, loadConditions, validate } from "./lib/load.js";
import { buildEnvironment } from "./lib/environment.js";
import { buildPrompt } from "./lib/prompt.js";
import { extract } from "./lib/extractor.js";
import { aggregate, BRANDS } from "./lib/metrics.js";
import { AGENTS, selectAgents } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=")[1] : d;
};
const DIM = argOf("dim", "coverage");
const N = parseInt(argOf("n", "6"), 10);
const CONC = parseInt(argOf("conc", "5"), 10);
const agents = selectAgents(argOf("agents", "all"));

// Coverage deliberately varies the one use-case word; every other dimension
// holds the query constant at the primary buyer query.
const COVERAGE_QUERY = {
  "cov-overpronation-framing": "Best stability running shoes for overpronation under $150",
  "cov-flatfeet-framing": "Best running shoes for flat feet under $150",
  "cov-broad-stability-framing": "Best stability running shoes under $150"
};
const queryForLevel = (dimName, level, conditions) =>
  dimName === "coverage" ? COVERAGE_QUERY[level.id] || conditions.queries[0] : conditions.queries[0];

function banner(t) {
  console.log("\n" + "─".repeat(72) + "\n " + t + "\n" + "─".repeat(72));
}

async function runPool(items, worker, conc) {
  const out = new Array(items.length);
  let i = 0, done = 0;
  const next = async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await worker(items[idx], idx);
      } catch (e) {
        out[idx] = { __error: String((e && e.message) || e), item: items[idx] };
      }
      done++;
      process.stdout.write(`\r  running… ${done}/${items.length}   `);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, next));
  process.stdout.write("\n");
  return out;
}

// ── setup ───────────────────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\n  Missing ANTHROPIC_API_KEY (engine/.env). Aborting.\n");
  process.exit(1);
}
const corpus = loadCorpus();
const conditions = loadConditions();
const errs = validate(corpus, conditions);
if (errs.length) {
  console.error("\n  Corpus/condition validation FAILED (no-fabrication guard):");
  for (const e of errs) console.error("   - " + e);
  process.exit(1);
}

const dims = DIM === "all" ? conditions.dimensions : conditions.dimensions.filter((d) => d.dimension === DIM);
if (!dims.length) {
  console.error(`\n  Unknown --dim="${DIM}". Options: ${conditions.dimensions.map((d) => d.dimension).join(", ")}, all\n`);
  process.exit(1);
}

banner(`LEGIBLE · dim=${DIM} · N=${N} · agents=[${agents.map((a) => a.id).join(", ")}]`);
console.log(`  focal: ${conditions.focal}  vs  ${conditions.competitors.join(", ")}`);
console.log(`  agent model: ${AGENTS.claude.model}   (extractor: ${process.env.LEGIBLE_EXTRACTOR_MODEL || "claude-sonnet-4-6"})`);

// ── build the task list ──────────────────────────────────────────────────────
const tasks = [];
for (const dim of dims)
  for (const level of dim.levels)
    for (const agent of agents)
      for (let rep = 0; rep < N; rep++)
        tasks.push({ dim: dim.dimension, level, agent, rep });

console.log(`  total cells: ${dims.flatMap((d) => d.levels).length} levels × ${agents.length} agents × ${N} reps = ${tasks.length} runs (×2 calls each)\n`);

const raws = await runPool(
  tasks,
  async (t) => {
    const env = buildEnvironment(t.level, corpus);
    const query = queryForLevel(t.dim, t.level, conditions);
    const { system, user } = buildPrompt(query, env);
    const answer = await t.agent.run({ system, user });
    const verdict = await extract(answer, { sourceIds: t.level.source_ids });
    return { dim: t.dim, levelId: t.level.id, levelLabel: t.level.label, agent: t.agent.id, rep: t.rep, query, answer, verdict };
  },
  CONC
);

const ok = raws.filter((r) => r && !r.__error);
const failed = raws.length - ok.length;
if (failed) {
  console.log(`  ⚠ ${failed} runs errored (continuing with ${ok.length}).`);
  const firstErr = raws.find((r) => r && r.__error);
  if (firstErr) console.log(`    first error: ${firstErr.__error}`);
}

// ── aggregate ────────────────────────────────────────────────────────────────
const byLevel = {};
for (const r of ok) (byLevel[r.levelId] ||= { label: r.levelLabel, query: r.query, dim: r.dim, verdicts: [], byAgent: {} })
  , byLevel[r.levelId].verdicts.push(r.verdict)
  , (byLevel[r.levelId].byAgent[r.agent] ||= []).push(r.verdict);

const levelsOut = [];
for (const dim of dims)
  for (const level of dim.levels) {
    const L = byLevel[level.id];
    if (!L) continue;
    const pooled = aggregate(L.verdicts);
    const perAgent = Object.fromEntries(Object.entries(L.byAgent).map(([a, vs]) => [a, aggregate(vs)]));
    levelsOut.push({ id: level.id, label: level.label, dim: L.dim, query: L.query, pooled, perAgent });
  }

// ── report ───────────────────────────────────────────────────────────────────
banner(`RESULT — ${DIM}`);
const pct = (x) => (x == null ? "  — " : (x * 100).toFixed(0).padStart(3) + "%");
console.log("  level".padEnd(36) + "Brooks#1   ASoV   mention  consist  modal-top");
for (const l of levelsOut) {
  const p = l.pooled;
  console.log(
    "  " + l.label.slice(0, 33).padEnd(34) +
    pct(p.brooksTop1) + "    " + pct(p.brooksASoV) + "   " + pct(p.brooksMentionRate) +
    "    " + pct(p.consistency) + "   " + p.modalTop
  );
}

if (DIM === "coverage" && levelsOut.length >= 2) {
  const a = levelsOut[0].pooled, b = levelsOut[levelsOut.length - 1].pooled;
  const drop = (a.brooksTop1 - b.brooksTop1) * 100;
  banner("THE COVERAGE FLIP");
  console.log(`  Same publishers, one word changed in the query:`);
  const ci = (c) => (c && c[0] != null ? ` [95% CI ${pct(c[0])}–${pct(c[1])}]` : "");
  console.log(`    "${levelsOut[0].label}" → Brooks #1 ${pct(a.brooksTop1)}${ci(a.brooksTop1CI)} · ASoV ${pct(a.brooksASoV)}`);
  console.log(`    "${levelsOut[levelsOut.length - 1].label}" → Brooks #1 ${pct(b.brooksTop1)}${ci(b.brooksTop1CI)} · ASoV ${pct(b.brooksASoV)}`);
  console.log(`\n  ${drop > 0 ? "🟢" : "⚪"} Brooks' top-1 ${drop > 0 ? "collapses" : "moves"} ${Math.abs(drop).toFixed(0)} points on wording alone.\n`);
}

// ── persist ──────────────────────────────────────────────────────────────────
const OUT = path.join(__dirname, "..", "out");
fs.mkdirSync(OUT, { recursive: true });
const results = {
  scenario: conditions.focal + "-flat-feet",
  focalBrand: conditions.focal,
  competitors: conditions.competitors,
  dimension: DIM,
  n: N,
  agentModel: AGENTS.claude.model,
  generatedAt: new Date().toISOString(),
  levels: levelsOut
};
const SLUG = DIM.replace(/[^a-z0-9]+/gi, "-");
fs.writeFileSync(path.join(OUT, `results-${SLUG}.json`), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, `raw-${SLUG}.jsonl`), ok.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`  → out/results-${SLUG}.json  +  out/raw-${SLUG}.jsonl  (${ok.length} responses, full audit trail)\n`);
