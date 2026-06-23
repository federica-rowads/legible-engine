// Local test of the FULL iteration: generate versions -> test -> best -> final live run.
import { runSandbox } from "./controlled-search";

const main = async () => {
  const r = await runSandbox("361 Degrees Phoenix 2", "best stability running shoes for flat feet", ["community", "comparison", "authority"], 2);
  console.log("\n=== ITERATIONS (per writable lever) ===");
  for (const it of r.iterations) {
    console.log(`\n[${it.lever}] tested ${it.versions.length} versions:`);
    for (const v of it.versions) console.log(`   rank #${v.rank}  [${v.label}]  ${v.content.slice(0, 85)}...`);
    console.log(`  -> WINNER: [${it.best?.label}] (rank ${it.best?.rank})`);
  }
  console.log("\n=== FINAL live run (winning content applied) ===");
  console.log(`avgRank ${r.final.avgRank} · top1 ${r.final.top1} · live ${r.final.liveCount}/3`);
  for (const a of r.final.agents) console.log(a.ok ? `  ${a.name.padEnd(8)} 361 @ #${a.rank}  top=${a.top}` : `  ${a.name.padEnd(8)} failed`);
};
main().catch((e) => { console.error(e); process.exit(1); });
