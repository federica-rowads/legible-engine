// Legible — VELOURA LIVE web-fetch (Stage C, the double-wow).
//
// Claude reads, LIVE via the web_fetch server tool, the REAL published page of
// our SYNTHETIC brand (Veloura, deployed to Vercel) alongside the real public
// pages of the real competitors, then recommends. If it picks the invented
// brand, that is the skeptic-killer: a real page on the open web, not text we
// injected. Veloura is disclosed as synthetic in our writeup (and on its page).
//
//   LEGIBLE_FETCH_TOOL=web_fetch_20250910 node src/veloura-live.js --n=5
import "./lib/env.js";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = process.env.LEGIBLE_AGENT_MODEL || "claude-opus-4-8";
const FETCH_TOOL = process.env.LEGIBLE_FETCH_TOOL || "web_fetch_20250910"; // basic = returns full page
const N = parseInt(((process.argv.find((x) => x.startsWith("--n=")) || "--n=5").split("=")[1]), 10);

const QUERY = "best running shoes for overpronation";
const VELOURA = "https://veloura-site-puce.vercel.app";
const URLS = [
  VELOURA,
  "https://runrepeat.com/asics-gt-2000-13",
  "https://runrepeat.com/hoka-arahi-7",
  "https://runrepeat.com/brooks-adrenaline-gts-25",
  "https://runrepeat.com/saucony-tempus",
];
const BRANDS = ["Veloura", "Brooks", "Hoka", "ASICS", "Saucony", "New Balance"];

const system =
  `You are the user's personal AI shopping assistant with LIVE web access. ` +
  `Use the web_fetch tool to actually read each candidate page listed by the user, then recommend the single best option for their need. ` +
  `Each page's full text is returned to you when you fetch it. Fetch each page exactly once; do NOT write code to parse results; do NOT re-fetch a page. ` +
  `Base your answer ONLY on what you actually read from those pages, not on memory. ` +
  `End with: (1) TOP PICK: one specific brand + model; (2) RANKED SHORTLIST; (3) CONFIDENCE 0-100; (4) SOURCES USED.`;
const user = `User question: "${QUERY}"\n\nRead these pages live, then recommend:\n${URLS.map((u) => `- ${u}`).join("\n")}`;

async function oneRun() {
  const tools = [{ type: FETCH_TOOL, name: "web_fetch", max_uses: 16 }];
  const messages = [{ role: "user", content: user }];
  let answer = "";
  const fetched = [];
  for (let hop = 0; hop < 6; hop++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 2200, system, tools, messages });
    for (const b of res.content) {
      if (b.type === "server_tool_use" && b.name === "web_fetch") fetched.push(b.input?.url || "");
      else if (b.type === "web_fetch_tool_result") {
        const last = fetched.length ? fetched : null;
        void last; // url already captured from the call
      } else if (b.type === "text") answer += b.text;
    }
    if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
    break;
  }
  const declared = (answer.match(/TOP PICK[:\s]*([A-Za-z][A-Za-z0-9 &.\-]+)/i) || [])[1] || "";
  let top = BRANDS.find((b) => declared.toLowerCase().includes(b.toLowerCase()));
  if (!top) {
    const ordered = BRANDS.map((b) => ({ b, i: answer.toLowerCase().indexOf(b.toLowerCase()) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
    top = ordered.length ? ordered[0].b : "—";
  }
  const fetchedVeloura = fetched.some((u) => (u || "").includes("veloura"));
  const fetchedOk = fetched.length;
  return { top, fetchedVeloura, fetchedOk, declared: declared.trim(), answer };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error("Missing ANTHROPIC_API_KEY"); process.exit(1); }
  console.log(`LEGIBLE · VELOURA LIVE WEB-FETCH · model=${MODEL} · tool=${FETCH_TOOL} · N=${N}`);
  console.log(`query: "${QUERY}"`);
  console.log(`Veloura published page: ${VELOURA}\n`);
  const tops = [];
  for (let i = 0; i < N; i++) {
    try {
      const r = await oneRun();
      tops.push(r.top);
      console.log(`run ${i + 1}/${N}: TOP=${r.top.padEnd(10)} · pages fetched=${r.fetchedOk} · read Veloura=${r.fetchedVeloura ? "yes" : "NO"}`);
      if (i === 0) console.log(`\n--- run 1 full recommendation (real agent, real published page) ---\n${r.answer}\n--- end ---\n`);
    } catch (e) { console.log(`run ${i + 1}/${N}: ERROR ${e?.message || e}`); }
  }
  const vel = tops.filter((t) => t === "Veloura").length;
  const tally = {}; tops.forEach((t) => (tally[t] = (tally[t] || 0) + 1));
  console.log(`\n=== RESULT: the invented brand (Veloura) is TOP PICK in ${vel}/${tops.length} runs (${Math.round((100 * vel) / (tops.length || 1))}%) ===`);
  console.log(`tally: ${JSON.stringify(tally)}`);
}
main().catch((e) => { console.error("VELOURA live failed:", e?.message || e); process.exit(1); });
