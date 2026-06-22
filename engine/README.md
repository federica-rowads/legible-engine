# Legible — the experiment engine

> Cannes Lions 2026 · PMG brief: **Brand Visibility & Discovery in the Age of Agents**

This folder is the **engine**: the brand‑new, standalone code that produces the
real findings the UI shows. It runs a real AI agent (Claude) across two
controlled information environments and records whether one single third‑party
signal flips the agent's recommendation.

The **UI** lives at the repo root (TanStack/React). It reads the engine's
`out/results.json`.

## The experiment (one isolated variable)

We hold the buyer's **query constant** and change exactly **one** thing in the
brand's information environment:

| Environment | Sources the agent can see |
|---|---|
| **Baseline** | Kestrel's own (vague) website + competitors' third‑party coverage |
| **+1 Reddit** | identical to baseline **+ one** community thread endorsing Kestrel |

Everything else is byte‑identical, so any change in the agent's pick is caused
by that one signal — **the flip**. The focal brand is fictional ("Kestrel") on
purpose: the agent has no prior knowledge of it, so the environment is the only
possible cause.

## Run it

```bash
cd engine
npm install
cp .env.example .env          # paste your ANTHROPIC_API_KEY
npm run flip                  # real before/after on Claude → out/results.json

# No key handy? See the controlled environments themselves:
npm run dry
```

## Next (M1)

Add ChatGPT, Perplexity, and Gemini behind the same `getVerdict()` interface
(one OpenRouter key), plus the provenance 2×2 and the live‑browsing reality
check.
