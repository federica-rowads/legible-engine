# Legible engine — Cloud Functions (2nd gen)

The live two-layer engine (the part that makes the long, real ChatGPT / Claude / Gemini
web-search calls) deployed as a **gen2 HTTP function** so a run can take minutes without being
killed. Vercel's free tier hard-caps functions at 60s; gen2 allows up to 60 min. **Only the
backend moves here — the frontend stays where it is** and calls this function directly.

## What's here

- `engine.mjs` — the two-layer engine, ported verbatim from `src/lib/real-engine.ts` to plain ESM.
- `index.mjs` — the HTTP entrypoint (Functions Framework). Routes: `POST /baseline`, `POST /lift`, `GET /` (health).
- `deploy.sh` — one-shot deploy: enables APIs, loads the 3 keys into Secret Manager, deploys gen2.
- `.env.example` — copy to `.env` and fill the 3 keys before deploying.

## Deploy

```bash
cd cloud-function
cp .env.example .env          # fill ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
./deploy.sh                   # project defaults to hackaton-cannes, region us-central1
```

Requires `gcloud` authenticated as Owner (or equivalent) on `hackaton-cannes`. The script
prints the function URL when done.

## Wire the frontend to it

Set one build-time env var on the frontend host and redeploy the frontend:

```
VITE_ENGINE_URL = <the function URL printed by deploy.sh>
```

`src/lib/rank-live.ts` calls that URL from the browser. With it unset (local dev), it falls
back to the in-process TanStack server functions, so `bun run dev` still works with no setup.

## Endpoints

```
POST /baseline   { "brand": "...", "query": "...", "n": 3 }
POST /lift       { "brand": "...", "query": "...", "competitors": [...], "levers": [...], "n": 3 }
GET  /           -> { ok, service, keys: { anthropic, openai, gemini } }
```
