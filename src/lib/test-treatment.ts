// Phase 2 test: controlled lift grounded in the REAL competitors from Phase 1.
//   set -a; . engine/.env; set +a; bun src/lib/test-treatment.ts
import { runTreatment } from "./real-engine";

const main = async () => {
  const FOCAL = "Celio";
  const Q = "tell me stores to buy my capsule wardrobe as a man";
  const COMPS = ["Uniqlo", "Everlane", "J.Crew", "Buck Mason", "COS", "Muji"]; // real, from Phase 1
  const LEVERS = ["specs", "reviews", "authority", "community", "editorial", "comparison"];
  console.log(`Controlled lift for "${FOCAL}" grounded in real competitors: ${COMPS.join(", ")}\n`);
  const t = await runTreatment(FOCAL, Q, COMPS, LEVERS, 3, 2);
  console.log("CATEGORY:", t.corpus.category);
  const show = (c: typeof t.control) => {
    console.log(`  mention ${(c.mentionRate * 100).toFixed(0)}% · avgPos ${c.avgPos ?? "—"}`);
    for (const a of c.agents) console.log(`    ${a.name.padEnd(8)} ${(a.mentionRate * 100).toFixed(0).padStart(3)}% · pos ${String(a.avgPos ?? "—").padStart(3)}   runs: ${a.runs.map((r) => (r.pos != null ? `#${r.pos}` : (r.ok ? "–" : "x"))).join(" ")}`);
  };
  console.log("\n=== CONTROL (real competitors, focal ABSENT) ==="); show(t.control);
  console.log("\n=== TREATMENT (+ focal signals injected) ==="); show(t.treatment);
  console.log(`\nLIFT: mention ${(t.control.mentionRate * 100).toFixed(0)}% → ${(t.treatment.mentionRate * 100).toFixed(0)}%  (+${(t.lift.mentionRate * 100).toFixed(0)}pp) · position ${t.control.avgPos ?? "—"} → ${t.treatment.avgPos ?? "—"}`);
  console.log("\n=== iterations (write exactly this) ===");
  for (const it of t.iterations) console.log(`[${it.lever}] best mention ${it.best ? (it.best.mentionRate * 100).toFixed(0) + "%" : "—"} pos ${it.best?.pos ?? "—"}: ${it.best?.content?.slice(0, 90)}`);
};
main().catch((e) => { console.error(e); process.exit(1); });
