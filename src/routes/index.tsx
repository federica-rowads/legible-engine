import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { baselineLive, liftLive } from "../lib/rank-live";

type Baseline = Awaited<ReturnType<typeof baselineLive>>;
type Lift = Awaited<ReturnType<typeof liftLive>>;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible — where do AI agents rank your brand?" },
      { name: "description", content: "See whether AI agents recommend your brand today (real web search), then apply the moves and measure the lift. Real agents, real data, honest." },
    ],
  }),
  component: Index,
});

const STEPS = ["Where you stand", "Apply the moves", "Measure the lift"];
const TAG: Record<string, string> = { ChatGPT: "GPT", Claude: "CLD", Gemini: "GEM" };
const AGENT_NAMES = ["ChatGPT", "Claude", "Gemini"];
const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const isFocalName = (b: string, focal: string) => { const t = norm(focal).split(/\s+/)[0] || norm(focal); const nb = norm(b); return nb.length >= 2 && (nb.includes(t) || t.includes(nb)); };

// The six moves. Writable = the brand publishes the content (we generate & test it);
// earnable = the brand earns the placement.
const FACTORS = [
  { id: "comparison", label: "Head-to-head comparison", desc: "an honest page pitting you against the category leader", writable: true },
  { id: "reviews", label: "Owner reviews & ratings", desc: "a visible body of customer reviews and a rating", writable: true },
  { id: "community", label: "Community recommendation", desc: "real users recommending you in forums / Reddit", writable: true },
  { id: "specs", label: "Product details / specs", desc: "a clear, machine-readable detail page", writable: true },
  { id: "editorial", label: "Editorial best-of placement", desc: "appear in the best-of guides agents cite", writable: false },
  { id: "authority", label: "Independent expert review", desc: "an independent test or expert assessment", writable: false },
];

const ACTIVITY = ["searching the web…", "collecting the brand's signals…", "reading the results…", "cross-referencing sources…", "weighing the evidence…", "ranking the options…", "double-checking…", "finalizing…"];
function Running({ label, sub }: { label: string; sub: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1700); return () => clearInterval(t); }, []);
  return (
    <div id="running" className="mx-auto max-w-[1100px] px-6 py-24 sm:px-10 sm:py-28">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">{label}</p>
      <h2 className="display-lg mt-4">Asking the real agents…</h2>
      <div className="mt-10 flex flex-col gap-3">
        {AGENT_NAMES.map((a, i) => (
          <span key={a} className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-base font-semibold sm:w-[26rem]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-signal border-t-transparent" style={{ animationDelay: `${i * 200}ms` }} />
            <span className="w-20">{a}</span>
            <span className="mono-label text-foreground/45 transition-all">{ACTIVITY[(tick + i) % ACTIVITY.length]}</span>
          </span>
        ))}
      </div>
      <div className="mt-8 h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-muted"><div className="h-full w-full animate-pulse rounded-full bg-signal" /></div>
      <p className="mono-label mt-4 text-foreground/50">{sub}</p>
    </div>
  );
}

// One agent's result: where it ranks the brand (or "not in its top 10") + its REAL top 10.
function AgentCard({ a, focal }: { a: Baseline["agents"][number]; focal: string }) {
  const failed = a.runs.length > 0 && a.runs.every((r) => !r.ok); // every call errored — NOT the same as "didn't rank you"
  const ranked = a.mentionRate > 0;
  return (
    <div className={`rounded-2xl border p-5 ${ranked ? "border-signal/60 bg-signal/[0.06]" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div><div className="text-lg font-extrabold tracking-tight text-foreground">{a.name}</div><div className="mono-label text-foreground/50">{a.model}</div></div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/15 text-[11px] font-extrabold text-signal">{TAG[a.name]}</span>
      </div>
      <div className="mt-4">
        <div className="mono-label text-foreground/70">ranks {focal}</div>
        {failed
          ? <div className="font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground/45">didn't respond</div>
          : ranked
            ? <div className="font-display text-5xl font-extrabold tracking-[-0.04em] text-signal">#{a.avgPos}<span className="text-base font-bold text-foreground/40"> of 10</span></div>
            : <div className="font-display text-3xl font-extrabold tracking-[-0.04em] text-foreground/45">not in its top 10</div>}
        <div className="mono-label mt-1 text-foreground/50">{failed ? "the live call errored — re-test" : `${ranked && a.posStdev ? `±${a.posStdev} · ` : ""}runs: ${a.runs.map((r) => (r.pos != null ? `#${r.pos}` : (r.ok ? "–" : "x"))).join(" ")}`}</div>
      </div>
      <div className="mt-4">
        <div className="mono-label text-foreground/70">its top 10, live</div>
        <ol className="mt-1.5 space-y-0.5">
          {a.topList.slice(0, 10).map((b, i) => <li key={i} className={`text-[13px] ${isFocalName(b, focal) ? "font-extrabold text-signal" : "text-foreground/70"}`}>{i + 1}. {b}{isFocalName(b, focal) ? " ← you" : ""}</li>)}
          {a.topList.length === 0 && <li className="text-[13px] text-foreground/40">(no ranking returned)</li>}
        </ol>
      </div>
    </div>
  );
}

function BaselineView({ b }: { b: Baseline }) {
  const nRanked = b.agents.filter((a) => a.mentionRate > 0).length;
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">01 · the verdict — today<span className="ml-2 inline-flex items-center gap-1 rounded bg-signal px-1.5 py-0.5 text-[10px] font-bold text-signal-foreground"><span className="h-1.5 w-1.5 rounded-full bg-signal-foreground" />REAL SEARCH</span></p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Where do the agents rank {b.focal}?</h2>
      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="font-display text-8xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-9xl">{b.avgPos != null ? `#${b.avgPos}` : "—"}</div>
        <div className="pb-2"><div className="text-xl font-extrabold text-foreground">average rank, when an agent ranks it at all</div><div className="mono-label text-foreground/60">ranked by {nRanked} of 3 agents · {b.N} real runs each · we never named the brand</div></div>
      </div>
      <p className="mt-6 max-w-[54ch] text-lg font-semibold leading-snug text-foreground sm:text-xl">
        {nRanked === 0
          ? <><span className="text-signal">{b.focal} is invisible</span> — not one agent puts it in its top 10. See what they rank instead, below.</>
          : <>{nRanked} of 3 agents rank {b.focal}{b.avgPos != null ? <>, around <span className="text-signal">#{b.avgPos}</span> of 10</> : null}{nRanked < 3 ? <> — the other {3 - nRanked} leave it off entirely</> : null}.</>}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {b.agents.map((a) => <AgentCard key={a.name} a={a} focal={b.focal} />)}
      </div>
    </div>
  );
}

function LiftView({ baseline, lift, brand }: { baseline: Baseline; lift: Lift; brand: string }) {
  const bAvg = baseline.avgPos, tAvg = lift.avgPos;
  const tRanked = lift.agents.filter((a) => a.mentionRate > 0).length;
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">03 · the lift<span className="ml-2 inline-flex items-center gap-1 rounded bg-signal px-1.5 py-0.5 text-[10px] font-bold text-signal-foreground"><span className="h-1.5 w-1.5 rounded-full bg-signal-foreground" />REAL SEARCH + YOUR CONTENT</span></p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Apply the moves, and {brand} climbs</h2>
      <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="font-display text-5xl font-extrabold leading-none tracking-[-0.05em] text-foreground/40 sm:text-6xl">{bAvg != null ? `#${bAvg}` : "unranked"}</div>
        <div className="pb-3 text-3xl font-extrabold text-signal">→</div>
        <div className="font-display text-7xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-8xl">{tAvg != null ? `#${tAvg}` : "—"}</div>
        <div className="pb-2"><div className="text-xl font-extrabold text-foreground">average rank now · {tRanked} of 3 agents</div><div className="mono-label text-foreground/60">before = today's real search · after = the same real search with your optimized content added</div></div>
      </div>
      <p className="mt-6 max-w-[54ch] text-lg font-semibold leading-snug text-foreground sm:text-xl">
        With its content made legible, {brand} goes from <span className="text-foreground/55">{bAvg != null ? `#${bAvg}` : "unranked"}</span> to <span className="text-signal">{tAvg != null ? `#${tAvg}` : "—"}</span>{tRanked ? <> — now ranked by {tRanked} of 3 agents</> : null}.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {lift.agents.map((a) => <AgentCard key={a.name} a={a} focal={brand} />)}
      </div>
    </div>
  );
}

function WriteThis({ iterations }: { iterations: Lift["iterations"] }) {
  const withBest = iterations.filter((it) => it.best);
  if (!withBest.length) return null;
  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-12 sm:px-10">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">04 · what to write</p>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">We tested the content live. Write exactly this.</h3>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">For each writable move, an agent generated variations, we ran them past the agents, and kept the one that moved the brand most. Verify the facts before you publish.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {withBest.map((it) => (
          <div key={it.lever} className="rounded-2xl border border-signal/40 bg-signal/[0.04] p-5">
            <div className="flex items-center justify-between"><span className="text-sm font-bold capitalize text-foreground">{it.lever}</span><span className="mono-label text-foreground/50">winner · {pct(it.best?.mentionRate)} mention{it.best?.pos != null ? ` · #${it.best.pos}` : ""}</span></div>
            <p className="mt-3 rounded-lg bg-background/60 p-3 text-[13px] leading-relaxed text-foreground/90">"{it.best?.content}"</p>
            {it.versions.length > 1 && <div className="mt-3 space-y-1">{it.versions.map((v, i) => <div key={i} className={`flex items-center justify-between text-[11px] ${v.label === it.best?.label ? "text-signal" : "text-foreground/45"}`}><span className="truncate pr-2">{v.label}</span><span className="font-mono shrink-0">{pct(v.mentionRate)}{v.pos != null ? ` · #${v.pos}` : ""}</span></div>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FailNote({ brand, onRetry }: { brand: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">The live run didn't come back for {brand}.</h2>
      <p className="mt-3 max-w-xl text-sm text-foreground/70">Real agents can be briefly overloaded, and a full run takes a few minutes. <button onClick={onRetry} className="font-semibold text-signal underline underline-offset-2">Try again</button>.</p>
    </div>
  );
}

function Index() {
  const [stage, setStage] = useState(0); // 0 input · 1 baseline-running · 2 baseline+sandbox · 3 lift-running · 4 lift
  const [brand, setBrand] = useState("361 Degrees");
  const [query, setQuery] = useState("best stability running shoes for flat feet");
  const [factors, setFactors] = useState<Set<string>>(new Set(["comparison", "reviews", "community"]));
  const [openF, setOpenF] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [lift, setLift] = useState<Lift | null>(null);

  const activeStep = stage <= 1 ? 0 : stage === 4 ? 2 : 1;
  const scrollTo = (id: string) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 70);

  const ask = async () => {
    if (!brand.trim() || !query.trim()) return;
    setBaseline(null); setLift(null); setStage(1); scrollTo("running");
    try { setBaseline(await baselineLive({ data: { brand, query, n: 3 } })); } catch { setBaseline(null); }
    setStage(2); scrollTo("verdict");
  };
  const retest = async () => {
    setStage(3); scrollTo("running");
    try {
      const competitors = (baseline?.competitors || []).map((c) => c.name);
      setLift(await liftLive({ data: { brand, query, competitors, levers: [...factors], n: 3 } }));
    } catch { setLift(null); }
    setStage(4); scrollTo("result");
  };
  const toggle = (id: string) => setFactors((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleOpen = (id: string) => setOpenF((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <span className="text-lg font-extrabold tracking-tight">Legible<span className="text-signal">.</span></span>
          <nav className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] sm:flex">
            {STEPS.map((label, i) => (
              <span key={label} className="flex items-center gap-2">
                <span className={i === activeStep ? "text-signal" : i < activeStep ? "text-foreground/60" : "text-foreground/30"}>0{i + 1}. {label}</span>
                {i < STEPS.length - 1 && <span className="text-foreground/20">›</span>}
              </span>
            ))}
          </nav>
        </div>
      </header>

      {/* HERO + INPUT */}
      <section className="border-b border-border">
        <div className="relative mx-auto max-w-[1100px] overflow-hidden px-6 pb-12 pt-16 sm:px-10 sm:pt-24">
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-3xl" />
          <h1 className="display-xl max-w-[15ch]"><span className="block">Where do AI agents</span><span className="mt-3 block text-muted-foreground">rank your brand?</span></h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">When a buyer asks an agent, it recommends a few brands. We ask the real agents (live web search) whether yours is one of them — then apply the moves and measure the lift.</p>

          <div className="mt-10 rounded-3xl border-2 border-foreground/15 bg-card p-6 shadow-[0_0_40px_-12px_rgba(0,0,0,0.6)] sm:p-7">
            <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.14em] text-foreground/80">your brand</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="type any brand" className="mt-2 w-full rounded-xl border-2 border-foreground/20 bg-background px-4 py-3.5 text-base font-semibold text-foreground placeholder:font-normal placeholder:text-foreground/40 focus:border-signal focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.14em] text-foreground/80">buyer prompt</label>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="type the buyer's question" className="mt-2 w-full rounded-xl border-2 border-foreground/20 bg-background px-4 py-3.5 text-base text-foreground placeholder:text-foreground/40 focus:border-signal focus:outline-none" />
              </div>
              <button onClick={ask} disabled={!brand.trim() || !query.trim() || stage === 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3.5 text-base font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">Ask the agents <span aria-hidden>→</span></button>
            </div>
            {stage === 0 && <p className="mono-label mt-5 text-foreground/50">real agents · live web search · 3 runs each · a full run takes a couple of minutes</p>}
          </div>
        </div>
      </section>

      {/* STAGE 1 — baseline running */}
      {stage === 1 && <section className="border-b border-border animate-in fade-in"><Running label="measuring · live web search" sub="searching the real web and reading what they recommend — this takes a couple of minutes" /></section>}

      {/* STAGE 2 — baseline + sandbox */}
      {stage >= 2 && (
        <section id="verdict" className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          {baseline ? <BaselineView b={baseline} /> : <FailNote brand={brand} onRetry={ask} />}

          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <div className="rounded-3xl border border-signal/30 bg-signal/[0.05] p-6 sm:p-8">
              <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">02 · the sandbox</p>
              <h3 className="mt-3 max-w-[34ch] text-2xl font-extrabold tracking-tight sm:text-3xl">Make your signals legible, then test again.</h3>
              <p className="mt-3 max-w-2xl text-sm text-foreground/70">We optimize your content for the moves you pick, <span className="font-semibold text-foreground">inject it into the agents' real search</span>, and re-measure — so the lift is anchored to today's reality. <span className="font-semibold text-foreground">Writable</span> = content you publish (we generate &amp; test the wording); <span className="font-semibold text-foreground">earnable</span> = a placement you earn.</p>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_auto] lg:items-start">
                <div className="space-y-3">
                  {FACTORS.map((f) => {
                    const on = factors.has(f.id), open = openF.has(f.id);
                    return (
                      <div key={f.id} className={`rounded-xl border-2 transition-colors ${on ? "border-signal bg-signal/[0.1]" : "border-foreground/15 bg-card"}`}>
                        <div className="flex items-center gap-4 p-4">
                          <button onClick={() => toggle(f.id)} aria-label={`toggle ${f.label}`} className="shrink-0">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-md border-2 text-sm font-extrabold transition-colors ${on ? "border-signal bg-signal text-signal-foreground" : "border-foreground/50 bg-background text-transparent"}`}>✓</span>
                          </button>
                          <button onClick={() => toggleOpen(f.id)} className="flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{f.label}</span>
                              <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${f.writable ? "bg-signal/20 text-signal" : "bg-muted text-foreground/70"}`}>{f.writable ? "writable" : "earnable"}</span>
                            </div>
                            <span className="mt-0.5 block font-mono text-[0.72rem] text-foreground/60">{f.desc}</span>
                          </button>
                          <button onClick={() => toggleOpen(f.id)} aria-label="expand" className="w-6 shrink-0 text-center text-xl text-foreground/50 hover:text-foreground">{open ? "−" : "+"}</button>
                        </div>
                        {open && (
                          <div className="animate-in fade-in border-t border-border/60 px-4 py-4 text-[13px] leading-relaxed text-foreground/80">
                            {f.writable ? <>You publish this. When you enable it, an agent generates a few realistic versions, we run each past the agents, and we keep the wording that moved your brand most — shown under "what to write".</> : <>You earn this — it can't be self-published. We model the placement to measure what it would be worth, but the brand has to genuinely earn it (pitch the editors, get into the independent tests).</>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center lg:sticky lg:top-24 lg:w-52">
                  <div className="mono-label text-foreground/70">{factors.size} moves enabled</div>
                  <button onClick={retest} disabled={factors.size === 0 || stage === 3 || !baseline} className="mt-4 w-full rounded-xl bg-signal px-4 py-3 text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">{stage === 3 ? "Re-testing…" : "Test again ↻"}</button>
                  <p className="mono-label mt-3 text-foreground/40">re-runs the agents live</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STAGE 3 — lift running */}
      {stage === 3 && <section className="border-b border-border animate-in fade-in"><Running label="re-testing · live" sub="optimizing your content, then re-running the real search with it added — a few minutes" /></section>}

      {/* STAGE 4 — lift */}
      {stage === 4 && (
        <section id="result" className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          {lift && baseline ? <LiftView baseline={baseline} lift={lift} brand={brand} /> : <FailNote brand={brand} onRetry={retest} />}
          {lift && <WriteThis iterations={lift.iterations} />}
          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <p className="mono-label text-foreground/50">
two layers, both honest · LAYER 1 (today): real agents (ChatGPT gpt-5.5 · Claude opus-4-8 · Gemini pro-latest) really web-search your prompt, brand never named, 3 runs each — this is where you rank right now · LAYER 2 (the lift): the SAME real search, with your optimized content added to what the agents read — so the "after" is anchored to today's reality (no clean room) · the lift assumes your content reaches the agents' search; the generated "write this" is illustrative — verify the facts before publishing
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
