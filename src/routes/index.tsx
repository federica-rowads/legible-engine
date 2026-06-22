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
          "Brand intelligence for the AI-agent era. Whether AI agents recommend your brand, why, and the one move that changes their answer.",
      },
    ],
  }),
  component: Index,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;
const BRAND = legible.brand;

function Index() {
  const cov = legible.coverage;
  const r = legible.rescue;
  const prov = legible.provenance;
  const [rescued, setRescued] = useState(false);

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
            live engine · {legible.agents.length} agent{legible.agents.length > 1 ? "s" : ""} · {BRAND}
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
            When an AI agent picks the product, your ad never gets seen. Legible measures whether agents recommend your
            brand — and the one real move that changes their answer. Every number below is a live, sourced experiment.
          </p>
        </div>
      </section>

      {/* 01 — THE VERDICT (the coverage flip) */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">01 — The Verdict</p>
          <h2 className="display-lg mt-4 max-w-[24ch]">Same brand. Same sources. One word changes everything.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            We asked Claude the same buying question and changed only the use-case word. How often it recommends{" "}
            {BRAND} as #1 — N={legible.n}, with 95% confidence intervals.
          </p>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {cov.map((c) => {
              const win = c.winner === BRAND;
              return (
                <article
                  key={c.framing}
                  className={`flex flex-col rounded-2xl border p-6 ${win ? "border-signal/60 bg-signal/[0.04]" : "border-border bg-card"}`}
                >
                  <div className="mono-label text-foreground/70">query says</div>
                  <div className="mt-1 text-2xl font-extrabold tracking-tight">"{c.framing}"</div>
                  <div className="mt-6 flex items-baseline gap-3">
                    <span className={`font-display text-6xl font-extrabold tracking-[-0.04em] ${win ? "text-signal" : "text-foreground"}`}>
                      {pct(c.brooksTop1)}
                    </span>
                    <span className="mono-label whitespace-nowrap">{BRAND} #1</span>
                  </div>
                  <div className="mono-label mt-1 text-[10px]">
                    95% CI {pct(c.brooksTop1CI[0])}–{pct(c.brooksTop1CI[1])}
                  </div>
                  <div className="mt-5 text-sm">
                    <span className="text-muted-foreground">agent picks </span>
                    <span className="font-bold">
                      {c.winner}
                      {c.topModel ? ` ${c.topModel}` : ""}
                    </span>
                  </div>
                  <p className="mt-4 border-l-2 border-foreground/20 pl-3 text-[13px] leading-relaxed text-muted-foreground">
                    "{c.quote}"
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-signal/40 bg-signal/[0.06] p-6">
            <span className="mono-label text-signal">the finding</span>
            <p className="mt-2 text-lg font-medium sm:text-xl">
              {BRAND}'s top-1 rate collapses from <span className="font-bold text-signal">{pct(cov[0].brooksTop1)}</span> to{" "}
              <span className="font-bold">{pct(cov[cov.length - 1].brooksTop1)}</span> on the buyer's wording alone — the
              confidence intervals don't even overlap. The single word the customer uses outweighs everything you control.
            </p>
          </div>
        </div>
      </section>

      {/* 02 — WHERE THE BELIEF COMES FROM (provenance) */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">02 — The Why</p>
          <h2 className="display-lg mt-4 max-w-[22ch]">Whose words win.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Across every run, where did the agent's belief actually come from? We traced every citation back to its
            source type.
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {([
              { t: `When ${BRAND} WINS`, m: prov.win, accent: true },
              { t: `When ${BRAND} LOSES`, m: prov.lose, accent: false },
            ] as const).map((g) => (
              <div key={g.t} className="rounded-2xl border border-border bg-card p-6">
                <div className="mono-label">{g.t}</div>
                {([
                  ["owned", "Owned (brand's own pages)"],
                  ["editorial", "Editorial / expert"],
                  ["community", "Community / Reddit"],
                  ["specs", "Structured specs"],
                ] as const).map(([k, label]) => (
                  <div key={k} className="mt-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-mono font-bold">{pct(g.m[k])}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${k === "owned" && g.accent ? "bg-signal" : k === "editorial" || k === "community" ? (!g.accent ? "bg-signal" : "bg-foreground/70") : "bg-foreground/70"}`}
                        style={{ width: pct(g.m[k]) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-signal/40 bg-signal/[0.06] p-6">
            <span className="mono-label text-signal">the finding</span>
            <p className="mt-2 text-lg font-medium sm:text-xl">
              {BRAND} wins on its own words (<span className="font-bold">{pct(prov.win.owned)}</span> owned) — and loses the
              moment independent voices speak (<span className="font-bold text-signal">{pct(prov.lose.editorial)}</span>{" "}
              editorial + <span className="font-bold text-signal">{pct(prov.lose.community)}</span> community). The brand
              controls the narrative only until a third party enters the room.
            </p>
          </div>
        </div>
      </section>

      {/* 03 — THE ONE MOVE / RESCUE (the prediction loop) */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-28">
          <p className="eyebrow">03 — The One Move</p>
          <h2 className="display-lg mt-4 max-w-[26ch]">We predicted the fix — then proved it on a re-run.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            For "flat feet", {BRAND} is invisible. We predicted that injecting one real spec comparison table (real
            numbers, zero opinions) would rescue it. Toggle it.
          </p>

          <div className="mt-10 rounded-3xl border border-border bg-card p-8 sm:p-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="mono-label">interactive — the prediction loop</p>
                <h4 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {rescued ? "After the move" : "Today"}
                </h4>
              </div>
              <button
                onClick={() => setRescued(!rescued)}
                role="switch"
                aria-checked={rescued}
                className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 transition-colors ${rescued ? "border-signal/60 bg-signal/10" : "border-border bg-background/40"}`}
              >
                <span className="mono-label text-foreground/80">{rescued ? "TABLE IN" : "BASELINE"}</span>
                <span className={`relative h-7 w-14 rounded-full transition-colors ${rescued ? "bg-signal" : "bg-muted"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow-md transition-all ${rescued ? "left-8" : "left-1"}`} />
                </span>
              </button>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <div className="mono-label">{BRAND} recommended #1</div>
                <div className={`font-display text-7xl font-extrabold tracking-[-0.05em] tabular-nums transition-colors duration-500 ${rescued ? "text-signal" : "text-foreground"}`}>
                  {pct(rescued ? r.moveTop1 : r.baseTop1)}
                </div>
                <div className="mono-label mt-1">ASoV {pct(rescued ? r.moveASoV : r.baseASoV)}</div>
              </div>
              <div>
                <div className="mono-label">Saucony Tempus ($159.95 — over budget)</div>
                <div className="font-display text-7xl font-extrabold tracking-[-0.05em] tabular-nums text-muted-foreground transition-colors duration-500">
                  {pct(rescued ? r.sauconyMove : r.sauconyBase)}
                </div>
                <div className="mono-label mt-1">share of voice</div>
              </div>
            </div>

            <div className={`mt-8 overflow-hidden transition-all duration-500 ${rescued ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`} aria-hidden={!rescued}>
              <p className="rounded-xl border border-signal/40 bg-signal/[0.08] p-5 text-[15px] leading-relaxed sm:text-base">
                <span className="mono-label mr-2 text-signal">proven</span>
                Predicted: up. Actual: {BRAND} went from {pct(r.baseTop1)} to {pct(r.moveTop1)} #1, and the over-budget
                competitor collapsed from {pct(r.sauconyBase)} to {pct(r.sauconyMove)}. Every cell in the injected table
                is a real published spec — no fabricated data.
              </p>
            </div>
          </div>

          <p className="mono-label mt-6">
            agent: {legible.agentModel} · N={legible.n} · {BRAND} vs {legible.competitors.join(" / ")} · all sources public & traceable
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
          <span className="text-base font-extrabold tracking-tight">
            Legible<span className="text-signal">.</span>
          </span>
          <span className="mono-label">the SEO of the agent era</span>
        </div>
      </footer>
    </main>
  );
}
