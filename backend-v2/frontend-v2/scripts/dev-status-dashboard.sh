#!/bin/bash

# =============================================================================
# Development Environment Status Dashboard
# Real-time monitoring and health status
# =============================================================================

PROJECT_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

show_header() {
    clear
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                    📊 BookedBarber V2 Development Dashboard${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Last updated: $(date)${NC}"
    echo ""
}

check_server_status() {
    echo -e "${WHITE}🌐 DEVELOPMENT SERVER STATUS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if Next.js process is running
    if pgrep -f "next dev" > /dev/null; then
        local pid=$(pgrep -f "next dev")
        local uptime=$(ps -o etime= -p $pid | tr -d ' ')
        echo -e "Process Status:     ${GREEN}✅ RUNNING${NC} (PID: $pid, Uptime: $uptime)"
    else
        echo -e "Process Status:     ${RED}❌ NOT RUNNING${NC}"
        return 1
    fi
    
    # Check server responsiveness
    if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
        local response_time=$(curl -o /dev/null -s -w '%{time_total}\n' "http://localhost:3000")
        echo -e "HTTP Response:      ${GREEN}✅ RESPONSIVE${NC} (${response_time}s)"
    else
        echo -e "HTTP Response:      ${RED}❌ UNRESPONSIVE${NC}"
        return 1
    fi
    
    # Check port usage
    local port_info=$(lsof -i :3000 2>/dev/null | grep LISTEN | head -1)
    if [[ -n "$port_info" ]]; then
        echo -e "Port 3000:          ${GREEN}✅ IN USE${NC}"
    else
        echo -e "Port 3000:          ${RED}❌ NOT IN USE${NC}"
    fi
    
    # Check recent errors
    if [[ -f "$PROJECT_ROOT/server_debug.log" ]]; then
        local error_count=$(tail -n 100 "$PROJECT_ROOT/server_debug.log" | grep -c -E "(Error|Failed|Cannot find)" 2>/dev/null || echo 0)
        if [[ $error_count -eq 0 ]]; then
            echo -e "Recent Errors:      ${GREEN}✅ NO ERRORS${NC}"
        else
            echo -e "Recent Errors:      ${YELLOW}⚠️  $error_count ERRORS${NC}"
        fi
    else
        echo -e "Server Log:         ${YELLOW}⚠️  NOT FOUND${NC}"
    fi
    
    echo ""
    return 0
}

check_health_monitor_status() {
    echo -e "${WHITE}🔍 HEALTH MONITOR STATUS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [[ -f "$PROJECT_ROOT/health-monitor.pid" ]]; then
        local monitor_pid=$(cat "$PROJECT_ROOT/health-monitor.pid")
        if kill -0 $monitor_pid 2>/dev/null; then
            local uptime=$(ps -o etime= -p $monitor_pid | tr -d ' ')
            echo -e "Monitor Status:     ${GREEN}✅ ACTIVE${NC} (PID: $monitor_pid, Uptime: $uptime)"
            
            # Check monitor log for recent activity
            if [[ -f "$PROJECT_ROOT/logs/health-monitor.log" ]]; then
                local last_activity=$(tail -n 1 "$PROJECT_ROOT/logs/health-monitor.log" | cut -d']' -f1 | tr -d '[')
                echo -e "Last Activity:      ${CYAN}$last_activity${NC}"
                
                local recovery_count=$(grep -c "Auto-recovery completed" "$PROJECT_ROOT/logs/health-monitor.log" 2>/dev/null || echo 0)
                if [[ $recovery_count -eq 0 ]]; then
                    echo -e "Auto-recoveries:    ${GREEN}✅ 0 RECOVERIES${NC}"
                else
                    echo -e "Auto-recoveries:    ${YELLOW}⚠️  $recovery_count RECOVERIES${NC}"
                fi
            fi
        else
            echo -e "Monitor Status:     ${RED}❌ PROCESS DEAD${NC}"
            rm -f "$PROJECT_ROOT/health-monitor.pid"
        fi
    else
        echo -e "Monitor Status:     ${YELLOW}⚠️  NOT RUNNING${NC}"
    fi
    
    echo ""
}

check_cache_health() {
    echo -e "${WHITE}🗃️  CACHE HEALTH${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check .next directory
    if [[ -d "$PROJECT_ROOT/.next" ]]; then
        local next_size=$(du -sh "$PROJECT_ROOT/.next" 2>/dev/null | cut -f1)
        echo -e ".next Directory:    ${GREEN}✅ EXISTS${NC} (Size: $next_size)"
        
        # Check for corrupted webpack cache
        if [[ -d "$PROJECT_ROOT/.next/cache/webpack" ]]; then
            local broken_chunks=$(find "$PROJECT_ROOT/.next/cache/webpack" -name "*.pack.gz" -size 0 2>/dev/null | wc -l)
            if [[ $broken_chunks -eq 0 ]]; then
                echo -e "Webpack Cache:      ${GREEN}✅ HEALTHY${NC}"
            else
                echo -e "Webpack Cache:      ${RED}❌ $broken_chunks CORRUPTED FILES${NC}"
            fi
        else
            echo -e "Webpack Cache:      ${YELLOW}⚠️  NOT FOUND${NC}"
        fi
    else
        echo -e ".next Directory:    ${YELLOW}⚠️  NOT FOUND${NC}"
    fi
    
    # Check TypeScript build info
    if [[ -f "$PROJECT_ROOT/tsconfig.tsbuildinfo" ]]; then
        if [[ -s "$PROJECT_ROOT/tsconfig.tsbuildinfo" ]]; then
            echo -e "TS Build Info:      ${GREEN}✅ HEALTHY${NC}"
        else
            echo -e "TS Build Info:      ${RED}❌ EMPTY/CORRUPTED${NC}"
        fi
    else
        echo -e "TS Build Info:      ${YELLOW}⚠️  NOT FOUND${NC}"
    fi
    
    # Check node_modules cache
    if [[ -d "$PROJECT_ROOT/node_modules/.cache" ]]; then
        local cache_size=$(du -sh "$PROJECT_ROOT/node_modules/.cache" 2>/dev/null | cut -f1)
        echo -e "Node Modules Cache: ${GREEN}✅ EXISTS${NC} (Size: $cache_size)"
    else
        echo -e "Node Modules Cache: ${YELLOW}⚠️  NOT FOUND${NC}"
    fi
    
    echo ""
}

check_dependency_health() {
    echo -e "${WHITE}📦 DEPENDENCY HEALTH${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check critical directories
    local critical_dirs=("components/ui" "lib" "hooks" "app" "styles")
    for dir in "${critical_dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            local file_count=$(find "$PROJECT_ROOT/$dir" -type f | wc -l)
            echo -e "$dir/:$(printf "%*s" $((15-${#dir})) "") ${GREEN}✅ EXISTS${NC} ($file_count files)"
        else
            echo -e "$dir/:$(printf "%*s" $((15-${#dir})) "") ${RED}❌ MISSING${NC}"
        fi
    done
    
    # Check for common missing files
    local common_files=(
        "lib/touch-utils.ts"
        "lib/appointment-conflicts.ts" 
        "lib/calendar-constants.ts"
        "hooks/useCalendarAccessibility.ts"
        "hooks/useResponsive.ts"
    )
    
    local missing_count=0
    for file in "${common_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            ((missing_count++))
        fi
    done
    
    if [[ $missing_count -eq 0 ]]; then
        echo -e "Common Files:       ${GREEN}✅ ALL PRESENT${NC}"
    else
        echo -e "Common Files:       ${YELLOW}⚠️  $missing_count MISSING${NC}"
    fi
    
    echo ""
}

check_performance_metrics() {
    echo -e "${WHITE}⚡ PERFORMANCE METRICS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Memory usage of Next.js process
    if pgrep -f "next dev" > /dev/null; then
        local pid=$(pgrep -f "next dev")
        local memory=$(ps -o rss= -p $pid 2>/dev/null | tr -d ' ')
        if [[ -n "$memory" ]]; then
            local memory_mb=$((memory / 1024))
            if [[ $memory_mb -lt 500 ]]; then
                echo -e "Memory Usage:       ${GREEN}✅ ${memory_mb}MB${NC}"
            elif [[ $memory_mb -lt 1000 ]]; then
                echo -e "Memory Usage:       ${YELLOW}⚠️  ${memory_mb}MB${NC}"
            else
                echo -e "Memory Usage:       ${RED}❌ ${memory_mb}MB (HIGH)${NC}"
            fi
        fi
    fi
    
    # CPU usage (approximate)
    if pgrep -f "next dev" > /dev/null; then
        local pid=$(pgrep -f "next dev")
        local cpu=$(ps -o pcpu= -p $pid 2>/dev/null | tr -d ' ' | cut -d. -f1)
        if [[ -n "$cpu" && "$cpu" =~ ^[0-9]+$ ]]; then
            if [[ $cpu -lt 30 ]]; then
                echo -e "CPU Usage:          ${GREEN}✅ ${cpu}%${NC}"
            elif [[ $cpu -lt 60 ]]; then
                echo -e "CPU Usage:          ${YELLOW}⚠️  ${cpu}%${NC}"
            else
                echo -e "CPU Usage:          ${RED}❌ ${cpu}% (HIGH)${NC}"
            fi
        fi
    fi
    
    # Disk space
    local available_space=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    local available_gb=$((available_space / 1024 / 1024))
    if [[ $available_gb -gt 5 ]]; then
        echo -e "Disk Space:         ${GREEN}✅ ${available_gb}GB AVAILABLE${NC}"
    elif [[ $available_gb -gt 1 ]]; then
        echo -e "Disk Space:         ${YELLOW}⚠️  ${available_gb}GB AVAILABLE${NC}"
    else
        echo -e "Disk Space:         ${RED}❌ ${available_gb}GB AVAILABLE (LOW)${NC}"
    fi
    
    echo ""
}

show_recent_logs() {
    echo -e "${WHITE}📋 RECENT ACTIVITY${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Show recent server log entries
    if [[ -f "$PROJECT_ROOT/server_debug.log" ]]; then
        echo -e "${CYAN}Last 5 server log entries:${NC}"
        tail -n 5 "$PROJECT_ROOT/server_debug.log" | while read -r line; do
            if [[ "$line" == *"Error"* ]] || [[ "$line" == *"Failed"* ]]; then
                echo -e "  ${RED}$line${NC}"
            elif [[ "$line" == *"GET"* ]] && [[ "$line" == *"200"* ]]; then
                echo -e "  ${GREEN}$line${NC}"
            else
                echo -e "  ${WHITE}$line${NC}"
            fi
        done
    fi
    
    echo ""
    
    # Show recent health monitor activity
    if [[ -f "$PROJECT_ROOT/logs/health-monitor.log" ]]; then
        echo -e "${CYAN}Last 3 health monitor entries:${NC}"
        tail -n 3 "$PROJECT_ROOT/logs/health-monitor.log" | while read -r line; do
            if [[ "$line" == *"CORRUPTION DETECTED"* ]] || [[ "$line" == *"Auto-recovery"* ]]; then
                echo -e "  ${YELLOW}$line${NC}"
            else
                echo -e "  ${WHITE}$line${NC}"
            fi
        done
    fi
    
    echo ""
}

show_quick_actions() {
    echo -e "${WHITE}🛠️  QUICK ACTIONS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}npm run dev:recover${NC}        - Emergency server recovery"
    echo -e "${CYAN}npm run dev:recover:nuclear${NC} - Nuclear recovery (clears npm cache)"
    echo -e "${CYAN}npm run dev:validate${NC}       - Validate dependencies"
    echo -e "${CYAN}npm run health:monitor${NC}     - Start health monitoring"
    echo -e "${CYAN}npm run dev:smart${NC}          - Smart startup with validation"
    echo ""
}

# Main dashboard function
main() {
    local watch_mode="${1:-}"
    
    if [[ "$watch_mode" == "--watch" ]]; then
        # Continuous monitoring mode
        while true; do
            show_header
            check_server_status
            check_health_monitor_status
            check_cache_health
            check_dependency_health
            check_performance_metrics
            show_recent_logs
            show_quick_actions
            
            echo -e "${PURPLE}Press Ctrl+C to exit watch mode${NC}"
            sleep 10
        done
    else
        # One-time status check
        show_header
        check_server_status
        check_health_monitor_status
        check_cache_health
        check_dependency_health
        check_performance_metrics
        show_recent_logs
        show_quick_actions
    fi
}

show_help() {
    cat << EOF
📊 Development Status Dashboard

Usage: $0 [option]

Options:
  (no args)   Show current status
  --watch     Continuous monitoring (updates every 10s)
  --help      Show this help

Examples:
  $0              # Show current development environment status  
  $0 --watch      # Continuous monitoring mode

EOF
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        ;;
    --watch)
        main --watch
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