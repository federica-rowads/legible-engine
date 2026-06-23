import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import climb from "../data/climb.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible — does AI recommend your brand?" },
      {
        name: "description",
        content:
          "AI agents recommend one brand to your customer. We learned exactly what makes them choose, and proved it on a brand that does not exist.",
      },
    ],
  }),
  component: Index,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;
const FOCAL = climb.focal;
const moves = climb.steps.slice(1); // the 6 moves (index 0 is the baseline)

function Index() {
  const [run, setRun] = useState<"idle" | "running" | "done">("idle");
  const [level, setLevel] = useState(0); // 0..6 cumulative moves applied
  const cur = climb.steps[level];

  const ask = () => {
    if (run === "running") return;
    setRun("running");
    setLevel(0);
    setTimeout(() => {
      setRun("done");
      setTimeout(() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" }), 90);
    }, 2400);
  };

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4 sm:px-10">
          <span className="text-lg font-extrabold tracking-tight">
            Legible<span className="text-signal">.</span>
          </span>
          <span className="mono-label flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            ChatGPT · Claude · Gemini
          </span>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1100px] px-6 pb-12 pt-20 sm:px-10 sm:pt-28">
          <div className="mono-label mb-8 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <span className="h-1 w-1 rounded-full bg-signal" /> the SEO of the agent era
          </div>
          <h1 className="display-xl max-w-[15ch]">
            <span className="block">Your customer stopped Googling.</span>
            <span className="mt-4 block text-muted-foreground">Their AI agent didn't.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            The agent recommends one brand. We ran controlled experiments on real agents to learn exactly what makes them
            choose, then proved it on a brand that does not exist.
          </p>
        </div>
      </section>

      {/* INPUT — the only white section; the input block stays dark */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-12 sm:px-10">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-neutral-500">ask the agents</p>
          <div className="mt-4 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[1.5fr_auto] sm:items-end">
              <div>
                <label className="mono-label">buyer query</label>
                <div className="mt-1.5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">"{climb.query}"</div>
              </div>
              <button
                onClick={ask}
                disabled={run === "running"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                {run === "running" ? "Asking…" : run === "done" ? "Ask again" : "Ask the agents"}
                <span aria-hidden>→</span>
              </button>
            </div>
            {run === "running" && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {climb.agents.map((a, i) => (
                    <span key={a} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-signal border-t-transparent" style={{ animationDelay: `${i * 120}ms` }} />
                      querying {a}…
                    </span>
                  ))}
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-full animate-pulse rounded-full bg-signal" />
                </div>
              </div>
            )}
            {run === "idle" && <p className="mono-label mt-5 text-foreground/50">real agents · N={climb.n} runs each · click to run</p>}
          </div>
        </div>
      </section>

      {run === "done" && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          {/* ACT 1 — THE PROBLEM */}
          <section id="problem" className="border-b border-border">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <p className="eyebrow">01 · the problem</p>
              <h2 className="display-lg mt-4 max-w-[20ch]">A new brand is invisible to the agents.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                The agents confidently rank the brands they can read, and pick a winner. A brand they can't read is not in
                the conversation, on any of the three.
              </p>
              <div className="mt-10 space-y-2.5">
                {climb.problem.map((b) => (
                  <div key={b.short} className={`flex items-center gap-4 rounded-xl border p-4 ${b.focal ? "border-signal/50 bg-signal/[0.06]" : "border-border bg-card"}`}>
                    <span className={`font-display text-2xl font-extrabold tabular-nums ${b.focal ? "text-signal" : "text-foreground/40"}`}>#{b.rank}</span>
                    <span className="flex-1 font-semibold">{b.brand}</span>
                    {b.focal ? (
                      <span className="mono-label text-signal">recommended 0% · invisible</span>
                    ) : (
                      <span className="mono-label text-foreground/40">recommended</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ACT 2 — THE SOLUTION / OPTIMIZATION SIMULATOR */}
          <section id="solution" className="border-b border-border">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <p className="eyebrow">02 · the solution — what our experiments learned</p>
              <h2 className="display-lg mt-4 max-w-[20ch]">Turn on the moves. Watch it climb.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                We ran controlled experiments to learn which signals actually move an agent. Apply them to the new brand,
                one at a time:
              </p>

              <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-2.5">
                  {moves.map((m, i) => {
                    const p = i + 1;
                    const on = level >= p;
                    return (
                      <button
                        key={m.label}
                        onClick={() => setLevel(on ? p - 1 : p)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${on ? "border-signal/50 bg-signal/[0.06]" : "border-border bg-card hover:border-foreground/30"}`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${on ? "border-signal bg-signal text-signal-foreground" : "border-border text-transparent"}`}>✓</span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">{m.label}</span>
                          <span className="block font-mono text-[0.7rem] text-muted-foreground">{m.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-24 lg:self-start">
                  <div className="mono-label">{FOCAL}'s rank with the agents</div>
                  <div className="font-display text-7xl font-extrabold tabular-nums tracking-[-0.05em] text-signal transition-all duration-500">#{cur.rank}</div>
                  <div className="mono-label mt-1">recommended #1 in {pct(cur.top1)} of runs</div>
                  <div className="mt-6 h-2.5 w-full rounded-full bg-muted">
                    <div className="h-full rounded-full bg-signal transition-all duration-500" style={{ width: pct((5 - cur.rank) / 4) }} />
                  </div>
                  <div className="mono-label mt-2 flex justify-between text-[10px] text-foreground/40">
                    <span>invisible</span>
                    <span>#1</span>
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground">
                    {level === 0 ? "A name the agents have never heard of." : `${level} of 6 moves applied. ${cur.desc}`}
                  </p>
                </div>
              </div>
              <p className="mono-label mt-6 text-foreground/40">each move is a real lever our controlled experiments measured · N={climb.n} per agent per step</p>
            </div>
          </section>

          {/* ACT 3 — THE FINALE / REVEAL */}
          <section id="finale" className="border-b border-border">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <p className="eyebrow">03 · the twist</p>
              <h2 className="display-lg mt-4 max-w-[18ch]">Veloura doesn't exist. We invented it.</h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">{climb.note}</p>
              <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
                {climb.finaleByAgent.map((a) => (
                  <div key={a.name} className="rounded-2xl border border-signal/40 bg-signal/[0.06] p-5 text-center sm:p-6">
                    <div className="mono-label">{a.name}</div>
                    <div className="mt-2 font-display text-5xl font-extrabold text-signal sm:text-6xl">{pct(a.top1)}</div>
                    <div className="mono-label mt-1 text-foreground/50">picks the brand we invented</div>
                  </div>
                ))}
              </div>
              <p className="mt-6 max-w-2xl text-sm text-muted-foreground">{climb.agentDifference}</p>
            </div>
          </section>

          {/* CLOSE */}
          <section className="bg-background">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <h2 className="display-lg max-w-[20ch]">Legible turns the research into your brand's action plan.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Where you rank with the agents today, and the prioritized moves to climb. Before you spend a cent.
              </p>
              <p className="mono-label mt-8 text-muted-foreground">
                real agents (ChatGPT · Claude · Gemini) · controlled experiments · N={climb.n} per condition · every transcript saved
              </p>
            </div>
          </section>
        </div>
      )}

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-8 sm:px-10">
          <span className="text-base font-extrabold tracking-tight">
            Legible<span className="text-signal">.</span>
          </span>
          <span className="mono-label">the SEO of the agent era</span>
        </div>
      </footer>
    </main>
  );
}
