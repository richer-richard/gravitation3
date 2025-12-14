#!/bin/bash
# Background startup script for Gravitation³ AI Model Server
# This script is called by the LaunchAgent

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
source "../venv/bin/activate"

# Start the server
exec python model_server.py
