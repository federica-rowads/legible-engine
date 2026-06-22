import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible — See your brand the way an AI agent does." },
      { name: "description", content: "Brand intelligence for the AI-agent era. Whether AI agents recommend your brand, why, and the one move that changes their answer." },
      { property: "og:title", content: "Legible — Brand intelligence for the AI-agent era" },
      { property: "og:description", content: "The SEO of the agent era. See your brand the way an AI agent does." },
    ],
  }),
  component: Index,
});

const BRAND_NAME = "Legible"; // placeholder working name — easy to change

const COMPETITORS = ["Hoka", "ASICS", "Saucony", "New Balance"];

type Agent = {
  name: string;
  mark: string;
  rankOff: number;
  rankOn: number;
  confidence: number;
  quote: string;
  sources: string[];
};

const AGENTS: Agent[] = [
  {
    name: "ChatGPT",
    mark: "GPT",
    rankOff: 2,
    rankOn: 1,
    confidence: 78,
    quote:
      "Brooks is a solid pick for overpronation — the Brooks Adrenaline GTS is frequently recommended for flat feet. That said, the ASICS Gel-Kayano edges it out on stability testing.",
    sources: ["brooksrunning.com", "Runner's World"],
  },
  {
    name: "Claude",
    mark: "CLD",
    rankOff: 3,
    rankOn: 1,
    confidence: 71,
    quote:
      "For flat feet under $150, I'd lean toward the Hoka Arahi or ASICS Gel-Kayano for guided support. Brooks makes great stability shoes too, though I found fewer head-to-head specs to compare.",
    sources: ["RunRepeat", "brooksrunning.com"],
  },
  {
    name: "Perplexity",
    mark: "PPX",
    rankOff: 4,
    rankOn: 2,
    confidence: 69,
    quote:
      "For overpronation under $150, I'd recommend the ASICS Gel-Kayano or Hoka Arahi — both have strong stability reviews on RunRepeat and Reddit.",
    sources: ["RunRepeat", "Reddit"],
  },
  {
    name: "Gemini",
    mark: "GEM",
    rankOff: 3,
    rankOn: 1,
    confidence: 73,
    quote:
      "Top stability picks for flat feet include ASICS, Hoka, and New Balance. Brooks is reputable but appears less often in recent comparison roundups.",
    sources: ["Runner's World", "New Balance editorial"],
  },
];

const SCORECARD = [
  { label: "Claim Specificity", brooks: 45, leader: 78, flagged: false },
  { label: "Third-Party Citations", brooks: 38, leader: 80, flagged: false },
  { label: "Structured Comparison Data", brooks: 30, leader: 82, flagged: true },
  { label: "Community Presence", brooks: 22, leader: 75, flagged: true },
  { label: "Recency", brooks: 60, leader: 70, flagged: false },
];

const PROVENANCE = [
  { label: "Owned", detail: "brooksrunning.com", pct: 68 },
  { label: "Editorial", detail: "Runner's World, RunRepeat", pct: 22 },
  { label: "Community", detail: "Reddit, forums", pct: 10 },
];

function scrollToVerdict() {
  const el = document.getElementById("verdict");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Index() {
  const [brand, setBrand] = useState("Brooks");
  const [query, setQuery] = useState(
    "best running shoes for flat feet / overpronation under $150",
  );
  const [boosted, setBoosted] = useState(false);

  const avgOff =
    AGENTS.reduce((s, a) => s + a.rankOff, 0) / AGENTS.length; // 3.0
  const avgOn = AGENTS.reduce((s, a) => s + a.rankOn, 0) / AGENTS.length; // 1.25
  const avg = boosted ? avgOn : avgOff;

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 sm:px-10">
          <a href="#top" className="text-lg font-extrabold tracking-tight">
            {BRAND_NAME}
            <span className="text-signal">.</span>
          </a>
          <span className="mono-label flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-foreground/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal"></span>
            </span>
            live engine · 4 agents
          </span>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section id="top" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1280px] px-6 pb-28 pt-20 sm:px-10 sm:pt-28 lg:pb-40 lg:pt-36">
          <div className="mono-label mb-8 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <span className="h-1 w-1 rounded-full bg-signal" />
            brand intelligence for the agent era
          </div>
          <h1 className="display-xl max-w-[18ch]">
            Your customer stopped Googling.
            <br />
            <span className="text-muted-foreground">Their AI agent didn't.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
            When an AI agent picks the product, your ad never gets seen. {BRAND_NAME}{" "}
            shows you whether agents recommend your brand — and the one move that
            changes their answer.
          </p>

          {/* Input card */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-black/40 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:gap-3">
              <label className="group flex flex-col rounded-xl bg-secondary/60 px-4 py-3 ring-1 ring-inset ring-transparent focus-within:ring-signal/60">
                <span className="mono-label text-[10px]">Brand</span>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-1 bg-transparent text-base font-semibold text-foreground outline-none"
                />
              </label>
              <label className="group flex flex-col rounded-xl bg-secondary/60 px-4 py-3 ring-1 ring-inset ring-transparent focus-within:ring-signal/60">
                <span className="mono-label text-[10px]">Category / query</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mt-1 truncate bg-transparent text-base text-foreground outline-none"
                />
              </label>
              <button
                onClick={scrollToVerdict}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-4 text-sm font-bold uppercase tracking-wider text-signal-foreground transition-all hover:brightness-110 active:scale-[0.98] sm:text-base"
              >
                Analyze
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>

          <p className="mono-label mt-5 flex flex-wrap items-center gap-2">
            <span className="text-signal">●</span> Analyzing across
            <span className="text-foreground/80">ChatGPT</span>·
            <span className="text-foreground/80">Claude</span>·
            <span className="text-foreground/80">Perplexity</span>·
            <span className="text-foreground/80">Gemini</span>
          </p>
        </div>
      </section>

      {/* SECTION 2 — VERDICT (light) */}
      <section
        id="verdict"
        className="light-section bg-background text-foreground"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-32">
          <p className="eyebrow">01 — The Verdict</p>
          <h2 className="display-lg mt-4 max-w-[20ch]">
            How agents rank {brand || "Brooks"} right now.
          </h2>

          <div className="mt-12 grid items-end gap-8 border-y border-border py-12 sm:grid-cols-[auto_1fr] sm:gap-16">
            <div className="flex items-baseline gap-4">
              <span
                className="font-display font-extrabold leading-none tracking-[-0.06em]"
                style={{ fontSize: "clamp(7rem, 16vw, 14rem)" }}
              >
                #3
              </span>
              <span className="mono-label whitespace-nowrap">
                avg agent rank
              </span>
            </div>
            <p className="text-xl font-medium leading-snug text-foreground sm:text-2xl">
              {brand || "Brooks"} ranks{" "}
              <span className="bg-signal px-1.5 text-signal-foreground">
                #3
              </span>{" "}
              on average. The category leaders in agent answers are{" "}
              <span className="font-bold">ASICS</span> and{" "}
              <span className="font-bold">Hoka</span>.
            </p>
          </div>

          {/* Agent cards */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((a) => (
              <article
                key={a.name}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/30"
              >
                <div className="flex items-center justify-between">
                  <span className="mono-label rounded-md border border-border px-2 py-1 text-foreground/80">
                    {a.mark}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {a.name}
                  </span>
                </div>
                <div className="mt-8 flex items-baseline justify-between">
                  <span className="mono-label">rank</span>
                  <span className="font-display text-6xl font-extrabold tracking-[-0.04em]">
                    #{a.rankOff}
                  </span>
                </div>
                <div className="mt-6">
                  <div className="mono-label flex items-center justify-between text-[10px]">
                    <span>confidence</span>
                    <span className="text-foreground">{a.confidence}%</span>
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${a.confidence}%` }}
                    />
                  </div>
                </div>
                <p className="mt-6 border-l-2 border-foreground/20 pl-3 text-[13.5px] leading-relaxed text-muted-foreground">
                  "{a.quote}"
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {a.sources.map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[10px] uppercase tracking-wider rounded-md border border-signal/40 bg-signal/10 px-2 py-1 text-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Competitor field */}
          <div className="mt-12 flex flex-wrap items-center gap-2">
            <span className="mono-label mr-2">competitor field</span>
            {COMPETITORS.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — THE WHY (dark) */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-32">
          <p className="eyebrow">02 — The Why</p>
          <h2 className="display-lg mt-4 max-w-[22ch]">
            Where the agents' belief comes from.
          </h2>

          <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
            <div>
              <div className="mono-label mb-4 flex justify-between">
                <span>provenance mix · {brand || "Brooks"}</span>
                <span>100%</span>
              </div>
              {/* Custom horizontal stacked bar */}
              <div className="flex h-14 w-full overflow-hidden rounded-md border border-border">
                {PROVENANCE.map((p, i) => (
                  <div
                    key={p.label}
                    style={{ width: `${p.pct}%` }}
                    className={
                      i === 0
                        ? "bg-foreground"
                        : i === 1
                          ? "bg-foreground/40"
                          : "bg-signal"
                    }
                    title={`${p.label} ${p.pct}%`}
                  />
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {PROVENANCE.map((p, i) => (
                  <div key={p.label} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm ${
                        i === 0
                          ? "bg-foreground"
                          : i === 1
                            ? "bg-foreground/40"
                            : "bg-signal"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{p.label}</span>
                        <span className="font-mono text-sm text-foreground">
                          {p.pct}%
                        </span>
                      </div>
                      <div className="mono-label mt-0.5 text-[10px] normal-case tracking-wider">
                        {p.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="relative rounded-2xl border border-signal/40 bg-signal/[0.06] p-8">
              <span className="mono-label text-signal">insight</span>
              <p className="mt-3 text-lg font-medium leading-snug text-foreground sm:text-xl">
                {brand || "Brooks"} is over-reliant on its own content and nearly
                invisible in community discussions and structured comparison
                sources —{" "}
                <span className="text-signal">
                  exactly where agents look for proof.
                </span>
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* SECTION 4 — SCORECARD (light) */}
      <section className="light-section bg-background text-foreground">
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-32">
          <p className="eyebrow">03 — Scorecard</p>
          <h2 className="display-lg mt-4 max-w-[24ch]">
            {brand || "Brooks"} vs. the category leader, on what agents can
            actually read.
          </h2>

          <div className="mt-14 divide-y divide-border border-y border-border">
            {SCORECARD.map((row) => (
              <div
                key={row.label}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-4 py-6 sm:grid-cols-[260px_minmax(0,1fr)_auto]`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {row.flagged && (
                    <span className="font-mono text-[10px] shrink-0 rounded-sm bg-signal px-1.5 py-0.5 uppercase tracking-wider text-signal-foreground">
                      gap
                    </span>
                  )}
                  <span className="truncate text-base font-semibold sm:text-lg">
                    {row.label}
                  </span>
                </div>

                <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                  <ScoreBars brooks={row.brooks} leader={row.leader} />
                </div>

                <div className="flex shrink-0 items-baseline gap-3 font-mono text-sm">
                  <span className="text-foreground">{row.brooks}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-signal-foreground bg-signal px-1.5">
                    {row.leader}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mono-label mt-6">
            leader benchmark = best-in-category across ASICS / Hoka
          </p>
        </div>
      </section>

      {/* SECTION 5 — THE ONE MOVE + SIMULATOR */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -bottom-40 right-0 h-[600px] w-[800px] rounded-full bg-signal/[0.07] blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-32">
          <p className="eyebrow">04 — The One Move</p>

          {/* Callout */}
          <div className="mt-6 grid gap-8 rounded-3xl border border-border bg-card p-8 sm:p-12 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <h3 className="display-lg max-w-[20ch]">
                Your highest-leverage move.
              </h3>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {brand || "Brooks"} tells its story, but agents can't repeat it —
                there are no specifics they can quote and almost no community
                proof.{" "}
                <span className="text-foreground">
                  Move #1: publish a quantified stability spec / comparison table
                </span>{" "}
                and seed 3 authentic comparison threads (Reddit
                r/RunningShoeGeeks, RunRepeat).
              </p>
            </div>
            <div className="flex items-center lg:justify-end">
              <div className="inline-flex items-center gap-3 rounded-full bg-signal px-5 py-3 text-signal-foreground signal-glow">
                <span className="mono-label text-signal-foreground/70">
                  projected
                </span>
                <span className="text-base font-extrabold tracking-tight">
                  +2 average rank
                </span>
              </div>
            </div>
          </div>

          {/* Simulator */}
          <div className="mt-12 rounded-3xl border border-border bg-card p-8 sm:p-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="mono-label">interactive simulator</p>
                <h4 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Add community + structured proof
                </h4>
              </div>
              <Toggle on={boosted} onChange={setBoosted} />
            </div>

            {/* Agents */}
            <div className="mt-10 grid gap-3">
              {AGENTS.map((a) => {
                const rank = boosted ? a.rankOn : a.rankOff;
                const isOne = rank === 1;
                // bar fill: rank 1 -> 100%, rank 4 -> 25%
                const fill = (5 - rank) * 25;
                return (
                  <div
                    key={a.name}
                    className="grid grid-cols-[88px_minmax(0,1fr)_56px] items-center gap-4 rounded-xl border border-border bg-background/40 px-4 py-4 sm:grid-cols-[140px_minmax(0,1fr)_72px] sm:px-6"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="mono-label hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 sm:inline-block">
                        {a.mark}
                      </span>
                      <span className="truncate text-sm font-semibold sm:text-base">
                        {a.name}
                      </span>
                    </div>
                    <div
                      className={`relative h-7 w-full overflow-hidden rounded-md border ${
                        isOne ? "border-signal/60" : "border-border"
                      }`}
                    >
                      <div
                        className={`h-full rounded-md transition-[width,background-color,box-shadow] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isOne
                            ? "bg-signal signal-glow"
                            : "bg-foreground/80"
                        }`}
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex min-w-[3ch] justify-end font-display text-2xl font-extrabold tracking-[-0.04em] tabular-nums transition-colors duration-500 sm:text-3xl ${
                          isOne ? "text-signal" : "text-foreground"
                        }`}
                      >
                        #{rank}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Average */}
            <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4 border-t border-border pt-8">
              <span className="mono-label">average rank</span>
              <span
                className={`font-display text-6xl font-extrabold tracking-[-0.05em] tabular-nums transition-colors duration-500 sm:text-7xl ${
                  boosted ? "text-signal" : "text-foreground"
                }`}
              >
                #{avg.toFixed(avg % 1 === 0 ? 0 : 2)}
              </span>
            </div>

            {/* Caption */}
            <div
              className={`mt-6 overflow-hidden transition-all duration-500 ease-out ${
                boosted ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
              }`}
              aria-hidden={!boosted}
            >
              <p className="rounded-xl border border-signal/40 bg-signal/[0.08] p-5 text-[15px] leading-relaxed text-foreground sm:text-base">
                <span className="mono-label text-signal mr-2">proof</span>
                We proved this in controlled experiments: swapping one signal
                flips the agent's pick.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-base font-extrabold tracking-tight">
              {BRAND_NAME}<span className="text-signal">.</span>
            </span>
            <span className="mono-label">the SEO of the agent era</span>
          </div>
          <span className="mono-label">
            see your brand the way an AI agent does
          </span>
        </div>
      </footer>
    </main>
  );
}

function ScoreBars({ brooks, leader }: { brooks: number; leader: number }) {
  return (
    <div className="relative h-6 w-full">
      {/* track */}
      <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-muted" />
      {/* brooks fill */}
      <div
        className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-foreground transition-[width] duration-700"
        style={{ width: `${brooks}%` }}
      />
      {/* leader marker */}
      <div
        className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-signal"
        style={{ left: `${leader}%` }}
        aria-label={`Leader ${leader}`}
      />
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`group inline-flex items-center gap-4 rounded-full border px-3 py-2 transition-colors duration-300 ${
        on
          ? "border-signal/60 bg-signal/10"
          : "border-border bg-background/40"
      }`}
    >
      <span className="mono-label text-foreground/80">
        {on ? "ON" : "OFF"}
      </span>
      <span
        className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${
          on ? "bg-signal" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            on ? "left-8" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
