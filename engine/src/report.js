// Consolidates the REAL experiment outputs into one UI-ready file the tool reads:
// src/data/legible.json. Re-run any time (e.g. after adding the 4 agents) and the
// tool refreshes — no re-wiring.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "out");
const J = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
const Jsafe = (f) => { try { return J(f); } catch { return null; } };
const L = (f) => fs.readFileSync(path.join(OUT, f), "utf8").trim().split("\n").map((x) => JSON.parse(x));

const cov = J("results-coverage.json");
const prov = J("provenance.json");
const rescue = J("predict-cov-flatfeet-framing.json");
const rawCov = L("raw-coverage.jsonl");

const FRAMING = {
  "cov-overpronation-framing": "overpronation",
  "cov-flatfeet-framing": "flat feet",
  "cov-broad-stability-framing": "stability"
};

function rep(levelId, winner) {
  const rows = rawCov.filter((r) => r.levelId === levelId);
  const w = (winner || "").toLowerCase().split(" ")[0];
  const m = rows.find((r) => (r.verdict.top_pick_brand || "").toLowerCase().includes(w)) || rows[0];
  return { model: m.verdict.top_pick_model, quote: m.verdict.verbatim_pick_sentence };
}

const coverage = cov.levels.map((l) => {
  const p = l.pooled;
  const r = rep(l.id, p.modalTop);
  return {
    framing: FRAMING[l.id] || l.id,
    query: l.query,
    brooksTop1: p.brooksTop1,
    brooksTop1CI: p.brooksTop1CI,
    brooksASoV: p.brooksASoV,
    winner: p.modalTop,
    topModel: r.model,
    quote: r.quote
  };
});

const mix = (m) => ({ owned: m.owned || 0, editorial: m.editorial || 0, community: m.community || 0, specs: m["structured-specs"] || 0 });

// ── LEGIBILITY SCORECARD: each tested lever, ranked by its MEASURED impact on the
//    brand's Agent Share of Voice (max-min across the dimension's levels). ──────
const LEVERS = [
  { lever: "Query framing", file: "results-coverage.json", controllable: false, note: "the word the buyer uses" },
  { lever: "Claim form (structured vs story)", file: "results-claim-form.json", controllable: true, note: "a spec table vs prose" },
  { lever: "Source authority", file: "results-source-authority.json", controllable: true, note: "owned vs editorial vs community" },
  { lever: "Specificity / evidence", file: "results-specificity-evidence.json", controllable: true, note: "vague vs quantified + lab-cited" },
  { lever: "Recency", file: "results-recency.json", controllable: true, note: "current vs older generation" }
];
const scorecard = LEVERS.map((x) => {
  const d = Jsafe(x.file);
  const asovs = d ? d.levels.map((l) => l.pooled.brooksASoV).filter((v) => v != null) : [];
  const high = asovs.length ? Math.max(...asovs) : 0;
  const low = asovs.length ? Math.min(...asovs) : 0;
  return { lever: x.lever, note: x.note, controllable: x.controllable, impact: high - low, low, high };
}).sort((a, b) => b.impact - a.impact);

// ── DEFAULT VERDICT: a query where the brand is WEAK (flat feet) — sets up the move ──
const weak = coverage.find((c) => c.framing === "flat feet");
const verdict = {
  query: weak.query,
  claude: { recommended: weak.brooksTop1, asov: weak.brooksASoV, winner: weak.winner, topModel: weak.topModel, quote: weak.quote }
};

// ── THE ONE MOVE: the highest-impact CONTROLLABLE lever (the structured table) ──
const oneMove = {
  title: "Publish a structured spec comparison table",
  detail:
    "The biggest lever you actually control. Your story gives agents nothing specific to repeat; a real spec grid (price, drop, weight, support, width) makes your genuine wins legible — and pushes over-budget rivals out of frame.",
  predictedLift: rescue.move.brooksTop1 - rescue.baseline.brooksTop1
};

const legible = {
  brand: cov.focalBrand,
  competitors: cov.competitors,
  agentModel: cov.agentModel,
  agents: ["Claude"], // expands to 4 when the OpenRouter key lands
  pendingAgents: ["ChatGPT", "Perplexity", "Gemini"],
  n: cov.n,
  generatedAt: cov.generatedAt,
  verdict,
  scorecard,
  oneMove,
  coverage,
  rescue: {
    query: rescue.query,
    baseTop1: rescue.baseline.brooksTop1,
    moveTop1: rescue.move.brooksTop1,
    baseASoV: rescue.baseline.brooksASoV,
    moveASoV: rescue.move.brooksASoV,
    sauconyBase: rescue.baseline.asov.Saucony,
    sauconyMove: rescue.move.asov.Saucony
  },
  provenance: { win: mix(prov.brooksWin.mix), lose: mix(prov.brooksLose.mix) }
};

const DATA = path.join(__dirname, "..", "..", "src", "data");
fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(path.join(DATA, "legible.json"), JSON.stringify(legible, null, 2));
console.log("✅ wrote src/data/legible.json");
console.log("  verdict query:", verdict.query);
console.log("  scorecard (by measured impact):");
for (const s of scorecard) console.log(`    ${(s.impact * 100).toFixed(0).padStart(3)}%  ${s.lever}${s.controllable ? "" : "  (not controllable)"}`);
console.log("  one move:", oneMove.title, `(predicted lift +${(oneMove.predictedLift * 100).toFixed(0)}pts)`);
