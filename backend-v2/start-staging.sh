#!/bin/bash

# BookedBarber V2 - Staging Environment Startup Script
# This script loads staging environment credentials and starts the servers

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

sleep 2

# Load staging environment variables from .env.staging
if [ -f ".env.staging" ]; then
    echo "📋 Loading staging environment variables from .env.staging..."
    export $(grep -v '^#' .env.staging | xargs)
else
    echo "⚠️  .env.staging file not found, using defaults..."
    # Set minimal staging environment variables
    export ENVIRONMENT=staging
    export DEBUG=true
    export DATABASE_URL="sqlite:///./staging_6fb_booking.db"
    
    # Note: API keys should be configured in .env.staging file
    echo "💡 Create .env.staging file with your staging API keys for full functionality"
fi

# Redis
export REDIS_URL="redis://localhost:6379/1"  # Use DB 1 for staging

# CORS
export ALLOWED_ORIGINS="http://localhost:3001,http://localhost:8001,http://127.0.0.1:3001"

# Feature flags
export ENABLE_SMS_NOTIFICATIONS=true
export ENABLE_EMAIL_NOTIFICATIONS=true
export ENABLE_ANALYTICS=true

echo "🚀 Starting staging backend server on port 8001..."
uvicorn main:app --reload --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend health
echo "🔍 Testing backend health..."
curl -s http://localhost:8001/health || echo "❌ Backend health check failed"

echo "✅ Staging backend started with PID $BACKEND_PID"
echo "📡 Backend URL: http://localhost:8001"
echo "📖 API Docs: http://localhost:8001/docs"
echo ""
echo "🎯 Staging environment is ready!"
echo "   - Backend: http://localhost:8001"
echo "   - Database: staging_6fb_booking.db (SQLite)"
echo "   - Redis: localhost:6379/1"
echo "   - Email: SendGrid enabled"
echo "   - SMS: Twilio enabled"
echo "   - Payments: Stripe test mode"
echo ""
echo "Now start the frontend with: cd frontend-v2 && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run staging"