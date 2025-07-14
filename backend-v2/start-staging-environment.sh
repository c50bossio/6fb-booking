#!/bin/bash

# Start complete staging environment
echo "🚀 Starting BookedBarber V2 Staging Environment"
echo "================================================"

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo "⚠️  tmux is not installed. Starting servers in background..."
    
    # Start backend in background
    echo "🔧 Starting staging backend on port 8001..."
    ./start-staging-backend.sh &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend in background
    echo "🔧 Starting staging frontend on port 3001..."
    cd frontend-v2 && ./start-staging-frontend.sh &
    FRONTEND_PID=$!
    
    echo ""
    echo "✅ Staging environment started!"
    echo "📊 Backend API: http://localhost:8001"
    echo "📊 API Docs: http://localhost:8001/docs"
    echo "📱 Frontend: http://localhost:3001"
    echo ""
    echo "Process IDs:"
    echo "- Backend: $BACKEND_PID"
    echo "- Frontend: $FRONTEND_PID"
    echo ""
    echo "To stop servers:"
    echo "kill $BACKEND_PID $FRONTEND_PID"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    
    # Wait for user interrupt
    trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGINT
    wait
else
    echo "📺 Starting staging environment with tmux..."
    
    # Kill existing staging session if it exists
    tmux kill-session -t staging 2>/dev/null
    
    # Create new tmux session
    tmux new-session -d -s staging -n backend
    
    # Start backend in first window
    tmux send-keys -t staging:backend 'cd /Users/bossio/6fb-booking/backend-v2 && ./start-staging-backend.sh' C-m
    
    # Create frontend window
    tmux new-window -t staging -n frontend
    tmux send-keys -t staging:frontend 'cd /Users/bossio/6fb-booking/backend-v2/frontend-v2 && ./start-staging-frontend.sh' C-m
    
    # Create monitoring window
    tmux new-window -t staging -n monitor
    tmux send-keys -t staging:monitor 'echo "📊 Staging Environment Monitor"' C-m
    tmux send-keys -t staging:monitor 'echo "=========================="' C-m
    tmux send-keys -t staging:monitor 'echo "Backend: http://localhost:8001"' C-m
    tmux send-keys -t staging:monitor 'echo "Frontend: http://localhost:3001"' C-m
    tmux send-keys -t staging:monitor 'echo "API Docs: http://localhost:8001/docs"' C-m
    tmux send-keys -t staging:monitor 'echo ""' C-m
    tmux send-keys -t staging:monitor 'echo "Commands:"' C-m
    tmux send-keys -t staging:monitor 'echo "- Ctrl+b, 0: Backend window"' C-m
    tmux send-keys -t staging:monitor 'echo "- Ctrl+b, 1: Frontend window"' C-m
    tmux send-keys -t staging:monitor 'echo "- Ctrl+b, 2: This monitor"' C-m
    tmux send-keys -t staging:monitor 'echo "- Ctrl+b, d: Detach session"' C-m
    tmux send-keys -t staging:monitor 'echo ""' C-m
    tmux send-keys -t staging:monitor 'echo "Test Accounts:"' C-m
    tmux send-keys -t staging:monitor 'echo "- admin@staging.bookedbarber.com / staging123!"' C-m
    tmux send-keys -t staging:monitor 'echo "- owner@staging.bookedbarber.com / staging123!"' C-m
    tmux send-keys -t staging:monitor 'echo "- barber@staging.bookedbarber.com / staging123!"' C-m
    tmux send-keys -t staging:monitor 'echo "- client@staging.bookedbarber.com / staging123!"' C-m
    
    # Attach to the session
    tmux attach-session -t staging
fi