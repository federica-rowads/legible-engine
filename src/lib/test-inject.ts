import { runFull } from "./real-engine";
const t0=Date.now();
const r=await runFull("Celio","best affordable menswear brands for everyday work basics in France",["comparison","reviews","community"],2,2);
console.log(`\nFULL took ${((Date.now()-t0)/1000).toFixed(0)}s`);
console.log(`BASELINE (before): ranked ${r.baseline.agents.filter(a=>a.mentionRate>0).length}/3 · avg #${r.baseline.avgPos}`);
for(const a of r.baseline.agents) console.log(`  ${a.name.padEnd(8)} ${a.runs.every(x=>!x.ok)?"FAILED":a.mentionRate>0?`#${a.avgPos}`:"not top10"} ${a.runs.map(x=>x.pos!=null?`#${x.pos}`:(x.ok?"–":"x")).join(" ")}`);
console.log(`TREATMENT (after, real+inject): ranked ${r.treatment.agents.filter(a=>a.mentionRate>0).length}/3 · avg #${r.treatment.avgPos}`);
for(const a of r.treatment.agents) console.log(`  ${a.name.padEnd(8)} ${a.runs.every(x=>!x.ok)?"FAILED":a.mentionRate>0?`#${a.avgPos}`:"not top10"} ${a.runs.map(x=>x.pos!=null?`#${x.pos}`:(x.ok?"–":"x")).join(" ")}`);
console.log(`LIFT: #${r.baseline.avgPos} -> #${r.treatment.avgPos}`);
