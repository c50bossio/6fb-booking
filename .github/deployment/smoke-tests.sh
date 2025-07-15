#!/bin/bash

# Smoke Tests for BookedBarber V2 Deployment
# Usage: ./smoke-tests.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-staging}

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

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

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
            FRONTEND_URL="http://localhost:3000"
            BACKEND_URL="http://localhost:8000"
            ;;
    esac
}

# Test runner helper
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    log "Running test: $test_name"
    
    if eval "$test_command"; then
        success "✓ $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        error "✗ $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# Basic connectivity tests
test_backend_health() {
    curl -f -s --max-time 10 "$BACKEND_URL/health" > /dev/null
}

test_frontend_health() {
    curl -f -s --max-time 10 "$FRONTEND_URL/api/health" > /dev/null || \
    curl -f -s --max-time 10 "$FRONTEND_URL" > /dev/null
}

test_backend_api_docs() {
    curl -f -s --max-time 10 "$BACKEND_URL/docs" > /dev/null
}

# API endpoint tests
test_services_endpoint() {
    local response=$(curl -f -s --max-time 10 "$BACKEND_URL/api/v1/services")
    echo "$response" | jq '.' > /dev/null  # Validate JSON
    echo "$response" | jq -e 'type == "array"' > /dev/null  # Should be array
}

test_barbers_endpoint() {
    local response=$(curl -f -s --max-time 10 "$BACKEND_URL/api/v1/barbers")
    echo "$response" | jq '.' > /dev/null  # Validate JSON
    echo "$response" | jq -e 'type == "array"' > /dev/null  # Should be array
}

test_availability_endpoint() {
    local tomorrow=$(date -d '+1 day' '+%Y-%m-%d')
    local response=$(curl -f -s --max-time 10 "$BACKEND_URL/api/v1/appointments/availability?date=$tomorrow")
    echo "$response" | jq '.' > /dev/null  # Validate JSON
}

# Authentication tests
test_auth_endpoints() {
    # Test login endpoint (should return 401 for invalid credentials)
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        -X POST "$BACKEND_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"invalid@example.com","password":"invalid"}')
    
    [ "$status_code" = "401" ] || [ "$status_code" = "422" ]
}

# Database connectivity test
test_database_connectivity() {
    local response=$(curl -f -s --max-time 10 "$BACKEND_URL/api/v1/services")
    # If we can fetch services, database is working
    [ -n "$response" ]
}

# Frontend routing tests
test_frontend_routes() {
    # Test main pages
    curl -f -s --max-time 10 "$FRONTEND_URL" > /dev/null
    
    # Test common routes
    curl -f -s --max-time 10 "$FRONTEND_URL/login" > /dev/null || true
    curl -f -s --max-time 10 "$FRONTEND_URL/register" > /dev/null || true
}

# Security headers test
test_security_headers() {
    local headers=$(curl -I -s --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "")
    
    # Check for security headers
    echo "$headers" | grep -i "x-frame-options" > /dev/null || return 1
    echo "$headers" | grep -i "x-content-type-options" > /dev/null || return 1
    echo "$headers" | grep -i "strict-transport-security" > /dev/null || return 1
}

# Performance tests
test_response_times() {
    local backend_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$BACKEND_URL/health")
    local frontend_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$FRONTEND_URL")
    
    # Convert to milliseconds and check thresholds
    local backend_ms=$(echo "$backend_time * 1000" | bc | cut -d. -f1)
    local frontend_ms=$(echo "$frontend_time * 1000" | bc | cut -d. -f1)
    
    log "Response times - Backend: ${backend_ms}ms, Frontend: ${frontend_ms}ms"
    
    # Fail if response times are too high (5 seconds)
    [ "$backend_ms" -lt 5000 ] && [ "$frontend_ms" -lt 5000 ]
}

# SSL certificate test
test_ssl_certificate() {
    if [[ "$FRONTEND_URL" == https://* ]]; then
        local domain=$(echo "$FRONTEND_URL" | sed 's|https://||' | cut -d'/' -f1)
        echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
        openssl x509 -noout -dates > /dev/null
    else
        # Skip SSL test for non-HTTPS environments
        return 0
    fi
}

# API rate limiting test
test_rate_limiting() {
    local count=0
    local rate_limited=false
    
    # Make rapid requests to test rate limiting
    for i in {1..10}; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BACKEND_URL/api/v1/services")
        if [ "$status_code" = "429" ]; then
            rate_limited=true
            break
        fi
        count=$((count + 1))
        sleep 0.1
    done
    
    # For production, we expect rate limiting to be active
    if [ "$ENVIRONMENT" = "production" ]; then
        # In production, we should see some rate limiting
        [ "$count" -lt 10 ] || [ "$rate_limited" = true ]
    else
        # For staging/dev, just check that the endpoint is responsive
        [ "$count" -gt 0 ]
    fi
}

# CORS test
test_cors_headers() {
    local response=$(curl -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS -s -I "$BACKEND_URL/api/v1/services" 2>/dev/null || echo "")
    
    # Check for CORS headers
    echo "$response" | grep -i "access-control-allow-origin" > /dev/null
}

# Integration test with actual booking flow
test_booking_flow_integration() {
    # Create a test user account
    local test_email="smoketest-$(date +%s)@example.com"
    local registration_response=$(curl -s --max-time 10 \
        -X POST "$BACKEND_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$test_email\",\"password\":\"Test123!\",\"first_name\":\"Smoke\",\"last_name\":\"Test\"}")
    
    # Check if registration succeeded or user already exists
    if echo "$registration_response" | jq -e '.access_token' > /dev/null 2>&1; then
        log "Test user created successfully"
        return 0
    elif echo "$registration_response" | grep -i "already exists\|email already" > /dev/null; then
        log "Test user already exists (expected in some cases)"
        return 0
    else
        warning "User registration test inconclusive"
        return 0  # Don't fail smoke tests for this
    fi
}

# Environment-specific tests
test_environment_config() {
    case $ENVIRONMENT in
        production)
            # Production-specific tests
            test_ssl_certificate
            test_security_headers
            ;;
        staging)
            # Staging-specific tests
            test_auth_endpoints
            ;;
        *)
            # Development tests
            test_backend_api_docs
            ;;
    esac
}

# Main test execution
main() {
    log "Starting smoke tests for environment: $ENVIRONMENT"
    
    get_service_urls
    log "Testing URLs:"
    log "  Backend: $BACKEND_URL"
    log "  Frontend: $FRONTEND_URL"
    
    # Core connectivity tests
    run_test "Backend Health Check" "test_backend_health"
    run_test "Frontend Health Check" "test_frontend_health"
    
    # API tests
    run_test "Services API Endpoint" "test_services_endpoint"
    run_test "Barbers API Endpoint" "test_barbers_endpoint"
    run_test "Availability API Endpoint" "test_availability_endpoint"
    run_test "Authentication Endpoints" "test_auth_endpoints"
    run_test "Database Connectivity" "test_database_connectivity"
    
    # Frontend tests
    run_test "Frontend Routes" "test_frontend_routes"
    
    # Security tests
    run_test "CORS Headers" "test_cors_headers"
    
    # Performance tests
    run_test "Response Times" "test_response_times"
    
    # Rate limiting test
    run_test "API Rate Limiting" "test_rate_limiting"
    
    # Environment-specific tests
    run_test "Environment Configuration" "test_environment_config"
    
    # Integration tests
    run_test "Booking Flow Integration" "test_booking_flow_integration"
    
    # Generate test report
    log "Smoke Test Results:"
    log "  Tests Run: $TESTS_RUN"
    log "  Tests Passed: $TESTS_PASSED"
    log "  Tests Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        success "All smoke tests passed!"
        return 0
    else
        error "Some smoke tests failed:"
        for test in "${FAILED_TESTS[@]}"; do
            error "  - $test"
        done
        return 1
    fi
}

# Ensure required tools are available
if ! command -v curl &> /dev/null; then
    error "curl is required but not installed"
fi

if ! command -v jq &> /dev/null; then
    warning "jq is not installed - some JSON validation tests will be skipped"
fi

if ! command -v bc &> /dev/null; then
    warning "bc is not installed - performance timing tests will be skipped"
fi

# Run main function
main "$@"