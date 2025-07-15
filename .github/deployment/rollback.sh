#!/bin/bash

# Automated Rollback Script for BookedBarber V2
# Usage: ./rollback.sh <environment> [target-version]

set -euo pipefail

ENVIRONMENT=${1:-staging}
TARGET_VERSION=${2:-""}
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
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking rollback prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
    fi
    
    success "Prerequisites check passed"
}

# Get deployment history
get_deployment_history() {
    log "Getting deployment history..."
    
    # Get rollout history for backend
    log "Backend deployment history:"
    kubectl rollout history deployment/bookedbarber-backend -n "$NAMESPACE" || true
    
    # Get rollout history for frontend
    log "Frontend deployment history:"
    kubectl rollout history deployment/bookedbarber-frontend -n "$NAMESPACE" || true
    
    # Get current image tags
    CURRENT_BACKEND_IMAGE=$(kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    CURRENT_FRONTEND_IMAGE=$(kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    log "Current backend image: $CURRENT_BACKEND_IMAGE"
    log "Current frontend image: $CURRENT_FRONTEND_IMAGE"
}

# Determine rollback target
determine_rollback_target() {
    log "Determining rollback target..."
    
    if [ -n "$TARGET_VERSION" ]; then
        log "Using specified target version: $TARGET_VERSION"
        ROLLBACK_TO_REVISION=""
        ROLLBACK_BACKEND_IMAGE="ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${TARGET_VERSION}"
        ROLLBACK_FRONTEND_IMAGE="ghcr.io/${GITHUB_REPOSITORY}/frontend-v2:${TARGET_VERSION}"
    else
        # Get previous revision
        BACKEND_PREVIOUS_REVISION=$(kubectl rollout history deployment/bookedbarber-backend -n "$NAMESPACE" | tail -2 | head -1 | awk '{print $1}')
        FRONTEND_PREVIOUS_REVISION=$(kubectl rollout history deployment/bookedbarber-frontend -n "$NAMESPACE" | tail -2 | head -1 | awk '{print $1}')
        
        if [ -z "$BACKEND_PREVIOUS_REVISION" ] || [ -z "$FRONTEND_PREVIOUS_REVISION" ]; then
            error "Cannot determine previous revision for rollback"
        fi
        
        log "Rolling back to previous revision - Backend: $BACKEND_PREVIOUS_REVISION, Frontend: $FRONTEND_PREVIOUS_REVISION"
        ROLLBACK_TO_REVISION="--to-revision"
    fi
}

# Create rollback backup
create_rollback_backup() {
    log "Creating rollback backup..."
    
    BACKUP_DIR="/tmp/rollback-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment configurations
    kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/backend-deployment-current.yaml"
    kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/frontend-deployment-current.yaml"
    
    # Backup current services
    kubectl get service bookedbarber-backend -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/backend-service-current.yaml"
    kubectl get service bookedbarber-frontend -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/frontend-service-current.yaml"
    
    # Backup current ingress
    kubectl get ingress bookedbarber-ingress -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/ingress-current.yaml" 2>/dev/null || true
    
    # Create rollback metadata
    cat > "$BACKUP_DIR/rollback-metadata.json" << EOF
{
  "rollback_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "current_backend_image": "$CURRENT_BACKEND_IMAGE",
  "current_frontend_image": "$CURRENT_FRONTEND_IMAGE",
  "target_version": "$TARGET_VERSION",
  "reason": "automated_rollback",
  "triggered_by": "${GITHUB_ACTOR:-manual}"
}
EOF
    
    success "Rollback backup created: $BACKUP_DIR"
    echo "$BACKUP_DIR" > /tmp/rollback_backup_path
}

# Perform database rollback check
check_database_rollback_compatibility() {
    log "Checking database rollback compatibility..."
    
    if [ -n "$TARGET_VERSION" ]; then
        # Check if database migrations need to be rolled back
        BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
        
        if [ -n "$BACKEND_POD" ]; then
            log "Checking database schema compatibility..."
            
            # This would typically check if the target version is compatible with current database schema
            # For now, we'll just log a warning
            warning "Database rollback compatibility check not fully implemented"
            warning "Manual database migration rollback may be required"
            
            # In a real implementation, you would:
            # 1. Compare current DB schema version with target version requirements
            # 2. Check if any destructive migrations were applied
            # 3. Prepare database rollback scripts if needed
        else
            warning "No backend pod available for database compatibility check"
        fi
    fi
}

# Scale down current deployment
scale_down_current() {
    log "Scaling down current deployments..."
    
    # Scale down to 1 replica to minimize disruption
    kubectl scale deployment bookedbarber-backend --replicas=1 -n "$NAMESPACE"
    kubectl scale deployment bookedbarber-frontend --replicas=1 -n "$NAMESPACE"
    
    # Wait for scale down
    kubectl rollout status deployment/bookedbarber-backend -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/bookedbarber-frontend -n "$NAMESPACE" --timeout=300s
    
    success "Current deployments scaled down"
}

# Perform the rollback
perform_rollback() {
    log "Performing rollback..."
    
    if [ -n "$TARGET_VERSION" ]; then
        # Rollback to specific version by updating images
        log "Rolling back to specific version: $TARGET_VERSION"
        
        kubectl set image deployment/bookedbarber-backend backend="$ROLLBACK_BACKEND_IMAGE" -n "$NAMESPACE"
        kubectl set image deployment/bookedbarber-frontend frontend="$ROLLBACK_FRONTEND_IMAGE" -n "$NAMESPACE"
        
        # Add rollback annotations
        kubectl annotate deployment bookedbarber-backend -n "$NAMESPACE" --overwrite \
            rollback-timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            rollback-target-version="$TARGET_VERSION" \
            rollback-reason="automated"
            
        kubectl annotate deployment bookedbarber-frontend -n "$NAMESPACE" --overwrite \
            rollback-timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            rollback-target-version="$TARGET_VERSION" \
            rollback-reason="automated"
    else
        # Rollback to previous revision
        log "Rolling back to previous revision..."
        
        kubectl rollout undo deployment/bookedbarber-backend -n "$NAMESPACE" $ROLLBACK_TO_REVISION $BACKEND_PREVIOUS_REVISION
        kubectl rollout undo deployment/bookedbarber-frontend -n "$NAMESPACE" $ROLLBACK_TO_REVISION $FRONTEND_PREVIOUS_REVISION
    fi
    
    success "Rollback initiated"
}

# Wait for rollback completion
wait_for_rollback() {
    log "Waiting for rollback to complete..."
    
    # Wait for backend rollback
    if kubectl rollout status deployment/bookedbarber-backend -n "$NAMESPACE" --timeout=600s; then
        success "Backend rollback completed"
    else
        error "Backend rollback failed or timed out"
    fi
    
    # Wait for frontend rollback
    if kubectl rollout status deployment/bookedbarber-frontend -n "$NAMESPACE" --timeout=600s; then
        success "Frontend rollback completed"
    else
        error "Frontend rollback failed or timed out"
    fi
}

# Scale back up after rollback
scale_up_after_rollback() {
    log "Scaling up after rollback..."
    
    # Scale back to original replicas
    case $ENVIRONMENT in
        production)
            BACKEND_REPLICAS=3
            FRONTEND_REPLICAS=2
            ;;
        staging)
            BACKEND_REPLICAS=2
            FRONTEND_REPLICAS=1
            ;;
        *)
            BACKEND_REPLICAS=1
            FRONTEND_REPLICAS=1
            ;;
    esac
    
    kubectl scale deployment bookedbarber-backend --replicas=$BACKEND_REPLICAS -n "$NAMESPACE"
    kubectl scale deployment bookedbarber-frontend --replicas=$FRONTEND_REPLICAS -n "$NAMESPACE"
    
    # Wait for scale up
    kubectl rollout status deployment/bookedbarber-backend -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/bookedbarber-frontend -n "$NAMESPACE" --timeout=300s
    
    success "Deployments scaled up after rollback"
}

# Verify rollback health
verify_rollback_health() {
    log "Verifying rollback health..."
    
    # Run health checks
    if command -v ./health-check.sh &> /dev/null; then
        ./health-check.sh "$ENVIRONMENT" 180
    else
        log "Health check script not found, performing basic verification..."
        
        # Basic pod health check
        UNHEALTHY_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running -o name 2>/dev/null || true)
        if [ -n "$UNHEALTHY_PODS" ]; then
            error "Found unhealthy pods after rollback: $UNHEALTHY_PODS"
        fi
        
        # Basic endpoint check
        sleep 30  # Give services time to stabilize
        
        case $ENVIRONMENT in
            staging)
                HEALTH_URL="https://staging-api.bookedbarber.com/health"
                ;;
            production)
                HEALTH_URL="https://api.bookedbarber.com/health"
                ;;
            *)
                HEALTH_URL="http://localhost:8000/health"
                ;;
        esac
        
        if curl -f -s --max-time 10 "$HEALTH_URL" > /dev/null; then
            success "Basic health check passed"
        else
            error "Basic health check failed"
        fi
    fi
    
    success "Rollback health verification completed"
}

# Send rollback notification
send_rollback_notification() {
    log "Sending rollback notification..."
    
    # Create rollback summary
    ROLLBACK_SUMMARY=$(cat << EOF
🔄 **Automated Rollback Completed**

**Environment:** $ENVIRONMENT
**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Target Version:** ${TARGET_VERSION:-"Previous Revision"}
**Triggered By:** ${GITHUB_ACTOR:-"Manual"}

**Status:** Rollback completed successfully

**Previous Images:**
- Backend: $CURRENT_BACKEND_IMAGE
- Frontend: $CURRENT_FRONTEND_IMAGE

**Current Images:**
- Backend: $(kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "Unknown")
- Frontend: $(kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "Unknown")

**Next Steps:**
1. Monitor application health
2. Investigate root cause of original issue
3. Plan corrective deployment
EOF
)
    
    # Send to Slack if webhook is available
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$ROLLBACK_SUMMARY\"}" || true
    fi
    
    # Send to deployment dashboard if available
    if [ -n "${DEPLOYMENT_DASHBOARD_URL:-}" ] && [ -n "${DASHBOARD_TOKEN:-}" ]; then
        curl -X POST "$DEPLOYMENT_DASHBOARD_URL/rollback" \
            -H "Authorization: Bearer $DASHBOARD_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"environment\": \"$ENVIRONMENT\",
                \"status\": \"completed\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"target_version\": \"${TARGET_VERSION:-previous}\",
                \"triggered_by\": \"${GITHUB_ACTOR:-manual}\"
            }" || true
    fi
    
    success "Rollback notification sent"
}

# Cleanup rollback artifacts
cleanup_rollback_artifacts() {
    log "Cleaning up rollback artifacts..."
    
    # Keep backup for 24 hours, then it can be cleaned up
    if [ -f /tmp/rollback_backup_path ]; then
        BACKUP_PATH=$(cat /tmp/rollback_backup_path)
        log "Rollback backup preserved at: $BACKUP_PATH"
        log "Backup will be available for 24 hours"
    fi
    
    # Clean up temporary files
    rm -f /tmp/rollback_backup_path
    
    success "Rollback cleanup completed"
}

# Emergency rollback (skip some safety checks)
emergency_rollback() {
    warning "Performing EMERGENCY rollback - skipping some safety checks!"
    
    check_prerequisites
    get_deployment_history
    determine_rollback_target
    
    # Skip backup and compatibility checks in emergency
    warning "Skipping backup and compatibility checks for emergency rollback"
    
    perform_rollback
    wait_for_rollback
    scale_up_after_rollback
    
    # Basic verification only
    sleep 60
    kubectl get pods -n "$NAMESPACE"
    
    send_rollback_notification
    
    success "Emergency rollback completed"
}

# Main execution
main() {
    if [ "${EMERGENCY:-false}" == "true" ]; then
        emergency_rollback
        return
    fi
    
    log "Starting rollback for environment: $ENVIRONMENT"
    if [ -n "$TARGET_VERSION" ]; then
        log "Target version: $TARGET_VERSION"
    else
        log "Rolling back to previous revision"
    fi
    
    check_prerequisites
    get_deployment_history
    determine_rollback_target
    create_rollback_backup
    check_database_rollback_compatibility
    scale_down_current
    perform_rollback
    wait_for_rollback
    scale_up_after_rollback
    verify_rollback_health
    send_rollback_notification
    cleanup_rollback_artifacts
    
    success "Rollback completed successfully for environment: $ENVIRONMENT"
}

# Handle emergency rollback via environment variable
if [ "${1:-}" == "--emergency" ]; then
    export EMERGENCY=true
    shift
fi

# Run main function
main "$@"