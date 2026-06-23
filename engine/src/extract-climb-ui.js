// Build the UI data file from the 361 climb raw transcripts: per-agent
// before (baseline) vs after (authority/full) rank, confidence, quote, sources.
import fs from "node:fs";
const rows = fs.readFileSync("out/raw-361.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const agents = ["chatgpt", "claude", "gemini"];
const nameMap = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini" };
const conds = ["baseline", "specs", "reviews", "authority"];

const avgRank = (c, a) => {
  const v = rows.filter((r) => r.cond === c && (a ? r.agent === a : true)).map((r) => (r.verdict.focal_rank > 0 ? r.verdict.focal_rank : 7));
  return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
};
const rep = (c, a) => {
  const runs = rows.filter((r) => r.cond === c && r.agent === a);
  const avg = avgRank(c, a);
  runs.sort((x, y) => Math.abs((x.verdict.focal_rank || 7) - avg) - Math.abs((y.verdict.focal_rank || 7) - avg));
  return runs[0]?.verdict || {};
};
const card = (c, a) => {
  const v = rep(c, a);
  return {
    name: nameMap[a],
    rank: Math.round(avgRank(c, a)),
    confidence: v.confidence_selfreport > 0 ? v.confidence_selfreport : null,
    pick: v.top_pick_brand || "",
    quote: v.verbatim_pick_sentence || "",
    sources: (v.cited_source_ids || []).slice(0, 2),
  };
};
const top1 = (c) => { const v = rows.filter((r) => r.cond === c); return +(v.filter((r) => r.verdict.focal_rank === 1).length / v.length).toFixed(2); };

const data = {
  brand: "361° Phoenix 2",
  brandFull: "361 Degrees",
  query: "best stability running shoes for overpronation",
  agents: ["ChatGPT", "Claude", "Gemini"],
  factors: [
    { id: "specs", label: "Publish structured specs", desc: "A machine-readable spec sheet: stack, drop, support tech, widths, price." },
    { id: "reviews", label: "Surface reviews & durability", desc: "Real owner reviews and the standout, lab-tested durability record." },
    { id: "authority", label: "Earn third-party expert authority", desc: "An independent lab score (Doctors of Running: 88.8%, 9.5/10 stability)." },
  ],
  steps: conds.map((c) => ({ cond: c, avgRank: +avgRank(c).toFixed(1), top1: top1(c) })),
  before: { avgRank: +avgRank("baseline").toFixed(1), top1: top1("baseline"), agents: agents.map((a) => card("baseline", a)) },
  after: { avgRank: +avgRank("authority").toFixed(1), top1: top1("authority"), agents: agents.map((a) => card("authority", a)) },
};
fs.writeFileSync("../src/data/climb361.json", JSON.stringify(data, null, 2));
console.log(JSON.stringify(data, null, 2));
