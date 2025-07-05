#!/bin/bash

# BookedBarber V2 - Server Conflict Detection Script
# Detects and prevents EADDRINUSE port conflicts before starting development servers

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="$PROJECT_ROOT/.claude/logs/conflict-detection.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if port is in use
is_port_in_use() {
    local port="$1"
    lsof -i ":$port" >/dev/null 2>&1
}

# Function to get process details for a port
get_port_process() {
    local port="$1"
    lsof -i ":$port" -t 2>/dev/null | head -1
}

# Function to get process command
get_process_command() {
    local pid="$1"
    ps -p "$pid" -o command= 2>/dev/null || echo "Unknown process"
}

# Function to check for development server conflicts
check_server_conflicts() {
    local conflicts_found=false
    
    # Check frontend port (3000)
    if is_port_in_use 3000; then
        local pid=$(get_port_process 3000)
        local cmd=$(get_process_command "$pid")
        log "❌ CONFLICT: Port 3000 (Frontend) is in use by PID $pid: $cmd"
        conflicts_found=true
    else
        log "✅ Port 3000 (Frontend) is available"
    fi
    
    # Check backend port (8000)
    if is_port_in_use 8000; then
        local pid=$(get_port_process 8000)
        local cmd=$(get_process_command "$pid")
        log "❌ CONFLICT: Port 8000 (Backend) is in use by PID $pid: $cmd"
        conflicts_found=true
    else
        log "✅ Port 8000 (Backend) is available"
    fi
    
    # Check for multiple Next.js processes
    local nextjs_count=$(pgrep -f "next dev" | wc -l)
    if [ "$nextjs_count" -gt 0 ]; then
        log "❌ CONFLICT: Found $nextjs_count Next.js development processes running"
        pgrep -f "next dev" | while read pid; do
            local cmd=$(get_process_command "$pid")
            log "   - PID $pid: $cmd"
        done
        conflicts_found=true
    else
        log "✅ No conflicting Next.js processes found"
    fi
    
    return $conflicts_found
}

# Function to offer automatic cleanup
offer_cleanup() {
    log "🔧 Conflict detected. Running automatic cleanup..."
    
    if [ -x "$PROJECT_ROOT/.claude/scripts/cleanup-all-servers.sh" ]; then
        "$PROJECT_ROOT/.claude/scripts/cleanup-all-servers.sh"
        local cleanup_result=$?
        
        if [ $cleanup_result -eq 0 ]; then
            log "✅ Automatic cleanup completed successfully"
            return 0
        else
            log "❌ Automatic cleanup failed"
            return 1
        fi
    else
        log "❌ Cleanup script not found or not executable"
        return 1
    fi
}

# Function to provide manual cleanup instructions
provide_manual_instructions() {
    log "📋 Manual cleanup instructions:"
    log "   1. Kill all Next.js processes: pkill -f 'next dev'"
    log "   2. Kill all npm dev processes: pkill -f 'npm run dev'"
    log "   3. Clear build cache: rm -rf backend-v2/frontend-v2/.next"
    log "   4. Check ports: lsof -i :3000 && lsof -i :8000"
    log "   5. Re-run your development command"
}

# Main function
main() {
    log "🔍 Checking for server conflicts..."
    
    if check_server_conflicts; then
        log "🎉 No conflicts detected. Safe to start development servers."
        exit 0
    else
        log "⚠️  Server conflicts detected!"
        
        # Attempt automatic cleanup
        if offer_cleanup; then
            log "🎉 Conflicts resolved automatically. Safe to proceed."
            exit 0
        else
            log "❌ Automatic cleanup failed. Manual intervention required."
            provide_manual_instructions
            exit 1
        fi
    fi
}

# Run main function
main "$@"