#!/bin/bash
# =============================================================================
# BookedBarber V2 - Docker End-to-End Test Suite
# =============================================================================
# 🧪 Comprehensive testing of Docker development environment
# 🎯 Validates all services, endpoints, and networking
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test tracking
test_name=""
start_time=0

# Function to start a test
start_test() {
    test_name="$1"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    start_time=$(date +%s%N)
    echo -e "\n${BLUE}[TEST $TESTS_TOTAL] $test_name${NC}"
}

# Function to pass a test
pass_test() {
    local duration=$(($(date +%s%N) - start_time))
    local duration_ms=$((duration / 1000000))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✅ PASS${NC} ($duration_ms ms)"
}

# Function to fail a test
fail_test() {
    local error_msg="$1"
    local duration=$(($(date +%s%N) - start_time))
    local duration_ms=$((duration / 1000000))
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}❌ FAIL${NC} ($duration_ms ms): $error_msg"
}

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Docker End-to-End Test Suite${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# =============================================================================
# Container Health Tests
# =============================================================================
start_test "Frontend Container Running"
if docker ps | grep -q "bookedbarber-frontend-dev.*healthy"; then
    pass_test
else
    fail_test "Frontend container not running or unhealthy"
fi

start_test "Backend Container Running"
if docker ps | grep -q "bookedbarber-backend-dev.*healthy"; then
    pass_test
else
    fail_test "Backend container not running or unhealthy"
fi

# =============================================================================
# Network Connectivity Tests
# =============================================================================
start_test "Inter-container Networking"
if docker exec bookedbarber-frontend-dev ping -c 1 backend >/dev/null 2>&1; then
    pass_test
else
    fail_test "Cannot ping backend from frontend container"
fi

start_test "Network Latency Performance"
LATENCY=$(docker exec bookedbarber-frontend-dev ping -c 1 backend 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print $1}')
if [[ $(echo "$LATENCY < 1.0" | bc -l) -eq 1 ]]; then
    pass_test
else
    fail_test "Network latency too high: $LATENCY"
fi

# =============================================================================
# Service Endpoint Tests
# =============================================================================
start_test "Frontend Homepage (Port 3000)"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    pass_test
else
    fail_test "Frontend not responding on port 3000"
fi

start_test "Backend Health Endpoint"
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    pass_test
else
    fail_test "Backend health check failed"
fi

start_test "API Documentation Endpoint"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs | grep -q "200"; then
    pass_test
else
    fail_test "API documentation not accessible"
fi

# =============================================================================
# Performance Tests
# =============================================================================
start_test "Frontend Response Time"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3000)
if [[ $(echo "$RESPONSE_TIME < 2.0" | bc -l) -eq 1 ]]; then
    pass_test
else
    fail_test "Frontend response time too slow: ${RESPONSE_TIME}s"
fi

start_test "Backend Response Time"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:8000/health)
if [[ $(echo "$RESPONSE_TIME < 1.0" | bc -l) -eq 1 ]]; then
    pass_test
else
    fail_test "Backend response time too slow: ${RESPONSE_TIME}s"
fi

# =============================================================================
# Resource Usage Tests
# =============================================================================
start_test "Frontend Memory Usage"
FRONTEND_MEMORY=$(docker stats --no-stream --format "{{.MemUsage}}" bookedbarber-frontend-dev | cut -d'/' -f1 | grep -o '[0-9.]*')
if [[ $(echo "$FRONTEND_MEMORY < 1000" | bc -l) -eq 1 ]]; then
    pass_test
else
    fail_test "Frontend using too much memory: ${FRONTEND_MEMORY}MiB"
fi

start_test "Backend Memory Usage"
BACKEND_MEMORY=$(docker stats --no-stream --format "{{.MemUsage}}" bookedbarber-backend-dev | cut -d'/' -f1 | grep -o '[0-9.]*')
if [[ $(echo "$BACKEND_MEMORY < 500" | bc -l) -eq 1 ]]; then
    pass_test
else
    fail_test "Backend using too much memory: ${BACKEND_MEMORY}MiB"
fi

# =============================================================================
# File System Tests
# =============================================================================
start_test "Volume Write Performance"
START_TIME=$(date +%s%N)
for i in {1..10}; do
    echo "test $i" > /tmp/docker_test_$i
    rm -f /tmp/docker_test_$i
done
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
if [[ $DURATION -lt 100 ]]; then
    pass_test
else
    fail_test "Volume write performance too slow: ${DURATION}ms"
fi

# =============================================================================
# Security Tests
# =============================================================================
start_test "Health Check Configuration"
if docker inspect bookedbarber-frontend-dev | grep -q "Healthcheck" && 
   docker inspect bookedbarber-backend-dev | grep -q "Healthcheck"; then
    pass_test
else
    fail_test "Health checks not properly configured"
fi

start_test "No Privileged Containers"
if ! docker ps --format "table {{.Names}}" | xargs -I {} docker inspect {} | grep -q '"Privileged": true'; then
    pass_test
else
    fail_test "Found privileged containers (security risk)"
fi

# =============================================================================
# Build System Tests
# =============================================================================
start_test "Docker Compose Configuration"
if docker-compose -f docker-compose.dev.yml config --quiet; then
    pass_test
else
    fail_test "Docker Compose configuration invalid"
fi

start_test "BuildKit Enabled"
if [[ "${DOCKER_BUILDKIT}" == "1" ]]; then
    pass_test
else
    fail_test "Docker BuildKit not enabled"
fi

# =============================================================================
# API Integration Tests
# =============================================================================
start_test "API CORS Headers"
CORS_HEADER=$(curl -s -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS http://localhost:8000/health -I | grep -i "access-control-allow-origin")
if [[ ! -z "$CORS_HEADER" ]]; then
    pass_test
else
    fail_test "CORS headers not configured properly"
fi

# =============================================================================
# Test Summary
# =============================================================================
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Docker environment is working perfectly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️ $TESTS_FAILED test(s) failed. Please review the issues above.${NC}"
    exit 1
fi