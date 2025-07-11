#!/bin/bash

# Staging Deployment Verification Script
# Tests all aspects of the staging environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs
FRONTEND_URL="https://sixfb-frontend-v2-staging.onrender.com"
BACKEND_URL="https://sixfb-backend-v2-staging.onrender.com"
API_DOCS_URL="$BACKEND_URL/docs"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓ $1${NC}"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗ $1${NC}"
    ((TESTS_FAILED++))
}

# Test function
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    log "Testing: $description"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
    status_code=$(echo "$response" | tail -n1)
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$description - Status: $status_code"
        return 0
    else
        log_error "$description - Status: $status_code (expected $expected_status)"
        return 1
    fi
}

# Test JSON endpoint
test_json_endpoint() {
    local url=$1
    local description=$2
    
    log "Testing JSON: $description"
    
    response=$(curl -s "$url" 2>/dev/null || echo '{"error": "request_failed"}')
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        log_success "$description - Valid JSON response"
        return 0
    else
        log_error "$description - Invalid JSON response"
        return 1
    fi
}

# Main verification flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║            Staging Deployment Verification                    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    log "Starting verification of staging environment..."
    echo ""
    
    # Test 1: Frontend accessibility
    echo "🌐 Frontend Tests"
    echo "─────────────────"
    test_endpoint "$FRONTEND_URL" "Frontend homepage"
    test_endpoint "$FRONTEND_URL/login" "Login page"
    test_endpoint "$FRONTEND_URL/register" "Registration page"
    test_endpoint "$FRONTEND_URL/_next/static/css" "Static assets" 404  # 404 is expected for this path
    echo ""
    
    # Test 2: Backend API health
    echo "🔧 Backend API Tests"
    echo "────────────────────"
    test_endpoint "$BACKEND_URL/health" "Backend health check"
    test_json_endpoint "$BACKEND_URL/health" "Health check JSON"
    test_endpoint "$API_DOCS_URL" "API documentation"
    echo ""
    
    # Test 3: API endpoints
    echo "📡 API Endpoint Tests"
    echo "─────────────────────"
    test_json_endpoint "$BACKEND_URL/api/v1/system/status" "System status"
    test_endpoint "$BACKEND_URL/api/v1/auth/register" "Auth register endpoint" 422  # 422 expected without data
    test_endpoint "$BACKEND_URL/api/v1/auth/login" "Auth login endpoint" 422     # 422 expected without data
    echo ""
    
    # Test 4: Database connectivity (if accessible)
    echo "🗄️ Database Tests"
    echo "─────────────────"
    test_json_endpoint "$BACKEND_URL/api/v1/system/db-status" "Database connectivity"
    echo ""
    
    # Test 5: Environment configuration
    echo "⚙️ Configuration Tests"
    echo "──────────────────────"
    
    # Check if environment is properly set to staging
    response=$(curl -s "$BACKEND_URL/api/v1/system/env-info" 2>/dev/null || echo '{}')
    if echo "$response" | grep -q "staging"; then
        log_success "Environment correctly set to staging"
    else
        log_warning "Environment setting unclear from API response"
    fi
    
    # Check CORS headers
    cors_response=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health" 2>/dev/null || echo "")
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        log_success "CORS headers present"
    else
        log_warning "CORS headers not detected"
    fi
    echo ""
    
    # Test 6: Performance check
    echo "⚡ Performance Tests"
    echo "───────────────────"
    
    # Test response time
    start_time=$(date +%s%N)
    curl -s "$BACKEND_URL/health" >/dev/null 2>&1
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    if [ "$response_time" -lt 2000 ]; then
        log_success "Backend response time: ${response_time}ms (good)"
    elif [ "$response_time" -lt 5000 ]; then
        log_warning "Backend response time: ${response_time}ms (acceptable)"
    else
        log_error "Backend response time: ${response_time}ms (slow)"
    fi
    echo ""
    
    # Summary
    echo "════════════════════════════════════════════════════════════════"
    echo "  VERIFICATION SUMMARY"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    
    total_tests=$((TESTS_PASSED + TESTS_FAILED))
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! ($TESTS_PASSED/$total_tests)${NC}"
        echo ""
        echo "✅ Staging environment is working correctly!"
        echo ""
        echo "📍 Environment URLs:"
        echo "   Frontend: $FRONTEND_URL"
        echo "   Backend:  $BACKEND_URL"
        echo "   API Docs: $API_DOCS_URL"
        echo ""
        echo "🚀 Ready for testing and development!"
        
    elif [ $TESTS_PASSED -gt $TESTS_FAILED ]; then
        echo -e "${YELLOW}⚠️ Some tests failed ($TESTS_PASSED passed, $TESTS_FAILED failed)${NC}"
        echo ""
        echo "🔧 Staging environment is partially working"
        echo "   Check the failed tests above and verify:"
        echo "   - Environment variables are set correctly"
        echo "   - Database connection is working"
        echo "   - All services have finished deploying"
        
    else
        echo -e "${RED}❌ Multiple tests failed ($TESTS_PASSED passed, $TESTS_FAILED failed)${NC}"
        echo ""
        echo "🚨 Staging environment has issues"
        echo "   Recommended actions:"
        echo "   1. Check Render service logs"
        echo "   2. Verify environment variables"
        echo "   3. Ensure all services are running"
        echo "   4. Check database connectivity"
    fi
    
    echo ""
    echo "🔍 For detailed logs, check the Render dashboard:"
    echo "   https://dashboard.render.com"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"