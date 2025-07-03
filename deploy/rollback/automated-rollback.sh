#!/bin/bash

# Automated Rollback Script
# Monitors deployment health and triggers rollback if issues are detected

set -e

# Configuration
ENVIRONMENT=${1:-production}
NAMESPACE=${ENVIRONMENT}
MONITORING_DURATION=${MONITORING_DURATION:-300}  # 5 minutes
CHECK_INTERVAL=${CHECK_INTERVAL:-30}             # 30 seconds
ERROR_THRESHOLD=${ERROR_THRESHOLD:-0.05}         # 5% error rate
LATENCY_THRESHOLD=${LATENCY_THRESHOLD:-1000}     # 1000ms
AVAILABILITY_THRESHOLD=${AVAILABILITY_THRESHOLD:-0.99}  # 99%

# URLs
if [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://bookedbarber.com"
    API_URL="https://api.bookedbarber.com"
    PROMETHEUS_URL="http://prometheus.monitoring:9090"
elif [ "$ENVIRONMENT" = "staging" ]; then
    BASE_URL="https://staging.bookedbarber.com"
    API_URL="https://api-staging.bookedbarber.com"
    PROMETHEUS_URL="http://prometheus.monitoring:9090"
else
    echo "Unsupported environment: $ENVIRONMENT"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health monitoring variables
CONSECUTIVE_FAILURES=0
MAX_CONSECUTIVE_FAILURES=3
ROLLBACK_TRIGGERED=false

# Get metrics from Prometheus
get_prometheus_metric() {
    local query="$1"
    local encoded_query=$(echo "$query" | sed 's/ /%20/g' | sed 's/=/%3D/g' | sed 's/{/%7B/g' | sed 's/}/%7D/g')
    
    local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$encoded_query" | \
                   jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
    
    echo "$result"
}

# Check error rate
check_error_rate() {
    local query='sum(rate(http_requests_total{code=~"5.."}[2m])) / sum(rate(http_requests_total[2m]))'
    local error_rate=$(get_prometheus_metric "$query")
    
    if [ "$error_rate" = "0" ]; then
        return 0  # No data or no errors
    fi
    
    # Compare using awk for floating point comparison
    if awk "BEGIN {exit !($error_rate > $ERROR_THRESHOLD)}"; then
        warning "Error rate too high: $(echo "$error_rate * 100" | bc -l | cut -d. -f1)%"
        return 1
    fi
    
    return 0
}

# Check response time
check_response_time() {
    local query='histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[2m])) by (le)) * 1000'
    local latency=$(get_prometheus_metric "$query")
    
    if [ "$latency" = "0" ]; then
        return 0  # No data
    fi
    
    # Compare latency threshold
    if awk "BEGIN {exit !($latency > $LATENCY_THRESHOLD)}"; then
        warning "Response time too high: ${latency}ms"
        return 1
    fi
    
    return 0
}

# Check availability
check_availability() {
    local start_time=$(date +%s)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/health" || echo "000")
    local end_time=$(date +%s)
    local response_time=$((end_time - start_time))
    
    if [ "$response_code" != "200" ]; then
        warning "Health check failed: HTTP $response_code"
        return 1
    fi
    
    if [ $response_time -gt 10 ]; then
        warning "Health check timeout: ${response_time}s"
        return 1
    fi
    
    return 0
}

# Check database connectivity
check_database() {
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/health/db" || echo "000")
    
    if [ "$response_code" != "200" ]; then
        warning "Database health check failed: HTTP $response_code"
        return 1
    fi
    
    return 0
}

# Check critical business functionality
check_business_functionality() {
    # Check if we can fetch services (basic functionality test)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/api/v1/services" || echo "000")
    
    if [ "$response_code" != "200" ]; then
        warning "Services endpoint failed: HTTP $response_code"
        return 1
    fi
    
    return 0
}

# Comprehensive health check
perform_health_check() {
    local health_issues=0
    
    # Check availability
    if ! check_availability; then
        health_issues=$((health_issues + 1))
    fi
    
    # Check error rate (if Prometheus is available)
    if ! check_error_rate; then
        health_issues=$((health_issues + 1))
    fi
    
    # Check response time (if Prometheus is available)
    if ! check_response_time; then
        health_issues=$((health_issues + 1))
    fi
    
    # Check database connectivity
    if ! check_database; then
        health_issues=$((health_issues + 1))
    fi
    
    # Check business functionality
    if ! check_business_functionality; then
        health_issues=$((health_issues + 1))
    fi
    
    return $health_issues
}

# Execute rollback
execute_rollback() {
    if [ "$ROLLBACK_TRIGGERED" = true ]; then
        return 0  # Already triggered
    fi
    
    ROLLBACK_TRIGGERED=true
    
    error "🚨 CRITICAL ISSUES DETECTED - TRIGGERING AUTOMATIC ROLLBACK"
    
    # Send immediate alert
    send_alert "CRITICAL" "Automatic rollback triggered due to deployment health issues" "danger"
    
    # Get current deployment info
    local current_color=$(kubectl get service backend-service -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "unknown")
    
    local target_color="blue"
    if [ "$current_color" = "blue" ]; then
        target_color="green"
    fi
    
    log "Current deployment color: $current_color"
    log "Rolling back to: $target_color"
    
    # Create database backup before rollback
    log "Creating emergency database backup..."
    kubectl create job db-backup-emergency-$(date +%Y%m%d-%H%M%S) \
        --from=cronjob/db-backup-job \
        --namespace="$NAMESPACE" || warning "Failed to create database backup"
    
    # Execute traffic switch
    log "Switching traffic back to $target_color deployment..."
    
    # Update service selectors
    kubectl patch service backend-service \
        --namespace="$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"color\":\"$target_color\"}}}" || {
        error "Failed to switch backend service"
        return 1
    }
    
    kubectl patch service frontend-service \
        --namespace="$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"color\":\"$target_color\"}}}" || {
        error "Failed to switch frontend service"
        return 1
    }
    
    success "Traffic switched to $target_color deployment"
    
    # Wait for rollback to take effect
    log "Waiting for rollback to take effect..."
    sleep 30
    
    # Verify rollback
    if verify_rollback; then
        success "🎉 Rollback completed successfully!"
        send_alert "INFO" "Automatic rollback completed successfully" "good"
        
        # Log rollback event
        kubectl create event \
            --namespace="$NAMESPACE" \
            --type=Warning \
            --reason=AutomaticRollback \
            --message="Automatic rollback executed due to health check failures at $(date)" \
            --source-component=deployment-automation \
            || warning "Failed to create rollback event"
        
        return 0
    else
        error "❌ Rollback verification failed!"
        send_alert "CRITICAL" "Automatic rollback failed - manual intervention required" "danger"
        return 1
    fi
}

# Verify rollback success
verify_rollback() {
    log "Verifying rollback success..."
    
    local verification_attempts=5
    local verification_interval=10
    
    for i in $(seq 1 $verification_attempts); do
        log "Verification attempt $i/$verification_attempts"
        
        if perform_health_check; then
            success "Rollback verification successful"
            return 0
        fi
        
        if [ $i -lt $verification_attempts ]; then
            log "Verification failed, retrying in ${verification_interval}s..."
            sleep $verification_interval
        fi
    done
    
    error "Rollback verification failed after $verification_attempts attempts"
    return 1
}

# Send alert notification
send_alert() {
    local severity="$1"
    local message="$2"
    local color="$3"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [
                    {
                        \"color\": \"$color\",
                        \"title\": \"🚨 Automated Rollback Alert\",
                        \"text\": \"$message\",
                        \"fields\": [
                            {
                                \"title\": \"Environment\",
                                \"value\": \"$ENVIRONMENT\",
                                \"short\": true
                            },
                            {
                                \"title\": \"Severity\",
                                \"value\": \"$severity\",
                                \"short\": true
                            },
                            {
                                \"title\": \"Timestamp\",
                                \"value\": \"$(date)\",
                                \"short\": false
                            }
                        ]
                    }
                ]
            }" &
    fi
    
    # Also send to PagerDuty if configured
    if [ -n "$PAGERDUTY_INTEGRATION_KEY" ] && [ "$severity" = "CRITICAL" ]; then
        curl -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            --data "{
                \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Automatic rollback triggered in $ENVIRONMENT\",
                    \"source\": \"automated-rollback\",
                    \"severity\": \"critical\",
                    \"custom_details\": {
                        \"message\": \"$message\",
                        \"environment\": \"$ENVIRONMENT\",
                        \"timestamp\": \"$(date --iso-8601=seconds)\"
                    }
                }
            }" &
    fi
}

# Main monitoring loop
monitor_deployment() {
    local start_time=$(date +%s)
    local end_time=$((start_time + MONITORING_DURATION))
    
    log "🔍 Starting automated monitoring for $MONITORING_DURATION seconds..."
    log "Error threshold: $(echo "$ERROR_THRESHOLD * 100" | bc -l | cut -d. -f1)%"
    log "Latency threshold: ${LATENCY_THRESHOLD}ms"
    log "Availability threshold: $(echo "$AVAILABILITY_THRESHOLD * 100" | bc -l | cut -d. -f1)%"
    
    while [ $(date +%s) -lt $end_time ]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        local remaining=$((end_time - current_time))
        
        log "Monitoring progress: ${elapsed}s elapsed, ${remaining}s remaining"
        
        # Perform health check
        if perform_health_check; then
            CONSECUTIVE_FAILURES=0
            log "✅ Health check passed"
        else
            CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
            warning "❌ Health check failed (consecutive failures: $CONSECUTIVE_FAILURES)"
            
            # Trigger rollback if we hit the threshold
            if [ $CONSECUTIVE_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
                execute_rollback
                return $?
            fi
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
    
    success "🎉 Monitoring completed successfully - no issues detected!"
    log "Deployment appears stable and healthy"
    
    return 0
}

# Cleanup function
cleanup() {
    log "Cleaning up monitoring resources..."
    # Kill any background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Signal handlers
trap cleanup EXIT
trap 'error "Monitoring interrupted"; cleanup; exit 1' INT TERM

# Pre-monitoring checks
pre_monitoring_checks() {
    log "🔧 Performing pre-monitoring checks..."
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &>/dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi
    
    # Check if deployments exist
    if ! kubectl get deployment backend-deployment -n "$NAMESPACE" &>/dev/null; then
        warning "Backend deployment not found in namespace $NAMESPACE"
    fi
    
    # Initial health check
    log "Performing initial health check..."
    if ! perform_health_check; then
        warning "Initial health check failed - starting with degraded state"
    else
        success "Initial health check passed"
    fi
    
    log "Pre-monitoring checks completed"
}

# Usage information
usage() {
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT    Target environment (production, staging) [default: production]"
    echo ""
    echo "Environment Variables:"
    echo "  MONITORING_DURATION    Duration to monitor in seconds [default: 300]"
    echo "  CHECK_INTERVAL        Interval between checks in seconds [default: 30]"
    echo "  ERROR_THRESHOLD       Error rate threshold (0.0-1.0) [default: 0.05]"
    echo "  LATENCY_THRESHOLD     Latency threshold in ms [default: 1000]"
    echo "  SLACK_WEBHOOK_URL     Slack webhook for notifications"
    echo "  PAGERDUTY_INTEGRATION_KEY  PagerDuty integration key for critical alerts"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  MONITORING_DURATION=600 $0 staging"
    echo "  ERROR_THRESHOLD=0.02 LATENCY_THRESHOLD=500 $0 production"
    exit 1
}

# Main execution
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        usage
    fi
    
    log "🚀 Starting automated rollback monitoring for $ENVIRONMENT environment"
    
    # Send monitoring start notification
    send_alert "INFO" "Automated rollback monitoring started for $ENVIRONMENT deployment" "good"
    
    # Perform pre-checks
    pre_monitoring_checks
    
    # Start monitoring
    if monitor_deployment; then
        # Monitoring completed successfully
        send_alert "INFO" "Deployment monitoring completed successfully - no rollback needed" "good"
        success "✅ Deployment monitoring completed successfully"
        exit 0
    else
        # Rollback was triggered
        if [ "$ROLLBACK_TRIGGERED" = true ]; then
            if verify_rollback; then
                warning "⚠️ Automatic rollback was executed and verified"
                exit 2  # Rollback executed but successful
            else
                error "❌ Automatic rollback was executed but failed verification"
                exit 3  # Rollback executed but failed
            fi
        else
            error "❌ Monitoring failed without triggering rollback"
            exit 1
        fi
    fi
}

# Execute main function
main "$@"