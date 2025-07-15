#!/bin/bash

# Blue-Green Deployment Script for BookedBarber V2
# Usage: ./deploy-blue-green.sh <environment> <image-tag>

set -euo pipefail

ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}
NAMESPACE="bookedbarber-${ENVIRONMENT}"
BACKEND_IMAGE="ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${IMAGE_TAG}"
FRONTEND_IMAGE="ghcr.io/${GITHUB_REPOSITORY}/frontend-v2:${IMAGE_TAG}"

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
    log "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "Creating namespace $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
    
    success "Prerequisites check passed"
}

# Determine current and new deployment colors
get_deployment_colors() {
    log "Determining deployment colors..."
    
    # Check if blue deployment exists and is active
    if kubectl get deployment bookedbarber-backend-blue -n "$NAMESPACE" &> /dev/null; then
        CURRENT_BACKEND_REPLICAS=$(kubectl get deployment bookedbarber-backend-blue -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        if [ "$CURRENT_BACKEND_REPLICAS" -gt 0 ]; then
            CURRENT_COLOR="blue"
            NEW_COLOR="green"
        else
            CURRENT_COLOR="green"
            NEW_COLOR="blue"
        fi
    else
        # First deployment - start with blue
        CURRENT_COLOR=""
        NEW_COLOR="blue"
    fi
    
    log "Current active color: ${CURRENT_COLOR:-none}"
    log "New deployment color: $NEW_COLOR"
}

# Deploy new version to inactive environment
deploy_new_version() {
    log "Deploying new version to $NEW_COLOR environment..."
    
    # Apply backend deployment
    envsubst << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookedbarber-backend-${NEW_COLOR}
  namespace: ${NAMESPACE}
  labels:
    app: bookedbarber-backend
    version: ${NEW_COLOR}
    environment: ${ENVIRONMENT}
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: bookedbarber-backend
      version: ${NEW_COLOR}
  template:
    metadata:
      labels:
        app: bookedbarber-backend
        version: ${NEW_COLOR}
        environment: ${ENVIRONMENT}
    spec:
      containers:
      - name: backend
        image: ${BACKEND_IMAGE}
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "${ENVIRONMENT}"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: database-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: secret-key
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: redis-url
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: stripe-secret-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: bookedbarber-backend-${NEW_COLOR}
  namespace: ${NAMESPACE}
  labels:
    app: bookedbarber-backend
    version: ${NEW_COLOR}
spec:
  selector:
    app: bookedbarber-backend
    version: ${NEW_COLOR}
  ports:
  - port: 8000
    targetPort: 8000
    protocol: TCP
  type: ClusterIP
EOF

    # Apply frontend deployment
    envsubst << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookedbarber-frontend-${NEW_COLOR}
  namespace: ${NAMESPACE}
  labels:
    app: bookedbarber-frontend
    version: ${NEW_COLOR}
    environment: ${ENVIRONMENT}
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: bookedbarber-frontend
      version: ${NEW_COLOR}
  template:
    metadata:
      labels:
        app: bookedbarber-frontend
        version: ${NEW_COLOR}
        environment: ${ENVIRONMENT}
    spec:
      containers:
      - name: frontend
        image: ${FRONTEND_IMAGE}
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://${ENVIRONMENT}-api.bookedbarber.com/api/v1"
        - name: NEXT_PUBLIC_ENVIRONMENT
          value: "${ENVIRONMENT}"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: bookedbarber-frontend-${NEW_COLOR}
  namespace: ${NAMESPACE}
  labels:
    app: bookedbarber-frontend
    version: ${NEW_COLOR}
spec:
  selector:
    app: bookedbarber-frontend
    version: ${NEW_COLOR}
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
EOF

    success "New version deployed to $NEW_COLOR environment"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log "Waiting for $NEW_COLOR deployment to be ready..."
    
    kubectl rollout status deployment/bookedbarber-backend-${NEW_COLOR} -n "$NAMESPACE" --timeout=600s
    kubectl rollout status deployment/bookedbarber-frontend-${NEW_COLOR} -n "$NAMESPACE" --timeout=600s
    
    success "$NEW_COLOR deployment is ready"
}

# Run health checks on new deployment
health_check_new_deployment() {
    log "Running health checks on $NEW_COLOR deployment..."
    
    # Get pod IPs for direct health checks
    BACKEND_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend,version=${NEW_COLOR} -o jsonpath='{.items[*].status.podIP}')
    FRONTEND_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-frontend,version=${NEW_COLOR} -o jsonpath='{.items[*].status.podIP}')
    
    # Health check backend pods
    for pod_ip in $BACKEND_PODS; do
        if ! kubectl run health-check-backend-${NEW_COLOR} --rm -i --restart=Never --image=curlimages/curl:latest -n "$NAMESPACE" -- curl -f "http://${pod_ip}:8000/health" --max-time 10; then
            error "Backend health check failed for pod $pod_ip"
        fi
    done
    
    # Health check frontend pods
    for pod_ip in $FRONTEND_PODS; do
        if ! kubectl run health-check-frontend-${NEW_COLOR} --rm -i --restart=Never --image=curlimages/curl:latest -n "$NAMESPACE" -- curl -f "http://${pod_ip}:3000/api/health" --max-time 10; then
            error "Frontend health check failed for pod $pod_ip"
        fi
    done
    
    success "Health checks passed for $NEW_COLOR deployment"
}

# Switch traffic to new deployment
switch_traffic() {
    log "Switching traffic to $NEW_COLOR deployment..."
    
    # Update main services to point to new deployment
    kubectl patch service bookedbarber-backend -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'${NEW_COLOR}'"}}}'
    kubectl patch service bookedbarber-frontend -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'${NEW_COLOR}'"}}}'
    
    # Update ingress if needed
    if kubectl get ingress bookedbarber-ingress -n "$NAMESPACE" &> /dev/null; then
        kubectl annotate ingress bookedbarber-ingress -n "$NAMESPACE" --overwrite \
            deployment-color="$NEW_COLOR" \
            deployment-timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    fi
    
    success "Traffic switched to $NEW_COLOR deployment"
}

# Monitor new deployment
monitor_deployment() {
    log "Monitoring new deployment for 5 minutes..."
    
    MONITOR_DURATION=300  # 5 minutes
    MONITOR_INTERVAL=30   # 30 seconds
    ITERATIONS=$((MONITOR_DURATION / MONITOR_INTERVAL))
    
    for i in $(seq 1 $ITERATIONS); do
        log "Monitor check $i/$ITERATIONS"
        
        # Check pod health
        UNHEALTHY_BACKEND=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend,version=${NEW_COLOR} --field-selector=status.phase!=Running -o name | wc -l)
        UNHEALTHY_FRONTEND=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-frontend,version=${NEW_COLOR} --field-selector=status.phase!=Running -o name | wc -l)
        
        if [ "$UNHEALTHY_BACKEND" -gt 0 ] || [ "$UNHEALTHY_FRONTEND" -gt 0 ]; then
            error "Unhealthy pods detected during monitoring. Rolling back..."
        fi
        
        # Check error rates via metrics (if available)
        # This would typically query Prometheus/monitoring system
        
        sleep $MONITOR_INTERVAL
    done
    
    success "Deployment monitoring completed successfully"
}

# Scale down old deployment
scale_down_old() {
    if [ -n "$CURRENT_COLOR" ]; then
        log "Scaling down $CURRENT_COLOR deployment..."
        
        kubectl scale deployment bookedbarber-backend-${CURRENT_COLOR} --replicas=0 -n "$NAMESPACE" || true
        kubectl scale deployment bookedbarber-frontend-${CURRENT_COLOR} --replicas=0 -n "$NAMESPACE" || true
        
        success "Old $CURRENT_COLOR deployment scaled down"
    fi
}

# Cleanup old resources (optional)
cleanup_old() {
    if [ -n "$CURRENT_COLOR" ] && [ "$1" == "--cleanup" ]; then
        log "Cleaning up old $CURRENT_COLOR deployment resources..."
        
        kubectl delete deployment bookedbarber-backend-${CURRENT_COLOR} -n "$NAMESPACE" || true
        kubectl delete deployment bookedbarber-frontend-${CURRENT_COLOR} -n "$NAMESPACE" || true
        kubectl delete service bookedbarber-backend-${CURRENT_COLOR} -n "$NAMESPACE" || true
        kubectl delete service bookedbarber-frontend-${CURRENT_COLOR} -n "$NAMESPACE" || true
        
        success "Old $CURRENT_COLOR deployment cleaned up"
    fi
}

# Rollback function
rollback() {
    if [ -n "$CURRENT_COLOR" ]; then
        error "Deployment failed. Rolling back to $CURRENT_COLOR..."
        
        # Switch traffic back
        kubectl patch service bookedbarber-backend -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'${CURRENT_COLOR}'"}}}'
        kubectl patch service bookedbarber-frontend -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'${CURRENT_COLOR}'"}}}'
        
        # Scale up old deployment
        kubectl scale deployment bookedbarber-backend-${CURRENT_COLOR} --replicas=3 -n "$NAMESPACE"
        kubectl scale deployment bookedbarber-frontend-${CURRENT_COLOR} --replicas=2 -n "$NAMESPACE"
        
        # Scale down failed deployment
        kubectl scale deployment bookedbarber-backend-${NEW_COLOR} --replicas=0 -n "$NAMESPACE"
        kubectl scale deployment bookedbarber-frontend-${NEW_COLOR} --replicas=0 -n "$NAMESPACE"
        
        error "Rollback completed"
    else
        error "No previous deployment to rollback to"
    fi
}

# Main execution with error handling
main() {
    trap rollback ERR
    
    log "Starting blue-green deployment for environment: $ENVIRONMENT"
    log "Image tag: $IMAGE_TAG"
    
    check_prerequisites
    get_deployment_colors
    deploy_new_version
    wait_for_deployment
    health_check_new_deployment
    switch_traffic
    monitor_deployment
    scale_down_old
    
    # Optional cleanup of old resources
    if [ "${3:-}" == "--cleanup" ]; then
        cleanup_old --cleanup
    fi
    
    success "Blue-green deployment completed successfully!"
    log "Active deployment color: $NEW_COLOR"
    log "Image: $BACKEND_IMAGE"
}

# Run main function
main "$@"