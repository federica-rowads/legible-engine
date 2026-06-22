// Agent registry. Claude is always available. The other three activate when their
// key is present — individual provider keys first, OpenRouter as a fallback for any
// still missing. Same run({system,user})->text interface, so the harness never changes.
import { claudeAgent } from "./claude.js";

const reg = { claude: claudeAgent };

if (process.env.OPENAI_API_KEY) {
  const { openaiAgent } = await import("./openai.js");
  reg.chatgpt = openaiAgent;
}
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  const { geminiAgent } = await import("./gemini.js");
  reg.gemini = geminiAgent;
}
if (process.env.PERPLEXITY_API_KEY) {
  const { perplexityAgent } = await import("./perplexity.js");
  reg.perplexity = perplexityAgent;
}

// OpenRouter fallback for any of the three not covered by an individual key
if (process.env.OPENROUTER_API_KEY) {
  const { makeOpenRouter } = await import("./openrouter.js");
  if (!reg.chatgpt) reg.chatgpt = makeOpenRouter("chatgpt", "ChatGPT", process.env.LEGIBLE_GPT_MODEL || "openai/gpt-4o");
  if (!reg.gemini) reg.gemini = makeOpenRouter("gemini", "Gemini", process.env.LEGIBLE_GEMINI_MODEL || "google/gemini-2.5-flash");
  if (!reg.perplexity) reg.perplexity = makeOpenRouter("perplexity", "Perplexity", process.env.LEGIBLE_PPLX_MODEL || "perplexity/sonar");
}

export const AGENTS = reg;

export function selectAgents(arg) {
  if (!arg || arg === "all") return Object.values(reg);
  return arg
    .split(",")
    .map((a) => reg[a.trim()])
    .filter(Boolean);
}
