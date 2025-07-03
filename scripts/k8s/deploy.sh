#!/bin/bash
# BookedBarber V2 Kubernetes Deployment Script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
NAMESPACE="bookedbarber"
DRY_RUN=false
SKIP_BUILD=false
REGISTRY="docker.io"
HELM_TIMEOUT="600s"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy BookedBarber V2 to Kubernetes cluster

OPTIONS:
    -e, --environment ENVIRONMENT    Environment to deploy (development|staging|production) [default: development]
    -n, --namespace NAMESPACE        Kubernetes namespace [default: bookedbarber]
    -r, --registry REGISTRY         Docker registry [default: docker.io]
    -d, --dry-run                   Perform a dry run without making changes
    -s, --skip-build                Skip Docker image building
    -t, --timeout TIMEOUT          Helm timeout [default: 600s]
    -h, --help                      Show this help message

EXAMPLES:
    # Deploy to development
    $0 -e development
    
    # Deploy to staging with custom registry
    $0 -e staging -r my-registry.com/bookedbarber
    
    # Production deployment with dry run
    $0 -e production -d
    
    # Deploy with custom namespace
    $0 -e staging -n bookedbarber-staging

PREREQUISITES:
    - kubectl configured for your cluster
    - helm 3.x installed
    - Docker daemon running (unless --skip-build)
    - Access to Docker registry
    - Cluster has ingress-nginx controller installed
    - cert-manager installed (for production)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -t|--timeout)
            HELM_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_status "Deploying BookedBarber V2 to $ENVIRONMENT environment"
print_status "Namespace: $NAMESPACE"
print_status "Registry: $REGISTRY"

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    print_error "helm is not installed or not in PATH"
    exit 1
fi

if ! command -v docker &> /dev/null && [ "$SKIP_BUILD" = false ]; then
    print_error "docker is not installed or not in PATH"
    exit 1
fi

# Check kubectl context
CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
print_status "Current kubectl context: $CURRENT_CONTEXT"

if [ "$ENVIRONMENT" = "production" ]; then
    read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
fi

# Build Docker images
if [ "$SKIP_BUILD" = false ]; then
    print_status "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    print_status "Building backend image..."
    docker build -f docker/backend/Dockerfile.prod -t "$REGISTRY/bookedbarber/backend:$ENVIRONMENT" .
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -f docker/frontend/Dockerfile.prod -t "$REGISTRY/bookedbarber/frontend:$ENVIRONMENT" .
    
    # Build worker image
    print_status "Building worker image..."
    docker build -f docker/worker/Dockerfile -t "$REGISTRY/bookedbarber/worker:$ENVIRONMENT" .
    
    # Push images if not local registry
    if [[ "$REGISTRY" != "localhost"* ]]; then
        print_status "Pushing images to registry..."
        docker push "$REGISTRY/bookedbarber/backend:$ENVIRONMENT"
        docker push "$REGISTRY/bookedbarber/frontend:$ENVIRONMENT"
        docker push "$REGISTRY/bookedbarber/worker:$ENVIRONMENT"
    fi
    
    print_success "Docker images built and pushed"
fi

# Create namespace if it doesn't exist
print_status "Creating namespace if it doesn't exist..."
if [ "$DRY_RUN" = false ]; then
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
else
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml
fi

# Add helm repositories
print_status "Adding Helm repositories..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install cert-manager for production
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Installing/upgrading cert-manager..."
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.13.0 \
        --set installCRDs=true \
        ${DRY_RUN:+--dry-run}
fi

# Install ingress-nginx if needed
print_status "Installing/upgrading ingress-nginx..."
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    ${DRY_RUN:+--dry-run}

# Deploy application with Helm
print_status "Deploying BookedBarber V2 with Helm..."

HELM_ARGS=(
    "upgrade" "--install" "bookedbarber"
    "$PROJECT_ROOT/helm/bookedbarber"
    "--namespace" "$NAMESPACE"
    "--timeout" "$HELM_TIMEOUT"
    "--values" "$PROJECT_ROOT/helm/bookedbarber/values-$ENVIRONMENT.yaml"
    "--set" "image.registry=$REGISTRY"
    "--set" "backend.image.tag=$ENVIRONMENT"
    "--set" "frontend.image.tag=$ENVIRONMENT"
    "--set" "worker.image.tag=$ENVIRONMENT"
)

if [ "$DRY_RUN" = true ]; then
    HELM_ARGS+=("--dry-run")
fi

# Environment-specific configurations
case $ENVIRONMENT in
    development)
        print_warning "Using development configuration - not suitable for production!"
        ;;
    staging)
        print_status "Using staging configuration"
        ;;
    production)
        print_status "Using production configuration"
        # Add production-specific settings
        HELM_ARGS+=(
            "--set" "postgresql.enabled=false"
            "--set" "redis.enabled=false"
        )
        print_warning "Ensure external database and Redis are configured!"
        ;;
esac

# Execute Helm deployment
helm "${HELM_ARGS[@]}"

if [ "$DRY_RUN" = false ]; then
    print_success "BookedBarber V2 deployed successfully!"
    
    # Wait for deployment to be ready
    print_status "Waiting for deployments to be ready..."
    kubectl -n "$NAMESPACE" wait --for=condition=available --timeout=300s deployment/bookedbarber-backend
    kubectl -n "$NAMESPACE" wait --for=condition=available --timeout=300s deployment/bookedbarber-frontend
    kubectl -n "$NAMESPACE" wait --for=condition=available --timeout=300s deployment/bookedbarber-worker
    
    # Show status
    print_status "Deployment status:"
    kubectl -n "$NAMESPACE" get pods,svc,ingress
    
    # Show access information
    print_status "Access information:"
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "Application: http://bookedbarber.local"
    else
        echo "Application: https://bookedbarber.com"
        echo "API: https://api.bookedbarber.com"
    fi
    
    print_success "Deployment completed successfully!"
else
    print_success "Dry run completed successfully!"
fi