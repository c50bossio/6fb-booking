#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting 6FB Booking Platform...${NC}"

# Function to kill processes on ports
kill_port() {
    local port=$1
    echo -e "${YELLOW}Checking port $port...${NC}"
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}Killing process on port $port${NC}"
        kill -9 $(lsof -Pi :$port -sTCP:LISTEN -t)
        sleep 2
    fi
}

# Kill any existing processes on ports 3000 and 8000
kill_port 3000
kill_port 8000

# Start backend server
echo -e "${GREEN}Starting backend server on port 8000...${NC}"
cd /Users/bossio/6fb-booking/backend-v2

# Check if virtual environment exists
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo -e "${RED}Virtual environment not found! Creating one...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Start backend in background
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}Backend server started with PID: $BACKEND_PID${NC}"

# Wait a bit for backend to start
sleep 3

# Start frontend server
echo -e "${GREEN}Starting frontend server on port 3000...${NC}"
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"

# Wait for servers to start
sleep 5

# Check if servers are running
echo -e "\n${BLUE}Checking server status...${NC}"

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ Backend is running on http://localhost:8000${NC}"
    echo -e "${GREEN}  API docs available at http://localhost:8000/docs${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
fi

echo -e "\n${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo -e "${BLUE}PIDs - Backend: $BACKEND_PID, Frontend: $FRONTEND_PID${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill_port 3000
    kill_port 8000
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
wait