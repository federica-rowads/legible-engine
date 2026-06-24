// De-risk Phase 1: native web search for all 3 agents (open question, no brand mention).
//   set -a; . engine/.env; set +a; bun src/lib/test-native.ts
const Q = "tell me stores to buy my capsule wardrobe as a man";

// Claude — server-side web search tool. Single response; may pause_turn to resume.
async function claudeSearch(query: string): Promise<string> {
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];
  const messages: unknown[] = [{ role: "user", content: query }];
  for (let hop = 0; hop < 5; hop++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 2000, messages, tools }),
    });
    if (!r.ok) return `ERR claude ${r.status}: ${(await r.text()).slice(0, 240)}`;
    const j = await r.json();
    messages.push({ role: "assistant", content: j.content });
    if (j.stop_reason !== "pause_turn") {
      return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    }
  }
  return "(claude: exhausted pause_turn loop)";
}

// ChatGPT — Responses API with the web_search tool.
async function openaiSearch(query: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.5", input: query, tools: [{ type: "web_search" }] }),
  });
  if (!r.ok) return `ERR openai ${r.status}: ${(await r.text()).slice(0, 240)}`;
  const j = await r.json();
  if (typeof j.output_text === "string" && j.output_text) return j.output_text;
  const texts = (j.output || []).flatMap((o: { content?: { type: string; text?: string }[] }) => (o.content || []).filter((c) => c.type === "output_text").map((c) => c.text || ""));
  return texts.join("") || `(openai: no text; keys=${Object.keys(j).join(",")})`;
}

// Gemini — Google Search grounding.
async function geminiSearch(query: string): Promise<string> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: query }] }], tools: [{ google_search: {} }] }),
  });
  if (!r.ok) return `ERR gemini ${r.status}: ${(await r.text()).slice(0, 240)}`;
  const j = await r.json();
  const parts = j.candidates?.[0]?.content?.parts || [];
  return parts.map((p: { text?: string }) => p.text || "").join("") || `(gemini: no text)`;
}

const main = async () => {
  console.log(`QUERY: "${Q}"\n`);
  const [c, o, g] = await Promise.all([claudeSearch(Q), openaiSearch(Q), geminiSearch(Q)]);
  console.log("=== CLAUDE (opus-4-8 + web_search) ===\n" + c.slice(0, 900) + "\n");
  console.log("=== CHATGPT (gpt-5.5 + web_search) ===\n" + o.slice(0, 900) + "\n");
  console.log("=== GEMINI (gemini-pro + google_search) ===\n" + g.slice(0, 900) + "\n");
};
main().catch((e) => { console.error(e); process.exit(1); });
