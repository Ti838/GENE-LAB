#!/usr/bin/env bash
set -euo pipefail

# Trigger Render deploys for bioservice and worker using Render API.
# Requires: RENDER_API_KEY, RENDER_BIOSERVICE_ID, RENDER_WORKER_ID env vars.

if [ -z "${RENDER_API_KEY:-}" ] || [ -z "${RENDER_BIOSERVICE_ID:-}" ] || [ -z "${RENDER_WORKER_ID:-}" ]; then
  echo "Please set RENDER_API_KEY, RENDER_BIOSERVICE_ID, RENDER_WORKER_ID"
  exit 1
fi

echo "Triggering bioservice deploy (service id: $RENDER_BIOSERVICE_ID)"
curl -s -X POST "https://api.render.com/v1/services/$RENDER_BIOSERVICE_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

echo "Triggering worker deploy (service id: $RENDER_WORKER_ID)"
curl -s -X POST "https://api.render.com/v1/services/$RENDER_WORKER_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

echo "Deploys triggered. Check Render dashboard for logs and status."
