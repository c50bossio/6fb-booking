#!/bin/bash
# Stop development servers for barber-profile-availability

if [ -f "feature_backend.pid" ]; then
    kill $(cat feature_backend.pid) 2>/dev/null || true
    rm feature_backend.pid
    echo "Backend stopped"
fi

if [ -f "feature_frontend.pid" ]; then
    kill $(cat feature_frontend.pid) 2>/dev/null || true
    rm feature_frontend.pid
    echo "Frontend stopped"
fi

# Kill any remaining processes on our ports
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:8002 | xargs kill -9 2>/dev/null || true

echo "Feature development servers stopped"
