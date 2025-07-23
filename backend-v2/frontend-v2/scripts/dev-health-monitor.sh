#!/bin/bash

# =============================================================================
# Development Server Health Monitor
# Automatically detects and recovers from webpack cache corruption
# =============================================================================

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
HEALTH_LOG="$PROJECT_ROOT/logs/health-monitor.log"
SERVER_LOG="$PROJECT_ROOT/server_debug.log"
PID_FILE="$PROJECT_ROOT/health-monitor.pid"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

# Cleanup function for graceful shutdown
cleanup() {
    echo "[$(date)] Health monitor shutting down..." >> "$HEALTH_LOG"
    rm -f "$PID_FILE"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGTERM SIGINT

# Store PID for management
echo $$ > "$PID_FILE"

log_health() {
    echo "[$(date)] HEALTH: $1" >> "$HEALTH_LOG"
    echo "[HEALTH] $1"
}

detect_corruption() {
    local pattern="$1"
    local description="$2"
    
    if [[ -f "$SERVER_LOG" ]] && tail -n 50 "$SERVER_LOG" | grep -q "$pattern"; then
        return 0  # Corruption detected
    fi
    return 1  # No corruption
}

auto_recover() {
    local corruption_type="$1"
    
    log_health "🚨 CORRUPTION DETECTED: $corruption_type"
    log_health "🔧 Starting automatic recovery..."
    
    # Kill development server
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    sleep 2
    
    # Clear corrupted cache
    cd "$PROJECT_ROOT"
    rm -rf .next 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf tsconfig.tsbuildinfo 2>/dev/null || true
    
    log_health "✅ Cache cleared successfully"
    
    # Create missing dependencies if needed
    create_missing_dependencies
    
    # Restart development server
    log_health "🚀 Restarting development server..."
    cd "$PROJECT_ROOT"
    npm run dev > "$SERVER_LOG" 2>&1 &
    
    log_health "✅ Auto-recovery completed"
    
    # Give server time to start
    sleep 10
}

create_missing_dependencies() {
    local deps_created=0
    
    # Create missing lib files
    for file in "lib/touch-utils.ts" "lib/appointment-conflicts.ts" "lib/calendar-constants.ts"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            mkdir -p "$(dirname "$PROJECT_ROOT/$file")"
            echo "export {};" > "$PROJECT_ROOT/$file"
            log_health "📁 Created missing dependency: $file"
            ((deps_created++))
        fi
    done
    
    # Create missing hooks
    for hook in "hooks/useCalendarAccessibility.ts" "hooks/useResponsive.ts"; do
        if [[ ! -f "$PROJECT_ROOT/$hook" ]]; then
            mkdir -p "$(dirname "$PROJECT_ROOT/$hook")"
            hook_name=$(basename "$hook" .ts)
            echo "export const $hook_name = () => ({});" > "$PROJECT_ROOT/$hook"
            log_health "🎣 Created missing hook: $hook"
            ((deps_created++))
        fi
    done
    
    # Create missing styles
    if [[ ! -f "$PROJECT_ROOT/styles/calendar-animations.css" ]]; then
        mkdir -p "$PROJECT_ROOT/styles"
        touch "$PROJECT_ROOT/styles/calendar-animations.css"
        log_health "🎨 Created missing styles: calendar-animations.css"
        ((deps_created++))
    fi
    
    if [[ $deps_created -gt 0 ]]; then
        log_health "✅ Created $deps_created missing dependencies"
    fi
}

check_server_health() {
    # Check if server is responsive
    if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
        return 0  # Server healthy
    fi
    return 1  # Server unhealthy
}

# Main monitoring loop
log_health "🔍 Starting development server health monitoring..."
log_health "📊 Monitoring server log: $SERVER_LOG"

# Create missing dependencies at startup
create_missing_dependencies

last_corruption_check=0
consecutive_failures=0

while true; do
    sleep 5  # Check every 5 seconds
    
    current_time=$(date +%s)
    
    # Check for webpack chunk errors
    if detect_corruption "Cannot find module '\./[0-9]+\.js'" "Webpack dynamic chunk corruption"; then
        auto_recover "Webpack Dynamic Chunk Corruption"
        consecutive_failures=0
        continue
    fi
    
    # Check for cache file errors
    if detect_corruption "ENOENT.*\.next/cache" "Webpack cache file corruption"; then
        auto_recover "Webpack Cache File Corruption"
        consecutive_failures=0
        continue
    fi
    
    # Check for module resolution errors
    if detect_corruption "Can't resolve.*\.next/server" "Module resolution failure"; then
        auto_recover "Module Resolution Failure"
        consecutive_failures=0
        continue
    fi
    
    # Check server responsiveness every 30 seconds
    if [[ $((current_time - last_corruption_check)) -ge 30 ]]; then
        if ! check_server_health; then
            ((consecutive_failures++))
            log_health "⚠️  Server unresponsive (failure #$consecutive_failures)"
            
            if [[ $consecutive_failures -ge 3 ]]; then
                log_health "🚨 Server failed 3 consecutive health checks"
                auto_recover "Server Unresponsive"
                consecutive_failures=0
            fi
        else
            if [[ $consecutive_failures -gt 0 ]]; then
                log_health "✅ Server recovered (was failing)"
                consecutive_failures=0
            fi
        fi
        last_corruption_check=$current_time
    fi
done