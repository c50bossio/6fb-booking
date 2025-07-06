#!/bin/bash
# Quick start script for BookedBarber development

echo "🚀 Starting BookedBarber Development Environment"
echo "=============================================="

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
sleep 2

# Start backend
echo "Starting backend on port 8000..."
cd /Users/bossio/6fb-booking/backend-v2
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend on port 3000..."
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Check status
echo ""
echo "Checking service status..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running at http://localhost:8000"
else
    echo "❌ Backend failed to start"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running at http://localhost:3000"
else
    echo "⚠️  Frontend is starting... (may take a few more seconds)"
fi

echo ""
echo "Services started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop services, run: pkill -f 'uvicorn|next dev'"
echo ""
echo "Dev Health Monitor should now show all services as UP!"