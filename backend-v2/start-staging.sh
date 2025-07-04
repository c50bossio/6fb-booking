#!/bin/bash
# Start Staging Environment Script
# This script starts both backend and frontend in staging mode

echo "🎯 Starting BookedBarber V2 Staging Environment"
echo "================================================"

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Stopping staging environment..."
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

# Start backend with staging configuration
echo "🚀 Starting Backend (Staging) on port 8001..."
export ENVIRONMENT=staging
export PORT=8001
export FRONTEND_URL=http://localhost:3001
uvicorn main:app --host 0.0.0.0 --port 8001 --reload --env-file .env.staging &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend with staging configuration
echo "🚀 Starting Frontend (Staging) on port 3001..."
cd frontend-v2
export NODE_ENV=staging
export PORT=3001
cp .env.staging .env.local.staging
npm run dev -- --port 3001 --env-file .env.staging &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo "✅ Staging Environment Started Successfully!"
echo "📱 Frontend (Staging): http://localhost:3001"
echo "🔧 Backend (Staging):  http://localhost:8001"
echo "📚 API Docs (Staging): http://localhost:8001/docs"
echo ""
echo "🔍 Environment Details:"
echo "  - Frontend Port: 3001"
echo "  - Backend Port:  8001"
echo "  - Database:      staging_6fb_booking.db"
echo "  - Redis DB:      1 (isolated from development)"
echo "  - Environment:   staging"
echo ""
echo "💡 To stop staging environment, press Ctrl+C"
echo "⚠️  This runs alongside development (ports 3000/8000)"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID