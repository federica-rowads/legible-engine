// The other three studied agents (ChatGPT, Gemini, Perplexity) through ONE
// OpenRouter key. Activated automatically by agents/index.js when
// OPENROUTER_API_KEY is present. OpenAI-compatible chat completions.
const KEY = process.env.OPENROUTER_API_KEY;

export function makeOpenRouter(id, label, model) {
  return {
    id,
    label,
    model,
    run: async ({ system, user }) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Legible Experiment Engine"
        },
        body: JSON.stringify({
          model,
          max_tokens: 900,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ]
        })
      });
      if (!res.ok) throw new Error(`OpenRouter ${id} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = await res.json();
      return (j.choices?.[0]?.message?.content || "").trim();
    }
  };
}
