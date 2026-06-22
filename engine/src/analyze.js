// Cross-references the data we ALREADY have: across every saved response,
// which sources did the agent actually lean on? = "where the belief comes from"
// (provenance) — split by whether Brooks won. No new API calls.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus } from "./lib/load.js";
import { canon } from "./lib/metrics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "out");
const corpus = loadCorpus();
const typeOf = (id) => corpus.byId.get(id)?.source_type || "unknown";

const rows = [];
for (const f of fs.readdirSync(OUT).filter((f) => /^raw-.*\.jsonl$/.test(f)))
  for (const line of fs.readFileSync(path.join(OUT, f), "utf8").trim().split("\n"))
    if (line) rows.push(JSON.parse(line));

function provenance(filter) {
  const tally = { owned: 0, editorial: 0, community: 0, "structured-specs": 0, unknown: 0 };
  let cites = 0, resp = 0;
  for (const r of rows) {
    if (!filter(r)) continue;
    resp++;
    for (const id of r.verdict.cited_source_ids || []) { tally[typeOf(id)]++; cites++; }
  }
  const total = cites || 1;
  return { responses: resp, citations: cites, mix: Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v / total])) };
}

const pct = (x) => (x * 100).toFixed(0) + "%";
const printMix = (label, p) => {
  console.log(`\n  ${label}  (${p.responses} responses, ${p.citations} citations)`);
  for (const t of ["owned", "editorial", "community", "structured-specs"])
    console.log(`    ${t.padEnd(18)} ${pct(p.mix[t] || 0)}`);
};

console.log("─".repeat(64) + "\n PROVENANCE — where the agent's belief actually comes from\n" + "─".repeat(64));
const overall = provenance(() => true);
const brooksWin = provenance((r) => canon(r.verdict.top_pick_brand) === "Brooks");
const brooksLose = provenance((r) => canon(r.verdict.top_pick_brand) !== "Brooks");
printMix("OVERALL", overall);
printMix("when Brooks IS the top pick", brooksWin);
printMix("when Brooks is NOT the top pick", brooksLose);

const srcTally = {};
for (const r of rows) for (const id of r.verdict.cited_source_ids || []) srcTally[id] = (srcTally[id] || 0) + 1;
const top = Object.entries(srcTally).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log("\n  Most-cited sources (the agent's real evidence base):");
for (const [id, n] of top) console.log(`    ${String(n).padStart(3)} × ${id}  (${typeOf(id)})`);

fs.writeFileSync(path.join(OUT, "provenance.json"), JSON.stringify({ overall, brooksWin, brooksLose, topSources: top }, null, 2));
console.log(`\n  ${rows.length} responses analyzed → out/provenance.json\n`);
