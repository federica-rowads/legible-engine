// Server-function wrapper around the controlled search (substitute the web_search
// tool, run the 3 agents live). Thin on purpose: the real logic lives in
// controlled-search.ts so it also runs locally and in tests. The UI calls rankLive
// on "Ask the agents" / "Test again"; it falls back to the measured data on failure.
import { createServerFn } from "@tanstack/react-start";
import { runControlled, runSandbox } from "./controlled-search";

// Baseline: the agents' real run today (no levers applied).
export const rankLive = createServerFn({ method: "POST" })
  .validator((d: { query: string; levers: string[] }) => d)
  .handler(async ({ data }) => runControlled(data.query, data.levers || []));

// Sandbox re-test: for each writable lever, generate + test content versions, find the winner,
// then run the agents live with the winning content applied. Returns the final ranking + the
// per-lever iterations (so the UI can show "we tested N versions — write exactly this").
export const sandboxLive = createServerFn({ method: "POST" })
  .validator((d: { brand: string; query: string; levers: string[] }) => d)
  .handler(async ({ data }) => runSandbox(data.brand, data.query, data.levers || []));
