import { runRealBaseline } from "./real-engine";
const t0 = Date.now();
const b = await runRealBaseline("Celio", "best affordable menswear brands for everyday work basics in France", 3);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const nR = b.agents.filter(a => a.mentionRate > 0).length;
console.log(`\nBASELINE took ${secs}s  ·  ranked by ${nR}/3 · avg #${b.avgPos ?? "—"}`);
for (const a of b.agents) console.log(`  ${a.name.padEnd(8)} ${a.mentionRate>0?`#${a.avgPos} (${a.runs.map(r=>r.pos!=null?`#${r.pos}`:"–").join(" ")})`:"not in top 10"}  top: ${a.topList.slice(0,5).join(", ")}…`);
