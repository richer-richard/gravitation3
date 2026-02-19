#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WEB_PORT="${WEB_PORT:-8000}"
WEB_URL="http://localhost:${WEB_PORT}/web/index.html"

cleanup() {
  echo ""
  echo "Stopping dev processes..."
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "=========================================="
echo "Gravitation³ Dev Mode"
echo "=========================================="
echo ""
echo "Backend: starting (ports 5001/5002/5003)..."
bash "$PROJECT_DIR/scripts/start_api.sh" &
BACKEND_PID=$!

echo "Web: starting http.server on :${WEB_PORT} ..."
python3 -m http.server "$WEB_PORT" --directory "$PROJECT_DIR" >/dev/null 2>&1 &
WEB_PID=$!

echo ""
echo "Open: ${WEB_URL}"
echo "Press Ctrl+C to stop."
echo ""

wait
