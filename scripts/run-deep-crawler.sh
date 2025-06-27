#!/bin/bash

# Deep App Crawler Runner Script
# This script ensures proper environment setup before running the crawler

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deep App Crawler - Full Application Test${NC}"
echo "================================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for server
wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo -n "Waiting for $name to be ready"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: This script must be run from the 6fb-booking root directory${NC}"
    exit 1
fi

# Check if frontend is running
echo -e "\n${YELLOW}📡 Checking servers...${NC}"
FRONTEND_RUNNING=false
BACKEND_RUNNING=false

if check_port 3000; then
    echo -e "${GREEN}✅ Frontend server is already running on port 3000${NC}"
    FRONTEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Frontend server is not running${NC}"
fi

if check_port 8000; then
    echo -e "${GREEN}✅ Backend server is already running on port 8000${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Backend server is not running${NC}"
fi

# Ask user if they want to start servers
if [ "$FRONTEND_RUNNING" = false ] || [ "$BACKEND_RUNNING" = false ]; then
    echo -e "\n${YELLOW}Would you like to start the missing servers? (y/n)${NC}"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Start servers in background
        if [ "$BACKEND_RUNNING" = false ]; then
            echo -e "${BLUE}Starting backend server...${NC}"
            cd backend
            source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
            pip install -r requirements.txt > /dev/null 2>&1
            uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../scripts/logs/backend-crawler.log 2>&1 &
            BACKEND_PID=$!
            cd ..

            if wait_for_server "http://localhost:8000/health" "backend"; then
                echo -e "${GREEN}✅ Backend server started (PID: $BACKEND_PID)${NC}"
            else
                echo -e "${RED}❌ Failed to start backend server${NC}"
                kill $BACKEND_PID 2>/dev/null
            fi
        fi

        if [ "$FRONTEND_RUNNING" = false ]; then
            echo -e "${BLUE}Starting frontend server...${NC}"
            cd frontend
            npm install > /dev/null 2>&1
            npm run dev > ../scripts/logs/frontend-crawler.log 2>&1 &
            FRONTEND_PID=$!
            cd ..

            if wait_for_server "http://localhost:3000" "frontend"; then
                echo -e "${GREEN}✅ Frontend server started (PID: $FRONTEND_PID)${NC}"
            else
                echo -e "${RED}❌ Failed to start frontend server${NC}"
                kill $FRONTEND_PID 2>/dev/null
                exit 1
            fi
        fi

        echo -e "\n${YELLOW}📝 Note: Servers are running in background. Check logs in scripts/logs/${NC}"
        echo -e "${YELLOW}   To stop them later: kill $BACKEND_PID $FRONTEND_PID${NC}"

        # Give servers a moment to fully initialize
        sleep 3
    else
        echo -e "${YELLOW}⚠️  Warning: Some tests may fail without all servers running${NC}"
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p scripts/logs

# Install dependencies if needed
echo -e "\n${BLUE}📦 Checking Puppeteer installation...${NC}"
cd frontend
if ! npm list puppeteer > /dev/null 2>&1; then
    echo "Installing Puppeteer..."
    npm install puppeteer
else
    echo -e "${GREEN}✅ Puppeteer is installed${NC}"
fi
cd ..

# Run the crawler
echo -e "\n${BLUE}🕷️  Starting Deep App Crawler...${NC}"
echo "=================================="
node scripts/deep-app-crawler.js

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend server (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null
    fi
}

# Register cleanup on exit
if [ ! -z "$BACKEND_PID" ] || [ ! -z "$FRONTEND_PID" ]; then
    trap cleanup EXIT
fi

echo -e "\n${GREEN}✅ Crawler completed!${NC}"
echo -e "Check the following files for results:"
echo -e "  - ${BLUE}scripts/deep-app-crawler-report.json${NC} (full report)"
echo -e "  - ${BLUE}scripts/deep-app-crawler-summary.md${NC} (human-readable summary)"
echo -e "  - ${BLUE}scripts/crawler-screenshots/${NC} (error screenshots)"

# Open summary in default editor if available
if command -v code &> /dev/null; then
    echo -e "\n${YELLOW}Would you like to open the summary in VS Code? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        code scripts/deep-app-crawler-summary.md
    fi
elif command -v open &> /dev/null; then
    echo -e "\n${YELLOW}Would you like to open the summary? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        open scripts/deep-app-crawler-summary.md
    fi
fi
