import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import legible from "../data/legible.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible — See your brand the way an AI agent does." },
      {
        name: "description",
        content:
          "Whether AI agents recommend your brand, why they don't, and the one move that flips them. Measured on real agents.",
      },
    ],
  }),
  component: Index,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;
const BRAND = legible.brand;
const v = legible.verdict;
const d = legible.diagnosis;
const f = legible.flip;
const cross = legible.crossAgent;
const law = legible.law;
const drivers = legible.drivers;

function Index() {
  const [moved, setMoved] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 sm:px-10">
          <span className="text-lg font-extrabold tracking-tight">
            Legible<span className="text-signal">.</span>
          </span>
          <span className="mono-label flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-foreground/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            measure · diagnose · act · prove
          </span>
        </div>
      </header>

      {/* HERO + the tool input (the spine of the whole page) */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-20 sm:px-10 sm:pt-28">
          <div className="mono-label mb-8 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <span className="h-1 w-1 rounded-full bg-signal" /> brand intelligence for the agent era
          </div>
          <h1 className="display-xl max-w-[18ch]">
            Your customer stopped Googling.
            <br />
            <span className="text-muted-foreground">Their AI agent didn't.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
            When the agent picks the product, your ad is never seen, and you never even know. Legible asks the real
            agents where your brand stands, why, and the one move that flips them.
          </p>

          {/* the tool input — one brand, one query, one button. v1 shows a measured result below. */}
          <div className="mt-12 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
              <div>
                <label className="mono-label text-muted-foreground">brand</label>
                <div className="mt-1.5 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold">
                  {BRAND} {legible.model}
                </div>
              </div>
              <div>
                <label className="mono-label text-muted-foreground">buyer query</label>
                <div className="mt-1.5 truncate rounded-xl border border-border bg-background px-4 py-3 text-sm">
                  "{legible.query}"
                </div>
              </div>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90">
                Ask the agents
                <span aria-hidden>→</span>
              </button>
            </div>
            <p className="mono-label mt-4 text-muted-foreground">
              results below · real agents (ChatGPT · Claude · Gemini) · N={legible.n} runs · live test for any brand coming next
            </p>
          </div>
        </div>
      </section>

      {/* 01 — MEASURE */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-10 sm:py-24">
          <p className="eyebrow">01 · Measure — where the agents rank you</p>
          <h2 className="display-lg mt-4 max-w-[24ch]">The world's #1 overpronation shoe is invisible to the agent.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            We ran the query above on real agents, {legible.n} times each. {BRAND} is RunRepeat's #1 "Best Overall" pick —
            and the agents still never choose it.
          </p>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="rounded-3xl border border-signal/40 bg-signal/[0.05] p-8">
              <div className="mono-label text-foreground/70">{BRAND} recommended #1</div>
              <div className="font-display text-8xl font-extrabold tracking-[-0.05em] text-signal">{pct(v.brooksTop1)}</div>
              <div className="mono-label mt-1">avg rank {v.brooksAvgRank} of 5 · 95% CI {pct(v.brooksTop1CI[0])}–{pct(v.brooksTop1CI[1])}</div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                The agents settle for{" "}
                <span className="font-bold text-foreground">{v.winner} {v.winnerModel} ({v.winnerPrice})</span> instead.
                The #1 shoe in the world never makes the list.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="mono-label mb-5">Agent Share of Voice — our metric</div>
              {v.asov.map((row) => {
                const isBrand = row.brand === BRAND;
                return (
                  <div key={row.brand} className="mt-4 first:mt-0">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className={isBrand ? "font-bold" : ""}>
                        {row.brand}
                        {isBrand ? <span className="mono-label ml-2 text-signal">RunRepeat #1</span> : null}
                      </span>
                      <span className="font-mono font-bold">{pct(row.asov)}</span>
                    </div>
                    <div className="mt-1 h-2.5 w-full rounded-full bg-muted">
                      <div className={`h-full rounded-full ${isBrand ? "bg-signal" : "bg-foreground/70"}`} style={{ width: pct(row.asov) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <span className="mono-label">why — the agent, in its own words</span>
            <p className="mt-2 border-l-2 border-signal/60 pl-4 text-base leading-relaxed sm:text-lg">"{v.agentQuote}"</p>
          </div>
        </div>
      </section>

      {/* 02 — DIAGNOSE */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-10 sm:py-24">
          <p className="eyebrow">02 · Diagnose — the one thing it can't see</p>
          <h2 className="display-lg mt-4 max-w-[20ch]">{d.gapTitle}</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">{d.gap}</p>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mono-label text-foreground/70">editorial authority</div>
              <p className="mt-2 text-[15px] leading-relaxed">{d.editorial}</p>
              <div className="mt-6 flex items-center gap-4">
                <div>
                  <div className="mono-label">price on its page</div>
                  <div className="font-display text-3xl font-extrabold text-foreground/80">{v.brooksPrice}</div>
                </div>
                <div className="text-2xl text-muted-foreground">›</div>
                <div>
                  <div className="mono-label">but really available</div>
                  <div className="font-display text-3xl font-extrabold text-signal">$81–$125</div>
                </div>
              </div>
              <p className="mono-label mt-3 text-[10px] text-muted-foreground">Brooks ReStart + retailers — real, public</p>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — ACT & PROVE (the one move, the live flip, on every agent) */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-10 sm:py-24">
          <p className="eyebrow">03 · Act &amp; Prove — the one move</p>
          <h2 className="display-lg mt-4 max-w-[26ch]">Make one true fact legible. Watch the recommendation flip.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">{f.move} Toggle it.</p>

          <div className="mt-10 rounded-3xl border border-border bg-card p-8 sm:p-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="mono-label">interactive — the validated loop</p>
                <h4 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {moved ? "After the move — re-run live" : "Today"}
                </h4>
              </div>
              <button
                onClick={() => setMoved(!moved)}
                role="switch"
                aria-checked={moved}
                className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 transition-colors ${moved ? "border-signal/60 bg-signal/10" : "border-border bg-background/40"}`}
              >
                <span className="mono-label text-foreground/80">{moved ? "PAGE PUBLISHED" : "BASELINE"}</span>
                <span className={`relative h-7 w-14 rounded-full transition-colors ${moved ? "bg-signal" : "bg-muted"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow-md transition-all ${moved ? "left-8" : "left-1"}`} />
                </span>
              </button>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <div className="mono-label">{BRAND} recommended #1</div>
                <div className={`font-display text-7xl font-extrabold tracking-[-0.05em] tabular-nums transition-colors duration-500 ${moved ? "text-signal" : "text-foreground"}`}>
                  {pct(moved ? f.moveBrooksTop1 : f.baseBrooksTop1)}
                </div>
                <div className="mono-label mt-1">avg rank {moved ? f.moveBrooksRank : f.baseBrooksRank} · ASoV {pct(moved ? f.moveBrooksASoV : f.baseBrooksASoV)}</div>
              </div>
              <div>
                <div className="mono-label">{f.winnerLabel}</div>
                <div className="font-display text-7xl font-extrabold tracking-[-0.05em] tabular-nums text-muted-foreground transition-colors duration-500">
                  {pct(moved ? f.moveWinnerTop1 : f.baseWinnerTop1)}
                </div>
                <div className="mono-label mt-1">recommended #1</div>
              </div>
            </div>

            {/* every agent flips — folded into the same beat */}
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {cross.agents.map((a) => (
                <div key={a.name} className="rounded-2xl border border-border bg-background/50 p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-extrabold tracking-tight">{a.name}</span>
                    <span className="mono-label">{a.model}</span>
                  </div>
                  <div className="mt-4 font-display text-4xl font-extrabold tracking-[-0.04em] tabular-nums">
                    <span className={moved ? "text-signal" : "text-foreground/70"}>{pct(moved ? a.after : a.before)}</span>
                  </div>
                  <div className="mono-label mt-1">{moved ? "picks " + BRAND : "drops " + BRAND}</div>
                </div>
              ))}
            </div>

            <div className={`mt-8 overflow-hidden transition-all duration-500 ${moved ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`} aria-hidden={!moved}>
              <p className="rounded-xl border border-signal/40 bg-signal/[0.08] p-5 text-[15px] leading-relaxed sm:text-base">
                <span className="mono-label mr-2 text-signal">proven live</span>
                {BRAND} went from <span className="font-bold">{pct(f.baseBrooksTop1)}</span> to{" "}
                <span className="font-bold text-signal">{pct(f.moveBrooksTop1)}</span> recommended #1, on all three agents,
                and its average rank climbed from {f.baseBrooksRank} to {f.moveBrooksRank}. Nothing fabricated — only Brooks'
                real, public facts, made legible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — THE LAW (it generalizes — the research that makes it a finding, not a fluke) */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-10 sm:py-24">
          <p className="eyebrow">04 · The Law — it isn't you, it's how agents read</p>
          <h2 className="display-lg mt-4 max-w-[24ch]">Not one brand. Not one category. A rule.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">{law.note}</p>

          {/* 4a — same pattern, another category */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {law.cases.map((c) => (
              <article key={c.category} className="rounded-2xl border border-border bg-card p-6">
                <div className="mono-label text-foreground/70">{c.category}</div>
                <div className="mt-1 text-xl font-extrabold tracking-tight">{c.brand}</div>
                <div className="mono-label mt-1 text-[11px] text-muted-foreground">dropped for {c.constraint}</div>
                <div className="mt-6 flex items-end gap-3">
                  <div>
                    <div className="mono-label">before</div>
                    <div className="font-display text-5xl font-extrabold tracking-[-0.04em] text-foreground/80">0%</div>
                  </div>
                  <div className="pb-2 text-2xl text-signal">→</div>
                  <div>
                    <div className="mono-label">after</div>
                    <div className="font-display text-5xl font-extrabold tracking-[-0.04em] text-signal">#1</div>
                  </div>
                </div>
                <div className="mono-label mt-3">across ChatGPT, Claude &amp; Gemini</div>
              </article>
            ))}
          </div>

          {/* 4b — the phantom brand: the control that proves it's legibility, not memory */}
          <div className="mt-14 rounded-3xl border border-signal/30 bg-signal/[0.04] p-8 sm:p-10">
            <p className="eyebrow text-signal">the proof — a brand that doesn't exist</p>
            <h3 className="display-lg mt-3 max-w-[22ch] text-3xl sm:text-4xl">We invented a brand. The agents recommend it over real ones.</h3>
            <p className="mt-4 max-w-2xl text-muted-foreground">{drivers.headline}</p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {drivers.fullLegibilityByAgent.map((a) => (
                <div key={a.name} className="rounded-2xl border border-border bg-card p-5 text-center">
                  <p className="mono-label text-muted-foreground">{a.name}</p>
                  <p className="mt-2 text-4xl font-extrabold text-signal sm:text-5xl">{pct(a.top1)}</p>
                  <p className="mono-label mt-1 text-foreground/50">picks the invented brand</p>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-2xl text-muted-foreground">
              Against four real competitors with full, legible profiles, we added one signal at a time. Only four of ten
              move the agent — the signals your rivals don't already have:
            </p>
            <div className="mt-6 space-y-2.5">
              {[...drivers.items].sort((a, b) => (b.top1 - a.top1) || (a.avgRank - b.avgRank)).map((it, i) => (
                <div key={it.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 sm:gap-4">
                  <span className="mono-label w-5 text-foreground/40">{i + 1}</span>
                  <span className="w-40 shrink-0 text-sm font-semibold sm:w-56">{it.label}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-signal" style={{ width: pct(it.top1) }} />
                  </div>
                  <span className="mono-label w-10 text-right">{pct(it.top1)}</span>
                  <span className={"mono-label hidden w-24 text-right text-[10px] sm:inline " + (it.tier === "differentiates" ? "text-signal" : "text-foreground/40")}>
                    {it.tier === "differentiates" ? "moves it" : "commodity"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <span className="mono-label text-signal">the insight</span>
                <p className="mt-2 text-base font-medium sm:text-lg">{drivers.insight}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <span className="mono-label text-muted-foreground">agents are not equal</span>
                <p className="mt-2 text-base font-medium sm:text-lg">{drivers.agentDifference}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* close */}
      <section className="border-t border-border light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="display-lg max-w-[20ch]">Measure your Agent Share of Voice. Make the one move. Prove the lift.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            You don't need a discount or a campaign to win the agent. You need to make one real, qualifying fact legible —
            and you can verify the lift the same day. Legible is the SEO of the agent era.
          </p>
          <p className="mono-label mt-8 text-muted-foreground">
            real agents (ChatGPT · Claude · Gemini) · N={legible.n} per condition · 95% bootstrap CIs · every transcript saved · {legible.sources}
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
          <span className="text-base font-extrabold tracking-tight">
            Legible<span className="text-signal">.</span>
          </span>
          <span className="mono-label">measure · diagnose · prescribe · act · prove — the SEO of the agent era</span>
        </div>
      </footer>
    </main>
  );
}
