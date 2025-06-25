#!/bin/bash

# 6FB Development Status Checker
# Quick status check for development servers

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_PORT=8000
FRONTEND_PORT=3000
PIDFILE_DIR="/tmp/6fb-dev"

echo -e "${BLUE}🔍 6FB Development Status${NC}"
echo "=========================="

# Check backend
if lsof -i:$BACKEND_PORT >/dev/null 2>&1; then
    if curl -s http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend: Running & Healthy${NC} (http://localhost:$BACKEND_PORT)"
    else
        echo -e "${YELLOW}⚠️  Backend: Running but not responding${NC} (port $BACKEND_PORT)"
    fi
else
    echo -e "${RED}❌ Backend: Not running${NC} (port $BACKEND_PORT)"
fi

# Check frontend
if lsof -i:$FRONTEND_PORT >/dev/null 2>&1; then
    if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend: Running & Healthy${NC} (http://localhost:$FRONTEND_PORT)"
    else
        echo -e "${YELLOW}⚠️  Frontend: Running but not responding${NC} (port $FRONTEND_PORT)"
    fi
else
    echo -e "${RED}❌ Frontend: Not running${NC} (port $FRONTEND_PORT)"
fi

# Show quick links
echo ""
echo "🔗 Quick Links:"
echo "   App: http://localhost:$FRONTEND_PORT"
echo "   API: http://localhost:$BACKEND_PORT"
echo "   Docs: http://localhost:$BACKEND_PORT/docs"

# Show process info if available
echo ""
echo "📊 Process Info:"
if [ -f "$PIDFILE_DIR/backend.pid" ]; then
    backend_pid=$(cat "$PIDFILE_DIR/backend.pid")
    if ps -p $backend_pid > /dev/null 2>&1; then
        echo "   Backend PID: $backend_pid"
    fi
fi

if [ -f "$PIDFILE_DIR/frontend.pid" ]; then
    frontend_pid=$(cat "$PIDFILE_DIR/frontend.pid")
    if ps -p $frontend_pid > /dev/null 2>&1; then
        echo "   Frontend PID: $frontend_pid"
    fi
fi
