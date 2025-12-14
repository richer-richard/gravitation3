#!/bin/bash
# Start AI Prediction API Server

echo "=========================================="
echo "Physics Simulation AI Prediction API"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please run: python -m venv venv"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed
echo "Checking dependencies..."
if ! python -c "import flask" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r scripts/api_requirements.txt
fi

echo ""
echo "Starting API server..."
echo "Server will be available at: http://localhost:5000"
echo "Press Ctrl+C to stop"
echo ""

# Run the server
python scripts/api_server.py
