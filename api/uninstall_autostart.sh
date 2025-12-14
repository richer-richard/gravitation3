#!/bin/bash
# Uninstall Gravitation³ AI Model Server auto-start service

echo "Uninstalling Gravitation³ AI Model Server Auto-Start..."
echo ""

DEST_PLIST="$HOME/Library/LaunchAgents/com.gravitation3.modelserver.plist"

# Check if the service is installed
if [ ! -f "$DEST_PLIST" ]; then
    echo "✗ Auto-start service is not installed."
    exit 1
fi

# Unload the LaunchAgent
echo "→ Stopping service..."
launchctl unload "$DEST_PLIST" 2>/dev/null || true

# Remove the plist file
echo "→ Removing LaunchAgent..."
rm "$DEST_PLIST"

echo ""
echo "✓ Auto-start uninstalled successfully!"
echo ""
echo "The AI Model Server will no longer start automatically."
echo "You can manually start it using:"
echo "  cd api && ./start_model_server.sh"
echo ""
