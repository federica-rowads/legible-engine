// Throwaway smoke test: prove the recs name SPECIFIC, real targets.
// Run: set -a; . engine/.env; set +a ; bun src/lib/test-recs.ts
import { optimizeContent } from "./real-engine";

const brand = "361 Degrees";
const query = "best stability running shoes for flat feet";
const competitors = ["Brooks", "ASICS", "Hoka", "Saucony", "New Balance"];
const levers = ["community", "editorial", "specs", "comparison", "authority"];

const r = await optimizeContent(brand, query, competitors, levers, 2);

console.log(`\n=== optimizeContent("${brand}", "${query}") ===`);
console.log(`competitors (real leader = ${competitors[0]}): ${competitors.join(", ")}\n`);
for (const it of r.iterations) {
  console.log(`── lever: ${it.lever} ──`);
  console.log(`best.label : ${it.best?.label ?? "(none)"}`);
  console.log(`best.content: ${it.best?.content ?? "(none)"}\n`);
}
console.log("=== injected note (what every lever's winner contributes) ===");
console.log(r.injected);
