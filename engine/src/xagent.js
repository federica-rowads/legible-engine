// Legible — CROSS-AGENT runner (controlled, real-content environment).
//
// The brief asks us to "design controlled information environments" and run real
// agents through them. Here we build ONE curated environment from REAL, sourced
// facts (the 5 candidate shoes: real prices, RunRepeat editorial verdicts, specs)
// and feed the SAME environment + the SAME query to ChatGPT, Claude and Gemini.
// Holding the information constant isolates the AGENT as the variable: given
// identical real information, who does each AI recommend?
//
// Two conditions:
//   BEFORE — Brooks shown at its $155 page price (the gap).
//   AFTER  — + one true fact: Brooks is genuinely available under $150
//            (Brooks ReStart from $81; retailers from $124.99).  → the flip.
//
//   node src/xagent.js --n=5 --conc=3 --agents=claude,chatgpt,gemini
import "./lib/env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "./lib/extractor.js";
import { aggregate, BRANDS } from "./lib/metrics.js";
import { selectAgents, AGENTS } from "./agents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};
const N = parseInt(argOf("n", "5"), 10);
const CONC = parseInt(argOf("conc", "3"), 10);
const QUERY = argOf("q", "Best running shoes for flat feet / overpronation under $150");
const agents = selectAgents(argOf("agents", "all"));

const SOURCE_HINT = ["brooks-adrenaline-gts-25", "asics-gt-2000-13", "hoka-arahi-7", "nb-860v14", "saucony-tempus"];

// REAL, sourced product information — the controlled environment. All facts true
// (RunRepeat lab guides/reviews + brand pages + retailer listings, June 2026).
const ENV_BEFORE = `
1) Brooks Adrenaline GTS 25 — $155
   - Editorial (RunRepeat): "Best Overall" for overpronation, 87/100 ("Great") — the #1 overall pick in RunRepeat's lab-tested overpronation buyer's guide.
   - Stability: GuideRails holistic support keeps an overpronating foot centered; very wide stable base (117.7/100.7 mm); stiff heel counter. Built for flat feet / overpronation / low arches.
   - Specs: 36.1/25.9 mm stack; heel shock absorption 138 SA; world-class outsole durability; multiple widths (Narrow–X-Wide).

2) ASICS GT-2000 13 — $140
   - Editorial (RunRepeat): 90/100 ("Superb"); strongest in-budget stability option. 5/5 torsional rigidity; very wide heel (102.2 mm); class-leading durability; multiple widths. Tagged for flat feet, low arch, overpronation. Negatives: firm foam, low energy return.

3) Hoka Arahi 7 — $145
   - Editorial (RunRepeat): 81/100. J-Frame stability, 5/5 torsional rigidity, light, durable. Negative: narrow tapered toebox (70.0 mm) — best for narrow-to-average feet.

4) New Balance Fresh Foam X 860v14 — $140
   - Editorial (RunRepeat): 85/100. Genuine stability (dual-density foam + EVA plate), softer/plusher ride; 4 widths. Negatives: only 3/5 torsional rigidity; weak durability (heel 1/5, toebox 2/5); heavier (10.4 oz).

5) Saucony Tempus — $160
   - Editorial (RunRepeat): energy-return standout (PWRRUN PB). Note: above a $150 budget.`.trim();

const AFTER_FACT =
  `\n   - AVAILABILITY: although new retail is $155, the Adrenaline GTS 25 is genuinely available UNDER $150 — ` +
  `Brooks' own ReStart certified-refurbished program from $81, and retailers from $124.99 (Relay Goods, REI, DICK'S, Running Warehouse).`;

// AFTER = insert the true availability fact into the Brooks block.
const ENV_AFTER = ENV_BEFORE.replace(
  "multiple widths (Narrow–X-Wide).",
  "multiple widths (Narrow–X-Wide)." + AFTER_FACT
);

const system =
  `You are the user's personal AI shopping assistant. Using ONLY the product information provided by the user, ` +
  `recommend the single best option for their stated need. End with: (1) TOP PICK: one specific brand + model; ` +
  `(2) RANKED SHORTLIST; (3) CONFIDENCE 0-100; (4) a one-sentence reason.`;

const buildUser = (env) =>
  `User question: "${QUERY}"\n\nHere is the product information available to you:\n\n${env}\n\nRecommend the single best option for the user.`;

function banner(t) { console.log("\n" + "─".repeat(74) + "\n " + t + "\n" + "─".repeat(74)); }

async function runPool(items, worker, conc) {
  const out = new Array(items.length);
  let i = 0, done = 0;
  const next = async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await worker(items[idx]); }
      catch (e) { out[idx] = { __error: String((e && e.message) || e) }; }
      done++; process.stdout.write(`\r  runs… ${done}/${items.length}   `);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, next));
  process.stdout.write("\n");
  return out;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error("\n  Missing ANTHROPIC_API_KEY. Aborting.\n"); process.exit(1); }
  banner(`LEGIBLE · CROSS-AGENT (controlled, real environment) · N=${N} · agents=[${agents.map((a) => a.id).join(", ")}]`);
  console.log(`  query (constant): "${QUERY}"`);
  console.log(`  agents: ${agents.map((a) => `${a.label} (${a.model})`).join("  ·  ")}\n`);

  const conditions = [
    { id: "before", label: "Brooks at $155 (the gap)", env: ENV_BEFORE },
    { id: "after", label: "+ Brooks available under $150 (one true fact)", env: ENV_AFTER }
  ];

  const tasks = [];
  for (const cond of conditions)
    for (const agent of agents)
      for (let rep = 0; rep < N; rep++)
        tasks.push({ cond, agent, rep });

  const raws = await runPool(tasks, async (t) => {
    const answer = await t.agent.run({ system, user: buildUser(t.cond.env) });
    if (!answer || !answer.trim()) throw new Error("empty answer");
    const verdict = await extract(answer, { sourceIds: SOURCE_HINT });
    return { cond: t.cond.id, agent: t.agent.id, rep: t.rep, answer, verdict };
  }, CONC);

  const ok = raws.filter((r) => r && !r.__error && r.verdict);
  const failed = raws.length - ok.length;
  if (failed) {
    console.log(`  ⚠ ${failed}/${raws.length} runs errored.`);
    const byAgentErr = {};
    raws.filter((r) => r && r.__error).forEach((r) => { byAgentErr[r.__error] = (byAgentErr[r.__error] || 0) + 1; });
    Object.entries(byAgentErr).slice(0, 4).forEach(([e, c]) => console.log(`    ${c}× ${e}`));
  }

  const pct = (x) => (x == null ? " —" : (x * 100).toFixed(0).padStart(3) + "%");
  const agg = {}; // agg[agentId][condId] = aggregate
  for (const agent of agents) {
    agg[agent.id] = {};
    for (const cond of conditions) {
      const vs = ok.filter((r) => r.agent === agent.id && r.cond === cond.id).map((r) => r.verdict);
      agg[agent.id][cond.id] = vs.length ? aggregate(vs) : null;
    }
  }

  banner("CROSS-AGENT — Brooks recommended #1 (same real info, who picks it?)");
  console.log("  agent".padEnd(14) + "BEFORE ($155)   AFTER (<$150)   shift     budget-honored");
  for (const agent of agents) {
    const b = agg[agent.id].before, a = agg[agent.id].after;
    if (!b && !a) { console.log("  " + agent.label.padEnd(12) + "(no data)"); continue; }
    const shift = (b && a) ? `${((a.brooksTop1 - b.brooksTop1) * 100).toFixed(0)}pts` : "—";
    console.log(
      "  " + agent.label.padEnd(12) +
      pct(b?.brooksTop1).padEnd(15) + " " + pct(a?.brooksTop1).padEnd(14) + " " +
      (shift.startsWith("-") ? shift : "+" + shift).padEnd(9) + " " +
      `${pct(b?.priceCapHonored)}→${pct(a?.priceCapHonored)}`
    );
  }

  banner("WHO EACH AGENT PICKS (modal winner)");
  for (const agent of agents) {
    const b = agg[agent.id].before, a = agg[agent.id].after;
    console.log("  " + agent.label.padEnd(12) + `before: ${b?.modalTop || "—"}   →   after: ${a?.modalTop || "—"}`);
  }

  // persist
  const OUT = path.join(__dirname, "..", "out");
  fs.mkdirSync(OUT, { recursive: true });
  const results = {
    mode: "cross-agent (controlled, real environment)",
    query: QUERY, n: N,
    agents: agents.map((a) => ({ id: a.id, label: a.label, model: a.model })),
    generatedAt: new Date().toISOString(),
    aggregate: agg
  };
  fs.writeFileSync(path.join(OUT, "results-xagent.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT, "raw-xagent.jsonl"), ok.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`\n  → out/results-xagent.json  +  out/raw-xagent.jsonl  (${ok.length} transcripts)\n`);
}

main().catch((e) => { console.error("\n  cross-agent run failed:", e?.message || e); process.exit(1); });
