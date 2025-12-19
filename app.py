#!/usr/bin/env python3
"""
Gravitation³ Application Launcher
Starts all backend servers and opens the main HTML file in a browser.
"""

import os
import sys
import subprocess
import webbrowser
import time
import signal
import atexit
from pathlib import Path
from typing import Optional

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()
API_DIR = SCRIPT_DIR / "api"
WEB_DIR = SCRIPT_DIR / "web"
HTML_FILE = WEB_DIR / "index.html"

# Server configurations
SERVERS = [
    {
        "name": "Model Server",
        "script": API_DIR / "start_model_server.sh",
        "port": 5003,
        "emoji": "🤖"
    },
    {
        "name": "LLM Chatbot Server",
        "script": API_DIR / "start_llm_server.sh",
        "port": 5001,
        "emoji": "💬"
    },
    {
        "name": "Data Collection Server",
        "script": API_DIR / "start_data_server.sh",
        "port": 5002,
        "emoji": "📡"
    }
]

# Store processes for cleanup
processes: list[Optional[subprocess.Popen[str]]] = []


def cleanup():
    """Clean up processes on exit."""
    print("\n\n🛑 Shutting down all servers...")
    for proc in processes:
        if proc and proc.poll() is None:  # Process is still running
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            except Exception as e:
                print(f"Error terminating process: {e}")
    print("✅ All servers stopped.")


def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    cleanup()
    sys.exit(0)


def check_file_exists(filepath):
    """Check if a file exists and is readable."""
    if not filepath.exists():
        print(f"❌ Error: {filepath} not found")
        return False
    if not os.access(filepath, os.R_OK):
        print(f"❌ Error: {filepath} is not readable")
        return False
    return True


def make_executable(filepath):
    """Make a script executable."""
    try:
        os.chmod(filepath, 0o755)
    except Exception as e:
        print(f"⚠️  Warning: Could not make {filepath} executable: {e}")


def start_server(server_config):
    """Start a backend server."""
    name = server_config["name"]
    script = server_config["script"]
    port = server_config["port"]
    emoji = server_config["emoji"]

    print(f"\n{emoji} Starting {name}...")

    if not check_file_exists(script):
        print(f"❌ Skipping {name}")
        return None

    try:
        make_executable(script)
        # Run the shell script in a new process
        proc = subprocess.Popen(
            ["/bin/bash", str(script)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        print(f"✅ {name} started on port {port}")
        return proc
    except Exception as e:
        print(f"❌ Error starting {name}: {e}")
        return None


def open_browser():
    """Open the main HTML file in the default browser."""
    print("\n\n🌐 Opening Gravitation³ in browser...")

    if not check_file_exists(HTML_FILE):
        print("❌ Cannot open browser: HTML file not found")
        return

    try:
        # Convert to file:// URL
        file_url = HTML_FILE.as_uri()
        webbrowser.open(file_url)
        print(f"✅ Opened: {file_url}")
    except Exception as e:
        print(f"❌ Error opening browser: {e}")
        print(f"📂 You can manually open: {HTML_FILE}")


def print_banner():
    """Print a nice banner."""
    banner = """
╔═══════════════════════════════════════════════════════════════╗
║                    Gravitation³ Launcher                      ║
║              Chaotic System Simulator Platform                ║
╚═══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def print_startup_info():
    """Print startup information."""
    info = """
📍 Servers Starting:
   🤖 Model Server      → http://localhost:5003
   💬 LLM Chatbot       → http://localhost:5001
   📡 Data Collection   → http://localhost:5002

🌐 Main Application:
   🌌 Gravitation³      → Opening in browser...

⏸️  Press Ctrl+C to stop all servers
"""
    print(info)


def main():
    """Main entry point."""
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup)

    print_banner()

    # Check if we're in the right directory
    if not check_file_exists(API_DIR):
        print("❌ Error: api/ directory not found")
        print(f"   Make sure you're running this from: {SCRIPT_DIR}")
        sys.exit(1)

    if not check_file_exists(WEB_DIR):
        print("❌ Error: web/ directory not found")
        print(f"   Make sure you're running this from: {SCRIPT_DIR}")
        sys.exit(1)

    # Start all backend servers
    print("🚀 Initializing servers...")
    for server_config in SERVERS:
        proc = start_server(server_config)
        if proc:
            processes.append(proc)

    # Brief delay to ensure servers are starting
    time.sleep(2)

    # Open the main HTML file
    open_browser()

    print_startup_info()

    # Keep the application running
    try:
        while True:
            # Check if any process has crashed
            for i, proc in enumerate(processes):
                if proc and proc.poll() is not None:
                    server_name = SERVERS[i]["name"]
                    print(f"\n⚠️  Warning: {server_name} has stopped (exit code: {proc.returncode})")

            time.sleep(1)

    except KeyboardInterrupt:
        cleanup()
        sys.exit(0)


if __name__ == "__main__":
    main()
