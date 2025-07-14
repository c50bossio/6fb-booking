#!/bin/bash

# Check staging environment status
echo "📊 BookedBarber V2 Staging Environment Status"
echo "=============================================="

# Check if staging environment files exist
echo "📁 Configuration Files:"
if [ -f ".env.staging" ]; then
    echo "✅ Backend .env.staging exists"
else
    echo "❌ Backend .env.staging missing"
fi

if [ -f "frontend-v2/.env.staging" ]; then
    echo "✅ Frontend .env.staging exists"
else
    echo "❌ Frontend .env.staging missing"
fi

if [ -f "staging_6fb_booking.db" ]; then
    echo "✅ Staging database exists"
    DB_SIZE=$(ls -lh staging_6fb_booking.db | awk '{print $5}')
    echo "   Database size: $DB_SIZE"
else
    echo "❌ Staging database missing"
fi

echo ""
echo "🔌 Port Status:"

# Check backend port
if lsof -i:8001 >/dev/null 2>&1; then
    BACKEND_PID=$(lsof -ti:8001)
    echo "✅ Backend running on port 8001 (PID: $BACKEND_PID)"
else
    echo "❌ Backend not running on port 8001"
fi

# Check frontend port
if lsof -i:3001 >/dev/null 2>&1; then
    FRONTEND_PID=$(lsof -ti:3001)
    echo "✅ Frontend running on port 3001 (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend not running on port 3001"
fi

echo ""
echo "📺 Tmux Session:"
if tmux has-session -t staging 2>/dev/null; then
    echo "✅ Tmux staging session active"
    echo "   Sessions:"
    tmux list-sessions | grep staging
else
    echo "❌ Tmux staging session not found"
fi

echo ""
echo "🌐 Service Endpoints:"
echo "📊 Backend API: http://localhost:8001"
echo "📊 API Documentation: http://localhost:8001/docs"
echo "📱 Frontend: http://localhost:3001"

echo ""
echo "🔐 Test Accounts:"
echo "- admin@staging.bookedbarber.com / staging123!"
echo "- owner@staging.bookedbarber.com / staging123!"
echo "- barber@staging.bookedbarber.com / staging123!"
echo "- client@staging.bookedbarber.com / staging123!"

echo ""
echo "🛠️ Management Commands:"
echo "- Start: ./start-staging-environment.sh"
echo "- Stop: ./stop-staging-environment.sh"
echo "- Status: ./check-staging-status.sh"

# Test backend API if it's running
if lsof -i:8001 >/dev/null 2>&1; then
    echo ""
    echo "🧪 API Health Check:"
    if curl -s http://localhost:8001/health >/dev/null 2>&1; then
        echo "✅ Backend API responding"
    else
        echo "⚠️  Backend API not responding to health check"
    fi
fi

# Test frontend if it's running
if lsof -i:3001 >/dev/null 2>&1; then
    echo ""
    echo "🧪 Frontend Health Check:"
    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        echo "✅ Frontend responding"
    else
        echo "⚠️  Frontend not responding"
    fi
fi

echo ""
echo "📈 Resource Usage:"
if command -v ps >/dev/null 2>&1; then
    echo "Memory usage of staging processes:"
    ps aux | grep -E "(uvicorn.*8001|next.*3001)" | grep -v grep | awk '{print $2, $3, $4, $11}' | column -t
fi