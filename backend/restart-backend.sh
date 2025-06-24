#!/bin/bash
# Restart 6FB Backend with CORS fixes

echo "🔄 Restarting 6FB Backend with CORS configuration fixes..."

# Find and kill existing backend processes
pkill -f "uvicorn main:app" || echo "No existing backend processes found"
pkill -f "python.*main.py" || echo "No Python backend processes found"

# Wait a moment for processes to terminate
sleep 2

# Start the backend with proper environment
cd "/Users/bossio/6fb-booking/backend"
echo "📁 Starting backend from: $(pwd)"
echo "🌍 Environment: $(grep ENVIRONMENT .env)"
echo "🔗 CORS Origins: $(grep CORS_ALLOWED_ORIGINS .env)"

# Start the backend
echo "🚀 Starting FastAPI backend..."
python3 main.py &

# Show the process ID
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"
echo "🌐 Backend should be available at: http://localhost:8000"
echo "🔍 Debug endpoint: http://localhost:8000/cors-debug"
echo "📊 Health check: http://localhost:8000/health"

echo ""
echo "🎯 CORS Fix Applied:"
echo "   ✓ Added https://bookbarber-agndzzr3p-6fb.vercel.app to allowed origins"
echo "   ✓ Removed problematic wildcard pattern"
echo "   ✓ Enhanced CORS headers for preflight requests"
echo "   ✓ Added debug endpoint for troubleshooting"
echo ""
echo "📝 To check if backend is running: curl http://localhost:8000/health"
echo "🔍 To debug CORS: curl http://localhost:8000/cors-debug"