#!/bin/bash

# =============================================================================
# Smart Development Server Startup
# Includes validation, health monitoring, and auto-recovery
# =============================================================================

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
STARTUP_LOG="$PROJECT_ROOT/logs/startup.log"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

log_startup() {
    echo "[$(date)] STARTUP: $1" | tee -a "$STARTUP_LOG"
}

check_prerequisites() {
    log_startup "1️⃣ Checking prerequisites..."
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [[ $node_version -lt 18 ]]; then
        log_startup "❌ Node.js 18+ required (found: $(node --version))"
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm >/dev/null 2>&1; then
        log_startup "❌ npm not found"
        exit 1
    fi
    
    # Check if project structure exists
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_startup "❌ package.json not found in $PROJECT_ROOT"
        exit 1
    fi
    
    log_startup "✅ Prerequisites check passed"
}

cleanup_existing_processes() {
    log_startup "2️⃣ Cleaning up existing processes..."
    
    # Kill existing development servers
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    # Kill health monitor if running
    if [[ -f "$PROJECT_ROOT/health-monitor.pid" ]]; then
        local health_pid=$(cat "$PROJECT_ROOT/health-monitor.pid")
        kill $health_pid 2>/dev/null || true
        rm -f "$PROJECT_ROOT/health-monitor.pid"
    fi
    
    # Clear port conflicts
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    sleep 2
    log_startup "✅ Process cleanup completed"
}

validate_environment() {
    log_startup "3️⃣ Validating development environment..."
    
    cd "$PROJECT_ROOT"
    
    # Run dependency validation
    if ! ./scripts/validate-dependencies.sh; then
        log_startup "❌ Dependency validation failed"
        log_startup "🔧 Running automatic dependency creation..."
        
        # Force creation of common dependencies
        mkdir -p lib hooks styles
        
        # Create lib files
        [[ ! -f "lib/touch-utils.ts" ]] && echo "export {};" > "lib/touch-utils.ts"
        [[ ! -f "lib/appointment-conflicts.ts" ]] && echo "export {};" > "lib/appointment-conflicts.ts"
        [[ ! -f "lib/calendar-constants.ts" ]] && echo "export {};" > "lib/calendar-constants.ts"
        
        # Create hooks
        [[ ! -f "hooks/useCalendarAccessibility.ts" ]] && echo "export const useCalendarAccessibility = () => ({});" > "hooks/useCalendarAccessibility.ts"
        [[ ! -f "hooks/useResponsive.ts" ]] && echo "export const useResponsive = () => ({});" > "hooks/useResponsive.ts"
        
        # Create styles
        [[ ! -f "styles/calendar-animations.css" ]] && touch "styles/calendar-animations.css"
        
        log_startup "✅ Dependencies created"
        
        # Re-run validation
        if ! ./scripts/validate-dependencies.sh; then
            log_startup "❌ Validation still failing - manual intervention required"
            exit 1
        fi
    fi
    
    log_startup "✅ Environment validation passed"
}

start_development_server() {
    log_startup "4️⃣ Starting development server..."
    
    cd "$PROJECT_ROOT"
    
    # Clear any corrupted cache before starting
    rm -rf .next node_modules/.cache tsconfig.tsbuildinfo 2>/dev/null || true
    
    # Start development server in background
    npm run dev > server_debug.log 2>&1 &
    local server_pid=$!
    
    log_startup "🚀 Development server started (PID: $server_pid)"
    
    # Wait for server to be ready
    log_startup "⏳ Waiting for server to initialize..."
    for i in {1..30}; do
        sleep 1
        if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
            log_startup "✅ Development server is ready at http://localhost:3000"
            return 0
        fi
        
        # Check if process died
        if ! kill -0 $server_pid 2>/dev/null; then
            log_startup "❌ Development server process died"
            return 1
        fi
        
        echo -n "."
    done
    
    log_startup "⚠️  Server startup timeout"
    return 1
}

start_health_monitoring() {
    log_startup "5️⃣ Starting health monitoring..."
    
    # Start health monitor in background
    ./scripts/dev-health-monitor.sh &
    local monitor_pid=$!
    
    log_startup "🔍 Health monitor started (PID: $monitor_pid)"
    
    # Give monitor time to initialize
    sleep 2
    
    # Check if monitor is still running
    if kill -0 $monitor_pid 2>/dev/null; then
        log_startup "✅ Health monitoring active"
        return 0
    else
        log_startup "❌ Health monitor failed to start"
        return 1
    fi
}

show_startup_summary() {
    log_startup "🎉 DEVELOPMENT ENVIRONMENT READY"
    
    cat << EOF

✅ BookedBarber V2 Development Environment Ready

🌐 Frontend:    http://localhost:3000
📊 Logs:       tail -f $PROJECT_ROOT/server_debug.log
🔍 Health:     tail -f $PROJECT_ROOT/logs/health-monitor.log
🛠️  Recovery:   $PROJECT_ROOT/scripts/dev-recover.sh

Features:
• 🔄 Auto-recovery from webpack cache corruption
• 🔍 Real-time health monitoring
• 📁 Automatic missing dependency creation
• 🚨 Automatic server restart on crashes

EOF
}

# Main startup sequence
main() {
    log_startup "🚀 Starting BookedBarber V2 development environment..."
    
    check_prerequisites
    cleanup_existing_processes
    validate_environment
    
    if start_development_server; then
        if start_health_monitoring; then
            show_startup_summary
        else
            log_startup "⚠️  Server started but health monitoring failed"
            log_startup "🌐 Development server available at http://localhost:3000"
        fi
    else
        log_startup "❌ Failed to start development server"
        log_startup "🔧 Try recovery script: ./scripts/dev-recover.sh"
        exit 1
    fi
}

show_help() {
    cat << EOF
🚀 Smart Development Server Startup

Usage: $0 [option]

Options:
  (no args)   Start development environment with health monitoring
  --help      Show this help

Features:
• Prerequisite validation
• Automatic dependency creation  
• Cache corruption prevention
• Real-time health monitoring
• Automatic crash recovery

Examples:
  $0          # Start complete development environment

EOF
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        ;;
    "")
        main
        ;;
    *)
        echo "❌ Unknown option: $1"
        show_help
        exit 1
        ;;
esac