#!/bin/bash

# Parallel Testing Script for 6FB Booking Platform V2
# This script runs multiple test suites in parallel to speed up development
# Updated for V2 directory structure

echo "🚀 BookedBarber V2 - Parallel Testing Suite"
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

# Function to detect if we're in a worktree context
detect_worktree_context() {
    local current_path=$(pwd)
    
    # Check for worktree indicators
    if [[ "$current_path" == *"/6fb-booking-features/"* ]] || 
       [[ "$current_path" == *"/6fb-booking-staging"* ]]; then
        return 0
    fi
    return 1
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check if we should use worktree-aware version
if detect_worktree_context; then
    echo -e "${BLUE}Detected worktree environment - using worktree-aware testing${NC}"
    echo ""
    
    if [ -f "$SCRIPT_DIR/parallel-tests-worktree.sh" ]; then
        exec "$SCRIPT_DIR/parallel-tests-worktree.sh" "$@"
    else
        echo -e "${RED}✗ Error: worktree-aware testing script not found${NC}"
        exit 1
    fi
fi

# Create temporary directory for test results
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TEST_RESULTS_DIR"

# Function to check if directory exists
check_directory() {
    local dir=$1
    local name=$2
    if [ ! -d "$dir" ]; then
        echo -e "${RED}✗ Error: $name directory not found at $dir${NC}"
        return 1
    fi
    return 0
}

# Validate V2 directories exist
echo "Validating V2 directories..."
check_directory "$PROJECT_ROOT/backend-v2" "Backend V2" || exit 1
check_directory "$PROJECT_ROOT/backend-v2/frontend-v2" "Frontend V2" || exit 1
echo -e "${GREEN}✓ V2 directories validated${NC}\n"

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
echo "Starting parallel test execution for V2..."
echo ""

# 1. Backend V2 Unit Tests
run_test_suite "backend_v2_unit" "cd $PROJECT_ROOT/backend-v2 && python -m pytest tests/ -m 'unit' -v --tb=short" "$BLUE"

# 2. Backend V2 Integration Tests
run_test_suite "backend_v2_integration" "cd $PROJECT_ROOT/backend-v2 && python -m pytest tests/ -m 'integration' -v --tb=short" "$PURPLE"

# 3. Backend V2 All Tests (if no markers)
run_test_suite "backend_v2_all" "cd $PROJECT_ROOT/backend-v2 && python -m pytest tests/ -v --tb=short" "$GREEN"

# 4. Frontend V2 Tests
run_test_suite "frontend_v2" "cd $PROJECT_ROOT/backend-v2/frontend-v2 && npm test -- --watchAll=false --passWithNoTests" "$CYAN"

# 5. Backend V2 Linting
run_test_suite "backend_v2_linting" "cd $PROJECT_ROOT/backend-v2 && python -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv,__pycache__,.git" "$YELLOW"

# 6. Frontend V2 Linting
run_test_suite "frontend_v2_linting" "cd $PROJECT_ROOT/backend-v2/frontend-v2 && npm run lint || true" "$RED"

# Wait for specific endpoint availability before running API tests
echo ""
echo "Checking if API server is running..."
max_attempts=5
attempts=0
api_available=false

while [ $attempts -lt $max_attempts ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        api_available=true
        break
    fi
    sleep 1
    ((attempts++))
done

if [ "$api_available" = true ]; then
    echo -e "${GREEN}✓ API server is available${NC}"
    echo ""
    echo "Running API endpoint tests..."

    # Test critical endpoints
    test_api_endpoint "Health Check" "/health" "GET" "" "200"
    test_api_endpoint "API Docs" "/docs" "GET" "" "200"
    test_api_endpoint "Public Status" "/api/v1/public/status" "GET" "" "200"
else
    echo -e "${YELLOW}⚠ API server not available - skipping endpoint tests${NC}"
fi

# Monitor test progress
echo ""
echo "Monitoring test progress... (Press Ctrl+C to stop)"
echo ""

# Wait for all background jobs to complete
wait $backend_v2_unit_PID
wait $backend_v2_integration_PID
wait $backend_v2_all_PID
wait $frontend_v2_PID
wait $backend_v2_linting_PID
wait $frontend_v2_linting_PID

# Generate summary report
echo ""
echo "=============================================="
echo "Test Summary Report"
echo "=============================================="
echo ""

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# Check each log file for results
for log_file in "$TEST_RESULTS_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        ((total_tests++))
        suite_name=$(basename "$log_file" .log)
        if grep -q "PASSED" "$log_file"; then
            echo -e "${GREEN}✓ $suite_name: PASSED${NC}"
            ((passed_tests++))
        else
            echo -e "${RED}✗ $suite_name: FAILED${NC}"
            echo "  See details in: $log_file"
            ((failed_tests++))
        fi
    fi
done

# Summary statistics
echo ""
echo "Overall Statistics:"
echo "  Total Test Suites: $total_tests"
echo -e "  ${GREEN}Passed: $passed_tests${NC}"
echo -e "  ${RED}Failed: $failed_tests${NC}"

# Feature-specific test commands for V2
echo ""
echo "=============================================="
echo "Feature-Specific Test Commands for V2"
echo "=============================================="
echo ""
echo "Run these in separate terminals for specific features:"
echo ""
echo -e "${BLUE}# Authentication & Security${NC}"
echo "cd backend-v2 && python -m pytest tests/ -k 'auth' -v"
echo ""
echo -e "${PURPLE}# Payment & Stripe Integration${NC}"
echo "cd backend-v2 && python -m pytest tests/ -k 'payment or stripe' -v"
echo ""
echo -e "${CYAN}# Booking System${NC}"
echo "cd backend-v2 && python -m pytest tests/ -k 'booking' -v"
echo ""
echo -e "${YELLOW}# Google Calendar Integration${NC}"
echo "cd backend-v2 && python -m pytest tests/ -k 'calendar' -v"
echo ""
echo -e "${GREEN}# Marketing Integrations${NC}"
echo "cd backend-v2 && python -m pytest tests/ -k 'marketing or gmb or review' -v"
echo ""

# Continuous testing mode for V2
echo "=============================================="
echo "Continuous Testing Mode for V2"
echo "=============================================="
echo ""
echo "To run tests continuously while developing:"
echo ""
echo "Backend V2 (with coverage):"
echo "  cd backend-v2 && python -m pytest tests/ --cov=. --cov-report=html -v --watch"
echo ""
echo "Frontend V2 (watch mode):"
echo "  cd backend-v2/frontend-v2 && npm test"
echo ""
echo "Full test results saved in: $TEST_RESULTS_DIR/"
echo ""

# Exit with appropriate code
if [ $failed_tests -gt 0 ]; then
    exit 1
else
    exit 0
fi
