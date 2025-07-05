#!/bin/bash

# BookedBarber V2 - Development Session Cleanup Script
# Cleans up development processes when Claude session ends

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="$PROJECT_ROOT/.claude/logs/session-cleanup.log"

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

# Function to gracefully terminate processes
graceful_shutdown() {
    local pattern="$1"
    local description="$2"
    local timeout="${3:-10}"
    
    if is_process_running "$pattern"; then
        log "🔄 Gracefully shutting down $description processes..."
        
        # Send SIGTERM first
        pkill -TERM -f "$pattern" || true
        
        # Wait for graceful shutdown
        local count=0
        while is_process_running "$pattern" && [ $count -lt $timeout ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if is_process_running "$pattern"; then
            log "⚠️  Force killing stubborn $description processes..."
            pkill -KILL -f "$pattern" || true
        fi
        
        if ! is_process_running "$pattern"; then
            log "✅ $description processes shut down successfully"
        else
            log "❌ Warning: Some $description processes may still be running"
        fi
    else
        log "✅ No $description processes to clean up"
    fi
}

# Function to save development state
save_development_state() {
    local state_file="$PROJECT_ROOT/.claude/dev-state.json"
    
    log "💾 Saving development state..."
    
    cat > "$state_file" << EOF
{
  "session_ended": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "frontend_server": $(is_process_running "next dev" && echo "true" || echo "false"),
  "backend_server": $(is_process_running "uvicorn.*main:app" && echo "true" || echo "false"),
  "git_branch": "$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "unknown")",
  "last_commit": "$(cd "$PROJECT_ROOT" && git log -1 --format='%H' 2>/dev/null || echo "unknown")"
}
EOF
    
    log "✅ Development state saved to $state_file"
}

# Function to create session summary
create_session_summary() {
    local summary_file="$PROJECT_ROOT/.claude/logs/session-summary-$(date +%Y%m%d_%H%M%S).log"
    
    log "📋 Creating session summary..."
    
    {
        echo "=== BookedBarber V2 Development Session Summary ==="
        echo "Session ended: $(date)"
        echo "Working directory: $PROJECT_ROOT"
        echo ""
        echo "=== Git Status ==="
        cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null || echo "Git status unavailable"
        echo ""
        echo "=== Recent Changes ==="
        cd "$PROJECT_ROOT" && git log --oneline -5 2>/dev/null || echo "Git log unavailable"
        echo ""
        echo "=== Server Status ==="
        echo "Frontend (port 3000): $(lsof -i :3000 >/dev/null 2>&1 && echo "Active" || echo "Inactive")"
        echo "Backend (port 8000): $(lsof -i :8000 >/dev/null 2>&1 && echo "Active" || echo "Inactive")"
        echo ""
        echo "=== Next Steps ==="
        echo "1. Review any uncommitted changes"
        echo "2. Start development servers with: ./scripts/start-dev-clean.sh"
        echo "3. Check .claude/logs/ for detailed session logs"
        echo "=========================================="
    } | tee "$summary_file"
    
    log "✅ Session summary saved to $summary_file"
}

# Main cleanup function
main() {
    log "🧹 Starting development session cleanup..."
    
    # Save current state before cleanup
    save_development_state
    
    # Gracefully shutdown development servers
    graceful_shutdown "next dev" "Next.js development server" 15
    graceful_shutdown "npm run dev" "npm development" 10
    graceful_shutdown "uvicorn.*main:app" "FastAPI backend server" 10
    
    # Clean up any remaining node processes
    graceful_shutdown "node.*3000" "Node.js on port 3000" 5
    graceful_shutdown "node.*8000" "Node.js on port 8000" 5
    
    # Create session summary
    create_session_summary
    
    log "🎉 Development session cleanup completed!"
}

# Run main function
main "$@"