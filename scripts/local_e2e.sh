#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(dirname "$0")/..
cd "$ROOT_DIR"

echo "Building and starting services with Docker Compose..."
docker compose up --build -d

echo "Waiting for bioservice (http://localhost:8000/health/) and backend (http://localhost:5000/api/health) to be healthy..."
MAX_WAIT=180
SLEEPT=2
WAITED=0

until curl -fs http://localhost:8000/health/ >/dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
  sleep $SLEEPT; WAITED=$((WAITED+SLEEPT)); echo "waiting... $WAITED/$MAX_WAIT";
done
if [ $WAITED -ge $MAX_WAIT ]; then echo "bioservice did not become healthy"; exit 1; fi

WAITED=0
until curl -fs http://localhost:5000/api/health >/dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
  sleep $SLEEPT; WAITED=$((WAITED+SLEEPT)); echo "waiting... $WAITED/$MAX_WAIT";
done
if [ $WAITED -ge $MAX_WAIT ]; then echo "backend did not become healthy"; exit 1; fi

echo "Both services healthy. Basic health checks pass. You can now test the UI at http://localhost:3000 (if served) or call endpoints directly."

echo "Run 'docker compose logs -f' to tail logs, and 'docker compose down' to stop." 
