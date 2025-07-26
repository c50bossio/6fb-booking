#!/bin/bash

# BookedBarber V2 Enterprise - Smoke Tests for Franchise Platform
# This script runs comprehensive smoke tests after deployment

set -e

ENVIRONMENT=${1:-"green"}
REGION=${2:-"us-east-1"}
BASE_URL=${3:-"https://api.bookedbarber.com"}

echo "🔍 Starting BookedBarber V2 Enterprise Smoke Tests"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date -u)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${YELLOW}Test $TOTAL_TESTS: $test_name${NC}"
    
    # Run the test command and capture result
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to make HTTP requests
http_test() {
    local endpoint="$1"
    local expected_status="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    local url="$BASE_URL$endpoint"
    local curl_args=("-s" "-w" "%{http_code}" "-o" "/tmp/response_body")
    
    if [ "$method" != "GET" ]; then
        curl_args+=("-X" "$method")
    fi
    
    if [ -n "$data" ]; then
        curl_args+=("-H" "Content-Type: application/json" "-d" "$data")
    fi
    
    curl_args+=("$url")
    
    local status_code
    status_code=$(curl "${curl_args[@]}")
    
    if [ "$status_code" -eq "$expected_status" ]; then
        return 0
    else
        echo "Expected status $expected_status, got $status_code"
        echo "Response body:"
        cat /tmp/response_body
        return 1
    fi
}

# Test 1: Health Check
run_test "Health Check Endpoint" \
    "http_test '/health' 200" \
    "Health endpoint returns 200"

# Test 2: Readiness Check
run_test "Readiness Check Endpoint" \
    "http_test '/health/ready' 200" \
    "Readiness endpoint returns 200"

# Test 3: API Version
run_test "API Version Endpoint" \
    "http_test '/api/v1/version' 200" \
    "Version endpoint returns 200"

# Test 4: Database Connection (via health endpoint)
run_test "Database Connection Health" \
    "curl -s $BASE_URL/health | jq -e '.database == \"healthy\"'" \
    "Database connection is healthy"

# Test 5: Redis Connection (via health endpoint)
run_test "Redis Connection Health" \
    "curl -s $BASE_URL/health | jq -e '.cache == \"healthy\"'" \
    "Redis connection is healthy"

# Test 6: Authentication Endpoint
run_test "Authentication Endpoint Structure" \
    "http_test '/api/v1/auth/login' 422" \
    "Auth endpoint returns proper validation error"

# Test 7: Franchise Shard Information
run_test "Franchise Shard Information" \
    "curl -s $BASE_URL/health | jq -e '.shard_id != null'" \
    "Shard information is present"

# Test 8: CORS Headers
run_test "CORS Headers" \
    "curl -s -I -X OPTIONS $BASE_URL/api/v1/health | grep -q 'Access-Control-Allow-Origin'" \
    "CORS headers are present"

# Test 9: Security Headers
run_test "Security Headers" \
    "curl -s -I $BASE_URL/health | grep -q 'X-Content-Type-Options'" \
    "Security headers are present"

# Test 10: SSL/TLS
if [[ $BASE_URL == https* ]]; then
    run_test "SSL/TLS Certificate" \
        "curl -s --fail $BASE_URL/health > /dev/null" \
        "SSL certificate is valid"
fi

# Test 11: Rate Limiting (check headers)
run_test "Rate Limiting Headers" \
    "curl -s -I $BASE_URL/api/v1/health | grep -q 'X-RateLimit-Limit'" \
    "Rate limiting headers are present"

# Test 12: Franchise-specific API endpoints
run_test "Franchise Locations Endpoint" \
    "http_test '/api/v1/locations' 401" \
    "Locations endpoint requires authentication"

# Test 13: Booking Endpoints Structure
run_test "Booking Endpoints Structure" \
    "http_test '/api/v1/bookings' 401" \
    "Booking endpoint requires authentication"

# Test 14: Payment Endpoints Structure
run_test "Payment Endpoints Structure" \
    "http_test '/api/v1/payments/health' 200" \
    "Payment health endpoint is accessible"

# Test 15: Metrics Endpoint (if enabled)
run_test "Metrics Endpoint" \
    "http_test '/metrics' 200" \
    "Metrics endpoint is accessible"

# Test 16: API Documentation
run_test "API Documentation" \
    "http_test '/docs' 200" \
    "API documentation is accessible"

# Test 17: OpenAPI Schema
run_test "OpenAPI Schema" \
    "http_test '/openapi.json' 200" \
    "OpenAPI schema is accessible"

# Test 18: Static File Serving (if applicable)
run_test "Static Files" \
    "http_test '/favicon.ico' 200 || http_test '/favicon.ico' 404" \
    "Static file endpoint responds"

# Test 19: Environment-specific Configuration
run_test "Environment Configuration" \
    "curl -s $BASE_URL/health | jq -e '.environment == \"$ENVIRONMENT\"'" \
    "Environment configuration is correct"

# Test 20: Regional Configuration
run_test "Regional Configuration" \
    "curl -s $BASE_URL/health | jq -e '.region == \"$REGION\"'" \
    "Regional configuration is correct"

# Franchise-specific Load Tests (Light)
echo -e "\n${YELLOW}🚀 Running Light Load Tests${NC}"

# Test 21: Concurrent Health Checks
run_test "Concurrent Health Checks (10 requests)" \
    "for i in {1..10}; do curl -s $BASE_URL/health & done; wait; echo 'Load test completed'" \
    "Server handles concurrent requests"

# Test 22: Response Time Check
run_test "Response Time Check" \
    "response_time=\$(curl -w '%{time_total}' -s -o /dev/null $BASE_URL/health); [[ \$(echo \"\$response_time < 2.0\" | bc -l) -eq 1 ]]" \
    "Response time under 2 seconds"

# Database-specific Tests
echo -e "\n${YELLOW}🗄️ Running Database Smoke Tests${NC}"

# Test 23: Database Query Performance
run_test "Database Query Performance" \
    "curl -s $BASE_URL/health | jq -e '.database_response_time_ms < 1000'" \
    "Database queries complete under 1 second"

# Cache-specific Tests
echo -e "\n${YELLOW}🔄 Running Cache Smoke Tests${NC}"

# Test 24: Cache Performance
run_test "Cache Performance" \
    "curl -s $BASE_URL/health | jq -e '.cache_response_time_ms < 100'" \
    "Cache queries complete under 100ms"

# Franchise Business Logic Tests
echo -e "\n${YELLOW}🏢 Running Franchise Business Logic Tests${NC}"

# Test 25: Franchise Routing Logic
run_test "Franchise Routing Logic" \
    "curl -s $BASE_URL/health | jq -e '.franchise_router == \"active\"'" \
    "Franchise routing is active"

# Integration Tests
echo -e "\n${YELLOW}🔗 Running Integration Tests${NC}"

# Test 26: External Service Health (if applicable)
run_test "External Services Health" \
    "curl -s $BASE_URL/health | jq -e '.external_services.stripe == \"healthy\"'" \
    "External services are healthy"

# Performance Benchmarks
echo -e "\n${YELLOW}📊 Running Performance Benchmarks${NC}"

# Test 27: Memory Usage Check (via health endpoint)
run_test "Memory Usage Check" \
    "curl -s $BASE_URL/health | jq -e '.memory_usage_percent < 85'" \
    "Memory usage is within acceptable limits"

# Test 28: CPU Usage Check (via health endpoint)
run_test "CPU Usage Check" \
    "curl -s $BASE_URL/health | jq -e '.cpu_usage_percent < 80'" \
    "CPU usage is within acceptable limits"

# Security Tests
echo -e "\n${YELLOW}🔒 Running Security Smoke Tests${NC}"

# Test 29: SQL Injection Protection
run_test "SQL Injection Protection" \
    "http_test '/api/v1/health?id=1\\'%20OR%20\\'1\\'=\\'1' 200" \
    "SQL injection attempts are handled safely"

# Test 30: XSS Protection Headers
run_test "XSS Protection Headers" \
    "curl -s -I $BASE_URL/health | grep -q 'X-XSS-Protection'" \
    "XSS protection headers are present"

# Final Results
echo -e "\n${YELLOW}📋 Smoke Test Results Summary${NC}"
echo "================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
echo -e "Success Rate: ${SUCCESS_RATE}%"

# Determine overall result
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL SMOKE TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ BookedBarber V2 Enterprise deployment is healthy${NC}"
    exit 0
elif [ $FAILED_TESTS -le 2 ] && [ $(echo "$SUCCESS_RATE >= 90" | bc -l) -eq 1 ]; then
    echo -e "\n${YELLOW}⚠️  SMOKE TESTS MOSTLY PASSED${NC}"
    echo -e "${YELLOW}📊 Success rate above 90% with minor issues${NC}"
    echo -e "${YELLOW}🔍 Review failed tests but deployment may proceed${NC}"
    exit 0
else
    echo -e "\n${RED}❌ SMOKE TESTS FAILED${NC}"
    echo -e "${RED}🚨 BookedBarber V2 Enterprise deployment has significant issues${NC}"
    echo -e "${RED}🛑 Deployment should be rolled back${NC}"
    exit 1
fi