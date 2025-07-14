#!/bin/bash

# Stop staging environment
echo "🛑 Stopping BookedBarber V2 Staging Environment"
echo "================================================"

# Kill tmux session if it exists
if tmux has-session -t staging 2>/dev/null; then
    echo "📺 Stopping tmux staging session..."
    tmux kill-session -t staging
fi

# Kill any processes using staging ports
echo "🔧 Stopping processes on staging ports..."

# Kill processes on port 8001 (staging backend)
BACKEND_PIDS=$(lsof -ti:8001)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "🔧 Killing backend processes on port 8001..."
    kill -9 $BACKEND_PIDS
fi

# Kill processes on port 3001 (staging frontend)
FRONTEND_PIDS=$(lsof -ti:3001)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "🔧 Killing frontend processes on port 3001..."
    kill -9 $FRONTEND_PIDS
fi

# Kill any remaining Next.js processes in staging mode
echo "🔧 Cleaning up Next.js processes..."
pkill -f "next dev -p 3001" 2>/dev/null
pkill -f "npm run staging" 2>/dev/null

# Kill any remaining uvicorn processes on port 8001
echo "🔧 Cleaning up uvicorn processes..."
pkill -f "uvicorn main:app.*--port 8001" 2>/dev/null

# Wait a moment for processes to cleanup
sleep 2

# Check if ports are still in use
echo "🔍 Checking port status..."
if lsof -i:8001 >/dev/null 2>&1; then
    echo "⚠️  Port 8001 still in use"
else
    echo "✅ Port 8001 is free"
fi

if lsof -i:3001 >/dev/null 2>&1; then
    echo "⚠️  Port 3001 still in use"
else
    echo "✅ Port 3001 is free"
fi

echo ""
echo "✅ Staging environment stopped!"
echo "📊 Backend API: http://localhost:8001 (stopped)"
echo "📱 Frontend: http://localhost:3001 (stopped)"
echo ""
echo "To restart:"
echo "./start-staging-environment.sh"