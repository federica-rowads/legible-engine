// Server-function wrappers around the honest two-layer engine (real-engine.ts).
// Thin on purpose: the real logic lives in real-engine.ts so it also runs locally and in tests.
// These are slow on purpose (real web search, multi-run) — they run on the dev server (no
// timeout) locally; the public deploy needs background execution / Vercel Pro.
import { createServerFn } from "@tanstack/react-start";
import { runRealBaseline, runTreatment } from "./real-engine";

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
