// Brand-agnostic test: generate the environment for ANY brand and run the full before->after.
//   set -a; . engine/.env; set +a; bun src/lib/test-sezane.ts
import { getCorpus, runControlled, runSandbox } from "./controlled-search";

const BRAND = "Sezane";
const Q = "best French clothing brands for timeless everyday style";
const ALL = ["specs", "reviews", "authority", "community", "editorial", "comparison"];

const show = (label: string, r: Awaited<ReturnType<typeof runControlled>>) => {
  console.log(`\n=== ${label} === avgRank ${r.avgRank} · top1 ${r.top1} · live ${r.liveCount}/3`);
  for (const a of r.agents) {
    if (a.ok) console.log(`  ${a.name.padEnd(8)} ${r.focal} @ #${a.rank}  top="${a.top}"  ranked=[${a.ranked.join(", ")}]`);
    else console.log(`  ${a.name.padEnd(8)} (live call failed)`);
  }
};

const main = async () => {
  console.log(`Building controlled environment for "${BRAND}"...`);
  const corpus = await getCorpus(BRAND, Q);
  console.log(`\nFOCAL: ${corpus.focal}  (token "${corpus.focalToken}")`);
  console.log(`CATEGORY: ${corpus.category}  |  recommend a: ${corpus.noun}`);
  console.log(`BRANDS: ${corpus.brands.join(", ")}`);
  console.log(`\n[guide BASE]  ${corpus.guideBase}`);
  console.log(`[guide +focal] ${corpus.guideFocal}`);
  console.log(`[authority default] ${corpus.authorityDefault}`);
  console.log(`[comparison default] ${corpus.comparisonDefault}`);

  show("BASELINE (no levers — focal should be invisible)", await runControlled(corpus, Q, []));

  console.log("\nRunning sandbox (generate -> test -> apply -> live final)...");
  const sb = await runSandbox(BRAND, Q, ALL);
  show("AFTER (full strategy, live)", sb.final);
  console.log("\n--- iterations (write exactly this) ---");
  for (const it of sb.iterations) console.log(`[${it.lever}] best #${it.best?.rank} (${it.best?.label}): ${it.best?.content?.slice(0, 100)}`);
};
main().catch((e) => { console.error(e); process.exit(1); });
