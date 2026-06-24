import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { agentBaselineLive, optimizeLive, agentTreatmentLive } from "../lib/rank-live";

type AgentB = Awaited<ReturnType<typeof agentBaselineLive>>;
type Opt = Awaited<ReturnType<typeof optimizeLive>>;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legible: How do AI agents rank your brand?" },
      { name: "description", content: "See whether AI agents recommend your brand today (real web search), then apply the moves and measure the lift. Real agents, real data, honest." },
    ],
  }),
  component: Index,
});

const STEPS = ["Where you stand", "Apply the moves", "Measure the lift"];
const AGENT_NAMES = ["ChatGPT", "Claude", "Gemini"];
const MODELS: Record<string, string> = { ChatGPT: "gpt-5.5", Claude: "claude-opus-4-8", Gemini: "gemini-pro-latest" };
// Readable display labels for the real model IDs above, shown in the agent card header.
const MODEL_LABEL: Record<string, string> = { ChatGPT: "GPT-5.5", Claude: "Opus 4.8", Gemini: "Gemini Pro" };
// Shared agent-card header: a green name pill + the readable model beside it. Used by
// ThinkingCard (loading) and AgentCard (result) so the card looks identical in both states.
function AgentHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 pb-3">
      <span className="rounded-md bg-signal/15 px-2.5 py-1 text-sm font-extrabold tracking-tight text-signal">{name}</span>
      <span className="mono-label text-foreground/60">{MODEL_LABEL[name] || MODELS[name]}</span>
    </div>
  );
}
const pct = (x: number | null | undefined) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const isFocalName = (b: string, focal: string) => { const t = norm(focal).split(/\s+/)[0] || norm(focal); const nb = norm(b); return nb.length >= 2 && (nb.includes(t) || t.includes(nb)); };
const meanOf = (xs: number[]) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);
// A synthetic "this agent's live call errored" result, so a failed agent shows "didn't respond" (never a fake "not ranked").
const errAgent = (name: string): AgentB => ({ name, model: MODELS[name] || "", runs: [{ agent: name, model: MODELS[name] || "", ranked: [], pos: null, ok: false }], mentionRate: 0, avgPos: null, posStdev: null, topList: [] });
const positions = (slots: AgentB[]) => slots.flatMap((a) => a.runs.filter((r) => r.ok && r.pos != null).map((r) => r.pos as number));
const anyOk = (slots: AgentB[]) => slots.some((a) => a.runs.some((r) => r.ok));
// The real competitor set, tallied across the agents' live top-10s (focal excluded), grounds the injection.
function competitorsOf(slots: (AgentB | null)[], focal: string): string[] {
  const tally = new Map<string, { name: string; n: number }>();
  for (const a of slots) { if (!a) continue; for (const b of a.topList) { if (isFocalName(b, focal)) continue; const k = norm(b); const e = tally.get(k); if (e) e.n++; else tally.set(k, { name: b, n: 1 }); } }
  return [...tally.values()].sort((x, y) => y.n - x.n).slice(0, 10).map((e) => e.name);
}

// The six moves. `what` is a plain explanation and `examples` are two concrete action items,
// shown in the expand panel. The engine decides writability by lever id internally.
const FACTORS = [
  { id: "comparison", label: "Head-to-head comparison", desc: "an honest page pitting you against the category leader", what: "An honest side-by-side of you against the brand agents recommend most, so the agent has a basis to place you.", examples: ["Publish a '[you] vs [category leader]' page: price, materials, fit, who each is best for.", "Add a line the agent can quote, e.g. '[you]: machine-washable, $X. [leader]: dry-clean, $Y.'"] },
  { id: "reviews", label: "Owner reviews & ratings", desc: "a visible body of customer reviews and a rating", what: "A visible body of real customer reviews and an aggregate rating on your product pages.", examples: ["Show a rating with a real count, e.g. '4.5/5 across 2,000+ verified owners' (substantiate the numbers).", "Surface two or three quoted reviews that name the use case, e.g. 'best for flat feet'."] },
  { id: "community", label: "Community recommendation", desc: "real users recommending you in forums / Reddit", what: "Real users recommending you where agents read, like Reddit and niche forums.", examples: ["Earn an honest Reddit thread where owners recommend you for this exact need.", "Get named in a forum reply comparing options for the buyer's use case."] },
  { id: "specs", label: "Product details / specs", desc: "a clear, machine-readable detail page", what: "A clear, machine-readable detail page with the attributes shoppers actually compare.", examples: ["Publish a spec block: materials, fit, sizing, weight, price, care.", "Add structured product data the agent can parse."] },
  { id: "editorial", label: "Editorial best-of placement", desc: "appear in the best-of guides agents cite", what: "A spot in the 'best [category]' guides agents cite. You earn or place this, you do not self-publish it.", examples: ["Get listed in a respected '[category] best-of' roundup.", "Land a mention in a buyer's guide for this use case (PR or paid placement both count)."] },
  { id: "authority", label: "Independent expert review", desc: "an independent test or expert assessment", what: "An independent test or expert verdict on your product. You earn this, but you can pursue it.", examples: ["Get an independent reviewer or lab to test your product.", "Earn an expert's verdict the agent can cite."] },
];

// Placebo thinking-feed phrases (not wired to real agent state). Agent-reasoning style.
const ACTIVITY = [
  "searching the web…",
  "collecting the brand's signals…",
  "reading the top results…",
  "cross-referencing sources…",
  "checking owner reviews…",
  "comparing the alternatives…",
  "weighing the evidence…",
  "ranking the options…",
  "double-checking the order…",
  "finalizing the shortlist…",
];

// One agent's rolling "thinking feed": a window of the last up-to-3 phrases that
// advances one line at a time. Newest line sits at the bottom (full opacity + spinner);
// older lines above it fade out. Self-timed: each step schedules the next on a fresh
// random delay (~1700-3000ms) so the three feeds tick at their own organic rhythm rather
// than in lockstep, and each starts on a different phrase (offset per column). The card
// unmounts when the agent's result arrives, so the feed stops naturally via cleanup.
function ThinkingFeed({ offset }: { offset: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 1700 + Math.random() * 1300; // ~1700ms .. ~3000ms
      timer = setTimeout(() => { setTick((x) => x + 1); schedule(); }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  const phrase = (k: number) => ACTIVITY[((k + offset) % ACTIVITY.length + ACTIVITY.length) % ACTIVITY.length];
  const start = Math.max(0, tick - 2);
  const lines: { key: number; text: string }[] = [];
  for (let k = start; k <= tick; k++) lines.push({ key: k, text: phrase(k) });
  const dim = ["text-foreground/30", "text-foreground/55", "text-foreground"];
  return (
    <div className="mt-4 min-h-[4.75rem] space-y-1.5">
      {lines.map((ln, idx) => {
        const newest = idx === lines.length - 1;
        const tone = dim[Math.min(idx + (3 - lines.length), 2)];
        return (
          <div key={ln.key} className={`flex items-center gap-2 font-mono text-[0.72rem] tracking-[0.06em] transition-all duration-500 ${tone}`}>
            {newest && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-signal border-t-transparent" />}
            <span className={newest ? "" : "pl-5"}>{ln.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// A still-running agent: same card chrome as the result card, with the live thinking feed below.
function ThinkingCard({ name, offset }: { name: string; offset: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <AgentHeader name={name} />
      <ThinkingFeed offset={offset} />
    </div>
  );
}

// One agent's result: where it ranks the brand (or "not in its top 10") + its REAL top 10.
function AgentCard({ a, focal }: { a: AgentB; focal: string }) {
  const failed = a.runs.length > 0 && a.runs.every((r) => !r.ok); // every call errored, NOT the same as "didn't rank you"
  const ranked = a.mentionRate > 0;
  return (
    <div className={`rounded-2xl border p-5 animate-in fade-in duration-500 ${ranked ? "border-signal/60 bg-signal/[0.06]" : "border-border bg-card"}`}>
      <AgentHeader name={a.name} />
      <div className="mt-4">
        <div className="mono-label text-foreground/70">ranks {focal}</div>
        {failed
          ? <div className="font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground/45">didn't respond</div>
          : ranked
            ? <div className="font-display text-5xl font-extrabold tracking-[-0.04em] text-signal">#{a.avgPos}<span className="text-base font-bold text-foreground/40"> of 10</span></div>
            : <div className="font-display text-3xl font-extrabold tracking-[-0.04em] text-foreground/45">not in its top 10</div>}
        <div className="mono-label mt-1 text-foreground/50">{failed ? "the live call errored, re-test" : `${ranked && a.posStdev ? `±${a.posStdev} · ` : ""}runs: ${a.runs.map((r) => (r.pos != null ? `#${r.pos}` : (r.ok ? "–" : "x"))).join(" ")}`}</div>
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

// The progressive grid: each cell is a result card once that agent resolves, a thinking card until then.
function AgentGrid({ slots, focal }: { slots: (AgentB | null)[]; focal: string }) {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {AGENT_NAMES.map((name, i) => (slots[i] ? <AgentCard key={name} a={slots[i] as AgentB} focal={focal} /> : <ThinkingCard key={name} name={name} offset={i * 3} />))}
    </div>
  );
}

function RunningHead({ label, n }: { label: string; n: number }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      <div className="text-xl font-extrabold text-foreground">{label}<span className="text-foreground/50"> · {n} of 3 answered</span></div>
    </div>
  );
}

// 01 the baseline verdict, filled in progressively as each agent answers.
function VerdictView({ slots, focal, onRetry }: { slots: (AgentB | null)[]; focal: string; onRetry: () => void }) {
  const loaded = slots.filter(Boolean) as AgentB[];
  const allDone = loaded.length === slots.length;
  const avgPos = meanOf(positions(loaded));
  const nRanked = loaded.filter((a) => a.mentionRate > 0).length;
  const N = loaded.find((a) => a.runs.length)?.runs.length ?? 2;
  const allFailed = allDone && !anyOk(loaded);
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">01 · the verdict, today<span className="ml-2 inline-flex items-center gap-1 rounded bg-signal px-1.5 py-0.5 text-[10px] font-bold text-signal-foreground"><span className="h-1.5 w-1.5 rounded-full bg-signal-foreground" />REAL SEARCH</span></p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">How do the agents rank the brand: <span className="italic">{focal}</span>?</h2>
      {!allDone ? (
        <RunningHead label="Measuring live" n={loaded.length} />
      ) : allFailed ? (
        <p className="mt-8 max-w-[68ch] text-lg font-semibold leading-snug text-foreground">The live run didn't come back. Real agents can be briefly overloaded. <button onClick={onRetry} className="text-signal underline underline-offset-2">Try again</button>.</p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div className="font-display text-8xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-9xl">{avgPos != null ? `#${avgPos}` : "Unranked"}</div>
            <div className="pb-2"><div className="text-xl font-extrabold text-foreground">{avgPos != null ? "average rank, when an agent ranks it at all" : "not in any agent's top 10"}</div><div className="mono-label text-foreground/60">ranked by {nRanked} of 3 agents · {N} real runs each · we never named the brand</div></div>
          </div>
          <p className="mt-6 max-w-[68ch] text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {nRanked === 0
              ? <><span className="text-signal">The brand: <span className="italic">{focal}</span> is invisible.</span> Not one agent puts it in its top 10. See what they rank instead, below.</>
              : <>{nRanked} of 3 agents rank the brand: <span className="italic">{focal}</span>{avgPos != null ? <>, around <span className="text-signal">#{avgPos}</span> of 10</> : null}{nRanked < 3 ? <>, while the other {3 - nRanked} leave it off entirely</> : null}.</>}
          </p>
        </>
      )}
      <AgentGrid slots={slots} focal={focal} />
    </div>
  );
}

// 03 the lift: optimize the content, then re-run each agent progressively. before vs after.
function LiftView({ bSlots, tSlots, brand, optimizing }: { bSlots: (AgentB | null)[]; tSlots: (AgentB | null)[]; brand: string; optimizing: boolean }) {
  const bAvg = meanOf(positions(bSlots.filter(Boolean) as AgentB[]));
  const tLoaded = tSlots.filter(Boolean) as AgentB[];
  const allDone = !optimizing && tLoaded.length === tSlots.length;
  const tAvg = meanOf(positions(tLoaded));
  const tRanked = tLoaded.filter((a) => a.mentionRate > 0).length;
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">03 · the lift<span className="ml-2 inline-flex items-center gap-1 rounded bg-signal px-1.5 py-0.5 text-[10px] font-bold text-signal-foreground"><span className="h-1.5 w-1.5 rounded-full bg-signal-foreground" />REAL SEARCH + YOUR CONTENT</span></p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Apply the moves, and the brand: <span className="italic">{brand}</span> climbs</h2>
      {optimizing ? (
        <div className="mt-8 flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" /><div className="text-xl font-extrabold text-foreground">Optimizing your content<span className="text-foreground/50"> · generating and scoring the best version</span></div></div>
      ) : !allDone ? (
        <RunningHead label="Re-testing live" n={tLoaded.length} />
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="font-display text-5xl font-extrabold leading-none tracking-[-0.05em] text-foreground/40 sm:text-6xl">{bAvg != null ? `#${bAvg}` : "Unranked"}</div>
            <div className="pb-3 text-3xl font-extrabold text-signal">→</div>
            <div className="font-display text-7xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-8xl">{tAvg != null ? `#${tAvg}` : "Unranked"}</div>
            <div className="pb-2"><div className="text-xl font-extrabold text-foreground">average rank now · {tRanked} of 3 agents</div><div className="mono-label text-foreground/60">before = today's real search · after = the same real search with your optimized content added</div></div>
          </div>
          <p className="mt-6 max-w-[68ch] text-lg font-semibold leading-snug text-foreground sm:text-xl">
            With its content made legible, <span className="italic">{brand}</span> goes from <span className="text-foreground/55">{bAvg != null ? `#${bAvg}` : "Unranked"}</span> to <span className="text-signal">{tAvg != null ? `#${tAvg}` : "Unranked"}</span>{tRanked ? <>, now ranked by {tRanked} of 3 agents</> : null}.
          </p>
        </>
      )}
      {!optimizing && <AgentGrid slots={tSlots} focal={brand} />}
    </div>
  );
}

function WriteThis({ iterations }: { iterations: Opt["iterations"] }) {
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

function Index() {
  const [stage, setStage] = useState(0); // 0 input · 2 baseline phase · 4 lift phase
  const [brand, setBrand] = useState("361 Degrees");
  const [query, setQuery] = useState("best stability running shoes for flat feet");
  const [factors, setFactors] = useState<Set<string>>(new Set(["comparison", "reviews", "community"]));
  const [openF, setOpenF] = useState<Set<string>>(new Set());
  const [bSlots, setBSlots] = useState<(AgentB | null)[]>([null, null, null]);
  const [bStarted, setBStarted] = useState(false);
  const [tSlots, setTSlots] = useState<(AgentB | null)[]>([null, null, null]);
  const [tStarted, setTStarted] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [iterations, setIterations] = useState<Opt["iterations"]>([]);

  const bDone = bStarted && bSlots.every((s) => s !== null);
  const bPending = bStarted && bSlots.some((s) => s === null);
  const tPending = tStarted && (optimizing || tSlots.some((s) => s === null));

  const activeStep = stage <= 1 ? 0 : stage === 4 ? 2 : 1;
  const scrollTo = (id: string) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 70);

  // Fire one call PER AGENT and render each card the moment it resolves (progressive reveal).
  const ask = () => {
    if (!brand.trim() || !query.trim()) return;
    setBSlots([null, null, null]); setTSlots([null, null, null]); setTStarted(false); setIterations([]); setBStarted(true); setStage(2);
    scrollTo("verdict");
    AGENT_NAMES.forEach((name, i) => {
      agentBaselineLive({ data: { brand, query, agent: name, n: 2 } })
        .then((r) => setBSlots((p) => { const n = [...p]; n[i] = r; return n; }))
        .catch(() => setBSlots((p) => { const n = [...p]; n[i] = errAgent(name); return n; }));
    });
  };

  // Optimize the content once, then fan out the per-agent treatment runs (also progressive).
  const retest = async () => {
    if (!bDone) return;
    setTSlots([null, null, null]); setIterations([]); setTStarted(true); setOptimizing(true); setStage(4);
    scrollTo("result");
    const competitors = competitorsOf(bSlots, brand);
    let injected = "";
    try {
      const opt = await optimizeLive({ data: { brand, query, competitors, levers: [...factors] } });
      injected = opt.injected; setIterations(opt.iterations);
    } catch { /* couldn't optimize: re-run with no injection rather than hang */ }
    setOptimizing(false);
    AGENT_NAMES.forEach((name, i) => {
      agentTreatmentLive({ data: { brand, query, agent: name, injected, n: 2 } })
        .then((r) => setTSlots((p) => { const n = [...p]; n[i] = r; return n; }))
        .catch(() => setTSlots((p) => { const n = [...p]; n[i] = errAgent(name); return n; }));
    });
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
          <h1 className="display-xl max-w-[15ch]"><span className="block">How do AI agents</span><span className="mt-3 block text-muted-foreground">rank your brand?</span></h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">When a buyer asks an agent, it recommends a few brands. We ask the real agents (live web search) whether yours is one of them, then apply the moves and measure the lift.</p>

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
              <button onClick={ask} disabled={!brand.trim() || !query.trim() || bPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3.5 text-base font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">Ask the agents <span aria-hidden>→</span></button>
            </div>
            {stage === 0 && <p className="mono-label mt-5 text-foreground/50">real agents · live web search · 2 runs each · cards fill in as each agent answers</p>}
          </div>
        </div>
      </section>

      {/* STAGE 2: baseline (progressive) + sandbox */}
      {stage >= 2 && (
        <section id="verdict" className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          <VerdictView slots={bSlots} focal={brand} onRetry={ask} />

          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <div className="rounded-3xl border border-signal/30 bg-signal/[0.05] p-6 sm:p-8">
              <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">02 · the sandbox</p>
              <h3 className="mt-3 max-w-[34ch] text-2xl font-extrabold tracking-tight sm:text-3xl">Make your signals legible, then test again.</h3>
              <p className="mt-3 max-w-2xl text-sm text-foreground/70">Pick the moves to test. We optimize your content for each, <span className="font-semibold text-foreground">inject it into the agents' real search</span>, and re-measure, so the lift is anchored to today's reality.</p>

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
                            <span className="block text-sm font-bold text-foreground">{f.label}</span>
                            <span className="mt-0.5 block font-mono text-[0.72rem] text-foreground/60">{f.desc}</span>
                          </button>
                          <button onClick={() => toggleOpen(f.id)} aria-label="expand" className="w-6 shrink-0 text-center text-xl text-foreground/50 hover:text-foreground">{open ? "−" : "+"}</button>
                        </div>
                        {open && (
                          <div className="animate-in fade-in border-t border-border/60 px-4 py-4 text-[13px] leading-relaxed text-foreground/80">
                            <p>{f.what}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-foreground/55">
                              {f.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center lg:sticky lg:top-24 lg:w-52">
                  <div className="mono-label text-foreground/70">{factors.size} moves enabled</div>
                  <button onClick={retest} disabled={factors.size === 0 || !bDone || tPending} className="mt-4 w-full rounded-xl bg-signal px-4 py-3 text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">{tPending ? "Re-testing…" : !bDone ? "Measuring…" : "Test again ↻"}</button>
                  <p className="mono-label mt-3 text-foreground/40">re-runs the agents live</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STAGE 4: lift (progressive) */}
      {stage === 4 && (
        <section id="result" className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          <LiftView bSlots={bSlots} tSlots={tSlots} brand={brand} optimizing={optimizing} />
          <WriteThis iterations={iterations} />
          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <p className="mono-label text-foreground/50">
two layers, both honest · LAYER 1 (today): real agents (ChatGPT gpt-5.5 · Claude opus-4-8 · Gemini pro-latest) really web-search your prompt, brand never named, 2 runs each. This is where you rank right now · LAYER 2 (the lift): the SAME real search, with your optimized content added to what the agents read, so the "after" is anchored to today's reality (no clean room) · the lift assumes your content reaches the agents' search; the generated "write this" is illustrative, verify the facts before publishing
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
