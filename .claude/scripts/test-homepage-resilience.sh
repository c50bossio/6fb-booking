#!/bin/bash

# Homepage Resilience Test Script
# Tests homepage works when backend systems are down
# Used by homepage_resilience_test hook

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
    echo -e "${BLUE}[RESILIENCE]${NC} $1" | tee -a "$LOG_FILE"
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
    if curl -s http://localhost:3000 > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if backend server is running
check_backend_server() {
    if curl -s http://localhost:8000/api/v1/auth/test > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Temporarily block backend connectivity
block_backend() {
    log "Simulating backend offline condition..."
    
    # Method 1: Block port using firewall rules (requires sudo)
    # sudo pfctl -f /dev/stdin <<< "block drop quick on lo0 proto tcp from any to any port 8000"
    
    # Method 2: Use network namespace or iptables (Linux)
    # iptables -A OUTPUT -p tcp --dport 8000 -j DROP
    
    # Method 3: Kill backend process temporarily
    local backend_pid=$(lsof -ti:8000 2>/dev/null || echo "")
    if [[ -n "$backend_pid" ]]; then
        log "Stopping backend server (PID: $backend_pid) temporarily..."
        kill -STOP "$backend_pid" 2>/dev/null || true
        echo "$backend_pid" > /tmp/bookedbarber_backend_pid
        return 0
    else
        log "Backend server not running - perfect for resilience test"
        return 0
    fi
}

# Restore backend connectivity
restore_backend() {
    log "Restoring backend connectivity..."
    
    # Restore stopped backend process
    if [[ -f /tmp/bookedbarber_backend_pid ]]; then
        local backend_pid=$(cat /tmp/bookedbarber_backend_pid)
        if kill -0 "$backend_pid" 2>/dev/null; then
            log "Resuming backend server (PID: $backend_pid)..."
            kill -CONT "$backend_pid" 2>/dev/null || true
        fi
        rm -f /tmp/bookedbarber_backend_pid
    fi
    
    # Wait a moment for backend to be responsive
    sleep 2
}

# Test homepage loading with backend offline
test_homepage_offline() {
    log "Testing homepage resilience with backend offline..."
    
    if ! check_frontend_server; then
        error "Frontend server not running - cannot test resilience"
        return 1
    fi
    
    # Test basic page load
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [[ "$response_code" != "200" ]]; then
        error "Homepage returned HTTP $response_code instead of 200"
        return 1
    fi
    
    # Test that page contains essential content
    local page_content=$(curl -s http://localhost:3000)
    
    # Check for key elements that should always be present
    if [[ ! "$page_content" =~ "BookedBarber" ]]; then
        error "Homepage missing brand name - page may have crashed"
        return 1
    fi
    
    if [[ ! "$page_content" =~ "Free Trial\|Register\|Start" ]]; then
        error "Homepage missing primary CTA - functionality broken"
        return 1
    fi
    
    # Check that page doesn't show error messages
    if [[ "$page_content" =~ "Error\|Failed\|Cannot connect\|Network error" ]]; then
        warning "Homepage shows error messages when backend is offline"
    fi
    
    # Check for JavaScript errors (basic check)
    if [[ "$page_content" =~ "undefined.*undefined\|null.*null\|Error:" ]]; then
        warning "Potential JavaScript errors detected in homepage"
    fi
    
    success "Homepage loads successfully with backend offline"
    return 0
}

# Test homepage loading with backend online
test_homepage_online() {
    log "Testing homepage functionality with backend online..."
    
    if ! check_frontend_server; then
        error "Frontend server not running"
        return 1
    fi
    
    if ! check_backend_server; then
        warning "Backend server not responding - cannot test online functionality"
        return 0
    fi
    
    # Test enhanced functionality when backend is available
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [[ "$response_code" != "200" ]]; then
        error "Homepage returned HTTP $response_code with backend online"
        return 1
    fi
    
    success "Homepage loads successfully with backend online"
    return 0
}

# Test authentication state handling
test_auth_state_resilience() {
    log "Testing authentication state handling resilience..."
    
    # Test with invalid token in localStorage
    # This simulates a corrupted auth state
    
    # For now, we'll do a basic check
    # In a full implementation, we'd use a headless browser
    # to manipulate localStorage and test auth state handling
    
    local page_content=$(curl -s http://localhost:3000)
    
    # Check that auth-dependent components have fallbacks
    if [[ "$page_content" =~ "auth.*undefined\|user.*undefined" ]]; then
        error "Auth state not properly handled - undefined values in content"
        return 1
    fi
    
    success "Auth state handling appears resilient"
    return 0
}

# Main resilience test function
test_homepage_resilience() {
    local errors=0
    
    log "Starting homepage resilience testing..."
    
    # Test with backend online first (baseline)
    if ! test_homepage_online; then
        errors=$((errors + 1))
    fi
    
    # Test auth state resilience
    if ! test_auth_state_resilience; then
        errors=$((errors + 1))
    fi
    
    # Test with backend offline
    local backend_was_running=false
    if check_backend_server; then
        backend_was_running=true
        block_backend
        sleep 2  # Wait for block to take effect
    fi
    
    if ! test_homepage_offline; then
        errors=$((errors + 1))
    fi
    
    # Restore backend if it was running
    if [[ "$backend_was_running" == "true" ]]; then
        restore_backend
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "All homepage resilience tests passed"
        return 0
    else
        error "Homepage resilience testing failed with $errors errors"
        
        # Provide remediation guidance
        echo ""
        echo "🛠️ REMEDIATION GUIDANCE:"
        echo "1. Implement error boundaries around auth-dependent components"
        echo "2. Add static fallbacks for when backend is unreachable"
        echo "3. Handle undefined auth states gracefully"
        echo "4. Test homepage with 'Network offline' in browser dev tools"
        echo "5. Use React Suspense with fallbacks for async components"
        echo ""
        
        return 1
    fi
}

# Execute test
main() {
    log "Homepage resilience test started at $(date)"
    
    if test_homepage_resilience "$@"; then
        success "Homepage resilience test completed successfully"
        exit 0
    else
        error "Homepage resilience test failed"
        exit 1
    fi
}

# Cleanup on exit
cleanup() {
    restore_backend
}

trap cleanup EXIT

# Run main function
main "$@"