#!/bin/bash
# Main Development Session Launcher for BookedBarber V2
# This script delegates to the comprehensive startup script in backend-v2

echo "🚀 Starting BookedBarber V2 Development Session"
echo "=============================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_V2_DIR="$ROOT_DIR/backend-v2"

# Check if backend-v2 directory exists
if [ ! -d "$BACKEND_V2_DIR" ]; then
    echo "❌ Error: backend-v2 directory not found at $BACKEND_V2_DIR"
    exit 1
fi

# Check if the new comprehensive script exists
if [ -f "$BACKEND_V2_DIR/scripts/start-dev-clean.sh" ]; then
    echo "ℹ️  Using comprehensive startup script..."
    echo ""
    exec "$BACKEND_V2_DIR/scripts/start-dev-clean.sh"
else
    echo "❌ Error: start-dev-clean.sh not found in backend-v2/scripts/"
    echo ""
    echo "Please ensure you have the latest scripts by running:"
    echo "  git pull"
    echo ""
    echo "Or create the scripts manually from the backend-v2/scripts directory"
    exit 1
fi