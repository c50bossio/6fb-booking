#!/bin/bash

# BookedBarber V2 - Server Cleanup Script
# Prevents multiple Next.js server conflicts by cleaning up all existing processes

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="$PROJECT_ROOT/.claude/logs/server-cleanup.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if a process is running
is_process_running() {
    local process_name="$1"
    pgrep -f "$process_name" >/dev/null 2>&1
}

# Function to kill processes safely
kill_processes() {
    local pattern="$1"
    local description="$2"
    
    if is_process_running "$pattern"; then
        log "🔄 Killing $description processes..."
        pkill -f "$pattern" || true
        sleep 2
        
        # Force kill if still running
        if is_process_running "$pattern"; then
            log "⚠️  Force killing stubborn $description processes..."
            pkill -9 -f "$pattern" || true
            sleep 1
        fi
        
        if ! is_process_running "$pattern"; then
            log "✅ $description processes cleaned up successfully"
        else
            log "❌ Warning: Some $description processes may still be running"
        fi
    else
        log "✅ No $description processes found"
    fi
}

# Function to clean build cache
clean_build_cache() {
    local frontend_path="$PROJECT_ROOT/backend-v2/frontend-v2"
    
    if [ -d "$frontend_path/.next" ]; then
        log "🧹 Cleaning .next build cache..."
        rm -rf "$frontend_path/.next"
        log "✅ Build cache cleaned"
    else
        log "✅ No build cache to clean"
    fi
}

# Function to check port availability
check_port_availability() {
    local port="$1"
    local service="$2"
    
    if lsof -i ":$port" >/dev/null 2>&1; then
        log "⚠️  Port $port ($service) is still in use:"
        lsof -i ":$port" | tee -a "$LOG_FILE"
        return 1
    else
        log "✅ Port $port ($service) is available"
        return 0
    fi
}

# Main cleanup function
main() {
    log "🚀 Starting server cleanup..."
    
    # Kill Next.js development servers
    kill_processes "next dev" "Next.js development server"
    
    # Kill npm run dev processes
    kill_processes "npm run dev" "npm development"
    
    # Kill any node processes running on port 3000
    kill_processes "node.*3000" "Node.js on port 3000"
    
    # Kill any remaining BookedBarber processes
    kill_processes "bookedbarber" "BookedBarber"
    
    # Clean build cache
    clean_build_cache
    
    # Wait for processes to fully terminate
    sleep 3
    
    # Check port availability
    log "🔍 Checking port availability..."
    local all_ports_available=true
    
    if ! check_port_availability 3000 "Frontend"; then
        all_ports_available=false
    fi
    
    if ! check_port_availability 8000 "Backend"; then
        all_ports_available=false
    fi
    
    if [ "$all_ports_available" = true ]; then
        log "🎉 All ports are available and clean!"
        exit 0
    else
        log "⚠️  Some ports are still in use. Manual intervention may be required."
        exit 1
    fi
}

# Run main function
main "$@"