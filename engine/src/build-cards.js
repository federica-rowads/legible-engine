// Build the REAL tool data file from the controlled-web-search sweep
// (out/raw-sandbox.jsonl). Preserves the hand-written factor copy (why/actions)
// in the existing climb361.json and overwrites the numbers + per-agent cards +
// per-lever steps with the measured controlled-search results.
//   node src/build-cards.js
import fs from "node:fs";

const RAW = "out/raw-sandbox.jsonl";
const OUT = "../src/data/climb361.json";
const ALL_LEVERS = ["specs", "reviews", "authority", "community", "editorial", "comparison"];
const AGENTS = ["ChatGPT", "Claude", "Gemini"];
const KEY = { ChatGPT: "chatgpt", Claude: "claude", Gemini: "gemini" };

const rows = fs.readFileSync(RAW, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const sel = (agent, cond) => rows.filter((r) => r.agent === agent && r.cond === cond);
const avgRank = (agent, cond) => { const v = sel(agent, cond); return v.length ? v.reduce((a, b) => a + b.rank, 0) / v.length : null; };
const pooledAvg = (cond) => { const v = rows.filter((r) => r.cond === cond); return v.length ? v.reduce((a, b) => a + b.rank, 0) / v.length : null; };
const pooledTop1 = (cond) => { const v = rows.filter((r) => r.cond === cond); return v.length ? v.filter((r) => r.rank === 1).length / v.length : 0; };

// Representative run for a card: the run whose rank is closest to the agent's mean.
const card = (label, cond) => {
  const ak = KEY[label];
  const runs = sel(ak, cond);
  const avg = avgRank(ak, cond) ?? 7;
  const rep = runs.slice().sort((a, b) => Math.abs(a.rank - avg) - Math.abs(b.rank - avg))[0] || {};
  return { name: label, rank: Math.round(avg), confidence: rep.conf > 0 ? rep.conf : null, pick: rep.pick || "", quote: rep.quote || "", sources: (rep.sources || []).slice(0, 2) };
};
const block = (cond) => ({ avgRank: +(pooledAvg(cond) ?? 7).toFixed(1), top1: +pooledTop1(cond).toFixed(2), agents: AGENTS.map((a) => card(a, cond)) });

// Safety net: refuse to wire sparse/incomplete data (e.g. if Anthropic's opus
// tier was overloaded and most runs got skipped). Both BEFORE (baseline) and
// AFTER (all) must have enough runs per agent, or we abort without writing.
const N_MIN = 3;
for (const cond of ["baseline", "all"]) {
  for (const label of AGENTS) {
    const c = sel(KEY[label], cond).length;
    if (c < N_MIN) {
      console.error(`SPARSE DATA: ${label}/${cond} has only ${c} runs (need >= ${N_MIN}). Anthropic likely overloaded mid-sweep — NOT wiring. Re-run the sweep when recovered.`);
      process.exit(2);
    }
  }
}

const existing = JSON.parse(fs.readFileSync(OUT, "utf8"));
const data = {
  ...existing, // keep brand, brandFull, query, agents, and the factor copy (why/actions)
  method: "controlled web search — the agent calls a web_search tool we control; N=5 per condition",
  steps: ["baseline", ...ALL_LEVERS, "all"].map((c) => ({
    cond: c,
    avgRank: +(pooledAvg(c) ?? 7).toFixed(1),
    top1: +pooledTop1(c).toFixed(2),
    perAgent: Object.fromEntries(AGENTS.map((a) => [KEY[a], +(avgRank(KEY[a], c) ?? 7).toFixed(1)])),
  })),
  before: block("baseline"),
  after: block("all"),
};
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log("wrote", OUT);
console.log(JSON.stringify({ before: data.before.avgRank, after: data.after.avgRank, steps: data.steps.map((s) => `${s.cond}:${s.avgRank}`) }, null, 2));
