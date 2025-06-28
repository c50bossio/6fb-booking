#!/bin/bash

# Development Session Launcher for 6FB Booking Platform
echo "🚀 Starting 6FB Development Session"
echo "=================================="
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Install it for the best experience:"
    echo "  macOS: brew install tmux"
    echo "  Ubuntu/Debian: sudo apt-get install tmux"
    echo ""
    echo "Starting without tmux..."
    echo ""
    echo "Please open 6 terminal windows manually and run:"
    echo ""
    echo "Window 1 - Backend Server:"
    echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload"
    echo ""
    echo "Window 2 - Frontend Server:"
    echo "  cd frontend && npm run dev"
    echo ""
    echo "Window 3 - Backend Tests:"
    echo "  cd backend && source venv/bin/activate && ptw"
    echo ""
    echo "Window 4 - Frontend Tests:"
    echo "  cd frontend && npm test"
    echo ""
    echo "Window 5 - Git/Features:"
    echo "  git status"
    echo ""
    echo "Window 6 - Logs/Monitoring:"
    echo "  tail -f backend/logs/*.log"
    exit 0
fi

# Create tmux session with multiple windows
tmux new-session -d -s sixfb -n backend-server
tmux send-keys -t sixfb:backend-server 'cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000' C-m

tmux new-window -t sixfb -n frontend-server
tmux send-keys -t sixfb:frontend-server 'cd frontend && npm run dev' C-m

tmux new-window -t sixfb -n backend-tests
tmux send-keys -t sixfb:backend-tests 'cd backend && source venv/bin/activate && echo "Run: ptw" for continuous testing' C-m

tmux new-window -t sixfb -n frontend-tests
tmux send-keys -t sixfb:frontend-tests 'cd frontend && echo "Run: npm test" for testing' C-m

tmux new-window -t sixfb -n git-features
tmux send-keys -t sixfb:git-features 'git branch -a | grep feature/' C-m

tmux new-window -t sixfb -n monitoring
tmux send-keys -t sixfb:monitoring 'echo "Monitoring window ready"' C-m

# Attach to the session
tmux attach-session -t sixfb

# Instructions for tmux navigation
echo ""
echo "tmux commands:"
echo "  Ctrl+b, n - Next window"
echo "  Ctrl+b, p - Previous window"
echo "  Ctrl+b, 0-5 - Go to window number"
echo "  Ctrl+b, d - Detach from session"
echo "  tmux attach -t sixfb - Reattach to session"
