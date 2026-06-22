// Turns a condition level into the injected information environment the agent
// reasons over — built ONLY from the real corpus snippets (no invented text).
const TYPE_ORDER = ["owned", "editorial", "community", "structured-specs"];
const TYPE_LABEL = {
  owned: "THE BRAND'S OWN PAGES",
  editorial: "EXPERT / EDITORIAL REVIEWS",
  community: "COMMUNITY DISCUSSION (REDDIT / FORUMS)",
  "structured-specs": "PRODUCT SPECS"
};

export function buildEnvironment(level, corpus) {
  const items = level.source_ids.map((id) => corpus.byId.get(id)).filter(Boolean);
  const groups = {};
  for (const it of items) (groups[it.source_type] ||= []).push(it);

  const parts = [];
  for (const t of TYPE_ORDER) {
    if (!groups[t]) continue;
    parts.push(`== ${TYPE_LABEL[t]} ==`);
    for (const it of groups[t]) parts.push(`• ${it.title}\n  (${it.url})\n  ${it.snippet}`);
  }
  return parts.join("\n\n");
}
