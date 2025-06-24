#!/bin/bash

# Quick backend restart script for CORS configuration update

echo "🔄 Restarting 6FB Backend with updated CORS configuration..."

# Find and kill existing backend process
echo "Stopping existing backend process..."
pkill -f "uvicorn main:app" || echo "No existing backend process found"

# Wait a moment for clean shutdown
sleep 2

# Start backend in background
echo "Starting backend server..."
cd /Users/bossio/6fb-booking/backend
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &

# Get the process ID
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait a moment and check if it's running
sleep 3
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend successfully restarted!"
    echo "📝 Backend logs available at: /Users/bossio/6fb-booking/backend/backend.log"
    echo "🌐 Backend URL: http://localhost:8000"
    echo "🔍 Health check: curl http://localhost:8000/health"
else
    echo "❌ Backend failed to start. Check logs at: /Users/bossio/6fb-booking/backend/backend.log"
    exit 1
fi