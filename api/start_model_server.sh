#!/bin/bash

# Gravitation³ - Start AI Model Server
# This script starts the AI model server on port 5003

echo "========================================"
echo "Gravitation³ AI Model Server"
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

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$PROJECT_DIR/venv/bin/activate"

# Check if Flask is installed
if ! python -c "import flask" 2>/dev/null; then
    echo "❌ Flask not installed in virtual environment"
    echo "Installing requirements..."
    pip install -r "$SCRIPT_DIR/requirements.txt"
fi

# Check if model_server.py exists
if [ ! -f "$SCRIPT_DIR/model_server.py" ]; then
    echo "❌ model_server.py not found at $SCRIPT_DIR/model_server.py"
    exit 1
fi

# Start the model server
echo "🤖 Starting AI Model Server..."
echo "Server will be available at: http://localhost:5003"
echo "Press Ctrl+C to stop"
echo ""

cd "$SCRIPT_DIR"
python model_server.py
