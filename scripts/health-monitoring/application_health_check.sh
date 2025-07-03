#!/bin/bash

# Comprehensive Application Health Check for BookedBarber V2
# Monitors all critical components and reports health status

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/bookedbarber/health-monitoring"
HEALTH_STATUS_FILE="/tmp/bookedbarber-health-status.json"
METRICS_FILE="/tmp/bookedbarber-health-metrics.prom"

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
DATABASE_URL="${DATABASE_URL:-}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

mkdir -p "$LOG_DIR"

exec 1> >(tee -a "$LOG_DIR/health-check.log")
exec 2> >(tee -a "$LOG_DIR/health-check-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Initialize health status
init_health_status() {
    cat > "$HEALTH_STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "overall_status": "unknown",
    "components": {}
}
EOF
}

# Update component status
update_component_status() {
    local component="$1"
    local status="$2"
    local message="$3"
    local response_time="${4:-0}"
    
    # Use jq to update the JSON file
    jq --arg comp "$component" --arg stat "$status" --arg msg "$message" --arg rt "$response_time" \
        '.components[$comp] = {
            "status": $stat,
            "message": $msg,
            "response_time_ms": ($rt | tonumber),
            "last_check": now | strftime("%Y-%m-%dT%H:%M:%SZ")
        }' "$HEALTH_STATUS_FILE" > "${HEALTH_STATUS_FILE}.tmp" && mv "${HEALTH_STATUS_FILE}.tmp" "$HEALTH_STATUS_FILE"
}

# Check API health
check_api_health() {
    log "Checking API health..."
    
    local start_time=$(date +%s%3N)
    local status="unknown"
    local message=""
    
    if response=$(curl -s -f --max-time 10 "$API_BASE_URL/health" 2>&1); then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        if echo "$response" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
            status="healthy"
            message="API is responding normally"
        else
            status="degraded"
            message="API responding but health check indicates issues"
        fi
        
        update_component_status "api" "$status" "$message" "$response_time"
    else
        status="unhealthy"
        message="API not responding or returning errors: $response"
        update_component_status "api" "$status" "$message" "0"
    fi
    
    log "API health: $status - $message"
}

# Check frontend health
check_frontend_health() {
    log "Checking frontend health..."
    
    local start_time=$(date +%s%3N)
    local status="unknown"
    local message=""
    
    if curl -s -f --max-time 10 "$FRONTEND_URL" > /dev/null 2>&1; then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        status="healthy"
        message="Frontend is accessible"
        update_component_status "frontend" "$status" "$message" "$response_time"
    else
        status="unhealthy"
        message="Frontend not accessible"
        update_component_status "frontend" "$status" "$message" "0"
    fi
    
    log "Frontend health: $status - $message"
}

# Check database health
check_database_health() {
    log "Checking database health..."
    
    if [ -z "$DATABASE_URL" ]; then
        update_component_status "database" "unknown" "DATABASE_URL not configured" "0"
        return
    fi
    
    local start_time=$(date +%s%3N)
    local status="unknown"
    local message=""
    
    # Parse database URL
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        local db_user="${BASH_REMATCH[1]}"
        local db_pass="${BASH_REMATCH[2]}"
        local db_host="${BASH_REMATCH[3]}"
        local db_port="${BASH_REMATCH[4]}"
        local db_name="${BASH_REMATCH[5]}"
        
        export PGPASSWORD="$db_pass"
        
        if result=$(psql --host="$db_host" --port="$db_port" --username="$db_user" --dbname="$db_name" \
            --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
            --tuples-only --quiet 2>&1); then
            
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            local table_count=$(echo "$result" | xargs)
            
            if [ "$table_count" -gt 5 ]; then
                status="healthy"
                message="Database is accessible with $table_count tables"
            else
                status="degraded"
                message="Database accessible but table count is low: $table_count"
            fi
            
            update_component_status "database" "$status" "$message" "$response_time"
        else
            status="unhealthy"
            message="Database connection failed: $result"
            update_component_status "database" "$status" "$message" "0"
        fi
    else
        status="unhealthy"
        message="Invalid DATABASE_URL format"
        update_component_status "database" "$status" "$message" "0"
    fi
    
    log "Database health: $status - $message"
}

# Check Redis health
check_redis_health() {
    log "Checking Redis health..."
    
    local start_time=$(date +%s%3N)
    local status="unknown"
    local message=""
    
    if command -v redis-cli &> /dev/null; then
        if result=$(redis-cli -u "$REDIS_URL" ping 2>&1); then
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            
            if [ "$result" = "PONG" ]; then
                status="healthy"
                message="Redis is responding to ping"
            else
                status="degraded"
                message="Redis responding but ping returned: $result"
            fi
            
            update_component_status "redis" "$status" "$message" "$response_time"
        else
            status="unhealthy"
            message="Redis connection failed: $result"
            update_component_status "redis" "$status" "$message" "0"
        fi
    else
        status="unknown"
        message="redis-cli not available for testing"
        update_component_status "redis" "$status" "$message" "0"
    fi
    
    log "Redis health: $status - $message"
}

# Check external services
check_external_services() {
    log "Checking external services..."
    
    # Check Stripe API
    if curl -s -f --max-time 10 "https://api.stripe.com/v1/account" \
        -H "Authorization: Bearer ${STRIPE_SECRET_KEY:-dummy}" > /dev/null 2>&1; then
        update_component_status "stripe" "healthy" "Stripe API accessible" "0"
    else
        update_component_status "stripe" "unknown" "Stripe API check skipped (no key)" "0"
    fi
    
    # Check SendGrid API
    if [ -n "${SENDGRID_API_KEY:-}" ]; then
        if curl -s -f --max-time 10 "https://api.sendgrid.com/v3/user/profile" \
            -H "Authorization: Bearer $SENDGRID_API_KEY" > /dev/null 2>&1; then
            update_component_status "sendgrid" "healthy" "SendGrid API accessible" "0"
        else
            update_component_status "sendgrid" "degraded" "SendGrid API not responding" "0"
        fi
    else
        update_component_status "sendgrid" "unknown" "SendGrid API key not configured" "0"
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local status="healthy"
    local message="Disk usage: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 90 ]; then
        status="unhealthy"
        message="Critical: Disk usage at ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        status="degraded"
        message="Warning: Disk usage at ${disk_usage}%"
    fi
    
    update_component_status "disk_space" "$status" "$message" "0"
    log "Disk space: $status - $message"
}

# Check memory usage
check_memory_usage() {
    log "Checking memory usage..."
    
    local memory_info=$(free | grep '^Mem:')
    local total=$(echo "$memory_info" | awk '{print $2}')
    local used=$(echo "$memory_info" | awk '{print $3}')
    local usage_percent=$((used * 100 / total))
    
    local status="healthy"
    local message="Memory usage: ${usage_percent}%"
    
    if [ "$usage_percent" -gt 95 ]; then
        status="unhealthy"
        message="Critical: Memory usage at ${usage_percent}%"
    elif [ "$usage_percent" -gt 85 ]; then
        status="degraded"
        message="Warning: Memory usage at ${usage_percent}%"
    fi
    
    update_component_status "memory" "$status" "$message" "0"
    log "Memory: $status - $message"
}

# Generate Prometheus metrics
generate_prometheus_metrics() {
    log "Generating Prometheus metrics..."
    
    cat > "$METRICS_FILE" << EOF
# HELP bookedbarber_health_status Health status of BookedBarber components (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE bookedbarber_health_status gauge
EOF
    
    # Parse health status and generate metrics
    jq -r '.components | to_entries[] | 
        "bookedbarber_health_status{component=\"" + .key + "\"} " + 
        (if .value.status == "healthy" then "1"
         elif .value.status == "degraded" then "0.5"
         else "0" end)' "$HEALTH_STATUS_FILE" >> "$METRICS_FILE"
    
    cat >> "$METRICS_FILE" << EOF

# HELP bookedbarber_health_response_time Response time for health checks in milliseconds
# TYPE bookedbarber_health_response_time gauge
EOF
    
    jq -r '.components | to_entries[] | 
        "bookedbarber_health_response_time{component=\"" + .key + "\"} " + 
        (.value.response_time_ms | tostring)' "$HEALTH_STATUS_FILE" >> "$METRICS_FILE"
    
    log "Prometheus metrics generated: $METRICS_FILE"
}

# Determine overall health status
determine_overall_status() {
    local critical_components=("api" "database")
    local overall_status="healthy"
    
    for component in "${critical_components[@]}"; do
        local comp_status=$(jq -r ".components.$component.status // \"unknown\"" "$HEALTH_STATUS_FILE")
        
        if [ "$comp_status" = "unhealthy" ]; then
            overall_status="unhealthy"
            break
        elif [ "$comp_status" = "degraded" ] && [ "$overall_status" = "healthy" ]; then
            overall_status="degraded"
        fi
    done
    
    # Update overall status
    jq --arg status "$overall_status" '.overall_status = $status' "$HEALTH_STATUS_FILE" > "${HEALTH_STATUS_FILE}.tmp" && mv "${HEALTH_STATUS_FILE}.tmp" "$HEALTH_STATUS_FILE"
    
    log "Overall health status: $overall_status"
}

# Send health report
send_health_report() {
    local overall_status=$(jq -r '.overall_status' "$HEALTH_STATUS_FILE")
    
    if [ "$overall_status" = "unhealthy" ]; then
        log "Sending critical health alert..."
        # This would integrate with your alerting system
        # For now, just log the critical status
        echo "CRITICAL: BookedBarber health status is UNHEALTHY" | \
            logger -t bookedbarber-health -p daemon.crit
    fi
}

# Main health check function
main() {
    log "Starting comprehensive health check..."
    
    init_health_status
    
    # Run all health checks
    check_api_health
    check_frontend_health
    check_database_health
    check_redis_health
    check_external_services
    check_disk_space
    check_memory_usage
    
    # Determine overall status
    determine_overall_status
    
    # Generate metrics
    generate_prometheus_metrics
    
    # Send alerts if needed
    send_health_report
    
    log "Health check completed"
    
    # Output summary
    echo "Health Check Summary:"
    jq -r '.components | to_entries[] | "  " + .key + ": " + .value.status + " - " + .value.message' "$HEALTH_STATUS_FILE"
    echo "Overall Status: $(jq -r '.overall_status' "$HEALTH_STATUS_FILE")"
}

# Run main function
main "$@"