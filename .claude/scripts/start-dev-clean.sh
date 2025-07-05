#!/bin/bash

# BookedBarber V2 - Clean Development Startup Script
# Ensures a clean development environment before starting servers

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="$PROJECT_ROOT/.claude/logs/dev-startup.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    local missing_deps=false
    
    # Check Node.js
    if ! command_exists node; then
        log "❌ Node.js is not installed"
        missing_deps=true
    else
        local node_version=$(node --version)
        log "✅ Node.js: $node_version"
    fi
    
    # Check npm
    if ! command_exists npm; then
        log "❌ npm is not installed"
        missing_deps=true
    else
        local npm_version=$(npm --version)
        log "✅ npm: $npm_version"
    fi
    
    # Check Python
    if ! command_exists python3; then
        log "❌ Python 3 is not installed"
        missing_deps=true
    else
        local python_version=$(python3 --version)
        log "✅ Python: $python_version"
    fi
    
    # Check project directories
    if [ ! -d "$PROJECT_ROOT/backend-v2" ]; then
        log "❌ Backend V2 directory not found"
        missing_deps=true
    else
        log "✅ Backend V2 directory found"
    fi
    
    if [ ! -d "$PROJECT_ROOT/backend-v2/frontend-v2" ]; then
        log "❌ Frontend V2 directory not found"
        missing_deps=true
    else
        log "✅ Frontend V2 directory found"
    fi
    
    if [ "$missing_deps" = true ]; then
        log "❌ Missing prerequisites. Please install missing dependencies."
        exit 1
    fi
    
    log "✅ All prerequisites met"
}

# Function to run server cleanup
run_cleanup() {
    log "🧹 Running server cleanup..."
    
    if [ -x "$PROJECT_ROOT/.claude/scripts/cleanup-all-servers.sh" ]; then
        "$PROJECT_ROOT/.claude/scripts/cleanup-all-servers.sh"
        local cleanup_result=$?
        
        if [ $cleanup_result -eq 0 ]; then
            log "✅ Server cleanup completed successfully"
        else
            log "❌ Server cleanup failed"
            exit 1
        fi
    else
        log "⚠️  Cleanup script not found, performing basic cleanup..."
        pkill -f "next dev" || true
        pkill -f "npm run dev" || true
        sleep 2
        log "✅ Basic cleanup completed"
    fi
}

# Function to install dependencies
install_dependencies() {
    log "📦 Installing/updating dependencies..."
    
    # Backend dependencies
    if [ -f "$PROJECT_ROOT/backend-v2/requirements.txt" ]; then
        log "🐍 Installing Python dependencies..."
        cd "$PROJECT_ROOT/backend-v2"
        
        # Check if virtual environment exists
        if [ ! -d "venv" ]; then
            log "🏗️  Creating Python virtual environment..."
            python3 -m venv venv
        fi
        
        # Activate virtual environment and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt >/dev/null 2>&1
        log "✅ Python dependencies installed"
    else
        log "⚠️  No requirements.txt found, skipping Python dependencies"
    fi
    
    # Frontend dependencies
    if [ -f "$PROJECT_ROOT/backend-v2/frontend-v2/package.json" ]; then
        log "📦 Installing Node.js dependencies..."
        cd "$PROJECT_ROOT/backend-v2/frontend-v2"
        
        # Check if node_modules exists and is up to date
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
            npm install >/dev/null 2>&1
            log "✅ Node.js dependencies installed"
        else
            log "✅ Node.js dependencies up to date"
        fi
    else
        log "⚠️  No package.json found, skipping Node.js dependencies"
    fi
}

# Function to start backend server
start_backend() {
    log "🚀 Starting backend server..."
    
    cd "$PROJECT_ROOT/backend-v2"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        log "❌ Virtual environment not found. Please run install_dependencies first."
        exit 1
    fi
    
    # Start backend server in background
    source venv/bin/activate
    nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > "$PROJECT_ROOT/.claude/logs/backend.log" 2>&1 &
    local backend_pid=$!
    
    # Wait for backend to start
    local count=0
    while ! curl -s http://localhost:8000/health >/dev/null 2>&1 && [ $count -lt 30 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        log "✅ Backend server started successfully (PID: $backend_pid)"
        echo "$backend_pid" > "$PROJECT_ROOT/.claude/backend.pid"
    else
        log "❌ Backend server failed to start"
        exit 1
    fi
}

# Function to start frontend server
start_frontend() {
    log "🚀 Starting frontend server..."
    
    cd "$PROJECT_ROOT/backend-v2/frontend-v2"
    
    # Start frontend server in background
    nohup npm run dev > "$PROJECT_ROOT/.claude/logs/frontend.log" 2>&1 &
    local frontend_pid=$!
    
    # Wait for frontend to start
    local count=0
    while ! curl -s http://localhost:3000 >/dev/null 2>&1 && [ $count -lt 60 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log "✅ Frontend server started successfully (PID: $frontend_pid)"
        echo "$frontend_pid" > "$PROJECT_ROOT/.claude/frontend.pid"
    else
        log "❌ Frontend server failed to start"
        exit 1
    fi
}

# Function to display startup summary
display_summary() {
    log "🎉 Development environment started successfully!"
    log ""
    log "📋 Server URLs:"
    log "   Frontend: http://localhost:3000"
    log "   Backend:  http://localhost:8000"
    log "   API Docs: http://localhost:8000/docs"
    log ""
    log "📁 Log Files:"
    log "   Backend:  $PROJECT_ROOT/.claude/logs/backend.log"
    log "   Frontend: $PROJECT_ROOT/.claude/logs/frontend.log"
    log "   Startup:  $LOG_FILE"
    log ""
    log "🔄 To stop servers: ./scripts/cleanup-all-servers.sh"
    log "📊 To view logs: tail -f .claude/logs/*.log"
}

# Function to handle cleanup on exit
cleanup_on_exit() {
    log "🛑 Received signal, cleaning up..."
    if [ -f "$PROJECT_ROOT/.claude/backend.pid" ]; then
        kill "$(cat "$PROJECT_ROOT/.claude/backend.pid")" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.claude/backend.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/.claude/frontend.pid" ]; then
        kill "$(cat "$PROJECT_ROOT/.claude/frontend.pid")" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.claude/frontend.pid"
    fi
    
    exit 0
}

# Set up signal handlers
trap cleanup_on_exit INT TERM

# Main function
main() {
    log "🚀 Starting BookedBarber V2 development environment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Clean up any existing servers
    run_cleanup
    
    # Install/update dependencies
    install_dependencies
    
    # Start backend server
    start_backend
    
    # Start frontend server
    start_frontend
    
    # Display summary
    display_summary
    
    # Option to run in foreground with log monitoring
    if [ "$1" = "--watch" ]; then
        log "📊 Watching logs (Ctrl+C to stop)..."
        tail -f "$PROJECT_ROOT/.claude/logs/backend.log" "$PROJECT_ROOT/.claude/logs/frontend.log"
    else
        log "✅ Development servers started in background"
        log "💡 Use --watch flag to monitor logs in real-time"
    fi
}

# Run main function
main "$@"