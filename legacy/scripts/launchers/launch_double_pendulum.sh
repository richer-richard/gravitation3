#!/bin/bash

# Gravitation³ - Double Pendulum Simulation Launcher
# Automatically starts AI server and opens simulation

echo "🚀 Launching Double Pendulum Simulation with AI..."

# Check if server is already running
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✓ AI Server already running on port 5001"
else
    echo "Starting AI Model Server..."
    cd api
    python model_server.py > server.log 2>&1 &
    SERVER_PID=$!
    cd ..
    
    # Wait for server to start
    echo "Waiting for server to initialize..."
    for i in {1..30}; do
        if curl -s http://localhost:5001/health > /dev/null 2>&1; then
            echo "✓ AI Server ready!"
            break
        fi
        sleep 0.5
    done
fi

# Open simulation in default browser
echo "Opening Double Pendulum Simulation..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open double-pendulum/sim.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open double-pendulum/sim.html
fi

echo ""
echo "=================================================="
echo "Double Pendulum Simulation with AI is now running!"
echo "=================================================="
echo ""
echo "• Simulation: Check your browser"
echo "• AI Status: Watch bottom-right indicator"
echo "• Server logs: api/server.log"
echo ""
echo "To stop the server:"
echo "  lsof -ti:5001 | xargs kill"
echo ""
