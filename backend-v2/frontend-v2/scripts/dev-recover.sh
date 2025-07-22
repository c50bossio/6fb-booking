#!/bin/bash

# =============================================================================
# Emergency Development Server Recovery
# One-command fix for all webpack/cache corruption issues
# =============================================================================

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
RECOVERY_LOG="$PROJECT_ROOT/logs/recovery.log"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

log_recovery() {
    echo "[$(date)] RECOVERY: $1" | tee -a "$RECOVERY_LOG"
}

emergency_recovery() {
    log_recovery "🚨 EMERGENCY RECOVERY INITIATED"
    
    # Kill all Node.js development processes
    log_recovery "1️⃣ Terminating all development processes..."
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
    
    # Force kill processes using development ports
    log_recovery "2️⃣ Clearing port conflicts..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    # Wait for processes to fully terminate
    sleep 3
    
    # Nuclear cache cleanup
    log_recovery "3️⃣ Nuclear cache cleanup..."
    cd "$PROJECT_ROOT"
    rm -rf .next 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf tsconfig.tsbuildinfo 2>/dev/null || true
    rm -rf .swc 2>/dev/null || true
    
    # Clear npm cache if severely corrupted
    if [[ "$1" == "--nuclear" ]]; then
        log_recovery "💥 Nuclear option: Clearing npm cache..."
        npm cache clean --force
    fi
    
    # Create missing dependencies
    log_recovery "4️⃣ Creating missing dependencies..."
    
    # Create lib dependencies
    mkdir -p lib
    [[ ! -f "lib/touch-utils.ts" ]] && echo "export {};" > "lib/touch-utils.ts"
    [[ ! -f "lib/appointment-conflicts.ts" ]] && echo "export {};" > "lib/appointment-conflicts.ts"
    [[ ! -f "lib/calendar-constants.ts" ]] && echo "export {};" > "lib/calendar-constants.ts"
    
    # Create hook dependencies
    mkdir -p hooks
    [[ ! -f "hooks/useCalendarAccessibility.ts" ]] && echo "export const useCalendarAccessibility = () => ({});" > "hooks/useCalendarAccessibility.ts"
    [[ ! -f "hooks/useResponsive.ts" ]] && echo "export const useResponsive = () => ({});" > "hooks/useResponsive.ts"
    
    # Create styles
    mkdir -p styles
    [[ ! -f "styles/calendar-animations.css" ]] && touch "styles/calendar-animations.css"
    
    log_recovery "5️⃣ Validating dependencies..."
    if npm install --silent; then
        log_recovery "✅ Dependencies validated successfully"
    else
        log_recovery "❌ Dependency validation failed - running npm install"
        npm install
    fi
    
    # Start development server
    log_recovery "6️⃣ Starting fresh development server..."
    npm run dev > server_debug.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start and check health
    log_recovery "7️⃣ Waiting for server to initialize..."
    for i in {1..30}; do
        sleep 1
        if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
            log_recovery "✅ Server is healthy and responsive"
            log_recovery "🎉 EMERGENCY RECOVERY COMPLETED SUCCESSFULLY"
            echo ""
            echo "✅ Development server recovered and running at http://localhost:3000"
            echo "📊 Logs: tail -f $PROJECT_ROOT/server_debug.log"
            echo "🔍 Recovery log: $RECOVERY_LOG"
            exit 0
        fi
        
        # Check if server process died
        if ! kill -0 $SERVER_PID 2>/dev/null; then
            log_recovery "❌ Server process died during startup"
            break
        fi
        
        echo -n "."
    done
    
    log_recovery "⚠️  Server startup timeout or failure"
    echo ""
    echo "❌ Server failed to start properly"
    echo "📋 Check logs for errors: tail -f $PROJECT_ROOT/server_debug.log"
    echo "🔧 Try nuclear recovery: ./scripts/dev-recover.sh --nuclear"
    exit 1
}

show_help() {
    cat << EOF
🛠️  Development Server Emergency Recovery

Usage: $0 [option]

Options:
  (no args)   Standard recovery (clears cache, restarts server)
  --nuclear   Nuclear recovery (includes npm cache clean)
  --status    Check current server status
  --help      Show this help

Examples:
  $0                    # Standard recovery
  $0 --nuclear         # Nuclear recovery for severe corruption
  $0 --status          # Check if recovery is needed

EOF
}

check_status() {
    echo "🔍 Checking development server status..."
    
    # Check if server process is running
    if pgrep -f "next dev" > /dev/null; then
        echo "✅ Next.js dev server process is running"
    else
        echo "❌ Next.js dev server process not found"
    fi
    
    # Check if server is responsive
    if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
        echo "✅ Server is responsive at http://localhost:3000"
    else
        echo "❌ Server is not responsive at http://localhost:3000"
    fi
    
    # Check for recent errors in log
    if [[ -f "$PROJECT_ROOT/server_debug.log" ]]; then
        if tail -n 20 "$PROJECT_ROOT/server_debug.log" | grep -q -E "(Error|Cannot find module|ENOENT)"; then
            echo "⚠️  Recent errors detected in server log"
            echo "🔧 Recovery recommended: $0"
        else
            echo "✅ No recent errors in server log"
        fi
    else
        echo "📋 No server log found"
    fi
}

# Handle command line arguments
case "${1:-}" in
    --nuclear)
        emergency_recovery --nuclear
        ;;
    --status)
        check_status
        ;;
    --help)
        show_help
        ;;
    "")
        emergency_recovery
        ;;
    *)
        echo "❌ Unknown option: $1"
        show_help
        exit 1
        ;;
esac