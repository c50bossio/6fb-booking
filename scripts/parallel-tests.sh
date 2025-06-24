#!/bin/bash

# Parallel Testing Script for 6FB Booking Platform
# This script runs multiple test suites in parallel to speed up development

echo "🚀 6FB Booking Platform - Parallel Testing Suite"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create temporary directory for test results
TEST_RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TEST_RESULTS_DIR"

# Function to run tests in background and capture output
run_test_suite() {
    local name=$1
    local command=$2
    local color=$3
    local log_file="$TEST_RESULTS_DIR/$name.log"
    
    echo -e "${color}Starting $name tests...${NC}"
    
    # Run the test command in background
    (
        echo "Test Suite: $name" > "$log_file"
        echo "Started at: $(date)" >> "$log_file"
        echo "Command: $command" >> "$log_file"
        echo "===========================================" >> "$log_file"
        
        # Execute the test command
        if eval "$command" >> "$log_file" 2>&1; then
            echo -e "\n${GREEN}✓ $name tests PASSED${NC}" >> "$log_file"
            echo -e "${GREEN}✓ $name tests PASSED${NC}"
        else
            echo -e "\n${RED}✗ $name tests FAILED${NC}" >> "$log_file"
            echo -e "${RED}✗ $name tests FAILED${NC}"
        fi
        
        echo "Completed at: $(date)" >> "$log_file"
    ) &
    
    # Store the PID
    eval "${name}_PID=$!"
}

# Function to test specific API endpoints
test_api_endpoint() {
    local name=$1
    local url=$2
    local method=$3
    local data=$4
    local expected_status=$5
    
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "http://localhost:8000$url")
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ $name: Status $status_code${NC}"
        return 0
    else
        echo -e "${RED}✗ $name: Expected $expected_status, got $status_code${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Start all test suites in parallel
echo "Starting parallel test execution..."
echo ""

# 1. Backend Unit Tests
run_test_suite "backend_unit" "cd backend && python -m pytest tests/unit/ -v --tb=short" "$BLUE"

# 2. Backend Integration Tests
run_test_suite "backend_integration" "cd backend && python -m pytest tests/integration/ -v --tb=short" "$PURPLE"

# 3. Frontend Tests
run_test_suite "frontend" "cd frontend && npm test -- --watchAll=false" "$CYAN"

# 4. API Performance Tests
run_test_suite "api_performance" "cd backend && python scripts/api_performance_test.py" "$YELLOW"

# 5. Database Performance Tests
run_test_suite "db_performance" "cd backend && python scripts/basic_performance_test.py" "$GREEN"

# 6. Linting and Type Checking
run_test_suite "linting" "cd backend && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics" "$RED"

# Wait for specific endpoint availability before running API tests
echo ""
echo "Waiting for API server to be ready..."
max_attempts=30
attempts=0
while ! curl -s http://localhost:8000/health > /dev/null 2>&1; do
    if [ $attempts -ge $max_attempts ]; then
        echo -e "${RED}API server not available after $max_attempts attempts${NC}"
        break
    fi
    sleep 1
    ((attempts++))
done

if [ $attempts -lt $max_attempts ]; then
    echo -e "${GREEN}API server is ready!${NC}"
    echo ""
    echo "Running API endpoint tests..."
    
    # Test critical endpoints
    test_api_endpoint "Health Check" "/health" "GET" "" "200"
    test_api_endpoint "API Docs" "/docs" "GET" "" "200"
    test_api_endpoint "Public Status" "/api/v1/public/status" "GET" "" "200"
fi

# Monitor test progress
echo ""
echo "Monitoring test progress... (Press Ctrl+C to stop)"
echo ""

# Wait for all background jobs to complete
wait $backend_unit_PID
wait $backend_integration_PID
wait $frontend_PID
wait $api_performance_PID
wait $db_performance_PID
wait $linting_PID

# Generate summary report
echo ""
echo "=============================================="
echo "Test Summary Report"
echo "=============================================="
echo ""

# Check each log file for results
for log_file in "$TEST_RESULTS_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        suite_name=$(basename "$log_file" .log)
        if grep -q "PASSED" "$log_file"; then
            echo -e "${GREEN}✓ $suite_name: PASSED${NC}"
        else
            echo -e "${RED}✗ $suite_name: FAILED${NC}"
            echo "  See details in: $log_file"
        fi
    fi
done

# Feature-specific test commands
echo ""
echo "=============================================="
echo "Feature-Specific Test Commands"
echo "=============================================="
echo ""
echo "Run these in separate terminals for specific features:"
echo ""
echo -e "${BLUE}# Google Calendar Integration${NC}"
echo "cd backend && python -m pytest tests/ -k 'calendar' -v"
echo ""
echo -e "${PURPLE}# Payment & Payout System${NC}"
echo "cd backend && python -m pytest tests/ -k 'payment or payout' -v"
echo ""
echo -e "${CYAN}# Booking Flow${NC}"
echo "cd backend && python -m pytest tests/ -k 'booking' -v"
echo "cd frontend && npm test -- BookingFlow"
echo ""
echo -e "${YELLOW}# Authentication & Security${NC}"
echo "cd backend && python -m pytest tests/ -k 'auth or security' -v"
echo ""

# Continuous testing mode
echo "=============================================="
echo "Continuous Testing Mode"
echo "=============================================="
echo ""
echo "To run tests continuously while developing:"
echo ""
echo "Backend (with coverage):"
echo "  cd backend && ptw -- --cov=. --cov-report=html"
echo ""
echo "Frontend (watch mode):"
echo "  cd frontend && npm test"
echo ""
echo "Full test results saved in: $TEST_RESULTS_DIR/"