#!/bin/bash

# Gravitation³ - Start LLM Chatbot Server
# This script starts the LLM chatbot server on port 5001

echo "========================================"
echo "Gravitation³ LLM Chatbot Server"
echo "========================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if virtual environment exists
if [ ! -d "$PROJECT_DIR/venv" ]; then
    echo "❌ Virtual environment not found at $PROJECT_DIR/venv"
    echo "Please create it first:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r api/requirements.txt"
    exit 1
fi

# Set Python path explicitly (more reliable than sourcing activate)
PYTHON="$PROJECT_DIR/venv/bin/python"
PIP="$PROJECT_DIR/venv/bin/pip"

echo "🔧 Using Python: $PYTHON"

# Check if Flask is installed
if ! "$PYTHON" -c "import flask" 2>/dev/null; then
    echo "❌ Flask not installed in virtual environment"
    echo "Installing requirements..."
    "$PIP" install -r "$SCRIPT_DIR/requirements.txt"
fi

# Check if llm_server.py exists
if [ ! -f "$SCRIPT_DIR/llm_server.py" ]; then
    echo "❌ llm_server.py not found at $SCRIPT_DIR/llm_server.py"
    exit 1
fi

# Check for .env file
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Make sure OPENAI_API_KEY is set in the environment"
fi

# Start the LLM server
echo "🤖 Starting LLM Chatbot Server..."
echo "Server will be available at: http://localhost:5001"
echo "Press Ctrl+C to stop"
echo ""

cd "$SCRIPT_DIR"
"$PYTHON" llm_server.py
