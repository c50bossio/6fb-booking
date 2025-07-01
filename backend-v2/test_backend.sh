#!/bin/bash

# Kill any existing process on port 8000
echo "Killing any process on port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Navigate to backend directory
cd /Users/bossio/6fb-booking/backend-v2

# Activate virtual environment
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Start the backend server
echo "Starting backend server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000