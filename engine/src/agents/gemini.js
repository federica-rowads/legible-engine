// "Gemini" — one of the studied consumer agents. Natural-language answer.
// Activates when GEMINI_API_KEY (or GOOGLE_API_KEY) is present.
const MODEL = process.env.LEGIBLE_GEMINI_MODEL || "gemini-pro-latest";

async function run({ system, user }) {
  const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 2500 }
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return (j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "").trim();
}

export const geminiAgent = { id: "gemini", label: "Gemini", model: MODEL, run };
