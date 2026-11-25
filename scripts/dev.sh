#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running database migrations and showcase seed..."
(cd "$ROOT_DIR/apps/api" && .venv/bin/alembic upgrade head && .venv/bin/python -m app.db.seed)

echo "Starting FastAPI backend on http://localhost:8000 ..."
(cd "$ROOT_DIR/apps/api" && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting Next.js web app on http://localhost:3000 ..."
cd "$ROOT_DIR"
pnpm dev:web
