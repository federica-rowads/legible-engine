// Post-process raw-drivers.jsonl into a granular per-condition ranking:
// top-1 rate, focal present-rate, and AVERAGE focal rank (more discriminating
// than a saturated top-1). Usage: node src/rank-report.js [out/raw-drivers.jsonl]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(__dirname, "..", "out", "raw-drivers.jsonl");
const ABSENT_RANK = 6; // 5 brands; absent counts as worse than last

const rows = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const byCond = {};
for (const r of rows) {
  const c = r.cond;
  (byCond[c] ||= []).push(r.verdict);
}

const stat = (vs) => {
  const n = vs.length;
  const top1 = vs.filter((v) => v.focal_rank === 1).length / n;
  const present = vs.filter((v) => v.focal_rank > 0);
  const presentRate = present.length / n;
  const avgRankPresent = present.length ? present.reduce((s, v) => s + v.focal_rank, 0) / present.length : null;
  const avgRankPenalized = vs.reduce((s, v) => s + (v.focal_rank > 0 ? v.focal_rank : ABSENT_RANK), 0) / n;
  return { n, top1, presentRate, avgRankPresent, avgRankPenalized };
};

const order = Object.keys(byCond).map((c) => ({ cond: c, ...stat(byCond[c]) }));
// rank by avg penalized rank (lower = better), baseline pinned at top for reference
order.sort((a, b) => (a.cond === "baseline" ? -1 : b.cond === "baseline" ? 1 : a.avgRankPenalized - b.avgRankPenalized));

const pct = (x) => (x == null ? "  —" : (x * 100).toFixed(0).padStart(3) + "%");
const f2 = (x) => (x == null ? "  —" : x.toFixed(2).padStart(4));
console.log("\n  condition".padEnd(40) + "  n   top1   present  avgRank  avgRank*");
console.log("  " + "─".repeat(74));
for (const r of order)
  console.log("  " + r.cond.padEnd(36) + String(r.n).padStart(3) + "  " + pct(r.top1) + "   " + pct(r.presentRate) + "   " + f2(r.avgRankPresent) + "    " + f2(r.avgRankPenalized));
console.log("\n  avgRank = mean focal rank when present · avgRank* = absent penalized to " + ABSENT_RANK + " (lower is better)\n");
