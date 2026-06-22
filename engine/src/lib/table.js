// Builds the head-to-head comparison TABLE — the prediction-loop "move".
// Pure restructuring of real specs into a grid. No opinions, no endorsements.
// Validates every shoe traces to a real corpus source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadSpecs() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "specs.json"), "utf8"));
}

export function buildComparisonTable(specs, corpus) {
  // no-fabrication guard: every shoe must map to a real corpus source
  for (const s of specs.shoes) {
    const src = corpus.byId.get(s.sourceId);
    if (!src || src.is_real !== true) throw new Error(`spec for ${s.model} has no real source (${s.sourceId})`);
  }
  const cap = specs.cap;
  const priceCell = (p) => `$${p}${p <= cap ? ` (under $${cap} ✓)` : ` (over $${cap} ✗)`}`;
  const votes = (v) => (v == null ? "—" : `${v}`);

  const header = `| Shoe | Price vs $${cap} cap | Weight | Drop | Support | Width | True-to-size votes |`;
  const sep = `|---|---|---|---|---|---|---|`;
  const rows = specs.shoes.map(
    (s) => `| ${s.brand} ${s.model} | ${priceCell(s.price)} | ${s.weight} | ${s.drop} | ${s.support} | ${s.width} | ${votes(s.trueToSizeVotes)} |`
  );
  return [
    "== HEAD-TO-HEAD SPEC COMPARISON ==",
    `(${specs.note})`,
    "",
    header,
    sep,
    ...rows
  ].join("\n");
}
