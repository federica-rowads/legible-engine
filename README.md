# Legible — Brand Visibility & Discovery in the Age of Agents

> Rowads · Cannes Lions 2026 · AI & Tech Sandbox Global Hackathon (PMG)
> **The SEO of the agent era.**

When a consumer asks an AI agent what to buy, the agent picks one brand — the
customer never sees an ad or a list. **Legible measures whether AI agents
recommend your brand, why, and the one real-world move that changes their
answer.**

This is a **research challenge**: the findings are the deliverable, and the tool
is what we build from them. Everything here is **real, sourced, and auditable** —
no fabricated data.

## The method

We don't build an agent — we use real ones (Claude today; ChatGPT, Perplexity,
Gemini next). What we build is the **environment** the agent reasons over: a
controlled set of inputs curated from a brand's **real public information** (its
site, real reviews, real Reddit, real specs). We **hold the buyer's query
constant, change one thing at a time, and measure what flips the recommendation.**

- **Brand:** Brooks (running shoes), vs Hoka / ASICS / Saucony / New Balance.
- **Metric:** **Agent Share of Voice (ASoV)** — a brand's share of the AI's
  recommendations across runs, plus the simpler top-1 rate.
- **Rigor:** every condition runs N times (agents are stochastic); a consistent
  Claude judge parses each answer into structured fields; we report 95%
  confidence intervals.

## What we found (real runs, on real data)

- **The buyer's word is the biggest lever.** Same sources, change one word —
  "overpronation" → "flat feet" — and Brooks flips from recommended **100%** of
  the time to **0%** (95% CI 100–100% vs 0–0%; no overlap).
- **The prediction loop works.** Where Brooks was invisible for "flat feet" (0%),
  we predicted that injecting **one real spec comparison table** would fix it —
  re-ran, and Brooks went **0% → 100% #1**, while the over-budget competitor
  collapsed. Predicted → proven, zero fabricated data.
- **Agents ignore the budget.** They recommend a $155 shoe for an "under $150"
  query and don't flag it.

## Repo structure

| Path | What |
|---|---|
| `engine/` | The experiment engine (Node). Brand-new standalone code. |
| `engine/data/` | The **real** corpus (28 sourced items, real URLs), the ablation conditions, the specs, and a provenance trail. |
| `engine/out/` | Every result + **every raw agent response** (the audit trail). |
| `src/` | The tool / UI (TanStack + React). Reads the engine's results. |

## Run it

```bash
# The experiment engine
cd engine
npm install
cp .env.example .env          # add your ANTHROPIC_API_KEY
npm run dry                   # inspect the controlled environments (no key needed)
node src/run.js --dim=coverage --n=9      # the coverage flip
node src/predict.js --base=cov-flatfeet-framing --query="Best running shoes for flat feet under $150"  # the prediction loop

# The tool / UI
cd ..  && npm install && npm run dev
```

## Notes

Brand-new code for the hackathon, no dependency on any private infrastructure.
No secrets are committed (`.env` is gitignored). All source material is public
and individually traceable to a URL.
