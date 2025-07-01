#!/bin/bash

# Kill any existing processes on our ports
echo "Cleaning up old processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Wait a moment for ports to be freed
sleep 2

# Start backend
echo "Starting backend server..."
cd /Users/bossio/6fb-booking/backend-v2
source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
pip install -r requirements.txt >/dev/null 2>&1

# Start backend with nohup to prevent crashes
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null; then
        echo "Backend is ready!"
        break
    fi
    sleep 1
done

# Start frontend
echo "Starting frontend server..."
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2

# Clear any cache issues
rm -rf .next/cache 2>/dev/null

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend with nohup
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "Waiting for frontend to start..."
sleep 5

# Check if both are running
if ps -p $BACKEND_PID > /dev/null && ps -p $FRONTEND_PID > /dev/null; then
    echo ""
    echo "========================================="
    echo "✅ Both servers are running!"
    echo "========================================="
    echo "Backend:  http://localhost:8000"
    echo "Frontend: http://localhost:3000"
    echo ""
    echo "Backend PID:  $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo ""
    echo "To stop servers:"
    echo "kill $BACKEND_PID $FRONTEND_PID"
    echo ""
    echo "To view logs:"
    echo "tail -f backend.log    # Backend logs"
    echo "tail -f frontend.log   # Frontend logs"
    echo "========================================="
else
    echo "❌ Failed to start servers properly"
    echo "Check backend.log and frontend.log for errors"
fi