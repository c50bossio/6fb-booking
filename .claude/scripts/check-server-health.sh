#!/bin/bash

# Server Health Check Script
# Monitors development server health and restarts if necessary

set -e

FRONTEND_PORT=3000
BACKEND_PORT=8000
LOG_FILE="/tmp/claude-server-health.log"

# Redirect output to log file and stdout
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "🔍 Checking server health... $(date)"

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

test_server_response() {
    local port=$1
    local url="http://localhost:$port"
    
    # Test if server responds within 5 seconds
    if timeout 5s curl -s -f "$url" >/dev/null 2>&1; then
        return 0  # Server responds
    else
        return 1  # Server not responding
    fi
}

restart_frontend() {
    echo "🔄 Restarting frontend server..."
    
    # Kill existing processes
    pkill -f "next dev" 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    
    sleep 2
    
    # Clear cache to prevent issues
    FRONTEND_DIR="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
    if [ -d "$FRONTEND_DIR" ]; then
        cd "$FRONTEND_DIR"
        rm -rf .next 2>/dev/null || true
        
        # Start server in background
        nohup npm run dev > /tmp/frontend-restart.log 2>&1 &
        
        echo "✅ Frontend restart initiated"
    else
        echo "❌ Frontend directory not found"
    fi
}

# Check frontend health
if check_port $FRONTEND_PORT; then
    echo "✅ Frontend port $FRONTEND_PORT is active"
    
    if test_server_response $FRONTEND_PORT; then
        echo "✅ Frontend server is responding properly"
    else
        echo "⚠️  Frontend server not responding, restarting..."
        restart_frontend
    fi
else
    echo "⚠️  Frontend server not running on port $FRONTEND_PORT"
    
    # Check if it should be running (if we're in a development context)
    if [ -f "/Users/bossio/6fb-booking/backend-v2/frontend-v2/package.json" ]; then
        echo "🔄 Starting frontend server..."
        restart_frontend
    fi
fi

# Check backend health  
if check_port $BACKEND_PORT; then
    echo "✅ Backend port $BACKEND_PORT is active"
    
    if test_server_response $BACKEND_PORT; then
        echo "✅ Backend server is responding properly"
    else
        echo "⚠️  Backend server not responding (may be normal if not started)"
    fi
else
    echo "ℹ️  Backend server not running on port $BACKEND_PORT (may be intentional)"
fi

echo "✅ Server health check complete"