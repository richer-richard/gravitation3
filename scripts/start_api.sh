#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "Gravitation³ Backend Launcher"
echo "=========================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting backend servers (no browser)..."
echo "  - LLM Chatbot Server: http://localhost:5001"
echo "  - Data Collection Server: http://localhost:5002"
echo "  - AI Model Server: http://localhost:5003"
echo ""
echo "Press Ctrl+C to stop."
echo ""

if [ -x "$PROJECT_DIR/app.py" ]; then
    "$PROJECT_DIR/app.py" --no-browser
else
    python3 "$PROJECT_DIR/app.py" --no-browser
fi
