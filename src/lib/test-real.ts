// Phase 1 test: the REAL, unbiased baseline. Should match what you see asking the agents by hand.
//   set -a; . engine/.env; set +a; bun src/lib/test-real.ts
import { runRealBaseline } from "./real-engine";

const main = async () => {
  const FOCAL = "Celio";
  const Q = "tell me stores to buy my capsule wardrobe as a man";
  const N = 3;
  console.log(`Running REAL baseline for "${FOCAL}" — "${Q}" — N=${N}/agent (real web search)...`);
  const b = await runRealBaseline(FOCAL, Q, N);

  console.log(`\n=== REAL BASELINE: ${b.focal} ===`);
  console.log(`POOLED: mention-rate ${(b.mentionRate * 100).toFixed(0)}% · avg position ${b.avgPos ?? "not mentioned"}`);
  for (const a of b.agents) {
    console.log(`\n  ${a.name.padEnd(8)} (${a.model}) — mention ${(a.mentionRate * 100).toFixed(0)}% · avgPos ${a.avgPos ?? "—"}`);
    a.runs.forEach((r, i) => console.log(`    run${i + 1}: ${r.pos != null ? `#${r.pos}` : (r.ok ? "NOT mentioned" : "(failed)")}  [${r.ranked.slice(0, 7).join(", ")}${r.ranked.length > 7 ? "…" : ""}]`));
  }
  console.log(`\n  REAL COMPETITOR SET (by frequency): ${b.competitors.map((c) => `${c.name}(${c.mentions})`).join(", ")}`);
};
main().catch((e) => { console.error(e); process.exit(1); });
