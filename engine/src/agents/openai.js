// "ChatGPT" — flagship consumer model (what a real buyer's ChatGPT uses today).
const MODEL = process.env.LEGIBLE_OPENAI_MODEL || "gpt-5.5";

async function run({ system, user }) {
  const KEY = process.env.OPENAI_API_KEY;
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };
  // GPT-5 / o-series use max_completion_tokens (and reason internally → give headroom)
  if (/^(gpt-5|o[0-9])/.test(MODEL)) body.max_completion_tokens = 2500;
  else body.max_tokens = 900;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return (j.choices?.[0]?.message?.content || "").trim();
}

export const openaiAgent = { id: "chatgpt", label: "ChatGPT", model: MODEL, run };
