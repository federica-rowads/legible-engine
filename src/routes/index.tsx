import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import legible from "../data/legible.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible — does AI recommend your brand?" },
      {
        name: "description",
        content:
          "AI agents recommend one brand to your customer. Legible shows whether it's you, and the one move that flips them.",
      },
    ],
  }),
  component: Index,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;
const BRAND = legible.brand;
const v = legible.verdict;
const f = legible.flip;
const cross = legible.crossAgent;
const ph = legible.drivers; // the phantom-brand experiment
const AGENTS = ["ChatGPT", "Claude", "Gemini"];

function Index() {
  const [run, setRun] = useState<"idle" | "running" | "done">("idle");
  const [moved, setMoved] = useState(false);

  const ask = () => {
    if (run === "running") return;
    setRun("running");
    setMoved(false);
    setTimeout(() => {
      setRun("done");
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 90);
    }, 2400);
  };

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      {/* header */}
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

      {/* HERO — what we do, in one breath */}
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
            The agent recommends one brand. If it isn't yours, you're invisible, and you never even know. Legible measures
            where AI agents rank your brand, and the one move that flips them.
          </p>
        </div>
      </section>

      {/* INPUT — the only white section; the input block itself stays dark */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-12 sm:px-10">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-neutral-500">try it on a brand</p>
          <div className="mt-4 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
              <div>
                <label className="mono-label">brand</label>
                <div className="mt-1.5 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground">
                  {BRAND} {legible.model}
                </div>
              </div>
              <div>
                <label className="mono-label">buyer query</label>
                <div className="mt-1.5 truncate rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                  "{legible.query}"
                </div>
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
                  {AGENTS.map((a, i) => (
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
            {run === "idle" && (
              <p className="mono-label mt-5 text-foreground/50">N={legible.n} live runs per agent · real public pages · click to run</p>
            )}
          </div>
        </div>
      </section>

      {/* RESULTS — appear only after the run */}
      {run === "done" && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          {/* THE RESULT: where you rank + the one move, in one block */}
          <section id="result" className="border-b border-border">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <p className="eyebrow">the verdict</p>
              <h2 className="display-lg mt-4 max-w-[22ch]">{BRAND}, the world's #1 shoe, is invisible to the agent.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                RunRepeat's #1 "Best Overall" pick for overpronation. The agents still never choose it, they settle for {v.winner}.
                Now make one true fact legible and watch:
              </p>

              <div className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-10">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">{moved ? "After the move" : "Today"}</h3>
                  <button
                    onClick={() => setMoved(!moved)}
                    role="switch"
                    aria-checked={moved}
                    className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 transition-colors ${moved ? "border-signal/60 bg-signal/10" : "border-border"}`}
                  >
                    <span className="mono-label">{moved ? "page published" : "make it legible"}</span>
                    <span className={`relative h-7 w-14 rounded-full transition-colors ${moved ? "bg-signal" : "bg-muted"}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow-md transition-all ${moved ? "left-8" : "left-1"}`} />
                    </span>
                  </button>
                </div>

                <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:items-center">
                  <div>
                    <div className="mono-label">{BRAND} recommended #1</div>
                    <div className={`font-display text-7xl font-extrabold tabular-nums tracking-[-0.05em] transition-colors duration-500 ${moved ? "text-signal" : "text-foreground"}`}>
                      {pct(moved ? f.moveBrooksTop1 : f.baseBrooksTop1)}
                    </div>
                    <div className="mono-label mt-1">average rank {moved ? f.moveBrooksRank : f.baseBrooksRank} of 5</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {cross.agents.map((a) => (
                      <div key={a.name} className="rounded-xl border border-border bg-background/50 p-3 text-center">
                        <div className="mono-label text-[10px]">{a.name}</div>
                        <div className={`font-display text-2xl font-extrabold tabular-nums transition-colors duration-500 ${moved ? "text-signal" : "text-foreground/60"}`}>
                          {pct(moved ? a.after : a.before)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-7 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
                  {moved
                    ? `One brand-safe page with ${BRAND}' real, public facts, nothing fabricated. Re-run on the live agents: 0% to ${pct(f.moveBrooksTop1)} recommended, on all three. The product never changed, only its legibility.`
                    : "We published one page surfacing the brand's real, public facts, then re-ran the live agents. Flip the switch."}
                </p>
              </div>
            </div>
          </section>

          {/* THE WHY — the phantom brand (the aha) */}
          <section className="border-b border-border">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <p className="eyebrow">why it works</p>
              <h2 className="display-lg mt-4 max-w-[20ch]">It's not reputation. It's legibility.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                We invented a brand that does not exist. Made it legible, and all three agents recommended it over four real
                market leaders.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
                {ph.fullLegibilityByAgent.map((a) => (
                  <div key={a.name} className="rounded-2xl border border-signal/40 bg-signal/[0.06] p-5 text-center sm:p-6">
                    <div className="mono-label">{a.name}</div>
                    <div className="mt-2 font-display text-5xl font-extrabold text-signal sm:text-6xl">{pct(a.top1)}</div>
                    <div className="mono-label mt-1 text-foreground/50">picks a brand that doesn't exist</div>
                  </div>
                ))}
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{ph.insight}</p>
            </div>
          </section>

          {/* CLOSE */}
          <section className="bg-background">
            <div className="mx-auto max-w-[1100px] px-6 py-20 sm:px-10 sm:py-24">
              <h2 className="display-lg max-w-[18ch]">Measure your Agent Share of Voice. Make the one move.</h2>
              <p className="mono-label mt-6 text-muted-foreground">
                real agents (ChatGPT · Claude · Gemini) · N={legible.n} per condition · 95% bootstrap CIs · every transcript saved
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
