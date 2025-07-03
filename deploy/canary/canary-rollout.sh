#!/bin/bash

# Canary Deployment Rollout Script
# Usage: ./canary-rollout.sh <image-tag> [--auto-promote] [--rollback]

set -e

IMAGE_TAG=${1}
AUTO_PROMOTE=${2}
ROLLBACK_FLAG=${3}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="production"
ROLLOUT_NAME="backend-rollout"
STABLE_SERVICE="backend-stable-service"
CANARY_SERVICE="backend-canary-service"
PROMETHEUS_URL="http://prometheus.monitoring:9090"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Usage function
usage() {
    echo "Usage: $0 <image-tag> [--auto-promote] [--rollback]"
    echo ""
    echo "Options:"
    echo "  image-tag      Docker image tag to deploy"
    echo "  --auto-promote Automatically promote if metrics are good"
    echo "  --rollback     Rollback the current canary deployment"
    echo ""
    echo "Examples:"
    echo "  $0 v1.2.3"
    echo "  $0 v1.2.3 --auto-promote"
    echo "  $0 --rollback"
    exit 1
}

# Check dependencies
check_dependencies() {
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
    command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed"
    
    # Check if Argo Rollouts is available
    if ! kubectl get crd rollouts.argoproj.io >/dev/null 2>&1; then
        error "Argo Rollouts CRD not found. Please install Argo Rollouts."
    fi
    
    log "✅ All dependencies satisfied"
}

# Get metrics from Prometheus
get_metric() {
    local metric_query="$1"
    local service_name="$2"
    
    query=$(echo "$metric_query" | sed "s/{{args.service-name}}/$service_name/g")
    encoded_query=$(echo "$query" | jq -sRr @uri)
    
    result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$encoded_query" | jq -r '.data.result[0].value[1] // "0"')
    echo "$result"
}

# Check canary metrics
check_canary_metrics() {
    log "Checking canary deployment metrics..."
    
    # Error rate check
    error_rate_query='sum(rate(http_requests_total{service="{{args.service-name}}",code=~"5.."}[2m])) / sum(rate(http_requests_total{service="{{args.service-name}}"}[2m]))'
    error_rate=$(get_metric "$error_rate_query" "$CANARY_SERVICE")
    error_rate_percent=$(echo "$error_rate * 100" | bc -l 2>/dev/null || echo "0")
    
    # Latency check
    latency_query='histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="{{args.service-name}}"}[2m])) by (le)) * 1000'
    latency_p95=$(get_metric "$latency_query" "$CANARY_SERVICE")
    
    # Success rate
    success_rate_query='sum(rate(http_requests_total{service="{{args.service-name}}",code!~"5.."}[2m])) / sum(rate(http_requests_total{service="{{args.service-name}}"}[2m]))'
    success_rate=$(get_metric "$success_rate_query" "$CANARY_SERVICE")
    success_rate_percent=$(echo "$success_rate * 100" | bc -l 2>/dev/null || echo "100")
    
    echo "Current Metrics:"
    echo "  Error Rate: ${error_rate_percent}%"
    echo "  Latency P95: ${latency_p95}ms"
    echo "  Success Rate: ${success_rate_percent}%"
    
    # Check thresholds
    if (( $(echo "$error_rate > 0.05" | bc -l) )); then
        error "Error rate too high: ${error_rate_percent}% > 5%"
    fi
    
    if (( $(echo "$latency_p95 > 1000" | bc -l) )); then
        error "Latency too high: ${latency_p95}ms > 1000ms"
    fi
    
    if (( $(echo "$success_rate < 0.95" | bc -l) )); then
        error "Success rate too low: ${success_rate_percent}% < 95%"
    fi
    
    success "All metrics within acceptable thresholds"
}

# Rollback canary deployment
rollback_canary() {
    log "Rolling back canary deployment..."
    
    kubectl argo rollouts abort "$ROLLOUT_NAME" -n "$NAMESPACE"
    kubectl argo rollouts undo "$ROLLOUT_NAME" -n "$NAMESPACE"
    
    # Wait for rollback to complete
    kubectl argo rollouts wait "$ROLLOUT_NAME" -n "$NAMESPACE" --timeout=600s
    
    success "Canary deployment rolled back successfully"
    
    # Send notification
    send_notification "🔄 Canary Rollback" "Canary deployment has been rolled back" "warning"
}

# Promote canary to stable
promote_canary() {
    log "Promoting canary to stable..."
    
    kubectl argo rollouts promote "$ROLLOUT_NAME" -n "$NAMESPACE"
    
    # Wait for promotion to complete
    kubectl argo rollouts wait "$ROLLOUT_NAME" -n "$NAMESPACE" --timeout=600s
    
    success "Canary promoted to stable successfully"
    
    # Send notification
    send_notification "🚀 Canary Promotion" "Canary deployment promoted to stable" "good"
}

# Send Slack notification
send_notification() {
    local title="$1"
    local message="$2"
    local color="$3"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [
                    {
                        \"color\": \"$color\",
                        \"title\": \"$title\",
                        \"text\": \"$message\",
                        \"fields\": [
                            {
                                \"title\": \"Environment\",
                                \"value\": \"Production\",
                                \"short\": true
                            },
                            {
                                \"title\": \"Image Tag\",
                                \"value\": \"${IMAGE_TAG:-current}\",
                                \"short\": true
                            }
                        ]
                    }
                ]
            }" || warning "Failed to send Slack notification"
    fi
}

# Monitor canary deployment
monitor_canary() {
    log "Monitoring canary deployment progress..."
    
    while true; do
        # Get rollout status
        status=$(kubectl argo rollouts status "$ROLLOUT_NAME" -n "$NAMESPACE" --timeout=10s 2>/dev/null || echo "unknown")
        phase=$(kubectl get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "unknown")
        
        current_step=$(kubectl get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o jsonpath='{.status.currentStepIndex}' 2>/dev/null || echo "0")
        total_steps=$(kubectl get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.strategy.canary.steps}' | jq length 2>/dev/null || echo "5")
        
        canary_weight=$(kubectl get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o jsonpath='{.status.canaryStatus.currentWeight}' 2>/dev/null || echo "0")
        
        echo "Status: $phase | Step: $((current_step + 1))/$total_steps | Canary Weight: $canary_weight%"
        
        # Check if deployment is complete
        if [ "$phase" = "Healthy" ] && [ "$canary_weight" = "100" ]; then
            success "Canary deployment completed successfully!"
            break
        fi
        
        # Check if deployment failed
        if [ "$phase" = "Degraded" ] || [ "$phase" = "Error" ]; then
            error "Canary deployment failed. Current phase: $phase"
        fi
        
        # Check if deployment is paused and auto-promote is enabled
        if [ "$phase" = "Paused" ] && [ "$AUTO_PROMOTE" = "--auto-promote" ]; then
            log "Deployment paused. Checking metrics for auto-promotion..."
            
            if check_canary_metrics; then
                log "Metrics look good. Auto-promoting..."
                promote_canary
            else
                warning "Metrics not within thresholds. Manual intervention required."
                break
            fi
        fi
        
        sleep 30
    done
}

# Main execution
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        usage
    fi
    
    if [ "$1" = "--rollback" ] || [ "$ROLLBACK_FLAG" = "--rollback" ]; then
        check_dependencies
        rollback_canary
        exit 0
    fi
    
    if [ -z "$IMAGE_TAG" ]; then
        usage
    fi
    
    check_dependencies
    
    log "Starting canary deployment for image tag: $IMAGE_TAG"
    
    # Update rollout with new image
    kubectl argo rollouts set image "$ROLLOUT_NAME" \
        backend="ghcr.io/bookedbarber/backend:$IMAGE_TAG" \
        -n "$NAMESPACE"
    
    # Send start notification
    send_notification "🎯 Canary Deployment Started" "Starting canary deployment for $IMAGE_TAG" "good"
    
    # Monitor the deployment
    monitor_canary
    
    # Final status check
    final_phase=$(kubectl get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
    
    if [ "$final_phase" = "Healthy" ]; then
        success "Canary deployment completed successfully!"
        send_notification "✅ Canary Deployment Complete" "Canary deployment for $IMAGE_TAG completed successfully" "good"
    else
        error "Canary deployment ended with status: $final_phase"
    fi
}

# Trap signals for cleanup
trap 'echo "Script interrupted. Current rollout status:"; kubectl argo rollouts status "$ROLLOUT_NAME" -n "$NAMESPACE" || true; exit 1' INT TERM

# Run main function
main "$@"