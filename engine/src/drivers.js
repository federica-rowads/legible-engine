// Legible — DRIVER MATRIX runner (the brief's core question: what drives an agent?).
//
// From a neutral, parity baseline (all candidates one bland line each), we add
// ONE real signal to the focal brand at a time and measure how much it moves the
// agent's recommendation. Ranking the signals by impact answers "what drives an
// agent's recommendation — and which drivers does a brand control?"
//
//   node src/drivers.js --n=6 --conc=3
import "./lib/env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "./lib/extractor.js";
import { selectAgents } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const SCEN = argOf("scenario", "drivers-shoes");
const N = parseInt(argOf("n", "6"), 10);
const CONC = parseInt(argOf("conc", "3"), 10);
const agents = selectAgents(argOf("agents", "all"));

const scen = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "scenarios", `${SCEN}.json`), "utf8"));
const BRANDS = scen.brands; const FOCAL = scen.focal;
const canon = (s) => { const t = (s || "").toLowerCase(); for (const b of BRANDS) if (b.aliases.some((a) => t.includes(a))) return b.name; return null; };

const anchorIdx = scen.baseEnv.findIndex((l) => l.includes(scen.focalAnchorSnippet));
const withLever = (add) => { const arr = [...scen.baseEnv]; arr.splice(anchorIdx + 1, 0, add); return arr.join("\n"); };
const conditions = [
  { id: "baseline", label: "Baseline (parity)", env: scen.baseEnv.join("\n"), controllable: null },
  ...scen.levers.map((L) => ({ id: L.id, label: L.label, env: withLever(L.add), controllable: L.controllable }))
];

const system =
  `You are the user's personal AI shopping assistant. Using ONLY the product information provided by the user, ` +
  `recommend the single best option for their stated need. End with: (1) TOP PICK: one specific brand + model; ` +
  `(2) RANKED SHORTLIST; (3) CONFIDENCE 0-100; (4) a one-sentence reason.`;
const buildUser = (env) => `User question: "${scen.query}"\n\nHere is the product information available to you:\n\n${env}\n\nRecommend the single best option for the user.`;

async function runPool(items, worker, conc) {
  const out = new Array(items.length); let i = 0, done = 0;
  const next = async () => { while (i < items.length) { const idx = i++; try { out[idx] = await worker(items[idx]); } catch (e) { out[idx] = { __error: String((e && e.message) || e) }; } done++; process.stdout.write(`\r  runs… ${done}/${items.length}   `); } };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, next)); process.stdout.write("\n"); return out;
}
function focalTop1(verdicts) { const n = verdicts.length; if (!n) return null; return verdicts.filter((v) => canon(v.top_pick_brand) === FOCAL).length / n; }
function banner(t) { console.log("\n" + "─".repeat(76) + "\n " + t + "\n" + "─".repeat(76)); }
const pct = (x) => (x == null ? " —" : (x * 100).toFixed(0).padStart(3) + "%");

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error("\n  Missing ANTHROPIC_API_KEY.\n"); process.exit(1); }
  banner(`LEGIBLE · DRIVER MATRIX · focal=${FOCAL} · N=${N} · agents=[${agents.map((a) => a.id).join(", ")}]`);
  console.log(`  query (constant): "${scen.query}"  ·  baseline = all candidates at parity\n`);

  const tasks = [];
  for (const cond of conditions) for (const agent of agents) for (let rep = 0; rep < N; rep++) tasks.push({ cond, agent, rep });
  const raws = await runPool(tasks, async (t) => {
    const answer = await t.agent.run({ system, user: buildUser(t.cond.env) });
    if (!answer || !answer.trim()) throw new Error("empty answer");
    const verdict = await extract(answer, { sourceIds: scen.sourceHint, brands: BRANDS.map((b) => b.name), focal: FOCAL });
    return { cond: t.cond.id, agent: t.agent.id, verdict };
  }, CONC);
  const ok = raws.filter((r) => r && !r.__error && r.verdict);
  if (raws.length - ok.length) console.log(`  ⚠ ${raws.length - ok.length}/${raws.length} errored.`);

  const byCond = {};
  for (const cond of conditions) byCond[cond.id] = focalTop1(ok.filter((r) => r.cond === cond.id).map((r) => r.verdict));
  const base = byCond["baseline"] ?? 0;

  const ranked = scen.levers
    .map((L) => ({ ...L, rate: byCond[L.id], delta: (byCond[L.id] ?? 0) - base }))
    .sort((a, b) => b.delta - a.delta);

  banner(`WHAT DRIVES THE AGENT — ${FOCAL} top-1 lift per signal (vs parity baseline ${pct(base)})`);
  console.log("  signal".padEnd(38) + "with it   lift    you control?");
  ranked.forEach((L, i) => console.log(`  ${i + 1}. ${L.label.padEnd(34)} ${pct(L.rate)}   ${(L.delta >= 0 ? "+" : "") + (L.delta * 100).toFixed(0)}pts   ${L.controllable ? "✓ owned/controllable" : "earned (3rd-party)"}`));

  const OUT = path.join(__dirname, "..", "out");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "results-drivers.json"), JSON.stringify({ scenario: scen.id, query: scen.query, focal: FOCAL, n: N, baseline: base, levers: ranked, generatedAt: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(OUT, "raw-drivers.jsonl"), ok.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`\n  → out/results-drivers.json  +  out/raw-drivers.jsonl  (${ok.length} transcripts)\n`);
}
main().catch((e) => { console.error("\n  drivers run failed:", e?.message || e); process.exit(1); });
