#!/usr/bin/env bash
set -euo pipefail

# Deploy frontend (frontend/) to Vercel and set environment variables.
# Requires: vercel CLI (`npm i -g vercel`) and VERCEL_TOKEN env var set.
# Usage example:
# export VERCEL_TOKEN=xxxx
# export VERCEL_PROJECT=your-project-name
# export VERCEL_ORG=your-org-id
# ./deploy_vercel.sh

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "Please set VERCEL_TOKEN environment variable"
  exit 1
fi
if [ -z "${VERCEL_PROJECT:-}" ]; then
  echo "Please set VERCEL_PROJECT environment variable"
  exit 1
fi

# Optional envs to pass through if exported
envs=(MONGO_URI JWT_SECRET FASTAPI_URL DISABLE_QUEUES REDIS_URL S3_BUCKET S3_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY NCBI_API_KEY FRONTEND_URL)

echo "Deploying frontend to Vercel (project: $VERCEL_PROJECT)"
# Deploy frontend directory
vercel --prod frontend --token "$VERCEL_TOKEN" --confirm

# Set environment variables on project (production)
for k in "${envs[@]}"; do
  val="${!k:-}"
  if [ -n "$val" ]; then
    echo "Setting Vercel env $k"
    vercel env add "$k" "$val" production --token "$VERCEL_TOKEN" --yes || true
  fi
done

echo "Vercel deploy complete. Visit your Vercel dashboard to see deployment status."
