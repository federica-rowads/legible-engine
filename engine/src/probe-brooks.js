// Probe: where do the agents rank Brooks, on their own real-world knowledge,
// across a few neutral queries? Used to pick an honest "problem" query (one
// where a real brand genuinely ranks low). No constructed environment here —
// we ask the agents directly so the ranking is their real-world behavior.
import "./lib/env.js";
import { selectAgents } from "./agents/index.js";
import { extract } from "./lib/extractor.js";

const BRANDS = ["Brooks", "Nike", "ASICS", "Hoka", "Saucony", "New Balance", "Adidas", "Mizuno", "On", "Puma"];
const FOCAL = "Brooks";
const QUERIES = [
  "best running shoes",
  "best stability running shoes",
  "best running shoes for daily training",
  "best supportive running shoes for long runs",
];
const agents = selectAgents("all");
const N = 3;
const system =
  "You are a knowledgeable running-shoe advisor. Using your own knowledge, recommend the single best shoe for the user's need, plus a ranked shortlist of the top 5 brands and models. " +
  "End with: TOP PICK: <brand and model>; then a numbered RANKED SHORTLIST of 5.";

function summarize(ranks) {
  const present = ranks.filter((r) => r > 0);
  const avg = present.length ? (present.reduce((a, b) => a + b, 0) / present.length).toFixed(1) : "—";
  return `rank ${avg.padStart(4)} (seen ${present.length}/${ranks.length})`;
}

async function main() {
  console.log(`PROBE · Brooks real-world rank · agents=[${agents.map((a) => a.id).join(", ")}] · N=${N}\n`);
  for (const q of QUERIES) {
    const cells = [];
    for (const agent of agents) {
      const ranks = [];
      for (let i = 0; i < N; i++) {
        try {
          const ans = await agent.run({ system, user: `User question: "${q}". Give your ranked top 5.` });
          const v = await extract(ans, { sourceIds: [], brands: BRANDS, focal: FOCAL });
          ranks.push(v.focal_rank || 0);
        } catch (e) { ranks.push(0); }
      }
      cells.push(`${agent.id.padEnd(8)} ${summarize(ranks)}`);
    }
    console.log(`"${q}"`);
    cells.forEach((c) => console.log(`   ${c}`));
    console.log("");
  }
}
main().catch((e) => { console.error("probe failed:", e?.message || e); process.exit(1); });
