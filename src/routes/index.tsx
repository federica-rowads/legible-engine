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
          "Brand intelligence for the AI-agent era. Whether AI agents recommend your brand, why they don't, and the one move that flips them — proven live.",
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
            live engine · {legible.agentModel} · {BRAND}
          </span>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1280px] px-6 pb-20 pt-20 sm:px-10 sm:pt-28">
          <div className="mono-label mb-8 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <span className="h-1 w-1 rounded-full bg-signal" /> brand intelligence for the agent era
          </div>
          <h1 className="display-xl max-w-[18ch]">
            Your customer stopped Googling.
            <br />
            <span className="text-muted-foreground">Their AI agent didn't.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
            When an AI agent picks the product, your ad is never seen. Legible measures whether agents recommend your
            brand, why they don't, and the one real move that flips them. Every number below is a live experiment on{" "}
            {legible.agentModel}, reading real public pages — N={legible.n}.
          </p>
        </div>
      </section>

      {/* 01 — THE VERDICT */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">01 — The Verdict</p>
          <h2 className="display-lg mt-4 max-w-[24ch]">The world's #1 overpronation shoe is invisible to the agent.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Buyer query (held constant): <span className="text-foreground">"{legible.query}"</span>. We ran it live{" "}
            {legible.n} times. Share of the agent's recommendation, per brand:
          </p>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            {/* big stat */}
            <div className="rounded-3xl border border-signal/40 bg-signal/[0.05] p-8">
              <div className="mono-label text-foreground/70">{BRAND} {legible.model} recommended #1</div>
              <div className="font-display text-8xl font-extrabold tracking-[-0.05em] text-signal">{pct(v.brooksTop1)}</div>
              <div className="mono-label mt-1">of {legible.n} live runs · 95% CI {pct(v.brooksTop1CI[0])}–{pct(v.brooksTop1CI[1])}</div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Editorial #1 in the world, yet the agent never picks it. The agent settles for{" "}
                <span className="font-bold text-foreground">{v.winner} {v.winnerModel} ({v.winnerPrice})</span> instead —
                {BRAND} sits at average rank <span className="font-bold text-foreground">{v.brooksAvgRank}</span>.
              </p>
            </div>

            {/* ASoV bars */}
            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="mono-label mb-5">Agent Share of Voice</div>
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
                      <div
                        className={`h-full rounded-full ${isBrand ? "bg-signal" : "bg-foreground/70"}`}
                        style={{ width: pct(row.asov) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <span className="mono-label">the agent, in its own words</span>
            <p className="mt-2 border-l-2 border-signal/60 pl-4 text-base leading-relaxed sm:text-lg">"{v.agentQuote}"</p>
          </div>
        </div>
      </section>

      {/* 02 — THE DIAGNOSIS */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">02 — The Diagnosis</p>
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

      {/* 03 — THE ONE MOVE (flip simulator) */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">03 — The One Move</p>
          <h2 className="display-lg mt-4 max-w-[26ch]">We prescribed one brand-safe move — then proved it on a live re-run.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">{f.move} Toggle it.</p>

          <div className="mt-10 rounded-3xl border border-border bg-card p-8 sm:p-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="mono-label">interactive — the validated loop, live</p>
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
                <div className="mono-label mt-1">
                  avg rank {moved ? f.moveBrooksRank : f.baseBrooksRank} · ASoV {pct(moved ? f.moveBrooksASoV : f.baseBrooksASoV)}
                </div>
              </div>
              <div>
                <div className="mono-label">{f.winnerLabel}</div>
                <div className="font-display text-7xl font-extrabold tracking-[-0.05em] tabular-nums text-muted-foreground transition-colors duration-500">
                  {pct(moved ? f.moveWinnerTop1 : f.baseWinnerTop1)}
                </div>
                <div className="mono-label mt-1">recommended #1</div>
              </div>
            </div>

            <div className={`mt-8 overflow-hidden transition-all duration-500 ${moved ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`} aria-hidden={!moved}>
              <p className="rounded-xl border border-signal/40 bg-signal/[0.08] p-5 text-[15px] leading-relaxed sm:text-base">
                <span className="mono-label mr-2 text-signal">proven live</span>
                {BRAND} went from <span className="font-bold">{pct(f.baseBrooksTop1)}</span> to{" "}
                <span className="font-bold text-signal">{pct(f.moveBrooksTop1)}</span> recommended #1 — from invisible to the
                agent's modal pick — and its average rank climbed from {f.baseBrooksRank} to {f.moveBrooksRank}. Why it
                recovered, in the agent's words: "{f.proofQuote}" Nothing fabricated — only Brooks' real, public facts,
                made legible.
              </p>
            </div>
          </div>

          <p className="mono-label mt-6">
            agent: {legible.agentModel} · {legible.mode} · N={legible.n} · {BRAND} vs {legible.competitors.join(" / ")} · {legible.sources}
          </p>
        </div>
      </section>

      {/* 04 — EVERY AGENT */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">04 — Every Agent</p>
          <h2 className="display-lg mt-4 max-w-[22ch]">Same blind spot — on every agent your buyer uses.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            We fed the same real product information to ChatGPT, Claude and Gemini. N={cross.n} per condition. How often
            each recommends {BRAND} #1, before and after the move:
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {cross.agents.map((a) => (
              <div key={a.name} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold tracking-tight">{a.name}</span>
                  <span className="mono-label">{a.model}</span>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <div className="mono-label">at $155</div>
                    <div className="font-display text-5xl font-extrabold tracking-[-0.04em] text-foreground/80">{pct(a.before)}</div>
                  </div>
                  <div className="px-1 pb-2 text-2xl text-signal">→</div>
                  <div className="text-right">
                    <div className="mono-label">under $150</div>
                    <div className="font-display text-5xl font-extrabold tracking-[-0.04em] text-signal">{pct(a.after)}</div>
                  </div>
                </div>
                <div className="mono-label mt-4">{BRAND} #1 · winner ASICS → {BRAND}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-signal/40 bg-signal/[0.06] p-6">
            <span className="mono-label text-signal">the finding</span>
            <p className="mt-2 text-lg font-medium sm:text-xl">
              It's not one model's quirk. ChatGPT, Claude and Gemini <span className="font-bold">all</span> drop the world's
              #1 shoe for $5 — and <span className="font-bold text-signal">all</span> recommend it the moment its real
              under-$150 availability is legible.
            </p>
          </div>
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
