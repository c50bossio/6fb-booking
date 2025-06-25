#!/bin/bash

# 6FB Development Stop Script
# Cleanly stops all development servers

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_PORT=8000
FRONTEND_PORT=3000
PIDFILE_DIR="/tmp/6fb-dev"

echo -e "${BLUE}⏹️  Stopping 6FB Development Servers${NC}"
echo "====================================="

# Function to kill processes on port
kill_port() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti:$port 2>/dev/null || true)

    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Killing processes on port $port...${NC}"
        echo $pids | xargs kill -TERM 2>/dev/null || true
        sleep 2

        # Force kill if still running
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}Force killing processes on port $port...${NC}"
            echo $pids | xargs kill -9 2>/dev/null || true
        fi

        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  No $service_name processes found on port $port${NC}"
    fi
}

# Stop backend
echo "Stopping Backend Server..."
if [ -f "$PIDFILE_DIR/backend.pid" ]; then
    backend_pid=$(cat "$PIDFILE_DIR/backend.pid")
    if ps -p $backend_pid > /dev/null 2>&1; then
        echo "Stopping backend process (PID: $backend_pid)..."
        pkill -P $backend_pid 2>/dev/null || true
        kill $backend_pid 2>/dev/null || true
        sleep 1

        # Force kill if still running
        if ps -p $backend_pid > /dev/null 2>&1; then
            kill -9 $backend_pid 2>/dev/null || true
        fi
    fi
    rm -f "$PIDFILE_DIR/backend.pid"
fi
kill_port $BACKEND_PORT "Backend"

# Stop frontend
echo ""
echo "Stopping Frontend Server..."
if [ -f "$PIDFILE_DIR/frontend.pid" ]; then
    frontend_pid=$(cat "$PIDFILE_DIR/frontend.pid")
    if ps -p $frontend_pid > /dev/null 2>&1; then
        echo "Stopping frontend process (PID: $frontend_pid)..."
        pkill -P $frontend_pid 2>/dev/null || true
        kill $frontend_pid 2>/dev/null || true
        sleep 1

        # Force kill if still running
        if ps -p $frontend_pid > /dev/null 2>&1; then
            kill -9 $frontend_pid 2>/dev/null || true
        fi
    fi
    rm -f "$PIDFILE_DIR/frontend.pid"
fi
kill_port $FRONTEND_PORT "Frontend"

# Clean up any remaining Node.js/Python processes related to the project
echo ""
echo "Cleaning up remaining processes..."

# Kill any remaining uvicorn processes
pkill -f "uvicorn.*main:app" 2>/dev/null || true

# Kill any remaining npm/node processes for this project
pkill -f "npm.*run.*dev" 2>/dev/null || true
pkill -f "next.*dev" 2>/dev/null || true
pkill -f "nodemon.*next" 2>/dev/null || true

# Final verification
echo ""
echo "Verifying shutdown..."
sleep 1

still_running=false
if lsof -i:$BACKEND_PORT >/dev/null 2>&1; then
    echo -e "${RED}⚠️  Something still running on port $BACKEND_PORT${NC}"
    still_running=true
fi

if lsof -i:$FRONTEND_PORT >/dev/null 2>&1; then
    echo -e "${RED}⚠️  Something still running on port $FRONTEND_PORT${NC}"
    still_running=true
fi

if [ "$still_running" = false ]; then
    echo -e "${GREEN}🏁 All development servers stopped successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Some processes may still be running. Check manually with:${NC}"
    echo "   lsof -i:$BACKEND_PORT"
    echo "   lsof -i:$FRONTEND_PORT"
fi

echo ""
echo "To restart: bash dev-manager.sh start"
