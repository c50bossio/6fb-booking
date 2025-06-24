#!/bin/bash

# =============================================================================
# 6FB Booking Platform - Health Monitoring Script
# =============================================================================
# Continuous health monitoring with alerting and auto-recovery

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/health-monitor-$(date +%Y%m%d).log"
PID_FILE="$PROJECT_ROOT/health-monitor.pid"

# Monitoring configuration
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # seconds
ALERT_THRESHOLD="${ALERT_THRESHOLD:-3}"  # failed checks before alert
AUTO_RECOVERY="${AUTO_RECOVERY:-true}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"
EMAIL_ALERTS="${EMAIL_ALERTS:-}"

# Service endpoints
BACKEND_URL="${BACKEND_URL:-http://localhost/api/v1/health}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost/api/health}"
NGINX_URL="${NGINX_URL:-http://localhost/health}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Global variables
FAILED_CHECKS=0
LAST_ALERT_TIME=0
ALERT_COOLDOWN=3600  # 1 hour

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Shutting down health monitor..."
    rm -f "$PID_FILE"
    exit 0
}

# =============================================================================
# NOTIFICATION FUNCTIONS
# =============================================================================

send_webhook_notification() {
    local message="$1"
    local severity="${2:-warning}"
    
    if [[ -n "$NOTIFICATION_WEBHOOK" ]]; then
        local payload=$(cat <<EOF
{
    "text": "6FB Booking Platform Alert",
    "blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Severity:* $severity\n*Message:* $message\n*Time:* $(date '+%Y-%m-%d %H:%M:%S')"
            }
        }
    ]
}
EOF
        )
        
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$NOTIFICATION_WEBHOOK" > /dev/null || true
    fi
}

send_email_alert() {
    local subject="$1"
    local message="$2"
    
    if [[ -n "$EMAIL_ALERTS" ]] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$EMAIL_ALERTS" || true
    fi
}

send_alert() {
    local message="$1"
    local severity="${2:-warning}"
    
    local current_time=$(date +%s)
    
    # Check if we're in alert cooldown
    if [[ $((current_time - LAST_ALERT_TIME)) -lt $ALERT_COOLDOWN ]]; then
        log_info "Alert cooldown active, skipping notification"
        return
    fi
    
    log_warning "Sending alert: $message"
    
    # Send webhook notification
    send_webhook_notification "$message" "$severity"
    
    # Send email alert
    send_email_alert "6FB Platform Alert - $severity" "$message"
    
    LAST_ALERT_TIME=$current_time
}

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

check_http_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    local status_code
    local response_time
    
    # Measure response time
    local start_time=$(date +%s%N)
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    
    response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "$name is healthy (${status_code}, ${response_time}ms)"
        return 0
    else
        log_error "$name is unhealthy (status: $status_code, timeout: ${timeout}s)"
        return 1
    fi
}

check_docker_containers() {
    local containers=(
        "6fb-backend"
        "6fb-frontend"
        "6fb-nginx"
        "6fb-postgres"
        "6fb-redis"
    )
    
    local failed_containers=()
    
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            failed_containers+=("$container (not running)")
            continue
        fi
        
        local health_status
        health_status=$(docker inspect --format="{{.State.Health.Status}}" "$container" 2>/dev/null || echo "none")
        
        if [[ "$health_status" == "unhealthy" ]]; then
            failed_containers+=("$container (unhealthy)")
        elif [[ "$health_status" == "none" ]]; then
            # No health check defined, check if running
            local container_status
            container_status=$(docker inspect --format="{{.State.Status}}" "$container" 2>/dev/null || echo "unknown")
            if [[ "$container_status" != "running" ]]; then
                failed_containers+=("$container (not running)")
            fi
        fi
    done
    
    if [[ ${#failed_containers[@]} -eq 0 ]]; then
        log_success "All containers are healthy"
        return 0
    else
        log_error "Failed containers: ${failed_containers[*]}"
        return 1
    fi
}

check_disk_space() {
    local usage
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $usage -gt 90 ]]; then
        log_error "Disk usage critical: ${usage}%"
        return 1
    elif [[ $usage -gt 80 ]]; then
        log_warning "Disk usage high: ${usage}%"
    else
        log_success "Disk usage normal: ${usage}%"
    fi
    
    return 0
}

check_memory_usage() {
    local usage
    usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [[ $usage -gt 90 ]]; then
        log_error "Memory usage critical: ${usage}%"
        return 1
    elif [[ $usage -gt 80 ]]; then
        log_warning "Memory usage high: ${usage}%"
    else
        log_success "Memory usage normal: ${usage}%"
    fi
    
    return 0
}

check_database_connection() {
    # Check if backend can connect to database
    local db_check_url="${BACKEND_URL/health/health/database}"
    
    if check_http_endpoint "Database Connection" "$db_check_url" "200" 30; then
        return 0
    else
        log_error "Database connection check failed"
        return 1
    fi
}

perform_health_checks() {
    log_info "Performing health checks..."
    
    local checks_failed=0
    
    # Check HTTP endpoints
    if ! check_http_endpoint "Backend API" "$BACKEND_URL"; then
        ((checks_failed++))
    fi
    
    if ! check_http_endpoint "Frontend" "$FRONTEND_URL"; then
        ((checks_failed++))
    fi
    
    if ! check_http_endpoint "Nginx" "$NGINX_URL"; then
        ((checks_failed++))
    fi
    
    # Check Docker containers
    if ! check_docker_containers; then
        ((checks_failed++))
    fi
    
    # Check system resources
    if ! check_disk_space; then
        ((checks_failed++))
    fi
    
    if ! check_memory_usage; then
        ((checks_failed++))
    fi
    
    # Check database connection
    if ! check_database_connection; then
        ((checks_failed++))
    fi
    
    return $checks_failed
}

# =============================================================================
# RECOVERY FUNCTIONS
# =============================================================================

attempt_auto_recovery() {
    log_warning "Attempting automatic recovery..."
    
    # Try to restart unhealthy containers
    local containers=(
        "6fb-backend"
        "6fb-frontend"
        "6fb-nginx"
    )
    
    for container in "${containers[@]}"; do
        local container_status
        container_status=$(docker inspect --format="{{.State.Status}}" "$container" 2>/dev/null || echo "not_found")
        
        if [[ "$container_status" != "running" ]]; then
            log_info "Restarting container: $container"
            docker restart "$container" || {
                log_error "Failed to restart $container"
                continue
            }
            
            # Wait for container to be ready
            sleep 10
        fi
    done
    
    # Wait for services to stabilize
    log_info "Waiting for services to stabilize..."
    sleep 30
    
    # Perform health check to verify recovery
    if perform_health_checks; then
        log_success "Auto-recovery successful"
        send_alert "Auto-recovery successful after health check failures" "info"
        return 0
    else
        log_error "Auto-recovery failed"
        return 1
    fi
}

# =============================================================================
# MONITORING LOOP
# =============================================================================

monitor_loop() {
    log_info "Starting health monitoring loop (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        local checks_result
        perform_health_checks
        checks_result=$?
        
        if [[ $checks_result -eq 0 ]]; then
            # All checks passed
            if [[ $FAILED_CHECKS -gt 0 ]]; then
                log_success "Health checks recovered after $FAILED_CHECKS failed attempts"
                send_alert "System health recovered" "info"
            fi
            FAILED_CHECKS=0
        else
            # Some checks failed
            ((FAILED_CHECKS++))
            log_warning "Health check failed ($FAILED_CHECKS/$ALERT_THRESHOLD)"
            
            if [[ $FAILED_CHECKS -ge $ALERT_THRESHOLD ]]; then
                local alert_message="Health checks failing: $FAILED_CHECKS consecutive failures detected"
                send_alert "$alert_message" "critical"
                
                # Attempt auto-recovery if enabled
                if [[ "$AUTO_RECOVERY" == "true" ]]; then
                    if attempt_auto_recovery; then
                        FAILED_CHECKS=0
                    else
                        send_alert "Auto-recovery failed - manual intervention required" "critical"
                    fi
                fi
            fi
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    local action="${1:-start}"
    
    case "$action" in
        start)
            # Check if already running
            if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                log_warning "Health monitor is already running (PID: $(cat "$PID_FILE"))"
                exit 1
            fi
            
            # Create logs directory
            mkdir -p "$PROJECT_ROOT/logs"
            
            # Save PID
            echo $$ > "$PID_FILE"
            
            # Set up signal handlers
            trap cleanup SIGTERM SIGINT EXIT
            
            log_info "Starting 6FB Booking Platform Health Monitor"
            log_info "PID: $$, Log: $LOG_FILE"
            
            # Start monitoring
            monitor_loop
            ;;
            
        stop)
            if [[ -f "$PID_FILE" ]]; then
                local pid
                pid=$(cat "$PID_FILE")
                log_info "Stopping health monitor (PID: $pid)"
                kill "$pid" 2>/dev/null || true
                rm -f "$PID_FILE"
                log_success "Health monitor stopped"
            else
                log_warning "Health monitor is not running"
            fi
            ;;
            
        status)
            if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                log_info "Health monitor is running (PID: $(cat "$PID_FILE"))"
                exit 0
            else
                log_info "Health monitor is not running"
                exit 1
            fi
            ;;
            
        check)
            log_info "Performing one-time health check..."
            perform_health_checks
            ;;
            
        *)
            echo "Usage: $0 {start|stop|status|check}"
            exit 1
            ;;
    esac
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi