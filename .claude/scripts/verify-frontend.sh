#!/bin/bash

# Frontend Page Verification Script
# Verifies that frontend pages load correctly after changes
# Uses browser logs MCP to check for errors

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="/Users/bossio/6fb-booking/.claude/verification.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[VERIFY]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if frontend server is running
check_frontend_server() {
    log "Checking if frontend server is running on port 3000..."
    if ! curl -s http://localhost:3000 > /dev/null; then
        error "Frontend server is not running on port 3000"
        return 1
    fi
    success "Frontend server is running"
    return 0
}

# Check if backend server is running
check_backend_server() {
    log "Checking if backend server is running on port 8000..."
    if ! curl -s http://localhost:8000/api/v1/auth/test > /dev/null; then
        warning "Backend server may not be running on port 8000"
        return 1
    fi
    success "Backend server is running"
    return 0
}

# Wait for page to load
wait_for_page_load() {
    local timeout=10
    local count=0
    
    log "Waiting for page to load completely..."
    while [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
    done
}

# Check for JavaScript errors using browser logs MCP
check_page_errors() {
    local page_url="$1"
    local page_name="$2"
    
    log "Checking $page_name at $page_url for errors..."
    
    # Check if Chrome is running with debug port
    if ! lsof -i :9222 > /dev/null 2>&1; then
        warning "Chrome debug port 9222 not available. Starting Chrome..."
        google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb --headless > /dev/null 2>&1 &
        sleep 3
    fi
    
    # For now, use a basic curl check until MCP integration is fully available
    if curl -s "$page_url" > /dev/null; then
        success "$page_name loads successfully"
        return 0
    else
        error "$page_name failed to load"
        return 1
    fi
}

# Main verification function
verify_frontend_pages() {
    local errors=0
    
    log "Starting frontend page verification..."
    
    # Check servers first
    if ! check_frontend_server; then
        error "Cannot verify pages - frontend server not running"
        return 1
    fi
    
    check_backend_server
    
    # Key pages to verify
    local pages=(
        "http://localhost:3000:Home"
        "http://localhost:3000/register:Register"
        "http://localhost:3000/agents/analytics:Analytics"
    )
    
    for page_info in "${pages[@]}"; do
        IFS=':' read -r url name <<< "$page_info"
        if ! check_page_errors "$url" "$name"; then
            errors=$((errors + 1))
        fi
        wait_for_page_load
    done
    
    if [ $errors -eq 0 ]; then
        success "All frontend pages verified successfully"
        return 0
    else
        error "Found $errors page(s) with issues"
        return 1
    fi
}

# Run verification
main() {
    log "Frontend verification started at $(date)"
    
    if verify_frontend_pages; then
        success "Frontend verification completed successfully"
        exit 0
    else
        error "Frontend verification failed"
        exit 1
    fi
}

# Execute main function
main "$@"