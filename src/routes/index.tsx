import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import data from "../data/climb361.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible — where do AI agents rank your brand?" },
      {
        name: "description",
        content:
          "See where AI agents rank your brand, then apply the moves our experiments found and watch it climb. A real brand, real agents, real lift.",
      },
    ],
  }),
  component: Index,
});

const ORDER = ["specs", "reviews", "authority"] as const;
const TAG: Record<string, string> = { ChatGPT: "GPT", Claude: "CLD", Gemini: "GEM" };
const stripMd = (s: string) => s.replace(/\*\*/g, "");

function Running({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-24 sm:px-10 sm:py-32">
      <p className="eyebrow">{label}</p>
      <h2 className="display-lg mt-4">Querying the agents…</h2>
      <div className="mt-10 flex flex-wrap gap-3">
        {data.agents.map((a, i) => (
          <span key={a} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-signal border-t-transparent" style={{ animationDelay: `${i * 140}ms` }} />
            {a}
          </span>
        ))}
      </div>
      <div className="mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full animate-pulse rounded-full bg-signal" />
      </div>
    </div>
  );
}

function Ranking({ block, brand, eyebrow, headline }: { block: typeof data.before; brand: string; eyebrow: string; headline: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="eyebrow">{eyebrow}</p>
      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="font-display text-8xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-9xl">#{block.avgRank}</div>
        <div className="mono-label pb-2 text-foreground/60">avg agent rank for<br />{brand}</div>
      </div>
      <h2 className="mt-6 max-w-[40ch] text-2xl font-extrabold tracking-tight sm:text-3xl">{headline}</h2>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {block.agents.map((ag) => {
          const win = ag.pick.toLowerCase().includes("361");
          return (
            <div key={ag.name} className={`rounded-2xl border p-5 ${win ? "border-signal/50 bg-signal/[0.06]" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between">
                <span className="mono-label text-foreground/50">{TAG[ag.name]}</span>
                <span className="text-sm font-extrabold tracking-tight">{ag.name}</span>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="mono-label">rank</div>
                  <div className={`font-display text-5xl font-extrabold tracking-[-0.04em] ${win ? "text-signal" : "text-foreground"}`}>#{ag.rank}</div>
                </div>
                <div className="text-right">
                  <div className="mono-label">confidence</div>
                  <div className="font-mono text-lg font-bold text-foreground/70">{ag.confidence ?? "—"}%</div>
                </div>
              </div>
              <p className="mt-4 border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground">"{stripMd(ag.quote)}"</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ag.sources.map((s) => (
                  <span key={s} className="mono-label rounded bg-muted px-1.5 py-0.5 text-[9px] text-foreground/50">{s}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Index() {
  const [stage, setStage] = useState(0); // 0 input · 1 running · 2 before+sandbox · 3 running · 4 after
  const [brand, setBrand] = useState("");
  const [factors, setFactors] = useState<Set<string>>(new Set());

  const level = ORDER.filter((f) => factors.has(f)).length;
  const projected = data.steps[level] || data.steps[data.steps.length - 1];
  const showAfter = factors.has("authority"); // the decisive lever flips the cards
  const afterBlock = showAfter ? data.after : { ...data.before, avgRank: projected.avgRank };

  const ask = () => { if (!brand) return; setStage(1); setTimeout(() => setStage(2), 2400); };
  const retest = () => {
    setStage(3);
    setTimeout(() => { setStage(4); setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 80); }, 2400);
  };
  const toggle = (id: string) => setFactors((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4 sm:px-10">
          <span className="text-lg font-extrabold tracking-tight">Legible<span className="text-signal">.</span></span>
          <span className="mono-label flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" /></span>
            ChatGPT · Claude · Gemini
          </span>
        </div>
      </header>

      {/* HERO + INPUT */}
      <section className="border-b border-border">
        <div className="relative mx-auto max-w-[1100px] overflow-hidden px-6 pb-12 pt-16 sm:px-10 sm:pt-24">
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-3xl" />
          <h1 className="display-xl max-w-[15ch]">
            <span className="block">Where do AI agents</span>
            <span className="mt-3 block text-muted-foreground">rank your brand?</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            When a buyer asks an agent, it recommends one brand. See where yours lands today, then apply the moves our
            experiments found, and watch it climb.
          </p>

          <div className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
              <div>
                <label className="mono-label">your brand</label>
                <input
                  value={brand}
                  onClick={() => setBrand(data.brandFull)}
                  onChange={() => setBrand(data.brandFull)}
                  readOnly
                  placeholder="click to enter your brand"
                  className="mt-1.5 w-full cursor-pointer rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-foreground/40 focus:border-signal focus:outline-none"
                />
              </div>
              <div>
                <label className="mono-label">buyer query</label>
                <div className="mt-1.5 truncate rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">"{data.query}"</div>
              </div>
              <button onClick={ask} disabled={!brand || stage === 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                Ask the agents <span aria-hidden>→</span>
              </button>
            </div>
            {stage === 0 && <p className="mono-label mt-5 text-foreground/50">real agents · N=5 runs each · click the brand field to begin</p>}
          </div>
        </div>
      </section>

      {/* STAGE 1 — running */}
      {stage === 1 && <section className="border-b border-border animate-in fade-in"><Running label="measuring · live" /></section>}

      {/* STAGE 2 — BEFORE + SANDBOX */}
      {stage >= 2 && (
        <section className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          <Ranking
            block={data.before}
            brand={data.brand}
            eyebrow="01 · how the agents rank you today"
            headline={<>{data.brandFull} is ranked <span className="text-signal">last</span>. All three agents pick Brooks, and they are confident.</>}
          />

          {/* SANDBOX */}
          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <div className="rounded-3xl border border-signal/30 bg-signal/[0.04] p-6 sm:p-8">
              <p className="eyebrow text-signal">02 · the sandbox — apply what we learned</p>
              <h3 className="mt-3 max-w-[28ch] text-2xl font-extrabold tracking-tight sm:text-3xl">Enable the moves, then test again.</h3>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">Each move is a real, brand-safe action our controlled experiments found moves an agent. Only true facts about {data.brandFull}, made legible.</p>

              <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_auto] lg:items-start">
                <div className="space-y-2.5">
                  {data.factors.map((f) => {
                    const on = factors.has(f.id);
                    return (
                      <button key={f.id} onClick={() => toggle(f.id)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${on ? "border-signal/50 bg-signal/[0.08]" : "border-border bg-card hover:border-foreground/30"}`}>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${on ? "border-signal bg-signal text-signal-foreground" : "border-border text-transparent"}`}>✓</span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">{f.label}</span>
                          <span className="block font-mono text-[0.7rem] text-muted-foreground">{f.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 text-center lg:w-48">
                  <div className="mono-label">projected rank</div>
                  <div className="font-display text-6xl font-extrabold tracking-[-0.05em] text-signal transition-all duration-500">#{projected.avgRank}</div>
                  <button onClick={retest} disabled={factors.size === 0 || stage === 3} className="mt-4 w-full rounded-xl bg-signal px-4 py-2.5 text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                    {stage === 3 ? "Testing…" : "Test again ↻"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STAGE 3 — running again */}
      {stage === 3 && <section className="border-b border-border animate-in fade-in"><Running label="re-testing · live" /></section>}

      {/* STAGE 4 — AFTER */}
      {stage === 4 && (
        <section id="result" className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          <Ranking
            block={afterBlock}
            brand={data.brand}
            eyebrow="03 · how the agents rank you now"
            headline={showAfter
              ? <>{data.brandFull} climbed from <span className="text-foreground/50">#6</span> to <span className="text-signal">#{afterBlock.avgRank}</span>, recommended {Math.round(data.after.top1 * 100)}% of the time. Same brand. Same shoe. Only its real signals, made legible.</>
              : <>It moved to #{afterBlock.avgRank}. The decisive lever is <span className="text-signal">third-party authority</span> — enable it and test again to see the flip.</>}
          />
          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <p className="mono-label text-muted-foreground">
              real agents (ChatGPT · Claude · Gemini) · N=5 per condition · controlled environment, one variable changed · every transcript saved · 361 Degrees is a real brand, all surfaced signals are true and sourced (Doctors of Running 88.8% / 9.5-of-10 stability)
            </p>
          </div>
        </section>
      )}

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-8 sm:px-10">
          <span className="text-base font-extrabold tracking-tight">Legible<span className="text-signal">.</span></span>
          <span className="mono-label">the SEO of the agent era</span>
        </div>
      </footer>
    </main>
  );
}
