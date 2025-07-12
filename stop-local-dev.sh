#!/bin/bash

# 🛑 Stop Local Development Environment
# Stops both frontend and backend servers
# Usage: ./stop-local-dev.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping 6FB Booking V2 Development Servers${NC}"
echo -e "${BLUE}=============================================${NC}"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}🔄 Stopping $service_name (PID: $pid)...${NC}"
            kill $pid
            rm -f "$pid_file"
            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name was not running (PID file existed but process not found)${NC}"
            rm -f "$pid_file"
        fi
    else
        echo -e "${YELLOW}🔍 Looking for $service_name processes on port $port...${NC}"
        local processes=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$processes" ]; then
            echo -e "${YELLOW}🔄 Killing processes on port $port...${NC}"
            echo $processes | xargs kill
            echo -e "${GREEN}✅ Processes on port $port stopped${NC}"
        else
            echo -e "${GREEN}✅ No $service_name processes found${NC}"
        fi
    fi
}

# Stop backend (port 8000)
stop_service "Backend (FastAPI)" "logs/backend.pid" 8000

# Stop frontend (port 3000)  
stop_service "Frontend (Next.js)" "logs/frontend.pid" 3000

# Clean up any remaining processes
echo -e "${YELLOW}🧹 Cleaning up any remaining processes...${NC}"

# Kill any remaining uvicorn processes
pkill -f "uvicorn.*main:app" 2>/dev/null || true

# Kill any remaining npm/node processes for this project
pkill -f "npm.*run.*dev" 2>/dev/null || true
pkill -f "next.*dev" 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 All development servers stopped successfully!${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "${YELLOW}💡 To start again: ./start-local-dev.sh${NC}"
echo -e "${YELLOW}🚀 To deploy to staging: ./deploy-to-staging.sh \"Your message\"${NC}"