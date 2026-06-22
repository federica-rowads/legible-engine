// The agent answers like a real consumer shopping assistant — in natural
// language. We do NOT force structure here (that would change its behavior);
// a separate consistent extractor parses the answer afterwards.
export function buildPrompt(query, environment) {
  const system =
    `You are the user's personal AI shopping assistant. Web browsing is OFF — ` +
    `rely ONLY on the information provided to you below; do not use outside knowledge. ` +
    `Recommend the single best option for the user's need: name one specific brand + model as your top pick, ` +
    `give a short ranked shortlist of the main options, and state how confident you are on a 0–100 scale. ` +
    `Be decisive and base everything strictly on the information provided.`;

  const user =
    `User: "${query}"\n\n` +
    `INFORMATION AVAILABLE TO YOU:\n\n${environment}\n\n` +
    `Now give your recommendation: your single best pick (brand + specific model), a short ranking of the main options, ` +
    `and your confidence (0–100).`;

  return { system, user };
}
