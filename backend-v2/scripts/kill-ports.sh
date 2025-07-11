#!/bin/bash
# Port Killing Script for BookedBarber V2
# Safely terminates processes on development ports

echo "🔧 BookedBarber Port Cleanup"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${BLUE}Checking port $port ($name)...${NC}"
    
    # Get PID of process using the port
    PID=$(lsof -ti:$port -sTCP:LISTEN 2>/dev/null)
    
    if [ ! -z "$PID" ]; then
        # Get process name for logging
        PNAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        
        echo -e "${YELLOW}Found process $PNAME (PID: $PID) on port $port${NC}"
        
        # Try graceful shutdown first
        kill $PID 2>/dev/null
        sleep 1
        
        # Check if still running
        if kill -0 $PID 2>/dev/null; then
            echo -e "${RED}Process didn't stop gracefully, forcing...${NC}"
            kill -9 $PID 2>/dev/null
        fi
        
        echo -e "${GREEN}✅ Port $port cleared${NC}"
    else
        echo -e "${GREEN}✅ Port $port was already free${NC}"
    fi
    echo ""
}

# Kill all Node.js related processes first
echo -e "${BLUE}Step 1: Killing Node.js processes...${NC}"
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}✅ Killed Next.js dev processes${NC}" || echo -e "${YELLOW}No Next.js processes found${NC}"
pkill -f "npm run dev" 2>/dev/null && echo -e "${GREEN}✅ Killed npm dev processes${NC}" || echo -e "${YELLOW}No npm dev processes found${NC}"
pkill -f "node.*next" 2>/dev/null && echo -e "${GREEN}✅ Killed node/next processes${NC}" || echo -e "${YELLOW}No node/next processes found${NC}"
echo ""

# Kill Python/FastAPI processes
echo -e "${BLUE}Step 2: Killing Python processes...${NC}"
pkill -f "uvicorn" 2>/dev/null && echo -e "${GREEN}✅ Killed uvicorn processes${NC}" || echo -e "${YELLOW}No uvicorn processes found${NC}"
pkill -f "python.*main:app" 2>/dev/null && echo -e "${GREEN}✅ Killed FastAPI processes${NC}" || echo -e "${YELLOW}No FastAPI processes found${NC}"
echo ""

# Clear specific ports
echo -e "${BLUE}Step 3: Clearing specific ports...${NC}"
kill_port 3000 "Frontend (Next.js)"
kill_port 3001 "Frontend Staging"
kill_port 8000 "Backend (FastAPI)"
kill_port 8001 "Backend Staging"

# Optional: Clear cache
echo -e "${BLUE}Step 4: Cache cleanup (optional)...${NC}"
read -p "Clear Next.js cache? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "../frontend-v2/.next" ]; then
        rm -rf ../frontend-v2/.next
        echo -e "${GREEN}✅ Cleared .next cache${NC}"
    fi
    
    if [ -d "../frontend-v2/node_modules/.cache" ]; then
        rm -rf ../frontend-v2/node_modules/.cache
        echo -e "${GREEN}✅ Cleared node_modules cache${NC}"
    fi
else
    echo -e "${YELLOW}Skipping cache cleanup${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Port cleanup complete!${NC}"
echo ""
echo "Ports should now be available. You can verify with:"
echo "  ./scripts/check-ports.sh"
echo ""
echo "To start development servers:"
echo "  ./scripts/start-dev-clean.sh"