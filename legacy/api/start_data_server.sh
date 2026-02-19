#!/bin/bash

# Gravitation³ - Start Data Collection Server
# This script starts the data collection server on port 5002

echo "========================================"
echo "Gravitation³ Data Collection Server"
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

# Check if data_server.py exists
if [ ! -f "$SCRIPT_DIR/data_server.py" ]; then
    echo "❌ data_server.py not found at $SCRIPT_DIR/data_server.py"
    exit 1
fi

# Start the data server
echo "📡 Starting Data Collection Server..."
echo "Server will be available at: http://localhost:5002"
echo "Press Ctrl+C to stop"
echo ""

cd "$SCRIPT_DIR"
"$PYTHON" data_server.py
