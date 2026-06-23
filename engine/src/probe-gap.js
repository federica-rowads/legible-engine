// Probe: find a REAL brand with a genuine legibility/awareness GAP — one that is
// legitimately good but under-recommended by the agents (so making its real info
// legible would honestly help, no forcing). We ask the agents directly (real-world
// knowledge) and tally how often each candidate appears + its avg rank.
import "./lib/env.js";
import { selectAgents } from "./agents/index.js";
import { extract } from "./lib/extractor.js";

// Mix of legitimately-good-but-lesser-known brands + a few well-known references.
const CANDIDATES = ["361 Degrees", "Topo Athletic", "Altra", "Karhu", "Craft", "Diadora", "Mizuno", "Saucony", "Brooks", "ASICS", "Hoka", "New Balance"];
const QUERY = "best stability running shoes for overpronation";
const agents = selectAgents("all");
const N = 3;
const system =
  "You are a knowledgeable running-shoe advisor. Using your own knowledge, recommend the single best shoe for the user's need plus a ranked shortlist of the top 6 brands and models. " +
  "End with: TOP PICK: <brand and model>; then a numbered RANKED SHORTLIST of 6.";

async function main() {
  console.log(`PROBE-GAP · query="${QUERY}" · agents=[${agents.map((a) => a.id).join(", ")}] · N=${N}\n`);
  // brand -> array of ranks (1-indexed) across all runs where it appeared
  const seen = {};
  let totalRuns = 0;
  for (const agent of agents) {
    for (let i = 0; i < N; i++) {
      totalRuns++;
      try {
        const ans = await agent.run({ system, user: `User question: "${QUERY}". Give your ranked top 6.` });
        const v = await extract(ans, { sourceIds: [], brands: CANDIDATES, focal: "361 Degrees" });
        const rb = v.ranked_brands || [];
        rb.forEach((b, idx) => {
          const m = CANDIDATES.find((c) => b.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(b.toLowerCase()));
          if (m) { (seen[m] = seen[m] || []).push(idx + 1); }
        });
      } catch (e) { /* skip */ }
    }
  }
  const rows = CANDIDATES.map((c) => {
    const ranks = seen[c] || [];
    const avg = ranks.length ? (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1) : "—";
    return { c, appear: ranks.length, of: totalRuns, avg };
  }).sort((a, b) => a.appear - b.appear);
  console.log("brand               appears        avg rank when seen");
  console.log("─".repeat(56));
  for (const r of rows) console.log(`  ${r.c.padEnd(18)} ${(r.appear + "/" + r.of).padEnd(12)}  ${r.avg}`);
  console.log("\n(lowest 'appears' among the legitimately-good lesser-known brands = the honest GAP hero)\n");
}
main().catch((e) => { console.error("probe-gap failed:", e?.message || e); process.exit(1); });
