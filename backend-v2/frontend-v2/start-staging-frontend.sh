#!/bin/bash

# Start staging frontend server
echo "🚀 Starting BookedBarber V2 Staging Frontend"
echo "============================================="

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo "❌ Error: .env.staging file not found"
    echo "Please create .env.staging file with staging configuration"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the frontend-v2 directory"
    exit 1
fi

# Copy staging environment to local environment
cp .env.staging .env.local

# Start the frontend server on port 3001
echo "🔧 Starting frontend server on port 3001..."
echo "🌍 Environment: staging"
echo "🔗 API URL: http://localhost:8001"
echo "📱 Frontend URL: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Next.js server
npm run staging