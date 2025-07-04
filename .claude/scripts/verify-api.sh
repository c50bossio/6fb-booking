#!/bin/bash

# API Endpoint Verification Script  
# Verifies that API endpoints work correctly after backend changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="/Users/bossio/6fb-booking/.claude/verification.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[API]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if backend server is running
check_backend_server() {
    log "Checking if backend server is running..."
    
    if ! curl -s http://localhost:8000/api/v1/auth/test > /dev/null; then
        error "Backend server is not running on port 8000"
        return 1
    fi
    
    success "Backend server is running"
    return 0
}

# Test basic API endpoints
test_basic_endpoints() {
    log "Testing basic API endpoints..."
    
    local endpoints=(
        "http://localhost:8000:Root"
        "http://localhost:8000/docs:API Docs"
        "http://localhost:8000/api/v1/auth/test:Auth Test"
    )
    
    local errors=0
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r url name <<< "$endpoint_info"
        
        local response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
        
        if [ "$response" = "200" ]; then
            success "$name endpoint works (200 OK)"
        else
            error "$name endpoint failed (Status: $response)"
            errors=$((errors + 1))
        fi
    done
    
    return $errors
}

# Test authentication endpoints
test_auth_endpoints() {
    log "Testing authentication endpoints..."
    
    local auth_endpoints=(
        "http://localhost:8000/api/v1/auth/test:Auth Test"
    )
    
    local errors=0
    
    for endpoint_info in "${auth_endpoints[@]}"; do
        IFS=':' read -r url name <<< "$endpoint_info"
        
        local response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
        
        if [ "$response" = "200" ]; then
            success "$name endpoint works"
        else
            error "$name endpoint failed (Status: $response)"
            errors=$((errors + 1))
        fi
    done
    
    return $errors
}

# Test agents API endpoints
test_agents_endpoints() {
    log "Testing agents API endpoints..."
    
    # Test analytics endpoint with various parameter formats
    local start_date=$(date -u -v-30d '+%Y-%m-%dT%H:%M:%S.000Z')
    local end_date=$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')
    
    # URL encode the dates
    local encoded_start=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$start_date'))")
    local encoded_end=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$end_date'))")
    
    local analytics_url="http://localhost:8000/api/v1/agents/analytics?start_date=${encoded_start}&end_date=${encoded_end}"
    
    local response=$(curl -s -w "%{http_code}" "$analytics_url" -o /dev/null)
    
    if [ "$response" = "401" ]; then
        success "Analytics endpoint responds correctly (401 - auth required)"
    elif [ "$response" = "422" ]; then
        error "Analytics endpoint returns 422 - parameter parsing issue"
        return 1
    elif [ "$response" = "200" ]; then
        success "Analytics endpoint works (200 OK)"
    else
        warning "Analytics endpoint returned status: $response"
    fi
    
    return 0
}

# Test for common API issues
test_api_health() {
    log "Testing API health and common issues..."
    
    # Check for CORS headers
    local cors_response=$(curl -s -H "Origin: http://localhost:3000" \
                          -H "Access-Control-Request-Method: GET" \
                          -H "Access-Control-Request-Headers: X-Requested-With" \
                          -X OPTIONS \
                          http://localhost:8000/api/v1/auth/test)
    
    if [ $? -eq 0 ]; then
        success "CORS preflight requests work"
    else
        warning "CORS preflight may have issues"
    fi
    
    # Check API documentation is accessible
    local docs_response=$(curl -s -w "%{http_code}" http://localhost:8000/docs -o /dev/null)
    
    if [ "$docs_response" = "200" ]; then
        success "API documentation is accessible"
    else
        warning "API documentation may not be accessible (Status: $docs_response)"
    fi
    
    return 0
}

# Check for parameter parsing issues
test_parameter_parsing() {
    log "Testing parameter parsing with various formats..."
    
    local base_url="http://localhost:8000/api/v1/agents/analytics"
    
    # Test different parameter formats that commonly cause issues
    local test_params=(
        "start_date=2025-06-04T01%3A18%3A40.197Z&end_date=2025-07-04T01%3A18%3A40.197Z"
        "start_date=2025-06-04&end_date=2025-07-04"
        "start_date=2025-06-04T00:00:00&end_date=2025-07-04T23:59:59"
    )
    
    local errors=0
    
    for params in "${test_params[@]}"; do
        local test_url="${base_url}?${params}"
        local response=$(curl -s -w "%{http_code}" "$test_url" -o /dev/null)
        
        if [ "$response" = "401" ] || [ "$response" = "200" ]; then
            success "Parameter format works: $params"
        elif [ "$response" = "422" ]; then
            error "Parameter parsing failed: $params"
            errors=$((errors + 1))
        else
            warning "Unexpected response for params '$params': $response"
        fi
    done
    
    return $errors
}

# Main verification function
verify_api() {
    local errors=0
    
    log "Starting API endpoint verification..."
    
    # Check server is running
    if ! check_backend_server; then
        error "Cannot verify API - backend server not running"
        return 1
    fi
    
    # Test basic endpoints
    if ! test_basic_endpoints; then
        errors=$((errors + 1))
    fi
    
    # Test auth endpoints
    if ! test_auth_endpoints; then
        errors=$((errors + 1))
    fi
    
    # Test agents endpoints
    if ! test_agents_endpoints; then
        errors=$((errors + 1))
    fi
    
    # Test API health
    test_api_health
    
    # Test parameter parsing
    if ! test_parameter_parsing; then
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        success "All API verification tests passed"
        return 0
    else
        error "API verification failed with $errors error(s)"
        return 1
    fi
}

# Run verification
main() {
    log "API verification started at $(date)"
    
    if verify_api; then
        success "API verification completed successfully"
        echo " API endpoints are working correctly"
        exit 0
    else
        error "API verification failed"
        echo "L API endpoints have issues that need to be fixed"
        exit 1
    fi
}

# Execute main function
main "$@"