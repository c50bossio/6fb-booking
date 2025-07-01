#!/bin/bash

echo "🔄 Switching from V1 to V2 frontend..."

# Find and kill V1 frontend process
echo "📍 Stopping V1 frontend on port 3000..."
V1_PID=$(lsof -ti:3000)
if [ ! -z "$V1_PID" ]; then
    kill -9 $V1_PID
    echo "✅ V1 frontend stopped (PID: $V1_PID)"
else
    echo "ℹ️  No process found on port 3000"
fi

# Wait a moment for port to be released
sleep 2

# Navigate to V2 frontend
echo "📂 Navigating to V2 frontend directory..."
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start V2 frontend
echo "🚀 Starting V2 frontend..."
echo "🌐 V2 BookedBarber will be available at: http://localhost:3000"
echo "🔐 Login page: http://localhost:3000/login"
echo ""
echo "✨ Look for 'BookedBarber' branding instead of '6FB Platform'"
echo ""

# Run the dev server
npm run dev