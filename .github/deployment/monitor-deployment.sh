#!/bin/bash

# Deployment Monitoring Script for BookedBarber V2
# Usage: ./monitor-deployment.sh <environment> <duration_seconds> [alert_threshold]

set -euo pipefail

ENVIRONMENT=${1:-staging}
MONITOR_DURATION=${2:-300}  # 5 minutes default
ALERT_THRESHOLD=${3:-5}     # 5 consecutive failures default
NAMESPACE="bookedbarber-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Monitoring state
CONSECUTIVE_FAILURES=0
TOTAL_CHECKS=0
FAILED_CHECKS=0
START_TIME=$(date +%s)
MONITORING_DATA=()

# Get service URLs based on environment
get_service_urls() {
    case $ENVIRONMENT in
        staging)
            FRONTEND_URL="https://staging.bookedbarber.com"
            BACKEND_URL="https://staging-api.bookedbarber.com"
            ;;
        production)
            FRONTEND_URL="https://bookedbarber.com"
            BACKEND_URL="https://api.bookedbarber.com"
            ;;
        *)
            FRONTEND_URL="http://localhost:3000"
            BACKEND_URL="http://localhost:8000"
            ;;
    esac
}

# Check deployment health
check_deployment_health() {
    local timestamp=$(date +%s)
    local check_passed=true
    local issues=()
    
    # Check backend deployment
    local backend_ready=$(kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local backend_desired=$(kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$backend_ready" -ne "$backend_desired" ] || [ "$backend_ready" -eq 0 ]; then
        check_passed=false
        issues+=("Backend deployment unhealthy: $backend_ready/$backend_desired pods ready")
    fi
    
    # Check frontend deployment
    local frontend_ready=$(kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local frontend_desired=$(kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$frontend_ready" -ne "$frontend_desired" ] || [ "$frontend_ready" -eq 0 ]; then
        check_passed=false
        issues+=("Frontend deployment unhealthy: $frontend_ready/$frontend_desired pods ready")
    fi
    
    # Check for failed pods
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running -o name 2>/dev/null | wc -l || echo "0")
    if [ "$failed_pods" -gt 0 ]; then
        check_passed=false
        issues+=("$failed_pods pods in failed state")
    fi
    
    # Check for high restart counts
    local high_restart_pods=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}' 2>/dev/null | awk '$2 > 3 {print $1}' | wc -l || echo "0")
    if [ "$high_restart_pods" -gt 0 ]; then
        check_passed=false
        issues+=("$high_restart_pods pods with high restart counts")
    fi
    
    # Store monitoring data
    local status="healthy"
    if [ "$check_passed" = false ]; then
        status="unhealthy"
    fi
    
    MONITORING_DATA+=("{\"timestamp\": $timestamp, \"status\": \"$status\", \"backend_ready\": $backend_ready, \"frontend_ready\": $frontend_ready, \"issues\": [$(printf '\"%s\",' "${issues[@]}" | sed 's/,$//')], \"check_type\": \"deployment\"}")
    
    if [ "$check_passed" = false ]; then
        error "Deployment health check failed:"
        for issue in "${issues[@]}"; do
            error "  - $issue"
        done
        return 1
    else
        return 0
    fi
}

# Check HTTP endpoints
check_http_endpoints() {
    local timestamp=$(date +%s)
    local check_passed=true
    local issues=()
    local response_times=()
    
    get_service_urls
    
    # Check backend health endpoint
    local backend_start=$(date +%s%3N)
    if curl -f -s --max-time 10 "$BACKEND_URL/health" > /dev/null 2>&1; then
        local backend_end=$(date +%s%3N)
        local backend_time=$((backend_end - backend_start))
        response_times+=("backend:$backend_time")
        
        if [ "$backend_time" -gt 5000 ]; then  # 5 seconds
            issues+=("Backend response time slow: ${backend_time}ms")
        fi
    else
        check_passed=false
        issues+=("Backend health endpoint not responding")
    fi
    
    # Check frontend endpoint
    local frontend_start=$(date +%s%3N)
    if curl -f -s --max-time 10 "$FRONTEND_URL/api/health" > /dev/null 2>&1; then
        local frontend_end=$(date +%s%3N)
        local frontend_time=$((frontend_end - frontend_start))
        response_times+=("frontend:$frontend_time")
        
        if [ "$frontend_time" -gt 5000 ]; then  # 5 seconds
            issues+=("Frontend response time slow: ${frontend_time}ms")
        fi
    else
        # Try main page as fallback
        if curl -f -s --max-time 10 "$FRONTEND_URL" > /dev/null 2>&1; then
            local frontend_end=$(date +%s%3N)
            local frontend_time=$((frontend_end - frontend_start))
            response_times+=("frontend:$frontend_time")
        else
            check_passed=false
            issues+=("Frontend endpoint not responding")
        fi
    fi
    
    # Store monitoring data
    local status="healthy"
    if [ "$check_passed" = false ]; then
        status="unhealthy"
    fi
    
    MONITORING_DATA+=("{\"timestamp\": $timestamp, \"status\": \"$status\", \"response_times\": [$(printf '\"%s\",' "${response_times[@]}" | sed 's/,$//')], \"issues\": [$(printf '\"%s\",' "${issues[@]}" | sed 's/,$//')], \"check_type\": \"http\"}")
    
    if [ "$check_passed" = false ]; then
        error "HTTP endpoint check failed:"
        for issue in "${issues[@]}"; do
            error "  - $issue"
        done
        return 1
    else
        return 0
    fi
}

# Check application metrics
check_application_metrics() {
    local timestamp=$(date +%s)
    local check_passed=true
    local issues=()
    local metrics=()
    
    # Check error rates from logs
    local backend_pods=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend -o jsonpath='{.items[*].metadata.name}')
    local total_error_count=0
    
    for pod in $backend_pods; do
        local error_count=$(kubectl logs "$pod" -n "$NAMESPACE" --tail=100 --since=60s 2>/dev/null | grep -i "error\|exception\|traceback\|failed" | wc -l || echo "0")
        total_error_count=$((total_error_count + error_count))
    done
    
    metrics+=("backend_errors_1m:$total_error_count")
    
    if [ "$total_error_count" -gt 10 ]; then
        check_passed=false
        issues+=("High error rate: $total_error_count errors in last minute")
    fi
    
    # Check resource usage
    local backend_cpu=$(kubectl top pods -n "$NAMESPACE" -l app=bookedbarber-backend --no-headers 2>/dev/null | awk '{sum += $2} END {print sum}' | sed 's/m//' || echo "0")
    local backend_memory=$(kubectl top pods -n "$NAMESPACE" -l app=bookedbarber-backend --no-headers 2>/dev/null | awk '{sum += $3} END {print sum}' | sed 's/Mi//' || echo "0")
    
    metrics+=("backend_cpu:$backend_cpu" "backend_memory:$backend_memory")
    
    if [ "$backend_cpu" -gt 2000 ]; then  # 2 cores
        issues+=("High CPU usage: ${backend_cpu}m")
    fi
    
    if [ "$backend_memory" -gt 2048 ]; then  # 2GB
        issues+=("High memory usage: ${backend_memory}Mi")
    fi
    
    # Store monitoring data
    local status="healthy"
    if [ "$check_passed" = false ]; then
        status="degraded"
    fi
    
    MONITORING_DATA+=("{\"timestamp\": $timestamp, \"status\": \"$status\", \"metrics\": [$(printf '\"%s\",' "${metrics[@]}" | sed 's/,$//')], \"issues\": [$(printf '\"%s\",' "${issues[@]}" | sed 's/,$//')], \"check_type\": \"metrics\"}")
    
    if [ "$check_passed" = false ]; then
        warning "Application metrics check detected issues:"
        for issue in "${issues[@]}"; do
            warning "  - $issue"
        done
        return 1
    else
        return 0
    fi
}

# Perform comprehensive health check
perform_health_check() {
    local overall_passed=true
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    # Run all health checks
    if ! check_deployment_health; then
        overall_passed=false
    fi
    
    if ! check_http_endpoints; then
        overall_passed=false
    fi
    
    if ! check_application_metrics; then
        overall_passed=false
    fi
    
    if [ "$overall_passed" = true ]; then
        success "Health check #$TOTAL_CHECKS passed"
        CONSECUTIVE_FAILURES=0
    else
        error "Health check #$TOTAL_CHECKS failed"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
        
        # Check if we've exceeded the failure threshold
        if [ "$CONSECUTIVE_FAILURES" -ge "$ALERT_THRESHOLD" ]; then
            send_critical_alert
            trigger_rollback
            return 2  # Critical failure
        fi
    fi
    
    return 0
}

# Send critical alert
send_critical_alert() {
    warning "CRITICAL: $CONSECUTIVE_FAILURES consecutive health check failures"
    
    local alert_message=$(cat << EOF
🚨 **CRITICAL DEPLOYMENT ALERT**

**Environment:** $ENVIRONMENT
**Consecutive Failures:** $CONSECUTIVE_FAILURES
**Alert Threshold:** $ALERT_THRESHOLD
**Total Checks:** $TOTAL_CHECKS
**Failed Checks:** $FAILED_CHECKS
**Monitoring Duration:** $MONITOR_DURATION seconds
**Uptime:** $(($(date +%s) - START_TIME)) seconds

**Action Required:** Automatic rollback will be triggered

**Recent Issues:**
$(echo "${MONITORING_DATA[@]}" | jq -r '.[] | select(.status != "healthy") | .issues[]' 2>/dev/null | tail -10 || echo "Unable to parse issues")

**Dashboard:** ${DEPLOYMENT_DASHBOARD_URL:-"Not configured"}
EOF
)
    
    # Send to Slack
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"$alert_message\",
                \"channel\": \"#critical-alerts\",
                \"username\": \"Deployment Monitor\",
                \"icon_emoji\": \":rotating_light:\"
            }" &
    fi
    
    # Send to PagerDuty or similar
    if [ -n "${PAGERDUTY_ROUTING_KEY:-}" ]; then
        curl -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Critical deployment failure in $ENVIRONMENT\",
                    \"source\": \"deployment-monitor\",
                    \"severity\": \"critical\",
                    \"custom_details\": {
                        \"environment\": \"$ENVIRONMENT\",
                        \"consecutive_failures\": $CONSECUTIVE_FAILURES,
                        \"monitoring_duration\": $MONITOR_DURATION
                    }
                }
            }" &
    fi
    
    # Send to email if configured
    if [ -n "${ALERT_EMAIL:-}" ]; then
        echo "$alert_message" | mail -s "CRITICAL: Deployment Failure in $ENVIRONMENT" "$ALERT_EMAIL" &
    fi
}

# Trigger automatic rollback
trigger_rollback() {
    warning "Triggering automatic rollback due to deployment failure"
    
    if [ -f "./rollback.sh" ]; then
        log "Executing automatic rollback..."
        ./rollback.sh "$ENVIRONMENT" &
        local rollback_pid=$!
        
        # Monitor rollback progress
        local rollback_timeout=600  # 10 minutes
        local rollback_start=$(date +%s)
        
        while kill -0 $rollback_pid 2>/dev/null; do
            if [ $(($(date +%s) - rollback_start)) -gt $rollback_timeout ]; then
                error "Rollback process timed out"
                kill $rollback_pid 2>/dev/null || true
                break
            fi
            sleep 10
        done
        
        wait $rollback_pid 2>/dev/null
        local rollback_exit_code=$?
        
        if [ $rollback_exit_code -eq 0 ]; then
            success "Automatic rollback completed successfully"
        else
            error "Automatic rollback failed with exit code: $rollback_exit_code"
        fi
    else
        error "Rollback script not found. Manual intervention required."
    fi
}

# Generate monitoring report
generate_monitoring_report() {
    log "Generating monitoring report..."
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    local success_rate=$(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS ))
    
    local report_file="/tmp/monitoring-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "monitoring_summary": {
    "environment": "$ENVIRONMENT",
    "start_time": "$START_TIME",
    "end_time": "$end_time",
    "duration_seconds": $total_duration,
    "total_checks": $TOTAL_CHECKS,
    "failed_checks": $FAILED_CHECKS,
    "success_rate_percent": $success_rate,
    "consecutive_failures": $CONSECUTIVE_FAILURES,
    "alert_threshold": $ALERT_THRESHOLD
  },
  "monitoring_data": [
    $(printf '%s,\n' "${MONITORING_DATA[@]}" | sed '$s/,$//')
  ]
}
EOF
    
    log "Monitoring report generated: $report_file"
    
    # Upload to monitoring dashboard if configured
    if [ -n "${MONITORING_DASHBOARD_URL:-}" ] && [ -n "${DASHBOARD_TOKEN:-}" ]; then
        curl -X POST "$MONITORING_DASHBOARD_URL/monitoring-reports" \
            -H "Authorization: Bearer $DASHBOARD_TOKEN" \
            -H "Content-Type: application/json" \
            -d @"$report_file" || warning "Failed to upload monitoring report"
    fi
    
    # Display summary
    log "Monitoring Summary:"
    log "  Total Duration: ${total_duration}s"
    log "  Total Checks: $TOTAL_CHECKS"
    log "  Failed Checks: $FAILED_CHECKS"
    log "  Success Rate: ${success_rate}%"
    log "  Final Status: $([ $CONSECUTIVE_FAILURES -eq 0 ] && echo "Healthy" || echo "Unhealthy")"
}

# Main monitoring loop
main() {
    log "Starting deployment monitoring for environment: $ENVIRONMENT"
    log "Monitor duration: ${MONITOR_DURATION}s"
    log "Alert threshold: $ALERT_THRESHOLD consecutive failures"
    
    get_service_urls
    log "Monitoring URLs:"
    log "  Backend: $BACKEND_URL"
    log "  Frontend: $FRONTEND_URL"
    
    local check_interval=30  # Check every 30 seconds
    local checks_needed=$((MONITOR_DURATION / check_interval))
    
    for ((i=1; i<=checks_needed; i++)); do
        log "Health check $i/$checks_needed ($(( (i-1) * check_interval ))s elapsed)"
        
        local check_result=0
        perform_health_check || check_result=$?
        
        if [ $check_result -eq 2 ]; then
            error "Critical failure threshold reached. Monitoring terminated."
            break
        fi
        
        # Sleep unless this is the last iteration
        if [ $i -lt $checks_needed ]; then
            sleep $check_interval
        fi
    done
    
    generate_monitoring_report
    
    if [ $CONSECUTIVE_FAILURES -eq 0 ]; then
        success "Deployment monitoring completed successfully"
        return 0
    else
        error "Deployment monitoring completed with issues"
        return 1
    fi
}

# Signal handlers for graceful shutdown
cleanup() {
    log "Monitoring interrupted. Generating final report..."
    generate_monitoring_report
    exit 130
}

trap cleanup SIGINT SIGTERM

# Run main function
main "$@"