#!/bin/bash
# Start Development Environment Script
# This script starts both backend and frontend in development mode

echo "🛠️  Starting BookedBarber V2 Development Environment"
echo "====================================================="

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Stopping development environment..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run this script from the backend-v2 directory"
    exit 1
fi

# Start backend with development configuration
echo "🚀 Starting Backend (Development) on port 8000..."
export ENVIRONMENT=development
export PORT=8000
export FRONTEND_URL=http://localhost:3000
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --env-file .env &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend with development configuration
echo "🚀 Starting Frontend (Development) on port 3000..."
cd frontend-v2
export NODE_ENV=development
export PORT=3000
npm run dev -- --port 3000 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo "✅ Development Environment Started Successfully!"
echo "📱 Frontend (Development): http://localhost:3000"
echo "🔧 Backend (Development):  http://localhost:8000"
echo "📚 API Docs (Development): http://localhost:8000/docs"
echo ""
echo "🔍 Environment Details:"
echo "  - Frontend Port: 3000"
echo "  - Backend Port:  8000"
echo "  - Database:      6fb_booking.db"
echo "  - Redis DB:      0 (default)"
echo "  - Environment:   development"
echo ""
echo "💡 To stop development environment, press Ctrl+C"
echo "⚠️  This runs alongside staging (ports 3001/8001)"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID