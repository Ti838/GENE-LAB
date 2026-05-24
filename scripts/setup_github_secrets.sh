#!/usr/bin/env bash
set -euo pipefail

# Usage: export GITHUB_REPO=owner/repo; ./setup_github_secrets.sh
# Requires: GitHub CLI (`gh`) installed and authenticated

if [ -z "${GITHUB_REPO:-}" ]; then
  echo "Please set GITHUB_REPO=owner/repo"
  exit 1
fi

echo "Setting GitHub Actions secrets for repo: $GITHUB_REPO"

secrets=(RENDER_API_KEY RENDER_BIOSERVICE_ID RENDER_WORKER_ID VERCEL_TOKEN MONGO_URI REDIS_URL S3_BUCKET S3_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY JWT_SECRET FASTAPI_URL)

for s in "${secrets[@]}"; do
  if [ -z "${!s:-}" ]; then
    echo "Skipping $s (env var $s not set). To set, export $s before running this script.";
  else
    echo "Setting secret $s"
    gh secret set "$s" --body "${!s}" --repo "$GITHUB_REPO"
  fi
done

echo "Done. GitHub secrets updated (only for those env vars that were exported)."
