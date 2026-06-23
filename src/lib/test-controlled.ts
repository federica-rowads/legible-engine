// Local smoke test for the substitute-the-web_search mechanic (run with bun).
//   set -a; . engine/.env; set +a; bun src/lib/test-controlled.ts
import { runControlled } from "./controlled-search";

const Q = "best stability running shoes for flat feet";
const ALL = ["specs", "reviews", "authority", "community", "editorial", "comparison"];

const show = (label: string, r: Awaited<ReturnType<typeof runControlled>>) => {
  console.log(`\n=== ${label} === avgRank ${r.avgRank} · top1 ${r.top1} · live ${r.liveCount}/3`);
  for (const a of r.agents) {
    if (a.ok) console.log(`  ${a.name.padEnd(8)} 361 @ #${a.rank}  top="${a.top}"  ranked=[${a.ranked.join(", ")}]`);
    else console.log(`  ${a.name.padEnd(8)} (live call failed)`);
  }
};

const main = async () => {
  show("BASELINE (no levers, 361 should be invisible)", await runControlled(Q, []));
  show("ALL LEVERS (361 fully legible)", await runControlled(Q, ALL));
};
main().catch((e) => { console.error(e); process.exit(1); });
