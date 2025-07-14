#!/bin/bash

# BookedBarber V2 Production Deployment Script
# This script deploys the complete BookedBarber V2 stack to Kubernetes

set -euo pipefail

# Configuration
NAMESPACE="bookedbarber-v2"
IMAGE_TAG="${IMAGE_TAG:-v2.0.0}"
REGISTRY="${REGISTRY:-bookedbarber}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    fi
    
    log_success "Prerequisites check passed"
}

# Validate secrets configuration
validate_secrets() {
    log_info "Validating secrets configuration..."
    
    if grep -q "REPLACE_WITH_ACTUAL" k8s/secrets.yaml; then
        log_error "Secrets file contains placeholder values. Please update k8s/secrets.yaml with production values."
        exit 1
    fi
    
    log_success "Secrets validation passed"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Build image
    docker build -t "${REGISTRY}/backend:${IMAGE_TAG}" .
    docker tag "${REGISTRY}/backend:${IMAGE_TAG}" "${REGISTRY}/backend:latest"
    
    # Push image
    docker push "${REGISTRY}/backend:${IMAGE_TAG}"
    docker push "${REGISTRY}/backend:latest"
    
    log_success "Docker image built and pushed: ${REGISTRY}/backend:${IMAGE_TAG}"
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Create namespace
    kubectl apply -f k8s/namespace.yaml
    
    # Apply configuration
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    
    # Deploy PostgreSQL
    log_info "Deploying PostgreSQL..."
    kubectl apply -f k8s/postgres-deployment.yaml
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    
    # Deploy Redis
    log_info "Deploying Redis..."
    kubectl apply -f k8s/redis-deployment.yaml
    
    # Wait for Redis to be ready
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    log_success "Infrastructure components deployed successfully"
}

# Deploy application services
deploy_application() {
    log_info "Deploying application services..."
    
    # Update image tag in deployment
    sed -i.bak "s|image: bookedbarber/backend:latest|image: ${REGISTRY}/backend:${IMAGE_TAG}|g" k8s/backend-deployment.yaml
    sed -i.bak "s|image: bookedbarber/backend:latest|image: ${REGISTRY}/backend:${IMAGE_TAG}|g" k8s/celery-deployment.yaml
    
    # Deploy backend
    log_info "Deploying backend API..."
    kubectl apply -f k8s/backend-deployment.yaml
    
    # Wait for backend to be ready
    log_info "Waiting for backend to be ready..."
    kubectl wait --for=condition=ready pod -l app=bookedbarber-backend -n $NAMESPACE --timeout=300s
    
    # Deploy Celery workers
    log_info "Deploying Celery workers..."
    kubectl apply -f k8s/celery-deployment.yaml
    
    # Wait for Celery workers to be ready
    log_info "Waiting for Celery workers to be ready..."
    kubectl wait --for=condition=ready pod -l app=celery-worker -n $NAMESPACE --timeout=300s
    
    # Restore original deployment files
    mv k8s/backend-deployment.yaml.bak k8s/backend-deployment.yaml
    mv k8s/celery-deployment.yaml.bak k8s/celery-deployment.yaml
    
    log_success "Application services deployed successfully"
}

# Deploy networking
deploy_networking() {
    log_info "Deploying networking components..."
    
    # Apply network policies
    kubectl apply -f k8s/network-policies.yaml
    
    # Deploy ingress
    kubectl apply -f k8s/ingress.yaml
    
    log_success "Networking components deployed successfully"
}

# Deploy monitoring
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    kubectl apply -f k8s/monitoring.yaml
    
    log_success "Monitoring stack deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check all pods are running
    log_info "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    # Check services
    log_info "Checking service status..."
    kubectl get services -n $NAMESPACE
    
    # Check ingress
    log_info "Checking ingress status..."
    kubectl get ingress -n $NAMESPACE
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=bookedbarber-backend -o jsonpath='{.items[0].metadata.name}')
    
    if kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/health; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
    
    # Check HPA status
    log_info "Checking HPA status..."
    kubectl get hpa -n $NAMESPACE
    
    log_success "Deployment verification completed successfully"
}

# Cleanup function
cleanup() {
    if [ "$DRY_RUN" = "true" ]; then
        log_info "Dry run mode - no cleanup needed"
        return
    fi
    
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here
}

# Main deployment function
main() {
    log_info "Starting BookedBarber V2 production deployment..."
    log_info "Configuration: NAMESPACE=$NAMESPACE, IMAGE_TAG=$IMAGE_TAG, REGISTRY=$REGISTRY"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_warning "Running in DRY RUN mode - no actual deployment will occur"
    fi
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    validate_secrets
    
    if [ "$DRY_RUN" != "true" ]; then
        build_and_push_image
        deploy_infrastructure
        deploy_application
        deploy_networking
        deploy_monitoring
        verify_deployment
    else
        log_info "Skipping actual deployment due to DRY_RUN=true"
    fi
    
    log_success "BookedBarber V2 deployment completed successfully!"
    
    # Display access information
    echo ""
    echo "================================================"
    echo "           Deployment Summary"
    echo "================================================"
    echo "Namespace: $NAMESPACE"
    echo "Image: ${REGISTRY}/backend:${IMAGE_TAG}"
    echo ""
    echo "Access URLs (after DNS configuration):"
    echo "  API: https://api.bookedbarber.com"
    echo "  Admin: https://admin.bookedbarber.com/flower"
    echo ""
    echo "Monitoring:"
    echo "  kubectl port-forward svc/prometheus-service 9090:9090 -n $NAMESPACE"
    echo "  kubectl port-forward svc/celery-flower-service 5555:5555 -n $NAMESPACE"
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods -n $NAMESPACE"
    echo "  kubectl logs -f deployment/bookedbarber-backend -n $NAMESPACE"
    echo "  kubectl exec -it deployment/bookedbarber-backend -n $NAMESPACE -- bash"
    echo "================================================"
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --dry-run          Run in dry run mode (no actual deployment)"
            echo "  --image-tag TAG    Docker image tag to deploy (default: v2.0.0)"
            echo "  --registry REG     Docker registry (default: bookedbarber)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main