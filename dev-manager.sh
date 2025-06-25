#!/bin/bash

# 6FB Development Manager - Bulletproof Development Environment
# Manages FastAPI + Next.js stack with process monitoring and auto-restart

set -e

# Configuration
PROJECT_NAME="6fb-booking"
BACKEND_PORT=8000
FRONTEND_PORT=3000
PIDFILE_DIR="/tmp/6fb-dev"
BACKEND_PID="$PIDFILE_DIR/backend.pid"
FRONTEND_PID="$PIDFILE_DIR/frontend.pid"
LOG_DIR="$PWD/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure required directories exist
mkdir -p "$PIDFILE_DIR" "$LOG_DIR"

# Utility functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if port is in use
check_port() {
    local port=$1
    if lsof -i:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo $pids | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Check if process is running
is_running() {
    local pidfile=$1
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p $pid > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f "$pidfile"
            return 1  # Not running
        fi
    else
        return 1  # No pidfile
    fi
}

# Start backend server
start_backend() {
    log "Starting FastAPI backend server..."

    # Kill any existing processes on port
    kill_port $BACKEND_PORT

    # Change to backend directory
    cd backend

    # Start with Python watcher for auto-restart
    nohup python dev_watcher.py > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID"

    cd ..

    # Wait and verify
    sleep 3
    if is_running "$BACKEND_PID"; then
        success "Backend server started on port $BACKEND_PORT (PID: $pid)"
        return 0
    else
        error "Failed to start backend server"
        return 1
    fi
}

# Start frontend server
start_frontend() {
    log "Starting Next.js frontend server..."

    # Kill any existing processes on port
    kill_port $FRONTEND_PORT

    # Change to frontend directory
    cd frontend

    # Start with nodemon for auto-restart
    nohup npm run dev:nodemon > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID"

    cd ..

    # Wait and verify
    sleep 5
    if is_running "$FRONTEND_PID"; then
        success "Frontend server started on port $FRONTEND_PORT (PID: $pid)"
        return 0
    else
        error "Failed to start frontend server"
        return 1
    fi
}

# Stop backend server
stop_backend() {
    if is_running "$BACKEND_PID"; then
        local pid=$(cat "$BACKEND_PID")
        log "Stopping backend server (PID: $pid)..."

        # Kill the main process and any children
        pkill -P $pid 2>/dev/null || true
        kill $pid 2>/dev/null || true

        # Force kill if still running after 5 seconds
        sleep 2
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null || true
        fi

        rm -f "$BACKEND_PID"
        kill_port $BACKEND_PORT
        success "Backend server stopped"
    else
        warning "Backend server is not running"
    fi
}

# Stop frontend server
stop_frontend() {
    if is_running "$FRONTEND_PID"; then
        local pid=$(cat "$FRONTEND_PID")
        log "Stopping frontend server (PID: $pid)..."

        # Kill the main process and any children
        pkill -P $pid 2>/dev/null || true
        kill $pid 2>/dev/null || true

        # Force kill if still running after 5 seconds
        sleep 2
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null || true
        fi

        rm -f "$FRONTEND_PID"
        kill_port $FRONTEND_PORT
        success "Frontend server stopped"
    else
        warning "Frontend server is not running"
    fi
}

# Show server status
show_status() {
    echo ""
    echo -e "${BLUE}📊 6FB Development Environment Status${NC}"
    echo "=" * 45

    # Backend status
    if is_running "$BACKEND_PID"; then
        local backend_pid=$(cat "$BACKEND_PID")
        if check_port $BACKEND_PORT; then
            success "Backend: Running (PID: $backend_pid, Port: $BACKEND_PORT)"
            echo "   📁 API: http://localhost:$BACKEND_PORT"
            echo "   📚 Docs: http://localhost:$BACKEND_PORT/docs"
            echo "   🔍 Health: http://localhost:$BACKEND_PORT/health"
        else
            warning "Backend: Process running but port $BACKEND_PORT not responding"
        fi
    else
        error "Backend: Not running"
    fi

    # Frontend status
    if is_running "$FRONTEND_PID"; then
        local frontend_pid=$(cat "$FRONTEND_PID")
        if check_port $FRONTEND_PORT; then
            success "Frontend: Running (PID: $frontend_pid, Port: $FRONTEND_PORT)"
            echo "   🌐 App: http://localhost:$FRONTEND_PORT"
        else
            warning "Frontend: Process running but port $FRONTEND_PORT not responding"
        fi
    else
        error "Frontend: Not running"
    fi

    echo ""
    echo "📋 Logs:"
    echo "   Backend: tail -f $LOG_DIR/backend.log"
    echo "   Frontend: tail -f $LOG_DIR/frontend.log"
    echo ""
}

# Start all servers
start_all() {
    echo -e "${BLUE}🚀 Starting 6FB Development Environment${NC}"
    echo "=" * 45

    # Check prerequisites
    if [ ! -f "backend/main.py" ]; then
        error "Backend main.py not found. Are you in the right directory?"
        exit 1
    fi

    if [ ! -f "frontend/package.json" ]; then
        error "Frontend package.json not found. Are you in the right directory?"
        exit 1
    fi

    # Start servers
    start_backend
    start_frontend

    echo ""
    success "Development environment started successfully!"
    show_status

    echo -e "${GREEN}🎯 Ready to develop!${NC}"
    echo "⚡ Auto-restart enabled for both servers"
    echo "📝 Use 'bash dev-manager.sh status' to check server health"
    echo "🛑 Use 'bash dev-manager.sh stop' to stop all servers"
}

# Stop all servers
stop_all() {
    echo -e "${BLUE}⏹️  Stopping 6FB Development Environment${NC}"
    echo "=" * 45

    stop_backend
    stop_frontend

    success "All servers stopped"
}

# Restart individual server
restart_backend() {
    log "Restarting backend server..."
    stop_backend
    sleep 1
    start_backend
    show_status
}

restart_frontend() {
    log "Restarting frontend server..."
    stop_frontend
    sleep 1
    start_frontend
    show_status
}

# Restart all servers
restart_all() {
    log "Restarting all servers..."
    stop_all
    sleep 2
    start_all
}

# Show logs
show_logs() {
    local service=${1:-"all"}

    case $service in
        "backend"|"be")
            echo -e "${BLUE}📄 Backend Logs (last 50 lines)${NC}"
            echo "=" * 40
            tail -n 50 "$LOG_DIR/backend.log" 2>/dev/null || echo "No backend logs found"
            ;;
        "frontend"|"fe")
            echo -e "${BLUE}📄 Frontend Logs (last 50 lines)${NC}"
            echo "=" * 40
            tail -n 50 "$LOG_DIR/frontend.log" 2>/dev/null || echo "No frontend logs found"
            ;;
        "all"|*)
            echo -e "${BLUE}📄 Backend Logs (last 25 lines)${NC}"
            echo "=" * 40
            tail -n 25 "$LOG_DIR/backend.log" 2>/dev/null || echo "No backend logs found"
            echo ""
            echo -e "${BLUE}📄 Frontend Logs (last 25 lines)${NC}"
            echo "=" * 40
            tail -n 25 "$LOG_DIR/frontend.log" 2>/dev/null || echo "No frontend logs found"
            ;;
    esac
}

# Health check
health_check() {
    echo -e "${BLUE}🏥 Health Check${NC}"
    echo "=" * 20

    # Backend health
    if check_port $BACKEND_PORT; then
        if curl -s http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
            success "Backend: Healthy"
        else
            warning "Backend: Port open but health endpoint not responding"
        fi
    else
        error "Backend: Not responding on port $BACKEND_PORT"
    fi

    # Frontend health
    if check_port $FRONTEND_PORT; then
        if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            success "Frontend: Healthy"
        else
            warning "Frontend: Port open but not responding"
        fi
    else
        error "Frontend: Not responding on port $FRONTEND_PORT"
    fi
}

# Show help
show_help() {
    echo -e "${BLUE}6FB Development Manager${NC}"
    echo "Bulletproof development environment for FastAPI + Next.js"
    echo ""
    echo "Usage: bash dev-manager.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start           Start all development servers"
    echo "  stop            Stop all development servers"
    echo "  restart         Restart all development servers"
    echo "  status          Show server status"
    echo "  health          Run health check"
    echo "  logs [service]  Show logs (backend|frontend|all)"
    echo "  restart-be      Restart backend only"
    echo "  restart-fe      Restart frontend only"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  bash dev-manager.sh start"
    echo "  bash dev-manager.sh logs backend"
    echo "  bash dev-manager.sh restart-fe"
}

# Main command handling
case "${1:-start}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "restart-backend"|"restart-be")
        restart_backend
        ;;
    "restart-frontend"|"restart-fe")
        restart_frontend
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "logs")
        show_logs "${2:-all}"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
