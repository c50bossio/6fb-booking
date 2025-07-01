#!/bin/bash
# Stable startup script for 6FB Booking development environment

echo "🚀 Starting 6FB Booking Development Environment"
echo "=============================================="

# Step 1: Clean environment
echo "🧹 Cleaning previous processes..."
pkill -f "uvicorn\|node\|npm\|next" 2>/dev/null
sleep 2

# Step 2: Verify ports are free
echo "🔍 Checking ports..."
if lsof -ti:3000,8000 > /dev/null 2>&1; then
    echo "❌ Ports still occupied, force killing..."
    lsof -ti:3000,8000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Step 3: Clean caches
echo "🗑️  Cleaning caches..."
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2
rm -rf .next
cd /Users/bossio/6fb-booking/backend-v2
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null

# Step 4: Start backend
echo "🔧 Starting backend..."
cd /Users/bossio/6fb-booking/backend-v2
TESTING=true nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Test backend health
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ Backend started successfully"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Step 5: Start frontend
echo "🎨 Starting frontend..."
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to build
echo "⏳ Waiting for frontend to build..."
sleep 15

# Test frontend
if curl -s http://localhost:3000 | grep -q "Booked Barber"; then
    echo "✅ Frontend started successfully"
else
    echo "❌ Frontend failed to start"
    tail -10 ../frontend.log
    exit 1
fi

# Step 6: Final verification
echo "🔍 Running integration test..."
python test_integration.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Both services are running:"
    echo "   Backend:  http://localhost:8000"
    echo "   Frontend: http://localhost:3000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "💡 To monitor processes: ./monitor.sh"
    echo "💡 To stop services: ./stop_all.sh"
else
    echo "❌ Integration test failed"
    exit 1
fi