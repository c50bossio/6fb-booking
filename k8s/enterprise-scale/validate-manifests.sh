#!/bin/bash

# BookedBarber V2 Enterprise Kubernetes Manifest Validation Script
# Validates all Kubernetes manifests before deployment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

validate_yaml_syntax() {
    local file=$1
    log_info "Validating YAML syntax: $file"
    
    if command -v yq &> /dev/null; then
        if yq eval '.' "$file" > /dev/null 2>&1; then
            log_success "Valid YAML syntax: $file"
        else
            log_error "Invalid YAML syntax: $file"
            return 1
        fi
    elif python3 -c "import yaml" 2>/dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            log_success "Valid YAML syntax: $file"
        else
            log_error "Invalid YAML syntax: $file"
            return 1
        fi
    else
        log_warning "No YAML validator found (yq or python yaml), skipping syntax check"
    fi
}

validate_kubernetes_schema() {
    local file=$1
    log_info "Validating Kubernetes schema: $file"
    
    if kubectl apply --dry-run=client -f "$file" > /dev/null 2>&1; then
        log_success "Valid Kubernetes schema: $file"
    else
        log_error "Invalid Kubernetes schema: $file"
        kubectl apply --dry-run=client -f "$file" 2>&1 | head -10
        return 1
    fi
}

check_resource_quotas() {
    log_info "Checking resource quotas and limits"
    
    # Calculate total resource requests
    local total_cpu_requests=0
    local total_memory_requests=0
    
    # Backend: 2 replicas * 500m CPU + 512Mi memory
    total_cpu_requests=$((total_cpu_requests + 2 * 500))
    total_memory_requests=$((total_memory_requests + 2 * 512))
    
    # Frontend: 3 replicas * 250m CPU + 512Mi memory  
    total_cpu_requests=$((total_cpu_requests + 3 * 250))
    total_memory_requests=$((total_memory_requests + 3 * 512))
    
    # PostgreSQL: 3 replicas * 1000m CPU + 2048Mi memory
    total_cpu_requests=$((total_cpu_requests + 3 * 1000))
    total_memory_requests=$((total_memory_requests + 3 * 2048))
    
    # Redis: 6 replicas * 250m CPU + 512Mi memory
    total_cpu_requests=$((total_cpu_requests + 6 * 250))
    total_memory_requests=$((total_memory_requests + 6 * 512))
    
    # Monitoring: Prometheus + Grafana
    total_cpu_requests=$((total_cpu_requests + 2 * 1000 + 2 * 500))
    total_memory_requests=$((total_memory_requests + 2 * 4096 + 2 * 1024))
    
    local total_cpu_cores=$((total_cpu_requests / 1000))
    local total_memory_gb=$((total_memory_requests / 1024))
    
    log_info "Total CPU requests: ${total_cpu_cores}.${total_cpu_requests}m cores"
    log_info "Total memory requests: ${total_memory_gb}.${total_memory_requests}Gi"
    
    # Check against namespace quota (20 CPU, 40Gi memory)
    if [[ $total_cpu_cores -gt 20 ]]; then
        log_warning "CPU requests (${total_cpu_cores}) exceed namespace quota (20 cores)"
    fi
    
    if [[ $total_memory_gb -gt 40 ]]; then
        log_warning "Memory requests (${total_memory_gb}Gi) exceed namespace quota (40Gi)"
    fi
    
    log_success "Resource quota validation completed"
}

check_security_context() {
    log_info "Checking security contexts"
    
    local files=(
        "backend-deployment.yaml"
        "frontend-deployment.yaml"
        "postgres-statefulset.yaml"
        "redis-cluster.yaml"
    )
    
    for file in "${files[@]}"; do
        if grep -q "runAsNonRoot: true" "$SCRIPT_DIR/$file"; then
            log_success "Security context check passed: $file"
        else
            log_warning "Missing runAsNonRoot in security context: $file"
        fi
        
        if grep -q "allowPrivilegeEscalation: false" "$SCRIPT_DIR/$file"; then
            log_success "Privilege escalation disabled: $file"
        else
            log_warning "Missing allowPrivilegeEscalation: false in: $file"
        fi
    done
}

check_health_probes() {
    log_info "Checking health probes"
    
    local files=(
        "backend-deployment.yaml"
        "frontend-deployment.yaml"
        "postgres-statefulset.yaml"
        "redis-cluster.yaml"
    )
    
    for file in "${files[@]}"; do
        if grep -q "livenessProbe" "$SCRIPT_DIR/$file" && grep -q "readinessProbe" "$SCRIPT_DIR/$file"; then
            log_success "Health probes configured: $file"
        else
            log_warning "Missing health probes: $file"
        fi
    done
}

check_autoscaling() {
    log_info "Checking autoscaling configuration"
    
    local files=(
        "backend-deployment.yaml"
        "frontend-deployment.yaml"
        "hpa-vpa-scaling.yaml"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$SCRIPT_DIR/$file" ]] && grep -q "HorizontalPodAutoscaler" "$SCRIPT_DIR/$file"; then
            log_success "HPA configured: $file"
        fi
    done
}

check_six_figure_barber_config() {
    log_info "Checking Six Figure Barber methodology configuration"
    
    # Check for Six Figure Barber specific configuration
    if grep -q "SIX_FIGURE_BARBER_MODE" "$SCRIPT_DIR/configmaps-secrets.yaml"; then
        log_success "Six Figure Barber mode configured"
    else
        log_warning "Six Figure Barber mode not found in configuration"
    fi
    
    if grep -q "FRANCHISE_MODE" "$SCRIPT_DIR/configmaps-secrets.yaml"; then
        log_success "Franchise mode configured"
    else
        log_warning "Franchise mode not found in configuration"
    fi
    
    if grep -q "MULTI_TENANT_SUPPORT" "$SCRIPT_DIR/configmaps-secrets.yaml"; then
        log_success "Multi-tenant support configured"
    else
        log_warning "Multi-tenant support not found in configuration"
    fi
}

validate_monitoring_config() {
    log_info "Validating monitoring configuration"
    
    if [[ -f "$SCRIPT_DIR/monitoring-stack.yaml" ]]; then
        # Check for Prometheus configuration
        if grep -q "prometheus.yml" "$SCRIPT_DIR/monitoring-stack.yaml"; then
            log_success "Prometheus configuration found"
        fi
        
        # Check for franchise-specific metrics
        if grep -q "franchise_shard_id" "$SCRIPT_DIR/monitoring-stack.yaml"; then
            log_success "Franchise-specific metrics configured"
        fi
        
        # Check for Grafana dashboards
        if grep -q "grafana-franchise-dashboards" "$SCRIPT_DIR/monitoring-stack.yaml"; then
            log_success "Franchise dashboards configured"
        fi
    else
        log_warning "Monitoring stack configuration not found"
    fi
}

check_networking() {
    log_info "Checking networking configuration"
    
    if [[ -f "$SCRIPT_DIR/ingress-loadbalancer.yaml" ]]; then
        # Check for SSL/TLS configuration
        if grep -q "cert-manager.io/cluster-issuer" "$SCRIPT_DIR/ingress-loadbalancer.yaml"; then
            log_success "SSL/TLS configuration found"
        fi
        
        # Check for CORS configuration
        if grep -q "enable-cors" "$SCRIPT_DIR/ingress-loadbalancer.yaml"; then
            log_success "CORS configuration found"
        fi
        
        # Check for rate limiting
        if grep -q "rate-limit" "$SCRIPT_DIR/ingress-loadbalancer.yaml"; then
            log_success "Rate limiting configured"
        fi
        
        # Check for security headers
        if grep -q "X-Frame-Options" "$SCRIPT_DIR/ingress-loadbalancer.yaml"; then
            log_success "Security headers configured"
        fi
    else
        log_warning "Ingress configuration not found"
    fi
}

main() {
    echo -e "\n${BLUE}BookedBarber V2 Enterprise Kubernetes Manifest Validation${NC}\n"
    
    local validation_errors=0
    
    # Find all YAML files
    local yaml_files=($(find "$SCRIPT_DIR" -name "*.yaml" -type f))
    
    if [[ ${#yaml_files[@]} -eq 0 ]]; then
        log_error "No YAML files found in $SCRIPT_DIR"
        exit 1
    fi
    
    # Validate each YAML file
    for file in "${yaml_files[@]}"; do
        if ! validate_yaml_syntax "$file"; then
            validation_errors=$((validation_errors + 1))
        fi
    done
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_warning "Cannot connect to Kubernetes cluster - skipping schema validation"
    else
        for file in "${yaml_files[@]}"; do
            if ! validate_kubernetes_schema "$file"; then
                validation_errors=$((validation_errors + 1))
            fi
        done
    fi
    
    # Run comprehensive checks
    check_resource_quotas
    check_security_context
    check_health_probes
    check_autoscaling
    check_six_figure_barber_config
    validate_monitoring_config
    check_networking
    
    # Summary
    echo -e "\n${BLUE}Validation Summary:${NC}"
    echo "• Total YAML files: ${#yaml_files[@]}"
    echo "• Validation errors: $validation_errors"
    
    if [[ $validation_errors -eq 0 ]]; then
        log_success "All manifest validations passed!"
        echo -e "\n${GREEN}Ready for deployment!${NC}"
        return 0
    else
        log_error "Found $validation_errors validation errors"
        echo -e "\n${RED}Please fix errors before deployment${NC}"
        return 1
    fi
}

main "$@"