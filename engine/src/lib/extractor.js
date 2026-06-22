// One consistent judge parses every agent answer into the same structured
// fields — so the metric is comparable across all four agents and across runs.
import Anthropic from "@anthropic-ai/sdk";

// Constructed lazily so .env is already loaded when the key is read.
let _client;
const client = () => (_client ||= new Anthropic());
const EXTRACTOR_MODEL = process.env.LEGIBLE_EXTRACTOR_MODEL || "claude-sonnet-4-6";
const BRANDS = ["Brooks", "Hoka", "ASICS", "Saucony", "New Balance"];

const TOOL = {
  name: "record",
  description: "Record the structured recommendation parsed from an AI shopping assistant's answer.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      top_pick_brand: { type: "string", description: `the single #1 recommended brand: one of ${BRANDS.join(", ")}, or "other", or "none"` },
      top_pick_model: { type: "string", description: `the specific model named for the top pick, or "none"` },
      ranked_brands: { type: "array", items: { type: "string" }, description: "the candidate brands in recommended order, best first" },
      focal_rank: { type: "integer", description: `Brooks' 1-indexed position in ranked_brands; 0 if Brooks is absent` },
      focal_mentioned: { type: "boolean", description: "was Brooks named anywhere in the answer" },
      confidence_selfreport: { type: "integer", description: "the 0-100 confidence the answer states for its top pick; -1 if none stated" },
      cited_source_ids: { type: "array", items: { type: "string" }, description: "corpus source ids the answer clearly leaned on (by distinctive phrase/spec); empty if unclear" },
      price_within_cap_claim: { type: "string", enum: ["true", "false", "unstated"], description: "did the answer assert/honor the under-$150 constraint for its pick" },
      decisive: { type: "boolean", description: "true if one concrete model is recommended; false if it punts to a vague list" },
      use_case_interpretation: { type: "string", enum: ["overpronation", "flat-feet", "broad-stability", "unclear"] },
      verbatim_pick_sentence: { type: "string", description: "the exact sentence stating the recommendation (for audit)" }
    },
    required: [
      "top_pick_brand", "top_pick_model", "ranked_brands", "focal_rank", "focal_mentioned",
      "confidence_selfreport", "cited_source_ids", "price_within_cap_claim", "decisive",
      "use_case_interpretation", "verbatim_pick_sentence"
    ]
  }
};

export async function extract(answer, { sourceIds }) {
  const system =
    `You are a precise extraction judge. Parse the AI shopping assistant's answer into structured fields. ` +
    `Consider only these brands: ${BRANDS.join(", ")}. The corpus source ids that were available to the assistant: ` +
    `${sourceIds.join(", ")}. For cited_source_ids, list ids the answer clearly relied on (matched by distinctive ` +
    `phrases/specs); empty if unclear. Be faithful — never invent.`;

  const res = await client().messages.create({
    model: EXTRACTOR_MODEL,
    max_tokens: 700,
    system,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record" },
    messages: [{ role: "user", content: `ANSWER:\n${answer}` }]
  });
  const b = res.content.find((x) => x.type === "tool_use");
  if (!b) throw new Error("extractor returned no structured output");
  return b.input;
}
