#!/bin/bash
# Start the Gravitation³ LLM Chatbot Server in background

cd "$(dirname "$0")"
VENV_PATH="./venv/bin/python3"
LOG_FILE="$HOME/llm_server.log"

echo "Starting Gravitation³ LLM Chatbot Server in background..."
nohup $VENV_PATH llm_server.py > "$LOG_FILE" 2>&1 &
PID=$!
echo "LLM Server started with PID: $PID"
echo "Log file: $LOG_FILE"
echo "To stop: kill $PID"
