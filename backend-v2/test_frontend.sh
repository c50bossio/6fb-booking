#!/bin/bash

# Kill any existing process on port 3000
echo "Killing any process on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Navigate to frontend directory
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting frontend server..."
npm run dev