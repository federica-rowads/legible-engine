import { runRealBaseline } from "./real-engine";
const b = await runRealBaseline("Ligne Roset", "I need a new couch where should i go", 3);
const nR = b.agents.filter(a=>a.mentionRate>0).length;
console.log(`\n=== NEW (top-10 ranking) — Ligne Roset ===`);
console.log(`HEADLINE: ranked by ${nR}/3 agents · avg rank ${b.avgPos ?? "—"}`);
for (const a of b.agents){
  console.log(`\n  ${a.name} — ${a.mentionRate>0?`#${a.avgPos} of 10 (${a.runs.map(r=>r.pos!=null?`#${r.pos}`:"–").join(" ")})`:"NOT in its top 10"}`);
  console.log(`    its top 10: ${a.topList.slice(0,10).map((x,i)=>`${i+1}.${x}`).join("  ")}`);
}
