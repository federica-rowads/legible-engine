# LEGIBLE — Session Handoff & Context Pack

> **MISSION (North Star): WIN the PMG "AI & Tech Sandbox" Cannes Lions 2026 Hackathon. This is the only objective.**
> You are a fresh Claude Code session continuing in-flight work. You have NONE of the prior conversation — this document is your full brief. Read it top to bottom before acting.

---

## 0. How to operate (read first)

- **Every decision is moved by one question: does it help us WIN?** Not sunk cost, not prior artifacts (several are deprecated — see §9), not external comments. Re-decide experiments / findings / tool / story with each new data point.
- **Driver:** Federica Doglio (`federica@rowads.studio`) — operator + builder. She will steer you from her phone. Keep momentum, propose the next concrete action, don't write long strategy memos. She wants **action + opinionated recommendations**, not option-surveys.
- **De-risk first. Every milestone must be independently submittable** (Marco's rule: better a small thing that works than an ambitious thing that doesn't).
- **Language rule (hard):** conversation can be Spanish; **ALL deliverables, UI strings, code comments, and generated docs MUST be English.**
- **Before ANY Anthropic/Claude API code: invoke the `claude-api` skill.** It is authoritative; never code the API from memory (model IDs, tool types, and headers drift). See §7.

---

## 1. The brief — what actually wins

**The challenge:** In the agent era, when a consumer asks an AI agent "find me a running shoe for flat feet under $150," the agent reasons over public info and recommends ONE brand — the buyer never sees an ad. Pick a real brand + category, build controlled information environments from real public data, run **real agents** (ChatGPT, Claude, Perplexity, Gemini), hold the query constant, vary the environment, and isolate what drives the recommendation. Then **build something a brand could actually use** from the findings.

**It is a RESEARCH challenge, not a build challenge.** The findings are the deliverable; the tool is what you build from them, and it should be simple.

**The 5 scoring criteria (reverse-engineer everything to these):**
1. **Question Quality** — is it genuinely worth answering?
2. **Experimental Design** — did the environments truly isolate the variable?
3. **Finding Quality** — real, specific, surprising, evidence-backed from real agent behavior?
4. **Deliverable Usefulness** — would a CMO / agency lead say "we need this"?
5. **Originality** — an angle nobody else in the room took.

**Two hard constraints we build around (quote them in the deck):**
- ⚠️ *"Judges will not reward infrastructure complexity."* → keep tooling lean.
- ⚠️ *"A system that takes a signal and acts on it automatically — a live demo beats a slide."* → the live loop is the centerpiece.

**Deliverables (due Wed Jun 24, ~3–4pm):** (1) Cover slide; (2) 5–10 slide deck (hypothesis → design → findings → what we built); (3) narrated video demo of the experiments + findings **in action**; (4) optional phone testimonial.

---

## 2. Dates & people

- **Today's anchor:** strategy locked Mon Jun 22, ~8pm. **Internal demo: Tue Jun 23 midday. Submit: Wed Jun 24 (~3–4pm).**
- **Federica** — operator + builder (you report to her; she drives from phone).
- **Paul-Louis Palluel (PL)** — owns the **deck assembly + demo videos**. Send him outputs/recordings as you go.
- **Marco Fucci di Napoli** — real blockers, infra, API keys, IP/legal.
- **Guillaume** — CEO; exec input.
- Team Rowads. Brief track: **"Agentic Discovery."**
- Stakes: up to **€500k grant** + a **$5k bonus to the winning builder**. We are all-in.

---

## 3. The strategy we locked (Mon Jun 22)

**ONE system: "The Legibility Loop" — live, on the real agents.** It is simultaneously the experiment AND the product, and it answers the brief's deepest question (*"can we predict — and change — when an agent recommends a brand?"*):

1. **MEASURE (live):** buyer query → real agents with **real web fetch** of a fixed set of **real URLs** (competitor pages + our brand's page). Record who gets recommended, at what rank, citing what.
2. **DIAGNOSE:** read what the agent cited (provenance); find the gap.
3. **PRESCRIBE:** the single highest-leverage move the brand can actually make, brand-safe (true facts, restructured / re-priced / re-surfaced on a page the agent reads).
4. **ACT (automatic):** publish that artifact to a real URL the agent can fetch. ← this is the brief's *"a signal → action, automatically."*
5. **PROVE (live):** re-run the live agent → the recommendation flips, citing our new page. **The flip, live, on the open web.**

**Why this beats the obvious entries:**
- The pure "controlled corpus injection" approach (browsing OFF, inject text) is rigorous but a sharp judge kills it: *"you changed the text you fed the model — that's reading comprehension, not agent behavior."* → we use it ONLY as the rigor backbone, not the hero.
- The live loop is real agent behavior on the real web, the cause is isolated to ONE page we control, it's brand-safe, and it flips. It threads every needle at once.

**Hybrid = how we win rigor AND wow:**
- **Live flip** (real agents, real web fetch) = the WOW + "signal→action" + originality.
- **Controlled matrix** (N runs, ASoV, confidence intervals, Claude-as-judge) = the scientific credibility backbone.

**The product (the CMO's actual job-to-be-done):** not "measure ASoV" — *don't disappear when buyers stop Googling and start asking agents.* One line:
> **"Legible tells you if AI agents recommend your brand, why they don't, and the one move that flips them — proven live, before you spend a cent."**

**Metric we coin:** **ASoV — Agent Share of Voice** (% of agent runs where your brand is the top recommendation, rank-weighted). The single number a CMO acts on.

**Originality angle (the narrative lens, not a narrowing):** *creative legibility* — "in the agent era, does brand creative even reach the buyer, and if not, what does?" Only a creative agency at a creative festival asks this. We run the full study; we tell it through this lens.

---

## 4. The plan — the ladder (each rung is independently submittable)

Goal = the most ambitious live open-web flip. Plan = climb rung by rung; if we stop at any rung we still have a coherent winning entry. None violates the brief.

- **R0 — "One flip, proven" — ✅ DONE + DE-RISKED (see §5).** Live web-fetch works; the hero finding is already surfaced.
- **R1 — "Matrix + ASoV + the 2–3 laws" (Tue AM).** Run the live baseline N≈8–10× across the 4 agents → confirm the hero finding is a stable RATE (not n=1), with CIs. Run the controlled matrix for the supporting laws. This is the rigor lab.
- **R2 — "The live flip" (Tue PM — the WOW).** Publish the brand-safe "one move" page to a real URL → re-run the live agent → recommendation flips, live, citing our page.
- **R3 — "Open-web, on its own" (stretch).** Don't hand the agent the URL — let it discover our page via live search. Cherry on top; never depended on (indexing latency).
- **The tool face** wraps R1+R2's real numbers: brand+query → live ASoV ranking → provenance → the ONE move → the flip simulator.
- **The video:** film real incognito ChatGPT/Claude/Perplexity windows for the before→act→after.

---

## 5. STATE — what's already proven (the wins)

### 5a. R0 de-risk PASSED — the live flip is feasible
Ran `engine/src/live.js` (Claude `claude-opus-4-8`, browsing ON via the `web_fetch` server tool). It fetched **7/7 real public pages live** (RunRepeat guides + brand/spec pages, 24k–104k chars each), `stop_reason: end_turn`, no errors. **Conclusion: live agent web-fetch is real and reliable → R2 and R3 are reachable.**

### 5b. THE HERO FINDING (live, n=1, Jun 22) — the crown jewel
**Query (constant):** "Best running shoes for flat feet / overpronation under $150."
**Setup:** Claude opus-4-8, browsing ON, web_fetch of 7 real URLs: RunRepeat overpronation guide, RunRepeat flat-feet guide, Brooks Adrenaline GTS 25 official PDP, and RunRepeat spec pages for ASICS GT-2000 13, Hoka Arahi 7, Saucony Tempus, NB 860v14.

**What happened:** The agent READ that RunRepeat's overpronation guide names the **Brooks Adrenaline GTS 25 as "Best Overall"** — the editorial #1. **And it still dropped Brooks to #4 and recommended the ASICS GT-2000 13 ($140) instead — purely because Brooks' own PDP shows $155, $5 over the buyer's $150 budget.** It enforced the budget live (confidence 78/100) and noted Brooks would arguably be the better shoe *if found under $150*.

Live ranking returned: 1) ASICS GT-2000 13 $140 · 2) NB 860v14 $140 · 3) Hoka Arahi 7 $145 · 4) **Brooks Adrenaline GTS 25 $155 (over budget)** · 5) Saucony Tempus $160 (over budget).

**The headline (hard to argue with):**
> *Brooks loses the AI's recommendation by $5 — on its own page — even though the web already calls it "Best Overall."*

**The flip (R2 target, basically handed to us):** change the price-fit signal on a page the agent fetches — a real ≤$150 Brooks variant / sale price / "from $140" colorway, true facts only → re-run live → **Brooks reclaims #1** (the editorial web already crowns it; the only thing holding it back was $5 on its own page). **#4 → #1, live.**

**Why this is the hero:** live + real + cause isolated to a page we control + brand-safe + it flips + it's the literal answer to the brief's "predict & change the prediction." CMO instantly gets it.

**The CMO sentence:** *"You're losing the AI's pick by $5 — on your own page — even though the web already calls you Best Overall. Here's the one move, and here it is flipping live."*

> ⚠️ **Honesty:** the hero finding is **n=1**. R1 must confirm it's a stable rate (N runs + CI) before we claim it as a finding. Reproduce before you headline it.

### 5c. Controlled-mode findings already in the repo (the RIGOR supporting cast — use, but don't headline the boring ones)
From earlier controlled runs (browsing OFF, curated corpus), in `engine/out/`:
- **Wording fragility (a HOOK, not the headline — not brand-actionable):** changing one query word, "overpronation" → "flat feet," flips Brooks from top-1 **100% → 0%** with identical sources (95% CI 100–100 vs 0–0).
- **The comparison-table move (brand-actionable, a real flip):** injecting ONE real spec comparison table took Brooks **0% → 100% #1** while the over-budget competitor collapsed (the controlled prediction loop).
- **Budget-blindness (controlled):** in controlled mode the agent recommended a $155 shoe for an "under $150" query without flagging it. **Note the richer LIVE contrast in §5b** — live, with the real price visible, the agent ENFORCED the budget and it cost Brooks the pick. Same lever both ways: **price/constraint legibility on your own page controls inclusion.** Tell the live version.
- **Metric + rigor:** ASoV, N runs per condition, a consistent `claude-sonnet-4-6` extractor (Claude-as-judge), 95% CIs.

---

## 6. The repo — what exists, where, how to run it

**Location:** `~/Downloads/legible-engine` (LOCAL on Federica's Mac). Git repo, branch `main`. **Brand-new standalone code** (the hackathon requires new, standalone code — NOT the Rowads monorepo).

> ⚠️ **For a CLOUD session to continue the ENGINE work, the repo must be reachable** — push it to a git remote and clone it in the cloud env. `.env` is gitignored (keep it that way; the submitted repo must be fully public with no secrets — see §9). If the cloud session can't get the repo, it can still do strategy/deck work from this doc, but the engine runs need the code + the API keys.

**Structure:**
```
legible-engine/
  engine/                      ← the experiment engine (Node, ESM, deps: @anthropic-ai/sdk, dotenv)
    src/
      live.js        ← ★ THE LIVE RUNNER (R0). Real agent + web_fetch of real URLs. START HERE for R1/R2.
      run.js         ← controlled matrix runner (browsing OFF, corpus injected). ASoV + the flip.
      predict.js     ← the controlled prediction loop (measure → inject table → re-run).
      flip.js / dose.js / analyze.js / report.js
      agents/        ← claude.js (opus-4-8, no tools), openai.js, gemini.js, perplexity.js, openrouter.js, index.js (registry; activates by API key present)
      lib/           ← env.js, environment.js (build injected env from corpus), prompt.js (controlled prompt), extractor.js (Claude-as-judge → structured verdict), metrics.js (ASoV + BRANDS), load.js, table.js (comparison-table builder), report.js
    data/
      corpus.json        ← 28 REAL sourced items (7 owned, 6 editorial, 9 community, 6 structured-specs)
      conditions.json    ← focal Brooks vs Hoka/ASICS/Saucony/NB; dimensions: source-authority, claim-form, specificity-evidence, recency, coverage
      specs.json         ← real specs for the comparison table
      provenance.csv     ← every source's real URL (the audit trail / no-fabrication guard)
    out/                 ← results-*.json + raw-*.jsonl (every raw agent response = audit trail) + flip.json, predict-*.json
  src/                   ← the TOOL/UI (TanStack Start + React + Tailwind). Reads engine results. Routes in src/routes/index.tsx; data in src/data/legible.json
  legible-demo/ , legible/  ← Vercel demo artifacts (deprecated one-pager lineage — see §9)
  .env                   ← gitignored. Holds the API keys (see below).
```

**API keys (in `~/Downloads/legible-engine/.env`, gitignored):** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` are **SET**. `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` are NOT set (add to run Perplexity or as a fallback for the 4th agent — ask Marco).

**How to run:**
```bash
cd ~/Downloads/legible-engine/engine
node src/live.js                                   # ★ live agent, real web_fetch (the R0 win). --q="..." to change query
node src/run.js --dim=coverage --n=6               # controlled matrix (ASoV)
node src/run.js --dim=all --n=9 --agents=claude,chatgpt,gemini
node src/predict.js --base=cov-flatfeet-framing --query="Best running shoes for flat feet under $150"

cd ~/Downloads/legible-engine && npm install && npm run dev   # the tool/UI
```

---

## 7. Critical technical knowledge (so you don't relearn or break it)

**ALWAYS invoke the `claude-api` skill before writing/editing Anthropic API code.** Key facts it confirmed (current as of this work):
- **Model under study:** `claude-opus-4-8` ("the everyday Claude a consumer uses"). Extractor/judge: `claude-sonnet-4-6`.
- **Live web server-tools:** `web_fetch_20260209` and `web_search_20260209` (dynamic-filtering variants; supported on Opus 4.8/4.7/4.6 + Sonnet 4.6). **No beta header.** Do **NOT** also declare `code_execution` (it's built in; a second env confuses the model). Basic fallback for older models: `web_fetch_20250910` / `web_search_20250305`.
- **`web_fetch` only fetches URLs already present in the conversation** → put the candidate URLs in the prompt (that's exactly what `live.js` does).
- **Server-tool loop:** the tools run server-side; if the turn hits the ~10-iteration cap, `stop_reason: "pause_turn"` → append the assistant content and re-send to resume. `live.js` already handles this.
- **SDK:** JS/ESM, `@anthropic-ai/sdk` (`new Anthropic()` reads `ANTHROPIC_API_KEY`). Opus 4.8 = adaptive thinking only; `budget_tokens`/`temperature`/`top_p` are rejected (don't add them).
- **`engine/src/live.js` already implements the whole live pattern (web_fetch tool, pause_turn loop, fetch-audit logging).** Reuse/extend it; don't reinvent.

---

## 8. Immediate next steps (do these, in order)

1. **Harden `live.js`:** (a) parse the agent's pick into a structured verdict — reuse `engine/src/lib/extractor.js` + `metrics.js` so output is the same ASoV shape as the controlled runs; (b) fix the crude TOP-PICK regex in `live.js` (its `SIGNAL` footer misfired — it matched guide text; the raw answer is the truth); (c) persist every raw transcript to `engine/out/` (audit trail / no-fabrication).
2. **R1 — make the hero finding rigorous:** run the live baseline **N≈8–10×** → confirm "Brooks drops to #4 on the $5 over-budget, ASICS wins" is a stable RATE with a CI (not n=1). Add ChatGPT + Gemini (+ Perplexity if keyed) as **live** agents → cross-agent live ASoV. Also run the controlled matrix for the supporting laws.
3. **R2 — the live flip (the WOW):** build a brand-safe page with a **real ≤$150 Brooks variant/price** (true facts only — a genuine sale price or under-$150 colorway/retailer listing; never fabricate). Host it at a real URL. Add that URL to the candidate set → re-run live → show **Brooks #4 → #1**. That is the hero demo.
4. **The tool/UI face:** brand+query → live ASoV ranking → provenance (what the agent cited) → the ONE move → the flip simulator. Wire to the real R1/R2 numbers. Deliberately simple.
5. **Feed PL:** send outputs + screen recordings as you go (PL builds the deck + video).

---

## 9. Gotchas, constraints, and what's DEPRECATED

**Constraints (non-negotiable):**
- **Brand-safe (brief requires it):** only TRUE facts. Never fabricate reviews or prices. The flip page must use real, sourced facts. `provenance.csv` exists for exactly this — keep every claim traceable to a URL.
- **No infra complexity** — judges won't reward it. Findings + the live loop are the deliverable; the tool stays lean.
- **English only** in all deliverables/UI/comments/generated docs.
- **Reproduce before headlining** — the hero finding is n=1 until R1 confirms a rate.
- **T&Cs:** the submitted repo must be **fully public, no login**; keep secrets/proprietary code out and make the demo work without them. We retain ownership; PMG gets a broad non-exclusive license. Don't put anything patentable in without a legal check (ask Marco).

**DEPRECATED — do NOT be dragged by these (they were pre-"win-mindset" steps):**
- The older one-pager `legible-topaz.vercel.app` and the Lovable mock — superseded; the tool is now the face over the real live engine.
- "Different AIs name different competitors" as a headline — boring, dropped.
- Pure controlled-corpus injection as the *centerpiece* — demoted to the rigor appendix.
- The 6-dimension matrix as the *narrative* — run it for rigor, but tell only the 2–3 sharp laws + the live flip.
- The "fake brand" idea from early meetings — resolved: real brand (Brooks) for the study; a brand-safe page WE control for the flip (same brand, true facts).

---

## 10. Federica's working style (match it)

- **Action over strategy when executing** — check the code, propose the next concrete action; skip the 5-section memo.
- **Opinionated recommendations**, not exhaustive surveys. Lead with the punchline.
- **Communicate VALUE from the user's POV** (who can now do what → how it moves the needle), never a technical changelog.
- Engage execs with **evidence**; diagnose first, come back with proof — don't yes-everything.
- **High energy. Match the "we must WIN" intensity.** This is the North Star: GANAR LA HACKATHON. Every action serves it.

---

### One-paragraph TL;DR (if you read nothing else)
We're building **Legible**, for the PMG Cannes hackathon (submit Wed Jun 24). It measures whether real AI agents recommend a brand, why, and the one move that flips them — proven **live**. We already proved (R0) that a real agent (`claude-opus-4-8` + `web_fetch`) reads real public pages live, and on the first run it surfaced the hero finding: **Brooks loses the agent's recommendation by $5 on its own page despite being the editorial "Best Overall."** Next: make that rigorous (R1: N runs, 4 agents, CIs) and build the **live flip** (R2: publish a brand-safe ≤$150 page → re-run → Brooks #4→#1). Keep it brand-safe, English-only, lean. Driver is Federica (on phone). North Star: **WIN.**
