#!/bin/bash

# Session Cleanup Script  
# Runs when Claude Code session ends to clean up development servers

set -e

echo "🧹 Claude Code session cleanup... $(date)"

# Kill development processes
pkill -f "next dev" 2>/dev/null && echo "  ✓ Stopped Next.js dev server" || true
pkill -f "npm run dev" 2>/dev/null && echo "  ✓ Stopped npm dev processes" || true
pkill -f "uvicorn main:app" 2>/dev/null && echo "  ✓ Stopped FastAPI dev server" || true

# Free up ports
for port in 3000 3001 8000 8001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null && echo "  ✓ Freed port $port" || true
    fi
done

# Optional: Clean temporary logs
rm -f /tmp/claude-*.log /tmp/frontend-*.log /tmp/backend-*.log 2>/dev/null || true

echo "✅ Session cleanup complete"