#!/bin/bash

# Start servers for 6FB Booking Platform

echo "Starting 6FB Booking Platform servers..."

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend server
echo "Starting backend server..."
cd /Users/bossio/6fb-booking/backend-v2
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Give backend time to start
sleep 3

# Start frontend server
echo "Starting frontend server..."
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2
npm run dev &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

# Give frontend time to start
sleep 5

echo "===================================="
echo "Servers are running:"
echo "Backend: http://localhost:8000"
echo "Backend Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
echo "===================================="
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID