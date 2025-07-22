#!/bin/bash

# BookedBarber V2 - Quick Development Server Management
# Usage: ./dev-server.sh [start|stop|restart|status|clean]

set -e

# Configuration
FRONTEND_DIR="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
BACKEND_DIR="/Users/bossio/6fb-booking/backend-v2"
FRONTEND_PORT=3000
BACKEND_PORT=8000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo -e "${BLUE}BookedBarber V2 - Development Server Manager${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start development servers (default)"
    echo "  stop      - Stop all development servers" 
    echo "  restart   - Restart development servers"
    echo "  status    - Show server status"
    echo "  clean     - Clean caches and restart"
    echo "  help      - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                # Start servers"
    echo "  $0 clean          # Clean restart"
    echo "  $0 status         # Check if running"
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

get_port_process() {
    local port=$1
    lsof -ti:$port 2>/dev/null | head -1
}

kill_processes() {
    echo -e "${YELLOW}Stopping development servers...${NC}"
    
    # Kill Next.js processes
    pkill -f "next dev" 2>/dev/null && echo "  ✓ Killed Next.js processes" || true
    pkill -f "npm run dev" 2>/dev/null && echo "  ✓ Killed npm dev processes" || true
    pkill -f "uvicorn main:app" 2>/dev/null && echo "  ✓ Killed FastAPI processes" || true
    
    # Force kill processes using our ports
    for port in $FRONTEND_PORT $BACKEND_PORT; do
        if check_port $port; then
            local pid=$(get_port_process $port)
            if [ -n "$pid" ]; then
                kill -9 $pid 2>/dev/null && echo "  ✓ Freed port $port" || true
            fi
        fi
    done
    
    sleep 1
}

clean_caches() {
    echo -e "${YELLOW}Cleaning development caches...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # Remove Next.js cache
    rm -rf .next 2>/dev/null && echo "  ✓ Removed .next cache" || true
    rm -rf node_modules/.cache 2>/dev/null && echo "  ✓ Removed npm cache" || true
    rm -rf tsconfig.tsbuildinfo 2>/dev/null && echo "  ✓ Removed TypeScript cache" || true
    rm -rf .turbo 2>/dev/null && echo "  ✓ Removed Turbo cache" || true
    
    echo -e "${GREEN}✅ Cache cleanup complete${NC}"
}

show_status() {
    echo -e "${BLUE}Development Server Status${NC}"
    echo -e "${BLUE}=========================${NC}"
    
    # Frontend status
    if check_port $FRONTEND_PORT; then
        local pid=$(get_port_process $FRONTEND_PORT)
        echo -e "Frontend (port $FRONTEND_PORT): ${GREEN}RUNNING${NC} (PID: $pid)"
        
        # Test if actually responding
        if curl -s -f http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            echo -e "  └─ Status: ${GREEN}HEALTHY${NC} (http://localhost:$FRONTEND_PORT)"
        else
            echo -e "  └─ Status: ${YELLOW}STARTED BUT NOT RESPONDING${NC}"
        fi
    else
        echo -e "Frontend (port $FRONTEND_PORT): ${RED}STOPPED${NC}"
    fi
    
    # Backend status
    if check_port $BACKEND_PORT; then
        local pid=$(get_port_process $BACKEND_PORT)
        echo -e "Backend (port $BACKEND_PORT): ${GREEN}RUNNING${NC} (PID: $pid)"
        
        # Test if actually responding
        if curl -s -f http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
            echo -e "  └─ Status: ${GREEN}HEALTHY${NC} (http://localhost:$BACKEND_PORT)"
        elif curl -s -f http://localhost:$BACKEND_PORT >/dev/null 2>&1; then
            echo -e "  └─ Status: ${GREEN}RESPONDING${NC} (http://localhost:$BACKEND_PORT)"
        else
            echo -e "  └─ Status: ${YELLOW}STARTED BUT NOT RESPONDING${NC}"
        fi
    else
        echo -e "Backend (port $BACKEND_PORT): ${RED}STOPPED${NC}"
    fi
    
    echo ""
}

start_backend() {
    echo -e "${YELLOW}Starting backend server...${NC}"
    cd "$BACKEND_DIR"
    
    if check_port $BACKEND_PORT; then
        echo -e "${YELLOW}Backend already running on port $BACKEND_PORT${NC}"
        return
    fi
    
    # Start backend in background
    nohup uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT > /tmp/backend.log 2>&1 &
    
    # Wait for backend to start
    local count=0
    while [ $count -lt 30 ]; do
        if check_port $BACKEND_PORT; then
            echo -e "${GREEN}✅ Backend server started at http://localhost:$BACKEND_PORT${NC}"
            return
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${RED}❌ Backend failed to start. Check /tmp/backend.log${NC}"
    tail -10 /tmp/backend.log
}

start_frontend() {
    echo -e "${YELLOW}Starting frontend server...${NC}"
    cd "$FRONTEND_DIR"
    
    if check_port $FRONTEND_PORT; then
        echo -e "${YELLOW}Frontend already running on port $FRONTEND_PORT${NC}"
        return
    fi
    
    # Ensure dependencies are installed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo -e "${YELLOW}Installing/updating dependencies...${NC}"
        npm install --silent
    fi
    
    # Start frontend
    echo -e "${GREEN}Starting Next.js development server...${NC}"
    echo -e "${BLUE}Frontend will be available at: http://localhost:$FRONTEND_PORT${NC}"
    
    # Start with monitoring
    if [ -f "scripts/monitor-server.js" ]; then
        exec node scripts/monitor-server.js
    else
        exec npm run dev
    fi
}

start_servers() {
    echo -e "${BLUE}🚀 Starting BookedBarber V2 Development Servers${NC}"
    echo -e "${BLUE}===============================================${NC}"
    
    # Start backend first
    start_backend
    
    # Give backend time to fully start
    sleep 3
    
    # Start frontend (this will exec and replace this process)
    start_frontend
}

stop_servers() {
    kill_processes
    echo -e "${GREEN}✅ Development servers stopped${NC}"
}

restart_servers() {
    stop_servers
    sleep 2
    start_servers
}

clean_restart() {
    stop_servers
    clean_caches
    sleep 2
    start_servers
}

# Main script logic
case "${1:-start}" in
    "start")
        start_servers
        ;;
    "stop")
        stop_servers
        ;;
    "restart")
        restart_servers
        ;;
    "status")
        show_status
        ;;
    "clean")
        clean_restart
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac