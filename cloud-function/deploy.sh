#!/usr/bin/env bash
# Deploy the Legible live engine to Cloud Functions (2nd gen) in the hackaton-cannes project.
# One-shot: enables the needed APIs, loads the 3 keys into Secret Manager, deploys gen2 (long timeout).
#
# Prereqs:
#   - gcloud authenticated as a principal with Owner (or equivalent) on the project
#   - cloud-function/.env present with ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
set -euo pipefail

PROJECT="${PROJECT:-hackaton-cannes}"
REGION="${REGION:-us-central1}"
NAME="${NAME:-legible-engine}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Project: $PROJECT   Region: $REGION   Function: $NAME"
gcloud config set project "$PROJECT" >/dev/null

echo "==> Enabling required APIs (idempotent)…"
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT"

# ---- Load keys into Secret Manager from cloud-function/.env ----
if [[ ! -f "$HERE/.env" ]]; then
  echo "!! $HERE/.env not found. Copy .env.example to .env and fill in the 3 keys." >&2
  exit 1
fi
set -a; source "$HERE/.env"; set +a

put_secret() {
  local key="$1" val="$2"
  [[ -z "$val" ]] && { echo "!! $key is empty in .env" >&2; exit 1; }
  if gcloud secrets describe "$key" --project "$PROJECT" >/dev/null 2>&1; then
    printf '%s' "$val" | gcloud secrets versions add "$key" --data-file=- --project "$PROJECT" >/dev/null
  else
    printf '%s' "$val" | gcloud secrets create "$key" --replication-policy=automatic --data-file=- --project "$PROJECT" >/dev/null
  fi
  echo "   secret $key ok"
}
echo "==> Loading secrets…"
put_secret ANTHROPIC_API_KEY "${ANTHROPIC_API_KEY:-}"
put_secret OPENAI_API_KEY "${OPENAI_API_KEY:-}"
put_secret GEMINI_API_KEY "${GEMINI_API_KEY:-}"

# Grant the Cloud Run runtime service account access to the secrets (gen2 runs on Cloud Run).
PROJNUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
RUNTIME_SA="${PROJNUM}-compute@developer.gserviceaccount.com"
for s in ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT" >/dev/null 2>&1 || true
done

echo "==> Deploying gen2 HTTP function (this builds via Cloud Build, ~2-4 min)…"
gcloud functions deploy "$NAME" \
  --gen2 \
  --project "$PROJECT" \
  --region "$REGION" \
  --runtime nodejs22 \
  --source "$HERE" \
  --entry-point legible \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 900s \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 4 \
  --max-instances 5 \
  --set-secrets "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"

URL="$(gcloud functions describe "$NAME" --gen2 --region "$REGION" --project "$PROJECT" --format='value(serviceConfig.uri)')"
echo
echo "==> Deployed. Function URL:"
echo "    $URL"
echo
echo "Health check:  curl $URL"
echo "Point the frontend at it:  set VITE_ENGINE_URL=$URL  (see cloud-function/README.md)"
