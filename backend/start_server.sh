#!/bin/bash
# Start the backend server
cd /Users/bossio/6fb-booking/backend
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &
echo $! > server.pid
echo "Server started with PID: $(cat server.pid)"
echo "Waiting for server to start..."
sleep 3
echo "Server should be running at http://localhost:8000"
