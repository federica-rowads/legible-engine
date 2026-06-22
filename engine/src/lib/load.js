// Loads the REAL corpus + conditions and hard-fails if anything referenced is
// missing or not real — the no-fabrication guarantee lives here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "..", "data");

export function loadCorpus() {
  const all = JSON.parse(fs.readFileSync(path.join(DATA, "corpus.json"), "utf8"));
  const byId = new Map(all.map((s) => [s.id, s]));
  return { all, byId };
}

export function loadConditions() {
  return JSON.parse(fs.readFileSync(path.join(DATA, "conditions.json"), "utf8"));
}

// Every source_id in every level must exist AND be real. No exceptions.
export function validate(corpus, conditions) {
  const errs = [];
  for (const dim of conditions.dimensions) {
    for (const lvl of dim.levels) {
      for (const sid of lvl.source_ids) {
        const s = corpus.byId.get(sid);
        if (!s) errs.push(`level "${lvl.id}": references missing source "${sid}"`);
        else if (s.is_real !== true) errs.push(`source "${sid}": is_real !== true (fabrication not allowed)`);
      }
    }
  }
  return errs;
}
