#!/bin/bash

# Pre-Session Cleanup Script
# Runs before Claude Code starts working to ensure clean environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Pre-session cleanup...${NC}"

# Kill orphaned development processes
pkill -f "next dev" 2>/dev/null && echo "  ✓ Cleaned orphaned Next.js processes" || true
pkill -f "npm run dev" 2>/dev/null && echo "  ✓ Cleaned orphaned npm processes" || true

# Clear any stuck ports
for port in 3000 3001 8000 8001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null && echo "  ✓ Freed port $port" || true
    fi
done

# Remove potentially corrupted build cache
FRONTEND_DIR="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
if [ -d "$FRONTEND_DIR/.next" ]; then
    # Check if .next is older than 1 hour (might be corrupted)
    if [ "$(find "$FRONTEND_DIR/.next" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
        rm -rf "$FRONTEND_DIR/.next" && echo "  ✓ Removed stale build cache" || true
    fi
fi

echo -e "${GREEN}✅ Environment ready${NC}"