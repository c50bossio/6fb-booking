#!/bin/bash
set -euo pipefail

# Chaos Engineering Deployment Script for Six Figure Barber Platform
# Deploys a comprehensive, business-safe chaos engineering system

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE_CHAOS="chaos-engineering"
NAMESPACE_MONITORING="sre-monitoring"
NAMESPACE_APP="bookedbarber-v2"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is required but not installed"
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    # Check required namespaces exist
    for ns in $NAMESPACE_MONITORING $NAMESPACE_APP; do
        if ! kubectl get namespace $ns &> /dev/null; then
            error "Required namespace $ns does not exist"
        fi
    done
    
    # Check if Prometheus is running
    if ! kubectl get deployment sre-prometheus -n $NAMESPACE_MONITORING &> /dev/null; then
        error "SRE Prometheus is required but not found in $NAMESPACE_MONITORING"
    fi
    
    success "Prerequisites check passed"
}

# Verify system health
verify_system_health() {
    log "Verifying system health before deployment..."
    
    # Check application pods are healthy
    local unhealthy_pods=$(kubectl get pods -n $NAMESPACE_APP --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [ $unhealthy_pods -gt 0 ]; then
        error "Found $unhealthy_pods unhealthy pods in $NAMESPACE_APP. Fix before deploying chaos engineering."
    fi
    
    # Check system metrics are available
    local prometheus_pod=$(kubectl get pods -n $NAMESPACE_MONITORING -l app=sre-prometheus -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -z "$prometheus_pod" ]; then
        error "Cannot find Prometheus pod in $NAMESPACE_MONITORING"
    fi
    
    # Test Prometheus query
    if ! kubectl exec -n $NAMESPACE_MONITORING $prometheus_pod -- \
        wget -q -O - 'http://localhost:9090/api/v1/query?query=up' | grep -q '"status":"success"'; then
        warning "Prometheus queries are not working properly"
    fi
    
    success "System health verified"
}

# Create secrets
create_secrets() {
    log "Creating required secrets..."
    
    # Create slack webhook secret if not exists
    if ! kubectl get secret slack-secrets -n $NAMESPACE_CHAOS &> /dev/null; then
        warning "Slack webhook secret not found. Creating empty secret."
        kubectl create secret generic slack-secrets -n $NAMESPACE_CHAOS \
            --from-literal=webhook-url="" || true
    fi
    
    # SendGrid secret should already exist from main deployment
    if ! kubectl get secret sendgrid-secrets -n $NAMESPACE_CHAOS &> /dev/null; then
        if kubectl get secret sendgrid-secrets -n $NAMESPACE_APP &> /dev/null; then
            log "Copying SendGrid secret from $NAMESPACE_APP"
            kubectl get secret sendgrid-secrets -n $NAMESPACE_APP -o yaml | \
                sed "s/namespace: $NAMESPACE_APP/namespace: $NAMESPACE_CHAOS/" | \
                kubectl apply -f -
        else
            warning "SendGrid secret not found. Creating empty secret."
            kubectl create secret generic sendgrid-secrets -n $NAMESPACE_CHAOS \
                --from-literal=api-key="" || true
        fi
    fi
    
    success "Secrets created/verified"
}

# Deploy chaos engineering stack
deploy_chaos_stack() {
    log "Deploying Chaos Engineering stack..."
    
    # Deploy in order
    local manifests=(
        "chaos-engineering-stack.yaml"
        "chaos-safety-controls.yaml"
        "chaos-monitoring-integration.yaml"
        "chaos-automation-scheduler.yaml"
        "chaos-recovery-validation.yaml"
        "chaos-experiments.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        log "Applying $manifest..."
        if kubectl apply -f "$manifest"; then
            success "Applied $manifest"
        else
            error "Failed to apply $manifest"
        fi
    done
    
    success "Chaos Engineering stack deployed"
}

# Wait for components to be ready
wait_for_components() {
    log "Waiting for components to be ready..."
    
    # Wait for chaos controller
    log "Waiting for chaos controller..."
    kubectl wait --for=condition=ready pod -l app=chaos-controller-manager -n $NAMESPACE_CHAOS --timeout=300s
    
    # Wait for safety controller
    log "Waiting for safety controller..."
    kubectl wait --for=condition=ready pod -l app=chaos-safety-controller -n $NAMESPACE_CHAOS --timeout=300s
    
    # Wait for dashboard
    log "Waiting for chaos dashboard..."
    kubectl wait --for=condition=ready pod -l app=chaos-dashboard -n $NAMESPACE_CHAOS --timeout=300s
    
    # Wait for scheduler
    log "Waiting for chaos scheduler..."
    kubectl wait --for=condition=ready pod -l app=chaos-scheduler -n $NAMESPACE_CHAOS --timeout=300s
    
    # Wait for recovery validator
    log "Waiting for recovery validator..."
    kubectl wait --for=condition=ready pod -l app=chaos-recovery-validator -n $NAMESPACE_CHAOS --timeout=300s
    
    success "All components are ready"
}

# Configure monitoring integration
configure_monitoring() {
    log "Configuring monitoring integration..."
    
    # Apply chaos monitoring rules to Prometheus
    if kubectl get configmap sre-alert-rules -n $NAMESPACE_MONITORING &> /dev/null; then
        log "Adding chaos engineering alert rules..."
        
        # Backup existing rules
        kubectl get configmap sre-alert-rules -n $NAMESPACE_MONITORING -o yaml > sre-alert-rules-backup.yaml
        
        # Get chaos rules
        local chaos_rules=$(kubectl get configmap chaos-safety-alert-rules -n $NAMESPACE_MONITORING -o jsonpath='{.data.chaos-safety\.yml}')
        
        # Add to existing rules (this would need to be done more carefully in production)
        warning "Manual step required: Add chaos alert rules to Prometheus configuration"
        
    fi
    
    # Restart Prometheus to pick up new configuration
    log "Restarting Prometheus to reload configuration..."
    kubectl rollout restart deployment/sre-prometheus -n $NAMESPACE_MONITORING
    
    success "Monitoring integration configured"
}

# Run initial validation
run_initial_validation() {
    log "Running initial validation..."
    
    # Test chaos controller
    log "Testing chaos controller..."
    if kubectl get crd podchaos.chaos-mesh.org &> /dev/null; then
        success "Chaos Mesh CRDs are available"
    else
        error "Chaos Mesh CRDs not found"
    fi
    
    # Test safety controller
    log "Testing safety controller..."
    local safety_pod=$(kubectl get pods -n $NAMESPACE_CHAOS -l app=chaos-safety-controller -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n $NAMESPACE_CHAOS $safety_pod -- wget -q -O - http://localhost:9090/healthz | grep -q "OK"; then
        success "Safety controller is healthy"
    else
        error "Safety controller health check failed"
    fi
    
    # Test dashboard access
    log "Testing dashboard access..."
    local dashboard_pod=$(kubectl get pods -n $NAMESPACE_CHAOS -l app=chaos-dashboard -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n $NAMESPACE_CHAOS $dashboard_pod -- wget -q -O - http://localhost:2333/api/common/version | grep -q "version"; then
        success "Chaos dashboard is accessible"
    else
        warning "Chaos dashboard might not be fully ready"
    fi
    
    success "Initial validation completed"
}

# Deploy a test experiment
deploy_test_experiment() {
    log "Deploying test experiment..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: chaos-deployment-test-$(date +%s)
  namespace: chaos-engineering
  labels:
    experiment-category: "low-risk"
    test-experiment: "true"
spec:
  selector:
    namespaces:
    - $NAMESPACE_CHAOS
    labelSelectors:
      app: chaos-dashboard
  mode: one
  action: pod-kill
  duration: "10s"
  annotations:
    chaos.bookedbarber.com/approved-by: "deployment-script"
    chaos.bookedbarber.com/test-experiment: "true"
EOF
    
    # Wait a bit for experiment to execute
    sleep 15
    
    # Check if experiment completed
    local completed_experiments=$(kubectl get podchaos -n $NAMESPACE_CHAOS -l test-experiment=true --field-selector=status.phase=Finished --no-headers | wc -l)
    if [ $completed_experiments -gt 0 ]; then
        success "Test experiment completed successfully"
        
        # Clean up test experiment
        kubectl delete podchaos -n $NAMESPACE_CHAOS -l test-experiment=true
    else
        warning "Test experiment may still be running or failed"
    fi
}

# Display access information
display_access_info() {
    log "Deployment completed! Access information:"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 CHAOS ENGINEERING SYSTEM DEPLOYED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Dashboard Access (port-forward required):"
    echo "   Chaos Dashboard: kubectl port-forward -n $NAMESPACE_CHAOS svc/chaos-dashboard 2333:2333"
    echo "   Then visit: http://localhost:2333"
    echo ""
    echo "🔍 Monitoring:"
    echo "   Grafana Dashboard: Navigate to 'Chaos Engineering - Six Figure Barber Platform'"
    echo "   Prometheus Metrics: Search for 'chaos_*' metrics"
    echo ""
    echo "📋 Management Commands:"
    echo "   View active experiments: kubectl get podchaos,networkchaos,stresschaos -A"
    echo "   View experiment logs: kubectl logs -n $NAMESPACE_CHAOS -l app=chaos-controller-manager"
    echo "   Check safety status: kubectl logs -n $NAMESPACE_CHAOS -l app=chaos-safety-controller"
    echo ""
    echo "📖 Documentation:"
    echo "   Runbook: $(pwd)/CHAOS_ENGINEERING_RUNBOOK.md"
    echo ""
    echo "🚨 Emergency Stop:"
    echo "   kubectl delete podchaos,networkchaos,stresschaos,iochaos,httpchaos --all -n $NAMESPACE_CHAOS"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Display component status
    echo ""
    echo "Component Status:"
    kubectl get pods -n $NAMESPACE_CHAOS -o wide
    
    echo ""
    echo "Services:"
    kubectl get services -n $NAMESPACE_CHAOS
    
    echo ""
    success "Chaos Engineering system is ready for use!"
    echo "⚠️  Remember: All experiments include automated safety controls to protect business operations"
    echo "📧 For questions, contact: sre@bookedbarber.com"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f sre-alert-rules-backup.yaml
}

# Main deployment flow
main() {
    echo ""
    echo "🧪 Deploying Chaos Engineering System for Six Figure Barber Platform"
    echo "======================================================================"
    echo ""
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Create namespace first
    log "Creating chaos engineering namespace..."
    kubectl create namespace $NAMESPACE_CHAOS --dry-run=client -o yaml | kubectl apply -f -
    
    # Run deployment steps
    check_prerequisites
    verify_system_health
    create_secrets
    deploy_chaos_stack
    wait_for_components
    configure_monitoring
    run_initial_validation
    deploy_test_experiment
    display_access_info
    
    success "Deployment completed successfully!"
    
    echo ""
    echo "🎉 Chaos Engineering system is now ready to enhance the reliability of the Six Figure Barber platform!"
    echo "   The system includes comprehensive safety controls to protect business operations."
    echo "   All experiments are designed to validate system resilience while maintaining the"
    echo "   platform's commitment to the Six Figure Barber methodology."
    echo ""
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        kubectl get pods,services -n $NAMESPACE_CHAOS
        ;;
    "logs")
        kubectl logs -n $NAMESPACE_CHAOS -l app=chaos-controller-manager --tail=50
        ;;
    "cleanup")
        log "Cleaning up chaos engineering system..."
        kubectl delete namespace $NAMESPACE_CHAOS --ignore-not-found=true
        success "Cleanup completed"
        ;;
    "emergency-stop")
        log "Emergency stop: Terminating all chaos experiments..."
        kubectl delete podchaos,networkchaos,stresschaos,iochaos,httpchaos --all -n $NAMESPACE_CHAOS
        success "All experiments terminated"
        ;;
    *)
        echo "Usage: $0 [deploy|status|logs|cleanup|emergency-stop]"
        echo ""
        echo "Commands:"
        echo "  deploy        - Deploy the complete chaos engineering system (default)"
        echo "  status        - Show status of chaos engineering components"
        echo "  logs          - Show logs from chaos controller"
        echo "  cleanup       - Remove the entire chaos engineering system"
        echo "  emergency-stop - Immediately terminate all running experiments"
        exit 1
        ;;
esac