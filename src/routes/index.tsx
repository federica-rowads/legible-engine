import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import data from "../data/climb361.json";
import { rankLive, sandboxLive } from "../lib/rank-live";

type LiveResult = Awaited<ReturnType<typeof rankLive>>;
type SandboxResult = Awaited<ReturnType<typeof sandboxLive>>;

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

const TESTED = ["specs", "reviews", "authority"];
const TAG: Record<string, string> = { ChatGPT: "GPT", Claude: "CLD", Gemini: "GEM" };
const MODEL: Record<string, string> = { ChatGPT: "gpt-5.5", Claude: "claude-opus-4-8", Gemini: "gemini-pro-latest" };
const BRAND_URL: Record<string, string> = {
  "361 Degrees": "https://www.361usa.com",
  Brooks: "https://www.brooksrunning.com",
  ASICS: "https://www.asics.com",
  Hoka: "https://www.hoka.com",
  Saucony: "https://www.saucony.com",
  "New Balance": "https://www.newbalance.com",
};
const STEPS = ["Rank your brand", "Apply the moves", "Rank again"];
const stripMd = (s: string) => s.replace(/\*\*/g, "");

// Normalize for accent/case-insensitive focal-brand matching (e.g. "Sézane" -> "sezane").
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const focalMatcher = (focal: string) => {
  const t = norm(focal).split(/\s+/)[0] || norm(focal);
  return (b: string) => { const nb = norm(b); return nb.length >= 2 && (nb.includes(t) || t.includes(nb)); };
};
const isDefault = (brand: string) => /361/.test(brand);

// Brand-neutral moves used when the typed brand is NOT the hand-tuned 361 demo. Same six levers,
// universal copy, no 361-specific measured claims (the brand-specific proof comes from the live run).
const GENERIC_FACTORS = [
  { id: "comparison", label: "Head-to-head comparison", desc: "an honest page pitting you against the category leader", writable: true, top: true,
    why: "Agents lean on a direct, specific comparison against the brand they already trust — a fair head-to-head gives them a concrete reason to consider you.",
    actions: ["Publish a fair 'you vs the category leader' page with checkable specifics", "Lead with the dimensions where you genuinely win", "Stay honest — name where the leader is better too; agents reward calibrated claims"] },
  { id: "editorial", label: "Editorial best-of placement", desc: "appear in the trusted best-of guides agents cite", writable: false,
    why: "Agents treat editorial round-ups as gatekeepers. Being listed at all — even neutrally — gets you into the consideration set.",
    actions: ["Pitch the editors at the outlets agents cite for your category", "Earn inclusion in 'best of' round-ups", "You earn this — it can't be self-published"] },
  { id: "reviews", label: "Owner reviews & ratings", desc: "a visible body of customer reviews and a rating", writable: true,
    why: "A concrete rating across many reviews is hard evidence agents weigh heavily when they compare options.",
    actions: ["Surface your real rating and review count where it's crawlable", "Encourage verified customer reviews", "Highlight the concrete strength owners repeat"] },
  { id: "authority", label: "Independent expert review", desc: "an independent test or expert assessment", writable: false,
    why: "A third-party expert assessment is the strongest credibility signal — and it has to be earned, not written.",
    actions: ["Get your product into independent tests, labs or expert reviewers", "Earn the assessment honestly", "You earn this — never fabricate a score or award"] },
  { id: "community", label: "Community recommendation", desc: "real users recommending you in forums / Reddit", writable: true,
    why: "Agents read community threads as authentic demand. Genuine recommendations from real users move them.",
    actions: ["Show up where your buyers actually discuss the category", "Earn genuine recommendations — don't astroturf", "Make it easy for happy customers to share specifics"] },
  { id: "specs", label: "Product details / specs", desc: "a clear, machine-readable spec or detail page", writable: true,
    why: "Agents compare on concrete attributes. If yours aren't legible, you simply get skipped in the comparison.",
    actions: ["Publish a clear, structured spec / detail page", "Use the exact attributes shoppers in your category compare", "Make it crawlable and unambiguous"] },
];

function BrandLink({ name, className = "" }: { name: string; className?: string }) {
  const url = BRAND_URL[name];
  if (!url) return <span className={className}>{name}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`underline decoration-signal/50 underline-offset-2 transition-colors hover:text-signal hover:decoration-signal ${className}`}>
      {name}
    </a>
  );
}

function Running({ label }: { label: string }) {
  return (
    <div id="running" className="mx-auto max-w-[1100px] px-6 py-24 sm:px-10 sm:py-32">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">{label}</p>
      <h2 className="display-lg mt-4">Querying the agents…</h2>
      <div className="mt-10 flex flex-wrap gap-3">
        {data.agents.map((a, i) => (
          <span key={a} className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-base font-semibold">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-signal border-t-transparent" style={{ animationDelay: `${i * 200}ms` }} />
            {a}
            <span className="mono-label text-foreground/40">{MODEL[a]}</span>
          </span>
        ))}
      </div>
      <div className="mt-8 h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full animate-pulse rounded-full bg-signal" />
      </div>
      <p className="mono-label mt-4 text-foreground/50">reading the brand's information and ranking the options…</p>
    </div>
  );
}

function Ranking({ block, brand, kicker, headline }: { block: typeof data.before; brand: string; kicker: string; headline: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">{kicker}</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Where the agents rank {brand}</h2>
      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="font-display text-8xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-9xl">#{block.avgRank}</div>
        <div className="pb-2">
          <div className="text-xl font-extrabold text-foreground">average agent rank</div>
          <div className="mono-label text-foreground/60">across ChatGPT, Claude &amp; Gemini · lower is better; 7 = left off the shortlist</div>
        </div>
      </div>
      <p className="mt-6 max-w-[44ch] text-lg font-semibold leading-snug text-foreground sm:text-xl">{headline}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {block.agents.map((ag) => {
          const win = ag.pick.toLowerCase().includes("361");
          return (
            <div key={ag.name} className={`rounded-2xl border p-5 ${win ? "border-signal/60 bg-signal/[0.06]" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <div className="text-lg font-extrabold tracking-tight text-foreground">{ag.name}</div>
                  <div className="mono-label text-foreground/50">{MODEL[ag.name]}</div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/15 text-[11px] font-extrabold text-signal">{TAG[ag.name]}</span>
              </div>
              <div className="mt-4">
                <div className="mono-label text-foreground/70">where it ranks the brand</div>
                {ag.rank <= 6 ? (
                  <div className={`font-display text-5xl font-extrabold tracking-[-0.04em] ${win ? "text-signal" : "text-foreground"}`}>#{ag.rank} <span className="text-xl font-bold text-foreground/40">of 6</span></div>
                ) : (
                  <div className="font-display text-3xl font-extrabold tracking-[-0.04em] text-foreground/45">not ranked <span className="text-sm font-semibold">(left off the list)</span></div>
                )}
              </div>
              <p className="mt-4 border-l-2 border-signal/40 pl-3 text-[13px] leading-relaxed text-foreground/85">"{stripMd(ag.quote)}"</p>
              {ag.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ag.sources.map((s) => (
                    <span key={s} className="mono-label rounded bg-muted px-1.5 py-0.5 text-[9px] text-foreground/60">{s}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Rendering for a REAL live run: per-agent rank + the agent's full ordered ranking. Brand-agnostic
// (highlights whichever brand is focal, ranks out of however many brands the corpus has).
function LiveRanking({ live, kicker, headline }: { live: LiveResult; kicker: string; headline: ReactNode }) {
  const isFocal = focalMatcher(live.focal);
  const N = live.brands.length;
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">{kicker}<span className="ml-2 inline-flex items-center gap-1 rounded bg-signal px-1.5 py-0.5 text-[10px] font-bold text-signal-foreground"><span className="h-1.5 w-1.5 rounded-full bg-signal-foreground" />LIVE</span></p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Where the agents rank {live.focal}</h2>
      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="font-display text-8xl font-extrabold leading-none tracking-[-0.06em] text-signal sm:text-9xl">#{live.avgRank ?? "—"}</div>
        <div className="pb-2"><div className="text-xl font-extrabold text-foreground">average agent rank</div><div className="mono-label text-foreground/60">this just ran live · across ChatGPT, Claude &amp; Gemini</div></div>
      </div>
      <p className="mt-6 max-w-[46ch] text-lg font-semibold leading-snug text-foreground sm:text-xl">{headline}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {live.agents.map((ag) => {
          const win = ag.ok && isFocal(ag.top);
          return (
            <div key={ag.name} className={`rounded-2xl border p-5 ${win ? "border-signal/60 bg-signal/[0.06]" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div><div className="text-lg font-extrabold tracking-tight text-foreground">{ag.name}</div><div className="mono-label text-foreground/50">{ag.model}</div></div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/15 text-[11px] font-extrabold text-signal">{TAG[ag.name]}</span>
              </div>
              {ag.ok ? (
                <>
                  <div className="mt-4">
                    <div className="mono-label text-foreground/70">where it ranks the brand</div>
                    {ag.rank <= N ? <div className={`font-display text-5xl font-extrabold tracking-[-0.04em] ${win ? "text-signal" : "text-foreground"}`}>#{ag.rank} <span className="text-xl font-bold text-foreground/40">of {N}</span></div> : <div className="font-display text-3xl font-extrabold tracking-[-0.04em] text-foreground/45">not ranked</div>}
                  </div>
                  <div className="mono-label mt-4 text-foreground/70">its full ranking, live</div>
                  <ol className="mt-1.5 space-y-1">{ag.ranked.map((b, i) => <li key={i} className={`text-[13px] ${isFocal(b) ? "font-extrabold text-signal" : "text-foreground/70"}`}>{i + 1}. {b}</li>)}</ol>
                </>
              ) : <div className="mt-6 text-sm text-foreground/45">this agent's live call didn't return — showing the measured result is recommended.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveFailNote({ brand, onRetry }: { brand: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">live run</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">The live run didn't return for {brand}.</h2>
      <p className="mt-3 max-w-xl text-sm text-foreground/70">The agents can be briefly overloaded. <button onClick={onRetry} className="font-semibold text-signal underline underline-offset-2">Try again</button> — it usually goes through on a second attempt.</p>
    </div>
  );
}

function Index() {
  const [stage, setStage] = useState(0); // 0 input · 1 running · 2 before+sandbox · 3 running · 4 after
  const [brand, setBrand] = useState(data.brandFull);
  const [query, setQuery] = useState(data.query);
  const [factors, setFactors] = useState<Set<string>>(new Set());
  const [openF, setOpenF] = useState<Set<string>>(new Set());
  const [liveBefore, setLiveBefore] = useState<LiveResult | null>(null);
  const [liveAfter, setLiveAfter] = useState<LiveResult | null>(null);
  const [liveIterations, setLiveIterations] = useState<SandboxResult["iterations"]>([]);

  // The hand-tuned 361 demo keeps its polished, measured copy; any other typed brand uses the
  // brand-neutral moves and the live numbers (no 361-specific claims leak onto another brand).
  const defaultBrand = isDefault(brand);
  const factorList = (defaultBrand ? data.factors : GENERIC_FACTORS) as Array<{ id: string; label: string; desc: string; why: string; actions: string[]; top?: boolean; writable?: boolean }>;
  const afterBlock = data.after;
  const beforeWinner = data.before.agents.find((a) => !a.pick.toLowerCase().includes("361"))?.pick || "Brooks";
  const activeStep = stage <= 1 ? 0 : stage === 4 ? 2 : 1;

  const liveWinner = (r: LiveResult | null) => { const m = r && focalMatcher(r.focal); return r?.agents.find((a) => a.ok && m && !m(a.top))?.top || ""; };

  const scrollTo = (id: string) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 70);
  // Real run: call the agents live with the controlled search for the typed brand + query. Falls
  // back to the measured 361 data (default brand only). A short floor keeps the animation smooth.
  const runLive = async (levers: string[]): Promise<LiveResult | null> => {
    try {
      const [r] = await Promise.all([rankLive({ data: { brand, query, levers } }), new Promise((res) => setTimeout(res, 1600))]);
      return r.liveCount > 0 ? r : null;
    } catch {
      return null;
    }
  };
  const ask = async () => { if (!brand.trim() || !query.trim()) return; setLiveBefore(null); setStage(1); scrollTo("running"); setLiveBefore(await runLive([])); setStage(2); scrollTo("verdict"); };
  const retest = async () => {
    setStage(3); scrollTo("running");
    try {
      const [r] = await Promise.all([sandboxLive({ data: { brand, query, levers: [...factors] } }), new Promise((res) => setTimeout(res, 1600))]);
      if (r.final.liveCount > 0) { setLiveAfter(r.final); setLiveIterations(r.iterations); }
    } catch { /* fall back to the measured data */ }
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
                <span className={i === activeStep ? "text-signal" : i < activeStep ? "text-foreground/60" : "text-foreground/30"}>
                  0{i + 1}. {label}
                </span>
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
          <h1 className="display-xl max-w-[15ch]">
            <span className="block">Where do AI agents</span>
            <span className="mt-3 block text-muted-foreground">rank your brand?</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            When a buyer asks an agent, it recommends one brand. See where yours lands today, then apply the moves our
            experiments found, and watch it climb.
          </p>

          <div className="mt-10 rounded-3xl border-2 border-foreground/15 bg-card p-6 shadow-[0_0_40px_-12px_rgba(0,0,0,0.6)] sm:p-7">
            <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.14em] text-foreground/80">your brand</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="type any brand"
                  className="mt-2 w-full rounded-xl border-2 border-foreground/20 bg-background px-4 py-3.5 text-base font-semibold text-foreground placeholder:font-normal placeholder:text-foreground/40 focus:border-signal focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.14em] text-foreground/80">buyer query</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="type the buyer's question"
                  className="mt-2 w-full rounded-xl border-2 border-foreground/20 bg-background px-4 py-3.5 text-base text-foreground placeholder:text-foreground/40 focus:border-signal focus:outline-none"
                />
              </div>
              <button onClick={ask} disabled={!brand.trim() || !query.trim() || stage === 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3.5 text-base font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                Ask the agents <span aria-hidden>→</span>
              </button>
            </div>
            {stage === 0 && <p className="mono-label mt-5 text-foreground/50">real agents · live · ChatGPT · Claude · Gemini · edit either field or just hit Ask</p>}
          </div>
        </div>
      </section>

      {/* STAGE 1 — running */}
      {stage === 1 && <section className="border-b border-border animate-in fade-in"><Running label="measuring · live" /></section>}

      {/* STAGE 2 — BEFORE + SANDBOX */}
      {stage >= 2 && (
        <section id="verdict" className="border-b border-border animate-in fade-in slide-in-from-bottom-3 duration-700">
          {liveBefore ? (
            <LiveRanking live={liveBefore} kicker="01 · the verdict — today" headline={defaultBrand
              ? <><BrandLink name="361 Degrees" /> is <span className="text-signal">invisible</span>: the agents leave it near the bottom and pick a famous brand.</>
              : <><BrandLink name={liveBefore.focal} /> averages <span className="text-signal">#{liveBefore.avgRank}</span> across the three agents today{liveWinner(liveBefore) ? <> — most pick {liveWinner(liveBefore)}</> : null}.</>} />
          ) : defaultBrand ? (
            <Ranking block={data.before} brand={data.brandFull} kicker="01 · the verdict — today" headline={<><BrandLink name="361 Degrees" /> is <span className="text-signal">invisible</span>: all three agents leave it off the shortlist and confidently pick <BrandLink name={beforeWinner} />.</>} />
          ) : (
            <LiveFailNote brand={brand} onRetry={ask} />
          )}

          {/* SANDBOX */}
          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            <div className="rounded-3xl border border-signal/30 bg-signal/[0.05] p-6 sm:p-8">
              <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">02 · the sandbox</p>
              <h3 className="mt-3 max-w-[30ch] text-2xl font-extrabold tracking-tight sm:text-3xl">Apply the moves, then test again.</h3>
              {defaultBrand ? (
                <p className="mt-3 max-w-2xl text-sm text-foreground/70">Each move makes a signal legible where the agents read. We measured every one's lift on real agents (N=5). <span className="font-semibold text-foreground">Real signal</span> = a true fact 361 already owns, under-surfaced; <span className="font-semibold text-foreground">earnable</span> = a placement or page 361 could realistically earn. Tap any move to see what it means and how to apply it.</p>
              ) : (
                <p className="mt-3 max-w-2xl text-sm text-foreground/70">Each move makes one of your signals legible where the agents read. <span className="font-semibold text-foreground">Writable</span> = content you publish (we generate &amp; test the exact wording live); <span className="font-semibold text-foreground">earnable</span> = a placement you earn. Tap any move to see how to apply it.</p>
              )}

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_auto] lg:items-start">
                <div className="space-y-3">
                  {factorList.map((f) => {
                    const on = factors.has(f.id);
                    const open = openF.has(f.id);
                    const generic = "writable" in f;
                    const tagOn = generic ? !!f.writable : TESTED.includes(f.id);
                    const tagText = generic ? (f.writable ? "writable" : "earnable") : (tagOn ? "real signal" : "earnable");
                    const top = f.top;
                    return (
                      <div key={f.id} className={`rounded-xl border-2 transition-colors ${on ? "border-signal bg-signal/[0.1]" : top ? "border-signal/40 bg-card" : "border-foreground/15 bg-card"}`}>
                        <div className="flex items-center gap-4 p-4">
                          <button onClick={() => toggle(f.id)} aria-label={`toggle ${f.label}`} className="shrink-0">
                            <span className={`flex items-center justify-center rounded-md border-2 font-extrabold transition-colors ${top ? "h-9 w-9 text-base" : "h-7 w-7 text-sm"} ${on ? "border-signal bg-signal text-signal-foreground" : "border-foreground/50 bg-background text-transparent"}`}>✓</span>
                          </button>
                          <button onClick={() => toggleOpen(f.id)} className="flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-bold text-foreground ${top ? "text-base sm:text-lg" : "text-sm"}`}>{f.label}</span>
                              {top && <span className="rounded-full bg-signal px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-signal-foreground">★ biggest leverage</span>}
                              <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${tagOn ? "bg-signal/20 text-signal" : "bg-muted text-foreground/70"}`}>{tagText}</span>
                            </div>
                            <span className="mt-0.5 block font-mono text-[0.72rem] text-foreground/60">{f.desc}</span>
                          </button>
                          <button onClick={() => toggleOpen(f.id)} aria-label="expand" className="w-6 shrink-0 text-center text-xl text-foreground/50 hover:text-foreground">{open ? "−" : "+"}</button>
                        </div>
                        {open && (
                          <div className="animate-in fade-in border-t border-border/60 px-4 py-4">
                            <p className="text-[13px] leading-relaxed text-foreground/80">{f.why}</p>
                            <p className="mono-label mt-4 text-signal">how to apply</p>
                            <ul className="mt-2 space-y-1.5">
                              {f.actions.map((a, i) => (
                                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/75"><span className="text-signal">→</span><span>{a}</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center lg:sticky lg:top-24 lg:w-52">
                  <div className="mono-label text-foreground/70">{factors.size} moves enabled</div>
                  <button onClick={retest} disabled={factors.size === 0 || stage === 3} className="mt-4 w-full rounded-xl bg-signal px-4 py-3 text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                    {stage === 3 ? "Re-testing…" : "Test again ↻"}
                  </button>
                  <p className="mono-label mt-3 text-foreground/40">re-runs the agents live</p>
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
          {liveAfter ? (
            <LiveRanking live={liveAfter} kicker="03 · after the moves" headline={defaultBrand
              ? <><BrandLink name="361 Degrees" /> moved from invisible to <span className="text-signal">#{liveAfter.avgRank}</span>{liveAfter.top1 ? <>, now the top pick</> : null}, live. Same brand, same shoe. Only its real signals, made legible where the agents read.</>
              : <><BrandLink name={liveAfter.focal} /> moved to <span className="text-signal">#{liveAfter.avgRank}</span>{liveAfter.top1 ? <>, the top pick</> : null}, live. Only its real signals, made legible where the agents read.</>} />
          ) : defaultBrand ? (
            <Ranking block={afterBlock} brand={data.brandFull} kicker="03 · after the moves" headline={<><BrandLink name="361 Degrees" /> moved from invisible to <span className="text-signal">#{afterBlock.avgRank}</span>{afterBlock.top1 > 0 ? <>, now the top pick {Math.round(afterBlock.top1 * 100)}% of the time</> : null}. Same brand, same shoe. Only its real signals, made legible where the agents read.</>} />
          ) : (
            <LiveFailNote brand={brand} onRetry={retest} />
          )}
          {liveIterations.length > 0 && (
            <div className="mx-auto max-w-[1100px] px-6 pb-12 sm:px-10">
              <p className="text-sm font-mono uppercase tracking-[0.18em] text-signal">04 · what to write</p>
              <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">We tested the content live. Write exactly this.</h3>
              <p className="mt-2 max-w-2xl text-sm text-foreground/70">For each writable move you enabled, an agent generated variations, we ran them past the agents, and kept the one that moved the brand most.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {liveIterations.map((it) => it.best ? (
                  <div key={it.lever} className="rounded-2xl border border-signal/40 bg-signal/[0.04] p-5">
                    <div className="flex items-center justify-between"><span className="text-sm font-bold capitalize text-foreground">{it.lever}</span><span className="mono-label text-foreground/50">tested {it.versions.length} versions</span></div>
                    <p className="mono-label mt-3 text-signal">winner — write this</p>
                    <p className="mt-1 rounded-lg bg-background/60 p-3 text-[13px] leading-relaxed text-foreground/90">"{it.best.content}"</p>
                    <div className="mt-3 space-y-1">{it.versions.map((v, i) => (<div key={i} className={`flex items-center justify-between text-[11px] ${it.best && v.label === it.best.label ? "text-signal" : "text-foreground/45"}`}><span className="truncate pr-2">{v.label}</span><span className="font-mono shrink-0">brand → #{v.rank}</span></div>))}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
          <div className="mx-auto max-w-[1100px] px-6 pb-20 sm:px-10">
            {defaultBrand ? (
              <p className="mono-label text-foreground/50">
                controlled web search · real agents (ChatGPT gpt-5.5 · Claude opus-4-8 · Gemini pro-latest) call a search tool whose results we control · N=5 per condition · every transcript saved · <BrandLink name="361 Degrees" /> is a real brand; the authority signal is true and sourced (Doctors of Running 88.8% / 9.5-of-10 stability), while the editorial and community moves model placements 361 could realistically earn
              </p>
            ) : (
              <p className="mono-label text-foreground/50">
                controlled web search · real agents (ChatGPT gpt-5.5 · Claude opus-4-8 · Gemini pro-latest) call a search tool whose results we control · the information environment for {brand} was generated for this query · writable moves show the exact content we tested live; earnable moves model placements the brand could realistically earn — no fabricated third-party scores
              </p>
            )}
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
