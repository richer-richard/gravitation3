#!/bin/bash
# Install Gravitation³ AI Model Server as auto-start service
# This sets up a macOS LaunchAgent to start the server automatically

echo "Installing Gravitation³ AI Model Server Auto-Start..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLIST_FILE="$SCRIPT_DIR/com.gravitation3.modelserver.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
DEST_PLIST="$LAUNCH_AGENTS_DIR/com.gravitation3.modelserver.plist"

# Make sure LaunchAgents directory exists
mkdir -p "$LAUNCH_AGENTS_DIR"

# Make the startup script executable
chmod +x "$SCRIPT_DIR/start_server_background.sh"

# Copy the plist file to LaunchAgents
echo "→ Installing LaunchAgent..."
cp "$PLIST_FILE" "$DEST_PLIST"

# Load the LaunchAgent
echo "→ Loading service..."
launchctl load "$DEST_PLIST"

echo ""
echo "✓ Auto-start installed successfully!"
echo ""
echo "The AI Model Server will now:"
echo "  • Start automatically when you log in"
echo "  • Restart automatically if it crashes"
echo "  • Run in the background"
echo ""
echo "Server logs are written to: $SCRIPT_DIR/server.log"
echo ""
echo "To check status:"
echo "  launchctl list | grep gravitation3"
echo ""
echo "To uninstall:"
echo "  ./uninstall_autostart.sh"
echo ""
