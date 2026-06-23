// Local test: does an agent generate good content versions per lever? (run with bun)
import { generateVersions } from "./controlled-search";

const main = async () => {
  for (const lever of ["community", "authority", "comparison"]) {
    console.log(`\n=== ${lever} — 2 generated versions ===`);
    const vs = await generateVersions(lever, "361 Degrees Phoenix 2", "best stability running shoes for flat feet", 2);
    if (!vs.length) console.log("  (generation returned nothing)");
    for (const v of vs) console.log(`  [${v.label}]\n   ${v.content}`);
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
