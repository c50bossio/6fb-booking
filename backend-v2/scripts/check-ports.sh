#!/bin/bash
# Port Checking Script for BookedBarber V2
# Checks which processes are using common development ports

echo "🔍 BookedBarber Port Check"
echo "========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ports to check
PORTS=(3000 3001 8000 8001 5432 6379 9222)
PORT_NAMES=(
    "Frontend (Next.js)"
    "Frontend Staging"
    "Backend (FastAPI)"
    "Backend Staging"
    "PostgreSQL"
    "Redis"
    "Chrome Debug"
)

# Function to check port
check_port() {
    local port=$1
    local name=$2
    
    echo -e "${BLUE}Checking port $port ($name)...${NC}"
    
    # Check if port is in use
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port is IN USE${NC}"
        
        # Get process details
        echo "   Process details:"
        lsof -i :$port | grep LISTEN | while read -r line; do
            echo "   $line"
        done
        
        # Get PID for easy killing
        PID=$(lsof -ti:$port -sTCP:LISTEN)
        if [ ! -z "$PID" ]; then
            echo -e "   ${YELLOW}Kill command: kill -9 $PID${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port $port is AVAILABLE${NC}"
    fi
    echo ""
}

# Check all ports
for i in "${!PORTS[@]}"; do
    check_port "${PORTS[$i]}" "${PORT_NAMES[$i]}"
done

# Check for common process issues
echo -e "${BLUE}Checking for common process issues...${NC}"
echo ""

# Check for multiple Next.js processes
NEXT_COUNT=$(pgrep -f "next dev" | wc -l)
if [ $NEXT_COUNT -gt 1 ]; then
    echo -e "${RED}⚠️  Multiple Next.js processes detected ($NEXT_COUNT instances)${NC}"
    echo "   This can cause Internal Server Errors and missing UI components"
    echo -e "   ${YELLOW}Fix: ./scripts/kill-ports.sh${NC}"
else
    echo -e "${GREEN}✅ No duplicate Next.js processes${NC}"
fi

# Check for zombie npm processes
NPM_COUNT=$(pgrep -f "npm run dev" | wc -l)
if [ $NPM_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Active npm processes detected ($NPM_COUNT instances)${NC}"
fi

# Check for uvicorn processes
UVICORN_COUNT=$(pgrep -f "uvicorn" | wc -l)
if [ $UVICORN_COUNT -gt 0 ]; then
    echo -e "${BLUE}ℹ️  Active uvicorn processes: $UVICORN_COUNT${NC}"
fi

echo ""
echo "Summary:"
echo "--------"
echo "• Use './scripts/kill-ports.sh' to free up ports"
echo "• Use './scripts/start-dev-clean.sh' for a clean start"
echo "• If you see 'Internal Server Error' or missing buttons, multiple servers are likely running"