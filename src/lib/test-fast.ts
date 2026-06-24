// Validate the progressive path: fire all 3 per-agent runners CONCURRENTLY (what the UI will do),
// at N=1. Confirms runAgentBaseline works, the Anthropic concurrency cap does not deadlock/hang,
// and shows each agent's wall-clock (so we can see how progressive the reveal will feel).
import { runAgentBaseline } from "./real-engine";
const t0 = Date.now();
const names = ["ChatGPT", "Claude", "Gemini"];
const results = await Promise.all(
  names.map(async (n) => {
    const tA = Date.now();
    const r = await runAgentBaseline(n, "best stability running shoes for flat feet", "361 Degrees", 1);
    return { n, s: ((Date.now() - tA) / 1000).toFixed(0), ok: r.runs.some((x) => x.ok), pos: r.avgPos, top: r.topList.slice(0, 3) };
  })
);
console.log(`\nALL 3 done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
for (const r of results) console.log(`  ${r.n.padEnd(8)} ${r.s}s  ok=${r.ok}  pos=${r.pos ?? "-"}  top3=[${r.top.join(", ")}]`);
