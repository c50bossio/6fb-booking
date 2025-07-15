#!/bin/bash

# Health Check Script for BookedBarber V2
# Usage: ./health-check.sh <environment> [timeout]

set -euo pipefail

ENVIRONMENT=${1:-staging}
TIMEOUT=${2:-300}
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
            # Local/development environment
            FRONTEND_URL="http://localhost:3000"
            BACKEND_URL="http://localhost:8000"
            ;;
    esac
}

# Check Kubernetes deployments health
check_k8s_deployments() {
    log "Checking Kubernetes deployments in namespace: $NAMESPACE"
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
    fi
    
    # Check backend deployment
    BACKEND_READY=$(kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    BACKEND_DESIRED=$(kubectl get deployment bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$BACKEND_READY" -eq "$BACKEND_DESIRED" ] && [ "$BACKEND_READY" -gt 0 ]; then
        success "Backend deployment healthy: $BACKEND_READY/$BACKEND_DESIRED pods ready"
    else
        error "Backend deployment unhealthy: $BACKEND_READY/$BACKEND_DESIRED pods ready"
    fi
    
    # Check frontend deployment
    FRONTEND_READY=$(kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    FRONTEND_DESIRED=$(kubectl get deployment bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$FRONTEND_READY" -eq "$FRONTEND_DESIRED" ] && [ "$FRONTEND_READY" -gt 0 ]; then
        success "Frontend deployment healthy: $FRONTEND_READY/$FRONTEND_DESIRED pods ready"
    else
        error "Frontend deployment unhealthy: $FRONTEND_READY/$FRONTEND_DESIRED pods ready"
    fi
}

# Check pod health
check_pod_health() {
    log "Checking pod health..."
    
    # Get unhealthy pods
    UNHEALTHY_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running -o name 2>/dev/null || true)
    
    if [ -n "$UNHEALTHY_PODS" ]; then
        warning "Found unhealthy pods:"
        echo "$UNHEALTHY_PODS" | while read -r pod; do
            warning "  - $pod"
            kubectl describe "$pod" -n "$NAMESPACE" | grep -A5 "Events:" || true
        done
    else
        success "All pods are healthy"
    fi
    
    # Check restart counts
    HIGH_RESTART_PODS=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}' | awk '$2 > 5 {print $1}' || true)
    
    if [ -n "$HIGH_RESTART_PODS" ]; then
        warning "Pods with high restart counts:"
        echo "$HIGH_RESTART_PODS" | while read -r pod; do
            warning "  - $pod"
        done
    fi
}

# Check service endpoints
check_service_endpoints() {
    log "Checking service endpoints..."
    
    # Check backend service
    BACKEND_ENDPOINTS=$(kubectl get endpoints bookedbarber-backend -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || true)
    if [ -n "$BACKEND_ENDPOINTS" ]; then
        success "Backend service has endpoints: $(echo $BACKEND_ENDPOINTS | wc -w) IPs"
    else
        error "Backend service has no endpoints"
    fi
    
    # Check frontend service
    FRONTEND_ENDPOINTS=$(kubectl get endpoints bookedbarber-frontend -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || true)
    if [ -n "$FRONTEND_ENDPOINTS" ]; then
        success "Frontend service has endpoints: $(echo $FRONTEND_ENDPOINTS | wc -w) IPs"
    else
        error "Frontend service has no endpoints"
    fi
}

# Check application HTTP endpoints
check_http_endpoints() {
    log "Checking HTTP endpoints..."
    
    get_service_urls
    
    # Function to check HTTP endpoint with retry
    check_endpoint() {
        local url=$1
        local description=$2
        local max_attempts=10
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            log "Checking $description (attempt $attempt/$max_attempts): $url"
            
            if curl -f -s --max-time 10 "$url" > /dev/null; then
                success "$description is responding"
                return 0
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                error "$description failed to respond after $max_attempts attempts"
                return 1
            fi
            
            sleep 5
            attempt=$((attempt + 1))
        done
    }
    
    # Check backend health endpoint
    check_endpoint "$BACKEND_URL/health" "Backend health endpoint"
    
    # Check frontend health endpoint
    if ! check_endpoint "$FRONTEND_URL/api/health" "Frontend health endpoint"; then
        # Try alternative frontend check
        check_endpoint "$FRONTEND_URL" "Frontend main page"
    fi
    
    # Check API endpoints
    check_endpoint "$BACKEND_URL/api/v1/services" "Backend API services endpoint"
    check_endpoint "$BACKEND_URL/api/v1/barbers" "Backend API barbers endpoint"
}

# Check database connectivity
check_database_connectivity() {
    log "Checking database connectivity..."
    
    # Run database connectivity test from backend pod
    BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    
    if [ -n "$BACKEND_POD" ]; then
        if kubectl exec "$BACKEND_POD" -n "$NAMESPACE" -- python -c "
import os
from sqlalchemy import create_engine, text
try:
    engine = create_engine(os.environ['DATABASE_URL'])
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        assert result.fetchone()[0] == 1
    print('Database connectivity OK')
except Exception as e:
    print(f'Database connectivity failed: {e}')
    exit(1)
" 2>/dev/null; then
            success "Database connectivity OK"
        else
            error "Database connectivity failed"
        fi
    else
        warning "No backend pod found to test database connectivity"
    fi
}

# Check Redis connectivity
check_redis_connectivity() {
    log "Checking Redis connectivity..."
    
    BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    
    if [ -n "$BACKEND_POD" ]; then
        if kubectl exec "$BACKEND_POD" -n "$NAMESPACE" -- python -c "
import os
import redis
try:
    r = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
    r.ping()
    print('Redis connectivity OK')
except Exception as e:
    print(f'Redis connectivity failed: {e}')
    exit(1)
" 2>/dev/null; then
            success "Redis connectivity OK"
        else
            warning "Redis connectivity failed (not critical)"
        fi
    else
        warning "No backend pod found to test Redis connectivity"
    fi
}

# Check ingress and SSL
check_ingress_ssl() {
    log "Checking ingress and SSL configuration..."
    
    # Check ingress status
    if kubectl get ingress bookedbarber-ingress -n "$NAMESPACE" &> /dev/null; then
        INGRESS_IP=$(kubectl get ingress bookedbarber-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
        if [ -n "$INGRESS_IP" ]; then
            success "Ingress has external IP: $INGRESS_IP"
        else
            warning "Ingress has no external IP"
        fi
        
        # Check SSL certificate
        get_service_urls
        if echo | openssl s_client -connect "$(echo $FRONTEND_URL | sed 's/https\?:\/\///')":443 -servername "$(echo $FRONTEND_URL | sed 's/https\?:\/\///')" 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
            success "SSL certificate is valid"
        else
            warning "SSL certificate check failed or not applicable"
        fi
    else
        warning "No ingress found (may be using different networking)"
    fi
}

# Check resource usage
check_resource_usage() {
    log "Checking resource usage..."
    
    # Check node resources
    kubectl top nodes 2>/dev/null | tail -n +2 | while read -r line; do
        NODE=$(echo "$line" | awk '{print $1}')
        CPU=$(echo "$line" | awk '{print $2}' | sed 's/%//')
        MEMORY=$(echo "$line" | awk '{print $4}' | sed 's/%//')
        
        if [ "$CPU" -gt 80 ]; then
            warning "Node $NODE has high CPU usage: ${CPU}%"
        fi
        
        if [ "$MEMORY" -gt 80 ]; then
            warning "Node $NODE has high memory usage: ${MEMORY}%"
        fi
    done || warning "Could not retrieve node metrics"
    
    # Check pod resources
    kubectl top pods -n "$NAMESPACE" 2>/dev/null | tail -n +2 | while read -r line; do
        POD=$(echo "$line" | awk '{print $1}')
        CPU=$(echo "$line" | awk '{print $2}' | sed 's/m//')
        MEMORY=$(echo "$line" | awk '{print $3}' | sed 's/Mi//')
        
        # Check if CPU usage is above 500m (0.5 cores)
        if [ "$CPU" -gt 500 ]; then
            warning "Pod $POD has high CPU usage: ${CPU}m"
        fi
        
        # Check if memory usage is above 1024Mi (1GB)
        if [ "$MEMORY" -gt 1024 ]; then
            warning "Pod $POD has high memory usage: ${MEMORY}Mi"
        fi
    done || warning "Could not retrieve pod metrics"
}

# Check logs for errors
check_application_logs() {
    log "Checking application logs for errors..."
    
    # Check backend logs for errors
    BACKEND_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend -o jsonpath='{.items[*].metadata.name}')
    for pod in $BACKEND_PODS; do
        ERROR_COUNT=$(kubectl logs "$pod" -n "$NAMESPACE" --tail=100 | grep -i "error\|exception\|traceback\|failed" | wc -l || echo "0")
        if [ "$ERROR_COUNT" -gt 5 ]; then
            warning "Backend pod $pod has $ERROR_COUNT recent errors"
        fi
    done
    
    # Check frontend logs for errors
    FRONTEND_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-frontend -o jsonpath='{.items[*].metadata.name}')
    for pod in $FRONTEND_PODS; do
        ERROR_COUNT=$(kubectl logs "$pod" -n "$NAMESPACE" --tail=100 | grep -i "error\|exception\|failed" | wc -l || echo "0")
        if [ "$ERROR_COUNT" -gt 5 ]; then
            warning "Frontend pod $pod has $ERROR_COUNT recent errors"
        fi
    done
}

# Generate health report
generate_health_report() {
    log "Generating health report..."
    
    REPORT_FILE="/tmp/health-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" << EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "health_checks": {
    "kubernetes_deployments": "$(check_k8s_deployments &>/dev/null && echo "healthy" || echo "unhealthy")",
    "pod_health": "$(check_pod_health &>/dev/null && echo "healthy" || echo "degraded")",
    "service_endpoints": "$(check_service_endpoints &>/dev/null && echo "healthy" || echo "unhealthy")",
    "http_endpoints": "$(check_http_endpoints &>/dev/null && echo "healthy" || echo "unhealthy")",
    "database_connectivity": "$(check_database_connectivity &>/dev/null && echo "healthy" || echo "unhealthy")",
    "redis_connectivity": "$(check_redis_connectivity &>/dev/null && echo "healthy" || echo "degraded")"
  },
  "overall_status": "healthy"
}
EOF
    
    # Determine overall status
    if grep -q "unhealthy" "$REPORT_FILE"; then
        sed -i 's/"overall_status": "healthy"/"overall_status": "unhealthy"/' "$REPORT_FILE"
    elif grep -q "degraded" "$REPORT_FILE"; then
        sed -i 's/"overall_status": "healthy"/"overall_status": "degraded"/' "$REPORT_FILE"
    fi
    
    log "Health report generated: $REPORT_FILE"
    cat "$REPORT_FILE"
}

# Main execution
main() {
    log "Starting health check for environment: $ENVIRONMENT"
    log "Timeout: ${TIMEOUT}s"
    
    # Check if we're running in Kubernetes context
    if ! kubectl version --client &> /dev/null; then
        warning "kubectl not available, running basic HTTP checks only"
        check_http_endpoints
        return
    fi
    
    # Run all health checks
    check_k8s_deployments
    check_pod_health
    check_service_endpoints
    check_http_endpoints
    check_database_connectivity
    check_redis_connectivity
    check_ingress_ssl
    check_resource_usage
    check_application_logs
    generate_health_report
    
    success "Health check completed for environment: $ENVIRONMENT"
}

# Run with timeout
timeout "$TIMEOUT" main "$@" || error "Health check timed out after ${TIMEOUT}s"