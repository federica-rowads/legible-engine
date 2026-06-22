// Turns a set of extracted verdicts (for one condition) into the metrics that
// make findings "hold up": Agent Share of Voice, top-1 rate, focal-mention
// rate, and run-to-run consistency (behavioral confidence).
export const BRANDS = ["Brooks", "Hoka", "ASICS", "Saucony", "New Balance"];
const W = { top1: 3, ranked: 1 }; // mention term folded into focal-mention rate

export function canon(s) {
  if (!s) return null;
  const t = String(s).toLowerCase();
  if (t.includes("brook")) return "Brooks";
  if (t.includes("hoka")) return "Hoka";
  if (t.includes("asic")) return "ASICS";
  if (t.includes("saucony")) return "Saucony";
  if (t.includes("new balance") || t.includes("newbalance") || t === "nb") return "New Balance";
  return null; // "other"/"none" — counted as out-of-set
}

function responseWeights(v) {
  const top = canon(v.top_pick_brand);
  const ranked = (v.ranked_brands || []).map(canon);
  const w = {};
  for (const b of BRANDS) {
    let s = 0;
    if (top === b) s += W.top1;
    const idx = ranked.indexOf(b);
    if (idx >= 0) s += W.ranked * (1 / (idx + 1));
    w[b] = s;
  }
  return w;
}

// 95% bootstrap confidence interval for a statistic over the N verdicts.
function bootstrapCI(items, statFn, B = 1000) {
  const n = items.length;
  if (!n) return [null, null];
  const s = [];
  for (let b = 0; b < B; b++) {
    const r = new Array(n);
    for (let i = 0; i < n; i++) r[i] = items[Math.floor(Math.random() * n)];
    s.push(statFn(r));
  }
  s.sort((a, b) => a - b);
  return [s[Math.floor(0.025 * (B - 1))], s[Math.ceil(0.975 * (B - 1))]];
}

export function aggregate(verdicts) {
  const n = verdicts.length;
  if (!n) return { n: 0 };

  // ASoV (weighted)
  const sum = Object.fromEntries(BRANDS.map((b) => [b, 0]));
  for (const v of verdicts) {
    const w = responseWeights(v);
    for (const b of BRANDS) sum[b] += w[b];
  }
  const total = BRANDS.reduce((a, b) => a + sum[b], 0) || 1;
  const asov = Object.fromEntries(BRANDS.map((b) => [b, sum[b] / total]));

  // top-1 rate per brand
  const top1 = Object.fromEntries(BRANDS.map((b) => [b, 0]));
  let outOfSetTop = 0;
  for (const v of verdicts) {
    const c = canon(v.top_pick_brand);
    if (c) top1[c] += 1;
    else outOfSetTop += 1;
  }
  for (const b of BRANDS) top1[b] /= n;

  // focal (Brooks) specifics
  const brooksMentionRate = verdicts.filter((v) => v.focal_mentioned).length / n;
  const ranks = verdicts.map((v) => v.focal_rank).filter((r) => r > 0);
  const brooksAvgRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;

  // run-to-run consistency = share of responses equal to the modal top pick
  const counts = {};
  for (const v of verdicts) {
    const c = canon(v.top_pick_brand) || "other";
    counts[c] = (counts[c] || 0) + 1;
  }
  const modal = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const consistency = modal[1] / n;

  // self-reported confidence (mean of those that stated one)
  const confs = verdicts.map((v) => v.confidence_selfreport).filter((c) => c >= 0);
  const confSelf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length / 100 : null;

  const decisiveRate = verdicts.filter((v) => v.decisive).length / n;
  const priceCapHonored = verdicts.filter((v) => v.price_within_cap_claim === "true").length / n;

  return {
    n,
    asov,
    top1,
    outOfSetTopRate: outOfSetTop / n,
    brooksTop1: top1["Brooks"],
    brooksTop1CI: bootstrapCI(verdicts, (vs) => vs.filter((v) => canon(v.top_pick_brand) === "Brooks").length / vs.length),
    brooksASoV: asov["Brooks"],
    brooksMentionRate,
    brooksAvgRank,
    modalTop: modal[0],
    consistency,
    confSelf,
    confConsistency: consistency, // behavioral confidence proxy
    calibrationGap: confSelf == null ? null : confSelf - consistency,
    decisiveRate,
    priceCapHonored
  };
}
