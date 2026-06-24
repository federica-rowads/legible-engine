// Server-function wrappers around the honest two-layer engine (real-engine.ts).
// Thin on purpose: the real logic lives in real-engine.ts so it also runs locally and in tests.
// These are slow on purpose (real web search, multi-run) — they run on the dev server (no
// timeout) locally; the public deploy needs background execution / Vercel Pro.
import { createServerFn } from "@tanstack/react-start";
import { runRealBaseline, runTreatment, runAgentBaseline, optimizeContent } from "./real-engine";

// Layer 1 — the REAL, unbiased baseline: the 3 agents really web-search the buyer's question
// (brand never mentioned), N runs each. Returns mention-rate, position, and the real competitors.
export const baselineLive = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; n?: number }) => d)
  .handler(async ({ data }) => runRealBaseline(data.brand, data.query, data.n || 3));

// Layer 2 — controlled lift grounded in the real competitors: control (focal absent) vs
// treatment (focal signals injected), N runs each, plus the per-writable-lever "write this".
export const liftLive = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; competitors: string[]; levers: string[]; n?: number }) => d)
  .handler(async ({ data }) => runTreatment(data.brand, data.query, data.competitors || [], data.levers || [], data.n || 3, 2));

// ---- Progressive (per-agent) variants. The UI fires one call PER AGENT and renders each card the
// moment it resolves, instead of waiting for all three. Same engine, just sliced by agent. ----

// One agent's REAL unbiased baseline (brand never named), N runs.
export const agentBaselineLive = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; agent: string; n?: number }) => d)
  .handler(async ({ data }) => runAgentBaseline(data.agent, data.query, data.brand, data.n || 2));

// Optimize the chosen levers ONCE (generate + score the content), returning the injection note and
// the per-writable-lever "write this" data. The UI calls this, then fans out the per-agent runs.
export const optimizeLive = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; competitors: string[]; levers: string[] }) => d)
  .handler(async ({ data }) => optimizeContent(data.brand, data.query, data.competitors || [], data.levers || [], 2));

// One agent's treatment run: the SAME real search with the optimized content injected, N runs.
export const agentTreatmentLive = createServerFn({ method: "POST" })
  .inputValidator((d: { brand: string; query: string; agent: string; injected: string; n?: number }) => d)
  .handler(async ({ data }) => runAgentBaseline(data.agent, data.query, data.brand, data.n || 2, data.injected));
