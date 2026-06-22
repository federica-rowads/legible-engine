// "Perplexity" — one of the studied consumer agents. OpenAI-compatible API.
// Activates when PERPLEXITY_API_KEY is present. NOTE: Perplexity's sonar models
// browse the live web by default — for the CONTROLLED arm (corpus injected) treat
// its results with that caveat; it's the natural fit for the live-browsing arm.
const MODEL = process.env.LEGIBLE_PPLX_MODEL || "sonar-pro";

async function run({ system, user }) {
  const KEY = process.env.PERPLEXITY_API_KEY;
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return (j.choices?.[0]?.message?.content || "").trim();
}

export const perplexityAgent = { id: "perplexity", label: "Perplexity", model: MODEL, run };
