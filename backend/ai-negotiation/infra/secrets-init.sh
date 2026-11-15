#!/usr/bin/env bash
# Run once to create all Secret Manager secrets for core-calculum.
# Usage: bash infra/secrets-init.sh
# Set values interactively after creation with:
#   echo -n "value" | gcloud secrets versions add SECRET_NAME --data-file=-

set -euo pipefail

PROJECT="ai-negotiation-494315"
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

echo "Creating secrets in project: $PROJECT"
for SECRET in "${SECRETS[@]}"; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT" &>/dev/null; then
    echo "  [skip] $SECRET already exists"
  else
    gcloud secrets create "$SECRET" \
      --project="$PROJECT" \
      --replication-policy="automatic"
    echo "  [created] $SECRET — add a version with:"
    echo "    echo -n '<value>' | gcloud secrets versions add $SECRET --data-file=-"
  fi
done

echo ""
echo "Grant Cloud Run runtime SA access to all secrets:"
echo "  bash infra/secrets-grant.sh"
