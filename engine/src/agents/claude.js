// Claude as one of the studied consumer agents. Returns a natural-language
// answer (no forced tool) — we measure how the real agent actually responds.
import Anthropic from "@anthropic-ai/sdk";

// Constructed lazily so .env is already loaded when the key is read.
let _client;
const client = () => (_client ||= new Anthropic());
// The everyday Claude a consumer uses. Override with LEGIBLE_AGENT_MODEL
// (e.g. claude-opus-4-8 for the flagship pass).
export const CLAUDE_AGENT_MODEL = process.env.LEGIBLE_AGENT_MODEL || "claude-opus-4-8";

async function runClaude({ system, user }) {
  const res = await client().messages.create({
    model: CLAUDE_AGENT_MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }]
  });
  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export const claudeAgent = { id: "claude", label: "Claude", model: CLAUDE_AGENT_MODEL, run: runClaude };
