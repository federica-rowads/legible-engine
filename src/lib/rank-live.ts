// Wrappers around the honest two-layer engine (real-engine.ts).
//
// The live runs are slow on purpose (real web search, multi-run) and take minutes. Two hosts:
//   • PROD: a Cloud Functions (2nd gen) HTTP function (long timeout). Set VITE_ENGINE_URL to its
//     URL at build time and the browser calls it directly — so the frontend can stay on a
//     static/edge host with no 60s function cap of its own (Vercel free hard-caps at 60s).
//   • LOCAL dev: VITE_ENGINE_URL unset → fall back to the in-process TanStack server functions
//     (the dev server has no timeout), so `bun run dev` keeps working with no extra setup.
//
// Same call shape either way — `fn({ data })` — so the page component does not change.
import { createServerFn } from "@tanstack/react-start";
import {
  runRealBaseline,
  runTreatment,
  runAgentBaseline,
  optimizeContent,
  type RealBaseline,
  type Treatment,
  type AgentBaseline,
  type OptimizedContent,
} from "./real-engine";

const ENGINE_URL = (import.meta.env.VITE_ENGINE_URL as string | undefined)?.replace(/\/+$/, "") || "";

async function callEngine<T>(route: string, data: unknown): Promise<T> {
  const r = await fetch(`${ENGINE_URL}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`${route} ${r.status}`);
  return (await r.json()) as T;
}

// ---- Local-dev fallbacks: the same logic served in-process by the dev server (no timeout). ----
const baselineFn = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; n?: number }) => d)
  .handler(async ({ data }) => runRealBaseline(data.brand, data.query, data.n || 3));

const liftFn = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; competitors: string[]; levers: string[]; n?: number }) => d)
  .handler(async ({ data }) => runTreatment(data.brand, data.query, data.competitors || [], data.levers || [], data.n || 3, 2));

const agentBaselineFn = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; agent: string; n?: number }) => d)
  .handler(async ({ data }) => runAgentBaseline(data.agent, data.query, data.brand, data.n || 2));

const optimizeFn = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; competitors: string[]; levers: string[] }) => d)
  .handler(async ({ data }) => optimizeContent(data.brand, data.query, data.competitors || [], data.levers || [], 2));

const agentTreatmentFn = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; agent: string; injected: string; n?: number }) => d)
  .handler(async ({ data }) => runAgentBaseline(data.agent, data.query, data.brand, data.n || 2, data.injected));

// ---- Public API — calls the Cloud Function in prod, the in-process fn in local dev. ----

// Layer 1 — the REAL, unbiased baseline across all 3 agents (brand never mentioned), N runs each.
export function baselineLive(opts: { data: { brand: string; query: string; n?: number } }): Promise<RealBaseline> {
  return ENGINE_URL ? callEngine<RealBaseline>("/baseline", opts.data) : baselineFn(opts);
}

// Layer 2 — controlled lift across all 3 agents (focal signals injected), N runs each.
export function liftLive(opts: {
  data: { brand: string; query: string; competitors: string[]; levers: string[]; n?: number };
}): Promise<Treatment> {
  return ENGINE_URL ? callEngine<Treatment>("/lift", opts.data) : liftFn(opts);
}

// Progressive per-agent variants — the UI fires one call PER AGENT and renders each card as it resolves.

// One agent's REAL unbiased baseline (brand never named), N runs.
export function agentBaselineLive(opts: {
  data: { brand: string; query: string; agent: string; n?: number };
}): Promise<AgentBaseline> {
  return ENGINE_URL ? callEngine<AgentBaseline>("/agent-baseline", opts.data) : agentBaselineFn(opts);
}

// Optimize the chosen levers ONCE (generate + score the content), returning the injection note and
// the per-writable-lever "write this" data. The UI calls this, then fans out the per-agent runs.
export function optimizeLive(opts: {
  data: { brand: string; query: string; competitors: string[]; levers: string[] };
}): Promise<OptimizedContent> {
  return ENGINE_URL ? callEngine<OptimizedContent>("/optimize", opts.data) : optimizeFn(opts);
}

// One agent's treatment run: the SAME real search with the optimized content injected, N runs.
export function agentTreatmentLive(opts: {
  data: { brand: string; query: string; agent: string; injected: string; n?: number };
}): Promise<AgentBaseline> {
  return ENGINE_URL ? callEngine<AgentBaseline>("/agent-treatment", opts.data) : agentTreatmentFn(opts);
}
