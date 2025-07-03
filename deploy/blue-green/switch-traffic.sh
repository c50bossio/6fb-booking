#!/bin/bash

# Blue-Green Deployment Traffic Switch Script
# Usage: ./switch-traffic.sh <namespace> <color> [--validate]

set -e

NAMESPACE=${1:-production}
TARGET_COLOR=${2:-green}
VALIDATE_FLAG=${3:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validate inputs
if [[ ! "$TARGET_COLOR" =~ ^(blue|green)$ ]]; then
    error "Invalid color. Must be 'blue' or 'green'"
fi

# Check kubectl connectivity
if ! kubectl cluster-info &>/dev/null; then
    error "Cannot connect to Kubernetes cluster"
fi

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    error "Namespace '$NAMESPACE' does not exist"
fi

log "Starting traffic switch to $TARGET_COLOR in namespace $NAMESPACE"

# Get current traffic color
CURRENT_COLOR=$(kubectl get service backend-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "unknown")

log "Current traffic color: $CURRENT_COLOR"
log "Target traffic color: $TARGET_COLOR"

if [ "$CURRENT_COLOR" = "$TARGET_COLOR" ]; then
    warning "Traffic is already pointing to $TARGET_COLOR"
    if [ "$VALIDATE_FLAG" != "--validate" ]; then
        exit 0
    fi
fi

# Validate target deployment exists and is ready
TARGET_NAMESPACE="$NAMESPACE-$TARGET_COLOR"
log "Checking target deployment in namespace: $TARGET_NAMESPACE"

if ! kubectl get namespace "$TARGET_NAMESPACE" &>/dev/null; then
    error "Target namespace '$TARGET_NAMESPACE' does not exist"
fi

# Check backend deployment
if ! kubectl get deployment backend-deployment -n "$TARGET_NAMESPACE" &>/dev/null; then
    error "Backend deployment not found in $TARGET_NAMESPACE"
fi

# Check frontend deployment
if ! kubectl get deployment frontend-deployment -n "$TARGET_NAMESPACE" &>/dev/null; then
    error "Frontend deployment not found in $TARGET_NAMESPACE"
fi

# Wait for deployments to be ready
log "Waiting for target deployments to be ready..."

if ! kubectl wait --for=condition=Available deployment/backend-deployment \
    --timeout=300s -n "$TARGET_NAMESPACE"; then
    error "Backend deployment is not ready in $TARGET_NAMESPACE"
fi

if ! kubectl wait --for=condition=Available deployment/frontend-deployment \
    --timeout=300s -n "$TARGET_NAMESPACE"; then
    error "Frontend deployment is not ready in $TARGET_NAMESPACE"
fi

success "Target deployments are ready"

# Pre-switch health check
log "Performing pre-switch health check..."

BACKEND_IP=$(kubectl get service backend-service \
    -n "$TARGET_NAMESPACE" \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

if [ -n "$BACKEND_IP" ]; then
    for i in {1..10}; do
        if curl -sf "http://$BACKEND_IP/health" &>/dev/null; then
            success "Health check passed (attempt $i)"
            break
        fi
        if [ $i -eq 10 ]; then
            error "Health check failed after 10 attempts"
        fi
        log "Health check failed, retrying in 10 seconds... (attempt $i/10)"
        sleep 10
    done
else
    warning "Could not get backend IP for health check"
fi

# If validation only, exit here
if [ "$VALIDATE_FLAG" = "--validate" ]; then
    success "Validation completed successfully"
    exit 0
fi

# Create backup of current service configuration
log "Creating backup of current service configuration..."
kubectl get service backend-service -n "$NAMESPACE" -o yaml > "backend-service-backup-$(date +%Y%m%d-%H%M%S).yaml"
kubectl get service frontend-service -n "$NAMESPACE" -o yaml > "frontend-service-backup-$(date +%Y%m%d-%H%M%S).yaml"

# Switch traffic - Backend service
log "Switching backend service traffic to $TARGET_COLOR..."
kubectl patch service backend-service \
    --namespace="$NAMESPACE" \
    -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"

# Switch traffic - Frontend service
log "Switching frontend service traffic to $TARGET_COLOR..."
kubectl patch service frontend-service \
    --namespace="$NAMESPACE" \
    -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"

# Wait for traffic switch to propagate
log "Waiting for traffic switch to propagate..."
sleep 30

# Post-switch validation
log "Performing post-switch validation..."

# Check if services are pointing to the right color
BACKEND_COLOR=$(kubectl get service backend-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.selector.color}')
FRONTEND_COLOR=$(kubectl get service frontend-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.selector.color}')

if [ "$BACKEND_COLOR" != "$TARGET_COLOR" ]; then
    error "Backend service is not pointing to $TARGET_COLOR (current: $BACKEND_COLOR)"
fi

if [ "$FRONTEND_COLOR" != "$TARGET_COLOR" ]; then
    error "Frontend service is not pointing to $TARGET_COLOR (current: $FRONTEND_COLOR)"
fi

# External health check
if [ "$NAMESPACE" = "production" ]; then
    BASE_URL="https://bookedbarber.com"
    API_URL="https://api.bookedbarber.com"
elif [ "$NAMESPACE" = "staging" ]; then
    BASE_URL="https://staging.bookedbarber.com"
    API_URL="https://api-staging.bookedbarber.com"
else
    BASE_URL="http://localhost"
    API_URL="http://localhost:8000"
fi

log "Performing external health checks..."

# Check frontend
for i in {1..5}; do
    if curl -sf "$BASE_URL" &>/dev/null; then
        success "Frontend external health check passed"
        break
    fi
    if [ $i -eq 5 ]; then
        error "Frontend external health check failed"
    fi
    sleep 10
done

# Check backend API
for i in {1..5}; do
    if curl -sf "$API_URL/health" &>/dev/null; then
        success "Backend external health check passed"
        break
    fi
    if [ $i -eq 5 ]; then
        error "Backend external health check failed"
    fi
    sleep 10
done

# Update service labels to reflect current deployment
kubectl label service backend-service -n "$NAMESPACE" \
    current-color="$TARGET_COLOR" \
    switched-at="$(date --iso-8601=seconds)" \
    switched-from="$CURRENT_COLOR" \
    --overwrite

kubectl label service frontend-service -n "$NAMESPACE" \
    current-color="$TARGET_COLOR" \
    switched-at="$(date --iso-8601=seconds)" \
    switched-from="$CURRENT_COLOR" \
    --overwrite

# Log traffic switch event
log "Logging traffic switch event..."
kubectl create event \
    --namespace="$NAMESPACE" \
    --type=Normal \
    --reason=TrafficSwitch \
    --message="Traffic switched from $CURRENT_COLOR to $TARGET_COLOR at $(date)" \
    --source-component=deployment-automation \
    || warning "Failed to create event log"

success "Traffic successfully switched to $TARGET_COLOR deployment!"

# Summary
echo ""
echo "=================================="
echo "TRAFFIC SWITCH SUMMARY"
echo "=================================="
echo "Namespace: $NAMESPACE"
echo "From Color: $CURRENT_COLOR"
echo "To Color: $TARGET_COLOR"
echo "Switched At: $(date)"
echo "Backend Service: ✅ Switched"
echo "Frontend Service: ✅ Switched"
echo "External Health Checks: ✅ Passed"
echo "=================================="

# Cleanup old backups (keep only last 5)
log "Cleaning up old service backups..."
ls -t *-service-backup-*.yaml 2>/dev/null | tail -n +6 | xargs rm -f || true

log "Traffic switch completed successfully!"