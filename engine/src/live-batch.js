// Legible — LIVE batch runner (R1 rigor).
//
// Runs the LIVE agent (real web_fetch of real public URLs) N times, holding the
// buyer query AND the candidate page set constant, then parses each transcript
// into a structured verdict (Claude-as-judge, reusing lib/extractor.js) and
// aggregates into Agent Share of Voice with 95% bootstrap CIs (lib/metrics.js).
//
// This turns the n=1 hero finding into a measured RATE: across N live runs, how
// often does the agent drop the editorial #1 (Brooks Adrenaline GTS 25, $155)
// for being $5 over the buyer's $150 budget — and who wins instead?
//
//   node src/live-batch.js --n=8 --conc=2
//   node src/live-batch.js --n=10 --conc=3 --q="Best stability running shoes for overpronation under $150"
import "./lib/env.js"; // loads .env before the Anthropic client reads the key
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { extract } from "./lib/extractor.js";
import { aggregate, BRANDS } from "./lib/metrics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();
const MODEL = process.env.LEGIBLE_AGENT_MODEL || "claude-opus-4-8";
// Basic web_fetch returns the FULL page (incl. the price) to the model. The
// dynamic-filtering variant (_20260209) filtered the PDP and hid the price.
const FETCH_TOOL = process.env.LEGIBLE_FETCH_TOOL || "web_fetch_20250910";

const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};
const N = parseInt(argOf("n", "8"), 10);
const CONC = parseInt(argOf("conc", "2"), 10);
const QUERY = argOf("q", "Best running shoes for flat feet / overpronation under $150");
const LABEL = argOf("label", "live");
// R2 (the flip): extra candidate page(s) the brand publishes — the "Act" step.
const EXTRA = (argOf("extra", "") || "").split(",").map((s) => s.trim()).filter(Boolean);

// The live candidate set — REAL public pages a shopping agent would read: the
// two category guides + one spec/review page per contender + the brand's own PDP.
const URLS = [
  "https://runrepeat.com/guides/best-overpronation-running-shoes",
  "https://runrepeat.com/guides/best-flat-feet-running-shoes",
  "https://www.brooksrunning.com/en_us/mens/shoes/road-running-shoes/adrenaline-gts-25/110454.html",
  "https://runrepeat.com/asics-gt-2000-13",
  "https://runrepeat.com/hoka-arahi-7",
  "https://runrepeat.com/saucony-tempus",
  "https://runrepeat.com/new-balance-fresh-foam-x-860-v14"
];
for (const u of EXTRA) URLS.push(u); // append the brand's published page(s) for the flip

// Source-id hints for the extraction judge (used only to populate cited_source_ids;
// does not affect ASoV, which is computed from top_pick/ranked_brands).
const SOURCE_HINT = [
  "brooks-adrenaline-gts-25-pdp", "asics-gt-2000-13", "hoka-arahi-7",
  "saucony-tempus-1", "nb-860v14", "runrepeat-overpronation-guide", "runrepeat-flatfeet-guide"
];

const system =
  `You are the user's personal AI shopping assistant with LIVE web access. ` +
  `Use the web_fetch tool to actually read each candidate page listed by the user, then recommend the single best option for their need. ` +
  `Each page's full text is returned to you directly when you fetch it — read it as provided. Fetch each page exactly once; do NOT write code to parse the results, and do NOT re-fetch a page you have already retrieved. ` +
  `Base your answer ONLY on what you actually read from those pages — do not rely on memory. ` +
  `End with: (1) TOP PICK: one specific brand + model; (2) RANKED SHORTLIST; (3) CONFIDENCE 0-100; (4) SOURCES USED: which pages backed your pick.`;

const user =
  `User question: "${QUERY}"\n\n` +
  `Read these pages live, then recommend:\n${URLS.map((u) => `- ${u}`).join("\n")}`;

function banner(t) {
  console.log("\n" + "─".repeat(72) + "\n " + t + "\n" + "─".repeat(72));
}

// One LIVE recommendation: real agent, real web_fetch, with the server-tool
// pause_turn loop. Returns the answer text + the URLs it fetched.
async function liveOnce() {
  const tools = [{ type: FETCH_TOOL, name: "web_fetch", max_uses: 10 }];
  let messages = [{ role: "user", content: user }];
  let answer = "";
  let stop = "";
  const fetched = [];
  for (let hop = 0; hop < 8; hop++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 2200, system, tools, messages });
    for (const b of res.content) {
      if (b.type === "server_tool_use" && b.name === "web_fetch") fetched.push(b.input?.url || "(unknown)");
      else if (b.type === "text") answer += b.text;
    }
    stop = res.stop_reason;
    if (stop === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue; // resume the server-tool turn
    }
    break;
  }
  return { answer, stop, fetchCount: fetched.length };
}

// Bounded-concurrency pool (same shape as run.js).
async function runPool(items, worker, conc) {
  const out = new Array(items.length);
  let i = 0, done = 0;
  const next = async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await worker(items[idx], idx);
      } catch (e) {
        out[idx] = { __error: String((e && e.message) || e) };
      }
      done++;
      process.stdout.write(`\r  live runs… ${done}/${items.length}   `);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, next));
  process.stdout.write("\n");
  return out;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("\n  Missing ANTHROPIC_API_KEY (engine/.env). Aborting.\n");
    process.exit(1);
  }
  banner(`LEGIBLE · LIVE BATCH · model=${MODEL} · tool=${FETCH_TOOL} · N=${N} · conc=${CONC}`);
  console.log(`  query (constant): "${QUERY}"`);
  console.log(`  live candidate pages: ${URLS.length}\n`);

  const reps = Array.from({ length: N }, (_, i) => i);
  const raws = await runPool(
    reps,
    async (rep) => {
      const { answer, stop, fetchCount } = await liveOnce();
      if (!answer.trim()) throw new Error(`empty answer (stop=${stop}, fetches=${fetchCount})`);
      const verdict = await extract(answer, { sourceIds: SOURCE_HINT });
      return { rep, query: QUERY, stop, fetchCount, answer, verdict };
    },
    CONC
  );

  const ok = raws.filter((r) => r && !r.__error && r.verdict);
  const failed = raws.length - ok.length;
  if (failed) {
    console.log(`  ⚠ ${failed}/${raws.length} runs errored (continuing with ${ok.length}).`);
    const firstErr = raws.find((r) => r && r.__error);
    if (firstErr) console.log(`    first error: ${firstErr.__error}`);
  }
  if (!ok.length) { console.error("\n  No usable runs. Aborting.\n"); process.exit(1); }

  const verdicts = ok.map((r) => r.verdict);
  const agg = aggregate(verdicts);
  const pct = (x) => (x == null ? "  —" : (x * 100).toFixed(0).padStart(3) + "%");

  banner(`AGENT SHARE OF VOICE — live, ${ok.length} runs (${MODEL})`);
  console.log("  brand".padEnd(20) + "top-1     ASoV");
  for (const b of BRANDS) {
    console.log("  " + b.padEnd(18) + pct(agg.top1[b]) + "     " + pct(agg.asov[b]));
  }
  const ci = agg.brooksTop1CI && agg.brooksTop1CI[0] != null
    ? ` [95% CI ${pct(agg.brooksTop1CI[0])}–${pct(agg.brooksTop1CI[1])}]` : "";

  banner("THE FINDING (editorial #1 vs the agent)");
  console.log(`  Editorial: RunRepeat names Brooks Adrenaline GTS 25 the "Best Overall" for overpronation.`);
  console.log(`  Agent (live, N=${ok.length}):`);
  console.log(`    Brooks is the agent's #1 pick:   ${pct(agg.brooksTop1)}${ci}`);
  console.log(`    Brooks average rank:             ${agg.brooksAvgRank == null ? "—" : agg.brooksAvgRank.toFixed(1)}`);
  console.log(`    Modal winner instead:            ${agg.modalTop}`);
  console.log(`    Runs honoring the $150 budget:   ${pct(agg.priceCapHonored)}`);
  console.log(`    Run-to-run consistency:          ${pct(agg.consistency)}`);
  console.log("");

  // ── persist (audit trail) ──────────────────────────────────────────────────
  const OUT = path.join(__dirname, "..", "out");
  fs.mkdirSync(OUT, { recursive: true });
  const results = {
    mode: "live",
    model: MODEL,
    fetchTool: FETCH_TOOL,
    query: QUERY,
    urls: URLS,
    n: ok.length,
    nRequested: N,
    generatedAt: new Date().toISOString(),
    aggregate: agg
  };
  fs.writeFileSync(path.join(OUT, `results-${LABEL}.json`), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT, `raw-${LABEL}.jsonl`), ok.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`  → out/results-${LABEL}.json  +  out/raw-${LABEL}.jsonl  (${ok.length} transcripts, full audit trail)\n`);
}

main().catch((e) => {
  console.error("\n  LIVE batch failed:", e?.message || e);
  process.exit(1);
});
