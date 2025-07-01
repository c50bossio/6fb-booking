#!/bin/bash
# Stop all 6FB Booking development services

echo "🛑 Stopping 6FB Booking Development Environment"
echo "==============================================="

# Kill processes by port
echo "🔪 Killing processes on ports 3000 and 8000..."
lsof -ti:3000,8000 | xargs kill -TERM 2>/dev/null

# Wait for graceful shutdown
sleep 3

# Force kill if needed
if lsof -ti:3000,8000 > /dev/null 2>&1; then
    echo "🔨 Force killing remaining processes..."
    lsof -ti:3000,8000 | xargs kill -9 2>/dev/null
fi

# Kill by process name as backup
echo "🧹 Cleaning up by process name..."
pkill -f "uvicorn.*main:app" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null

sleep 2

# Verify clean shutdown
if lsof -ti:3000,8000 > /dev/null 2>&1; then
    echo "⚠️  Some processes may still be running:"
    lsof -ti:3000,8000 | while read pid; do
        ps -p $pid -o pid,cmd --no-headers
    done
else
    echo "✅ All services stopped successfully"
fi

echo ""
echo "💡 To restart: ./start_stable.sh"