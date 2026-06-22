// Legible — LIVE runner (R0 de-risk / the rung that decides R2 & R3).
//
// Unlike run.js (browsing OFF, a curated corpus injected into the prompt), this
// runs the REAL agent with web access ON: Claude uses the web_fetch server tool
// to read a fixed set of REAL public URLs live, then recommends. This is the
// first truly-LIVE Agent-Share-of-Voice reading — and the spike that proves the
// live flip is feasible: change one of these pages → re-run → the pick moves,
// on the open web, not in a sandbox.
//
//   node src/live.js
//   node src/live.js --q="Best stability running shoes for overpronation under $150"
import "./lib/env.js"; // loads .env before the client reads ANTHROPIC_API_KEY
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = process.env.LEGIBLE_AGENT_MODEL || "claude-opus-4-8";
// web_fetch only fetches URLs already present in the conversation — we provide them.
const FETCH_TOOL = process.env.LEGIBLE_FETCH_TOOL || "web_fetch_20260209"; // basic fallback: web_fetch_20250910

const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};

const QUERY = argOf("q", "Best running shoes for flat feet / overpronation under $150");

// The live candidate set — REAL, public pages a shopping agent would actually
// read, one spec/review source per contender + the category guides. Neutral on
// purpose: we are reading who the live web favors today (the "before").
const URLS = [
  "https://runrepeat.com/guides/best-overpronation-running-shoes",
  "https://runrepeat.com/guides/best-flat-feet-running-shoes",
  "https://www.brooksrunning.com/en_us/mens/shoes/road-running-shoes/adrenaline-gts-25/110454.html",
  "https://runrepeat.com/asics-gt-2000-13",
  "https://runrepeat.com/hoka-arahi-7",
  "https://runrepeat.com/saucony-tempus",
  "https://runrepeat.com/new-balance-fresh-foam-x-860-v14"
];

const BRANDS = ["Brooks", "Hoka", "ASICS", "Saucony", "New Balance"];

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

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("\n  Missing ANTHROPIC_API_KEY (engine/.env). Aborting.\n");
    process.exit(1);
  }
  banner(`LEGIBLE · LIVE · model=${MODEL} · tool=${FETCH_TOOL}`);
  console.log(`  query (constant): "${QUERY}"`);
  console.log(`  live candidate pages: ${URLS.length}\n`);

  const tools = [{ type: FETCH_TOOL, name: "web_fetch", max_uses: 16 }];
  let messages = [{ role: "user", content: user }];

  const fetched = []; // { url, ok, note }
  let answer = "";
  let stop = "";

  // Server-tool loop: web_fetch runs server-side; on the 10-iteration cap the
  // turn pauses (stop_reason: "pause_turn") and we re-send to resume.
  for (let hop = 0; hop < 6; hop++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 2200, system, tools, messages });

    for (const b of res.content) {
      if (b.type === "server_tool_use" && b.name === "web_fetch") {
        fetched.push({ url: b.input?.url || "(unknown)", ok: null, note: "called" });
      } else if (b.type === "web_fetch_tool_result") {
        const c = b.content;
        const last = fetched[fetched.length - 1];
        const errCode = c && (c.error_code || (c.type === "web_fetch_tool_error" && c.error_code));
        if (errCode) {
          if (last) { last.ok = false; last.note = `ERROR ${errCode}`; }
        } else {
          // success: c is a web_fetch_result carrying a document block
          const doc = c?.content;
          const chars = typeof doc?.source?.data === "string" ? doc.source.data.length
            : typeof doc?.text === "string" ? doc.text.length : null;
          if (last) { last.ok = true; last.note = chars != null ? `ok (${chars} chars)` : "ok"; }
          if (c?.url && last) last.url = c.url;
        }
      } else if (b.type === "text") {
        answer += b.text;
      }
    }

    stop = res.stop_reason;
    if (stop === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue; // resume the server-tool turn
    }
    break;
  }

  banner("LIVE FETCHES (did the agent really read the open web?)");
  if (!fetched.length) console.log("  (no web_fetch calls — the tool may be disabled on this key)");
  for (const f of fetched) console.log(`  ${f.ok === true ? "✓" : f.ok === false ? "✗" : "·"} ${f.note.padEnd(18)} ${f.url}`);

  banner("THE LIVE RECOMMENDATION (real agent, real web)");
  console.log(answer.trim() || "(no text returned)");

  // crude first-pick detector for an at-a-glance ASoV signal
  const idx = BRANDS.map((b) => ({ b, i: answer.toLowerCase().indexOf(b.toLowerCase()) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  const topMatch = (answer.match(/TOP PICK[:\s]*([A-Za-z][A-Za-z &]+)/i) || [])[1];
  banner("SIGNAL");
  console.log(`  stop_reason: ${stop}`);
  console.log(`  fetches ok: ${fetched.filter((f) => f.ok === true).length}/${fetched.length}`);
  console.log(`  TOP PICK (declared): ${topMatch ? topMatch.trim() : "—"}`);
  console.log(`  first brand named:   ${idx.length ? idx[0].b : "—"}`);
  console.log("");
}

main().catch((e) => {
  console.error("\n  LIVE run failed:", e?.message || e);
  if (String(e?.message || e).match(/web_fetch|tool|beta|400/i)) {
    console.error("  → if it's the tool type, retry with: LEGIBLE_FETCH_TOOL=web_fetch_20250910 node src/live.js\n");
  }
  process.exit(1);
});
