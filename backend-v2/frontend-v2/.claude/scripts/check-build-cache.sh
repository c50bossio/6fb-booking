#!/bin/bash
# Check for corrupted build cache that causes server crashes

echo "🔍 Checking build cache health..."

FRONTEND_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
NEXT_DIR="$FRONTEND_ROOT/.next"

# Check if .next exists and has expected structure
if [[ -d "$NEXT_DIR" ]]; then
    # Check for webpack runtime errors in logs
    if [[ -f "$FRONTEND_ROOT/server_output.log" ]]; then
        RECENT_ERRORS=$(tail -n 100 "$FRONTEND_ROOT/server_output.log" | grep -c "Cannot find module" || echo "0")
        if [[ $RECENT_ERRORS -gt 5 ]]; then
            echo "⚠️  Detected multiple module resolution errors in recent logs"
            echo "🧹 Recommending cache cleanup before starting server"
            echo "   Run: rm -rf .next node_modules/.cache"
        fi
    fi
    
    # Check for missing critical files
    if [[ ! -d "$NEXT_DIR/server" ]]; then
        echo "⚠️  Missing .next/server directory - incomplete build"
        echo "🧹 Recommending cache cleanup"
    fi
else
    echo "✅ No existing cache - clean start"
fi

echo "✅ Build cache check complete"