// index.mjs — Cloud Functions (2nd gen) HTTP entrypoint for the Legible live engine.
//
// Why gen2: a full run makes live ChatGPT / Claude / Gemini web-search calls, several per
// agent, and takes minutes. gen2 HTTP functions allow timeouts up to 60 min, so a run is
// never killed mid-flight (Vercel's free tier hard-caps at 60s). The frontend stays where it
// is and calls this function directly from the browser.
//
// Routes (POST, JSON body) — mirror src/lib/rank-live.ts:
//   /agent-baseline   { brand, query, agent, n? }                  -> runAgentBaseline (one agent)
//   /optimize         { brand, query, competitors, levers }        -> optimizeContent
//   /agent-treatment  { brand, query, agent, injected, n? }        -> runAgentBaseline (with injection)
//   /baseline         { brand, query, n? }                         -> runRealBaseline (all 3 agents)
//   /lift             { brand, query, competitors, levers, n? }    -> runTreatment (all 3 agents)
//   /                 GET -> health check
//
// API keys come from the function's environment (Secret Manager at deploy):
//   ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY

import { http } from "@google-cloud/functions-framework";
import { runRealBaseline, runAgentBaseline, optimizeContent, runTreatment } from "./engine.mjs";

const cors = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
};

http("legible", async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  const path = (req.path || "/").replace(/\/+$/, "") || "/";

  if (req.method === "GET" && path === "/") {
    return res.status(200).json({
      ok: true,
      service: "legible-engine",
      keys: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
      },
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const d = req.body || {};
  const need = (...keys) => keys.find((k) => !d[k]);
  try {
    if (path === "/agent-baseline") {
      const miss = need("brand", "query", "agent");
      if (miss) return res.status(400).json({ error: `${miss} is required` });
      return res.status(200).json(await runAgentBaseline(d.agent, d.query, d.brand, d.n || 2, d.injected || ""));
    }
    if (path === "/agent-treatment") {
      const miss = need("brand", "query", "agent");
      if (miss) return res.status(400).json({ error: `${miss} is required` });
      return res.status(200).json(await runAgentBaseline(d.agent, d.query, d.brand, d.n || 2, d.injected || ""));
    }
    if (path === "/optimize") {
      const miss = need("brand", "query");
      if (miss) return res.status(400).json({ error: `${miss} is required` });
      return res.status(200).json(await optimizeContent(d.brand, d.query, d.competitors || [], d.levers || [], 2));
    }
    if (path === "/baseline") {
      const miss = need("brand", "query");
      if (miss) return res.status(400).json({ error: `${miss} is required` });
      return res.status(200).json(await runRealBaseline(d.brand, d.query, d.n || 3));
    }
    if (path === "/lift") {
      const miss = need("brand", "query");
      if (miss) return res.status(400).json({ error: `${miss} is required` });
      return res.status(200).json(await runTreatment(d.brand, d.query, d.competitors || [], d.levers || [], d.n || 3, 2));
    }
    return res.status(404).json({ error: `unknown route ${path}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});
