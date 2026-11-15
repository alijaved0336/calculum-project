#!/usr/bin/env bash
# Grant the Cloud Run runtime SA read access to every secret.
# Run once after secrets-init.sh.

set -euo pipefail

PROJECT="ai-negotiation-494315"
RUNTIME_SA="cloudrun-runtime@${PROJECT}.iam.gserviceaccount.com"
SECRETS=(
  LLM_MODEL
  OLLAMA_BASE_URL
  OLLAMA_HOST
  QDRANT_HOST
  QDRANT_PORT
  EMBED_MODEL
  EMBED_DIMS
  RERANKER_MODEL
  CALCULUM_API_URL
  CALCULUM_API_KEY
)

for SECRET in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --project="$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
  echo "  [granted] $RUNTIME_SA → $SECRET"
done
