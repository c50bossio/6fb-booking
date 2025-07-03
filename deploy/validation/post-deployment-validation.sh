#!/bin/bash

# Post-Deployment Validation Script
# Comprehensive validation of deployment health and functionality

set -e

# Configuration
ENVIRONMENT=${1:-production}
BASE_URL=${2:-"https://bookedbarber.com"}
API_URL=${3:-"https://api.bookedbarber.com"}
TIMEOUT=${TIMEOUT:-30}
RETRIES=${RETRIES:-5}
VALIDATION_WAIT=${VALIDATION_WAIT:-60}

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
    exit 1
}

# Validation results tracking
VALIDATION_RESULTS=()
FAILED_VALIDATIONS=0
TOTAL_VALIDATIONS=0

add_validation_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_VALIDATIONS=$((TOTAL_VALIDATIONS + 1))
    
    if [ "$status" = "PASS" ]; then
        success "$test_name: $message"
        VALIDATION_RESULTS+=("✅ $test_name: $message")
    else
        warning "$test_name: $message"
        VALIDATION_RESULTS+=("❌ $test_name: $message")
        FAILED_VALIDATIONS=$((FAILED_VALIDATIONS + 1))
    fi
}

# HTTP request with retries
http_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local max_retries="${3:-$RETRIES}"
    local wait_time="${4:-5}"
    
    for i in $(seq 1 $max_retries); do
        local response
        local status_code
        
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        status_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
        
        if [ "$status_code" = "$expected_status" ]; then
            echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//'
            return 0
        fi
        
        if [ $i -lt $max_retries ]; then
            log "Attempt $i failed (status: $status_code), retrying in ${wait_time}s..."
            sleep $wait_time
        else
            log "All $max_retries attempts failed. Last status: $status_code"
            return 1
        fi
    done
}

# Wait for deployment to stabilize
wait_for_stabilization() {
    log "Waiting ${VALIDATION_WAIT}s for deployment to stabilize..."
    sleep $VALIDATION_WAIT
}

# Basic health checks
validate_health_endpoints() {
    log "🏥 Validating health endpoints..."
    
    # Backend health check
    if response=$(http_request "$API_URL/health" 200 3 10); then
        if echo "$response" | grep -q '"status":"healthy"'; then
            add_validation_result "Backend Health" "PASS" "API health endpoint responding correctly"
        else
            add_validation_result "Backend Health" "FAIL" "API health endpoint returned unexpected response"
        fi
    else
        add_validation_result "Backend Health" "FAIL" "API health endpoint not accessible"
    fi
    
    # Database health check
    if response=$(http_request "$API_URL/health/db" 200 3 10); then
        if echo "$response" | grep -q '"database":"connected"'; then
            add_validation_result "Database Health" "PASS" "Database connection healthy"
        else
            add_validation_result "Database Health" "FAIL" "Database connection issue detected"
        fi
    else
        add_validation_result "Database Health" "FAIL" "Database health endpoint not accessible"
    fi
    
    # Redis health check
    if response=$(http_request "$API_URL/health/redis" 200 3 10); then
        if echo "$response" | grep -q '"redis":"connected"'; then
            add_validation_result "Redis Health" "PASS" "Redis connection healthy"
        else
            add_validation_result "Redis Health" "FAIL" "Redis connection issue detected"
        fi
    else
        add_validation_result "Redis Health" "FAIL" "Redis health endpoint not accessible"
    fi
    
    # Frontend health check
    if http_request "$BASE_URL" 200 3 10 >/dev/null; then
        add_validation_result "Frontend Health" "PASS" "Frontend loading successfully"
    else
        add_validation_result "Frontend Health" "FAIL" "Frontend not accessible"
    fi
}

# API endpoint validation
validate_api_endpoints() {
    log "🔌 Validating API endpoints..."
    
    # Version endpoint
    if response=$(http_request "$API_URL/api/v1/version" 200); then
        if echo "$response" | grep -q '"environment":"'$ENVIRONMENT'"'; then
            add_validation_result "API Version" "PASS" "Version endpoint returns correct environment"
        else
            add_validation_result "API Version" "FAIL" "Version endpoint returns incorrect environment"
        fi
    else
        add_validation_result "API Version" "FAIL" "Version endpoint not accessible"
    fi
    
    # Services endpoint
    if response=$(http_request "$API_URL/api/v1/services" 200); then
        if echo "$response" | grep -q '\[' && echo "$response" | grep -q '\]'; then
            add_validation_result "Services API" "PASS" "Services endpoint returns valid array"
        else
            add_validation_result "Services API" "FAIL" "Services endpoint returns invalid response"
        fi
    else
        add_validation_result "Services API" "FAIL" "Services endpoint not accessible"
    fi
    
    # Authentication endpoint (should return 401 for invalid credentials)
    if response=$(http_request "$API_URL/api/v1/auth/login" 401 1 5 2>/dev/null) || 
       response=$(http_request "$API_URL/api/v1/auth/login" 422 1 5 2>/dev/null); then
        add_validation_result "Auth API" "PASS" "Authentication endpoint properly rejecting invalid requests"
    else
        add_validation_result "Auth API" "FAIL" "Authentication endpoint not responding correctly"
    fi
    
    # Appointments endpoint (should require authentication)
    if http_request "$API_URL/api/v1/appointments" 401 1 5 >/dev/null 2>&1 || 
       http_request "$API_URL/api/v1/appointments" 403 1 5 >/dev/null 2>&1; then
        add_validation_result "Appointments API" "PASS" "Appointments endpoint properly protected"
    else
        add_validation_result "Appointments API" "FAIL" "Appointments endpoint security issue"
    fi
}

# Database validation
validate_database() {
    log "🗄️ Validating database..."
    
    # Migrations status
    if response=$(http_request "$API_URL/health/migrations" 200); then
        if echo "$response" | grep -q '"migrations":"up-to-date"'; then
            add_validation_result "Database Migrations" "PASS" "All migrations applied successfully"
        else
            add_validation_result "Database Migrations" "FAIL" "Database migrations not up to date"
        fi
    else
        add_validation_result "Database Migrations" "FAIL" "Cannot verify migration status"
    fi
    
    # Table accessibility
    if response=$(http_request "$API_URL/health/db/tables" 200); then
        required_tables=("users" "appointments" "services" "payments")
        all_tables_exist=true
        
        for table in "${required_tables[@]}"; do
            if ! echo "$response" | grep -q "\"$table\""; then
                all_tables_exist=false
                break
            fi
        done
        
        if [ "$all_tables_exist" = true ]; then
            add_validation_result "Database Tables" "PASS" "All required tables accessible"
        else
            add_validation_result "Database Tables" "FAIL" "Some required tables missing or inaccessible"
        fi
    else
        add_validation_result "Database Tables" "FAIL" "Cannot verify table accessibility"
    fi
}

# Performance validation
validate_performance() {
    log "⚡ Validating performance..."
    
    # API response time
    start_time=$(date +%s%3N)
    if http_request "$API_URL/health" 200 1 0 >/dev/null; then
        end_time=$(date +%s%3N)
        response_time=$((end_time - start_time))
        
        if [ $response_time -lt 1000 ]; then
            add_validation_result "API Response Time" "PASS" "API responding in ${response_time}ms"
        elif [ $response_time -lt 2000 ]; then
            add_validation_result "API Response Time" "PASS" "API responding in ${response_time}ms (acceptable)"
        else
            add_validation_result "API Response Time" "FAIL" "API slow response: ${response_time}ms"
        fi
    else
        add_validation_result "API Response Time" "FAIL" "Cannot measure API response time"
    fi
    
    # Frontend load time
    start_time=$(date +%s%3N)
    if http_request "$BASE_URL" 200 1 0 >/dev/null; then
        end_time=$(date +%s%3N)
        load_time=$((end_time - start_time))
        
        if [ $load_time -lt 3000 ]; then
            add_validation_result "Frontend Load Time" "PASS" "Frontend loading in ${load_time}ms"
        elif [ $load_time -lt 5000 ]; then
            add_validation_result "Frontend Load Time" "PASS" "Frontend loading in ${load_time}ms (acceptable)"
        else
            add_validation_result "Frontend Load Time" "FAIL" "Frontend slow load: ${load_time}ms"
        fi
    else
        add_validation_result "Frontend Load Time" "FAIL" "Cannot measure frontend load time"
    fi
}

# Security validation
validate_security() {
    log "🔒 Validating security..."
    
    # Security headers check
    if response=$(curl -s -I "$BASE_URL" 2>/dev/null); then
        security_headers=("X-Frame-Options" "X-Content-Type-Options" "Referrer-Policy")
        missing_headers=()
        
        for header in "${security_headers[@]}"; do
            if ! echo "$response" | grep -qi "$header"; then
                missing_headers+=("$header")
            fi
        done
        
        if [ ${#missing_headers[@]} -eq 0 ]; then
            add_validation_result "Security Headers" "PASS" "All required security headers present"
        else
            add_validation_result "Security Headers" "FAIL" "Missing headers: ${missing_headers[*]}"
        fi
    else
        add_validation_result "Security Headers" "FAIL" "Cannot check security headers"
    fi
    
    # HTTPS enforcement (for production)
    if [ "$ENVIRONMENT" = "production" ]; then
        http_url=$(echo "$BASE_URL" | sed 's/https:/http:/')
        if response=$(curl -s -I "$http_url" 2>/dev/null); then
            if echo "$response" | grep -qi "location.*https"; then
                add_validation_result "HTTPS Redirect" "PASS" "HTTP properly redirects to HTTPS"
            else
                add_validation_result "HTTPS Redirect" "FAIL" "HTTP does not redirect to HTTPS"
            fi
        else
            add_validation_result "HTTPS Redirect" "PASS" "HTTP not accessible (good)"
        fi
        
        # HSTS header check
        if response=$(curl -s -I "$BASE_URL" 2>/dev/null); then
            if echo "$response" | grep -qi "Strict-Transport-Security"; then
                add_validation_result "HSTS Header" "PASS" "HSTS header present"
            else
                add_validation_result "HSTS Header" "FAIL" "HSTS header missing"
            fi
        fi
    fi
}

# Integration validation
validate_integrations() {
    log "🔗 Validating integrations..."
    
    # External service health checks
    services=("calendar" "stripe" "sendgrid" "twilio")
    
    for service in "${services[@]}"; do
        if response=$(http_request "$API_URL/health/$service" 200 1 5 2>/dev/null) ||
           response=$(http_request "$API_URL/health/$service" 503 1 5 2>/dev/null); then
            add_validation_result "$service Integration" "PASS" "$service integration endpoint accessible"
        else
            add_validation_result "$service Integration" "FAIL" "$service integration endpoint not accessible"
        fi
    done
}

# Environment-specific validation
validate_environment_config() {
    log "🌍 Validating environment configuration..."
    
    # Check environment-specific URLs and configs
    if [ "$ENVIRONMENT" = "production" ]; then
        # Verify production URLs
        if echo "$BASE_URL" | grep -q "bookedbarber.com"; then
            add_validation_result "Production URL" "PASS" "Production URL correctly configured"
        else
            add_validation_result "Production URL" "FAIL" "Production URL incorrectly configured"
        fi
        
        # Check for staging/dev remnants
        if response=$(http_request "$API_URL/api/v1/version" 200); then
            if echo "$response" | grep -q '"debug":false' || ! echo "$response" | grep -q '"debug"'; then
                add_validation_result "Debug Mode" "PASS" "Debug mode disabled in production"
            else
                add_validation_result "Debug Mode" "FAIL" "Debug mode enabled in production"
            fi
        fi
    elif [ "$ENVIRONMENT" = "staging" ]; then
        # Verify staging URLs
        if echo "$BASE_URL" | grep -q "staging"; then
            add_validation_result "Staging URL" "PASS" "Staging URL correctly configured"
        else
            add_validation_result "Staging URL" "FAIL" "Staging URL incorrectly configured"
        fi
    fi
}

# Monitoring validation
validate_monitoring() {
    log "📊 Validating monitoring..."
    
    # Metrics endpoint
    if http_request "$API_URL/metrics" 200 1 5 >/dev/null 2>&1 ||
       http_request "$API_URL/metrics" 401 1 5 >/dev/null 2>&1 ||
       http_request "$API_URL/metrics" 403 1 5 >/dev/null 2>&1; then
        add_validation_result "Metrics Endpoint" "PASS" "Metrics endpoint accessible"
    else
        add_validation_result "Metrics Endpoint" "FAIL" "Metrics endpoint not accessible"
    fi
    
    # Health check for monitoring tools (if applicable)
    if [ "$ENVIRONMENT" = "production" ]; then
        # Check if Sentry is configured (look for Sentry scripts or configs)
        if response=$(http_request "$BASE_URL" 200); then
            if echo "$response" | grep -q "sentry" || echo "$response" | grep -q "Sentry"; then
                add_validation_result "Sentry Integration" "PASS" "Sentry monitoring detected"
            else
                add_validation_result "Sentry Integration" "FAIL" "Sentry monitoring not detected"
            fi
        fi
    fi
}

# Generate final report
generate_report() {
    log "📋 Generating validation report..."
    
    echo ""
    echo "=========================================="
    echo "DEPLOYMENT VALIDATION REPORT"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "Base URL: $BASE_URL"
    echo "API URL: $API_URL"
    echo ""
    echo "RESULTS SUMMARY:"
    echo "Total Validations: $TOTAL_VALIDATIONS"
    echo "Passed: $((TOTAL_VALIDATIONS - FAILED_VALIDATIONS))"
    echo "Failed: $FAILED_VALIDATIONS"
    echo ""
    
    if [ $FAILED_VALIDATIONS -eq 0 ]; then
        success "ALL VALIDATIONS PASSED! ✅"
        echo "Deployment validation successful. System is ready for traffic."
    else
        warning "VALIDATION FAILURES DETECTED! ⚠️"
        echo "Some validations failed. Review the issues before proceeding."
    fi
    
    echo ""
    echo "DETAILED RESULTS:"
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo "$result"
    done
    
    echo ""
    echo "=========================================="
}

# Save validation results
save_results() {
    local results_file="validation-results-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$results_file" << EOF
{
  "validation_timestamp": "$(date --iso-8601=seconds)",
  "environment": "$ENVIRONMENT",
  "base_url": "$BASE_URL",
  "api_url": "$API_URL",
  "summary": {
    "total_validations": $TOTAL_VALIDATIONS,
    "passed": $((TOTAL_VALIDATIONS - FAILED_VALIDATIONS)),
    "failed": $FAILED_VALIDATIONS,
    "success_rate": $(echo "scale=2; $((TOTAL_VALIDATIONS - FAILED_VALIDATIONS)) * 100 / $TOTAL_VALIDATIONS" | bc)
  },
  "status": "$([ $FAILED_VALIDATIONS -eq 0 ] && echo "PASS" || echo "FAIL")",
  "results": [
$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | sed 's/^.*: /    "/' | sed 's/$/",/' | sed '$ s/,$//')
  ]
}
EOF
    
    log "Validation results saved to: $results_file"
}

# Main execution
main() {
    log "🚀 Starting post-deployment validation for $ENVIRONMENT environment..."
    log "Target URLs: $BASE_URL (frontend), $API_URL (API)"
    
    # Wait for deployment to stabilize
    wait_for_stabilization
    
    # Run all validations
    validate_health_endpoints
    validate_api_endpoints
    validate_database
    validate_performance
    validate_security
    validate_integrations
    validate_environment_config
    validate_monitoring
    
    # Generate and save report
    generate_report
    save_results
    
    # Exit with appropriate code
    if [ $FAILED_VALIDATIONS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script interruption
trap 'echo "Validation interrupted. Partial results may be available."; exit 1' INT TERM

# Execute main function
main "$@"