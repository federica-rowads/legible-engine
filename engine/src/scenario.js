// Legible — generic SCENARIO runner (modular; one file per category).
//
// Loads data/scenarios/<id>.json and runs the SAME controlled experiment as the
// shoe study on any category: a curated REAL information environment, fed
// identically to ChatGPT / Claude / Gemini, BEFORE and AFTER one true fact is
// made legible. Tests whether "the law" — agents drop the editorial best on a
// constraint, and flip when the real qualifying fact is surfaced — generalizes.
//
//   node src/scenario.js --scenario=headphones --n=8 --conc=3
import "./lib/env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "./lib/extractor.js";
import { selectAgents } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};
const SCEN = argOf("scenario", "headphones");
const N = parseInt(argOf("n", "8"), 10);
const CONC = parseInt(argOf("conc", "3"), 10);
const agents = selectAgents(argOf("agents", "all"));

const scen = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "scenarios", `${SCEN}.json`), "utf8"));
const BRANDS = scen.brands; // [{name, aliases}]
const FOCAL = scen.focal;

const canon = (s) => {
  const t = (s || "").toLowerCase();
  for (const b of BRANDS) if (b.aliases.some((a) => t.includes(a))) return b.name;
  return null;
};

// before / after environments (the one true added fact is explicit + auditable)
const envBefore = scen.env.join("\n");
const afterArr = [...scen.env];
const ai = afterArr.findIndex((l) => l.includes(scen.afterInsert.matchSnippet));
afterArr.splice(ai + 1, 0, scen.afterInsert.line);
const envAfter = afterArr.join("\n");

const system =
  `You are the user's personal AI shopping assistant. Using ONLY the product information provided by the user, ` +
  `recommend the single best option for their stated need. End with: (1) TOP PICK: one specific brand + model; ` +
  `(2) RANKED SHORTLIST; (3) CONFIDENCE 0-100; (4) a one-sentence reason.`;
const buildUser = (env) =>
  `User question: "${scen.query}"\n\nHere is the product information available to you:\n\n${env}\n\nRecommend the single best option for the user.`;

function bootCI(bits, B = 1000) {
  const n = bits.length; if (!n) return [null, null];
  const s = [];
  for (let b = 0; b < B; b++) { let acc = 0; for (let i = 0; i < n; i++) acc += bits[Math.floor(Math.random() * n)]; s.push(acc / n); }
  s.sort((a, b) => a - b);
  return [s[Math.floor(0.025 * (B - 1))], s[Math.ceil(0.975 * (B - 1))]];
}
function agg(verdicts) {
  const n = verdicts.length; if (!n) return null;
  const top1 = Object.fromEntries(BRANDS.map((b) => [b.name, 0]));
  for (const v of verdicts) { const c = canon(v.top_pick_brand); if (c) top1[c]++; }
  for (const b of BRANDS) top1[b.name] /= n;
  const bits = verdicts.map((v) => (canon(v.top_pick_brand) === FOCAL ? 1 : 0));
  const counts = {}; verdicts.forEach((v) => { const c = canon(v.top_pick_brand) || "other"; counts[c] = (counts[c] || 0) + 1; });
  const modal = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const priceCap = verdicts.filter((v) => v.price_within_cap_claim === "true").length / n;
  return { n, top1, focalTop1: bits.reduce((a, b) => a + b, 0) / n, focalCI: bootCI(bits), modal, priceCap };
}

async function runPool(items, worker, conc) {
  const out = new Array(items.length); let i = 0, done = 0;
  const next = async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await worker(items[idx]); } catch (e) { out[idx] = { __error: String((e && e.message) || e) }; }
      done++; process.stdout.write(`\r  runs… ${done}/${items.length}   `);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, next));
  process.stdout.write("\n"); return out;
}

function banner(t) { console.log("\n" + "─".repeat(76) + "\n " + t + "\n" + "─".repeat(76)); }
const pct = (x) => (x == null ? " —" : (x * 100).toFixed(0).padStart(3) + "%");

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error("\n  Missing ANTHROPIC_API_KEY.\n"); process.exit(1); }
  banner(`LEGIBLE · SCENARIO "${scen.id}" (${scen.category}) · N=${N} · agents=[${agents.map((a) => a.id).join(", ")}]`);
  console.log(`  query (constant): "${scen.query}"`);
  console.log(`  focal: ${FOCAL} ${scen.focalModel || ""}  vs  ${BRANDS.filter((b) => b.name !== FOCAL).map((b) => b.name).join(", ")}\n`);

  const conditions = [{ id: "before", env: envBefore }, { id: "after", env: envAfter }];
  const tasks = [];
  for (const cond of conditions) for (const agent of agents) for (let rep = 0; rep < N; rep++) tasks.push({ cond, agent, rep });

  const raws = await runPool(tasks, async (t) => {
    const answer = await t.agent.run({ system, user: buildUser(t.cond.env) });
    if (!answer || !answer.trim()) throw new Error("empty answer");
    const verdict = await extract(answer, { sourceIds: scen.sourceHint, brands: BRANDS.map((b) => b.name), focal: FOCAL });
    return { cond: t.cond.id, agent: t.agent.id, rep: t.rep, answer, verdict };
  }, CONC);

  const ok = raws.filter((r) => r && !r.__error && r.verdict);
  const failed = raws.length - ok.length;
  if (failed) console.log(`  ⚠ ${failed}/${raws.length} errored.`);

  const A = {};
  for (const agent of agents) {
    A[agent.id] = {};
    for (const cond of conditions) {
      const vs = ok.filter((r) => r.agent === agent.id && r.cond === cond.id).map((r) => r.verdict);
      A[agent.id][cond.id] = vs.length ? agg(vs) : null;
    }
  }

  banner(`CROSS-AGENT — ${FOCAL} ${scen.focalModel || ""} recommended #1 (the law, generalized to ${scen.category})`);
  console.log("  agent".padEnd(14) + `BEFORE (over $)   AFTER (legible)   shift     modal`);
  for (const agent of agents) {
    const b = A[agent.id].before, a = A[agent.id].after;
    const shift = (b && a) ? `${((a.focalTop1 - b.focalTop1) * 100).toFixed(0)}pts` : "—";
    console.log(
      "  " + agent.label.padEnd(12) +
      pct(b?.focalTop1).padEnd(16) + " " + pct(a?.focalTop1).padEnd(15) + " " +
      (shift.startsWith("-") ? shift : "+" + shift).padEnd(9) + " " +
      `${b?.modal || "—"}→${a?.modal || "—"}`
    );
  }

  const OUT = path.join(__dirname, "..", "out");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `results-scenario-${scen.id}.json`),
    JSON.stringify({ scenario: scen.id, category: scen.category, query: scen.query, focal: FOCAL, n: N, agents: agents.map((a) => ({ id: a.id, model: a.model })), aggregate: A, generatedAt: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(OUT, `raw-scenario-${scen.id}.jsonl`), ok.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`\n  → out/results-scenario-${scen.id}.json  +  out/raw-scenario-${scen.id}.jsonl  (${ok.length} transcripts)\n`);
}

main().catch((e) => { console.error("\n  scenario run failed:", e?.message || e); process.exit(1); });
