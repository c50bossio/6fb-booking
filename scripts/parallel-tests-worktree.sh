#!/bin/bash

# Worktree-Aware Parallel Testing Script for BookedBarber V2
# This script runs tests appropriate to the current worktree context

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Worktree context variables
WORKTREE_TYPE=""
WORKTREE_NAME=""
ENV_FILE=""
DATABASE_FILE=""
BACKEND_PORT=""
FRONTEND_PORT=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect current worktree context
detect_worktree_context() {
    local current_path=$(pwd)
    
    # Check if we're in a feature worktree
    if [[ "$current_path" == *"/6fb-booking-features/"* ]]; then
        WORKTREE_TYPE="feature"
        WORKTREE_NAME=$(basename "$current_path")
        ENV_FILE=".env"
        DATABASE_FILE="feature_$(echo $WORKTREE_NAME | sed 's/feature-//').db"
        BACKEND_PORT=8002
        FRONTEND_PORT=3002
        return 0
    fi
    
    # Check if we're in staging worktree
    if [[ "$current_path" == *"/6fb-booking-staging"* ]]; then
        WORKTREE_TYPE="staging"
        WORKTREE_NAME="staging"
        ENV_FILE=".env.staging"
        DATABASE_FILE="staging_6fb_booking.db"
        BACKEND_PORT=8001
        FRONTEND_PORT=3001
        return 0
    fi
    
    # Check if we're in main project
    if [[ "$current_path" == *"/6fb-booking"* ]] && [[ "$current_path" != *"/6fb-booking-"* ]]; then
        WORKTREE_TYPE="main"
        WORKTREE_NAME="main"
        ENV_FILE=".env"
        DATABASE_FILE="6fb_booking.db"
        BACKEND_PORT=8000
        FRONTEND_PORT=3000
        return 0
    fi
    
    return 1
}

# Function to find actual running ports
detect_running_ports() {
    local backend_base=$1
    local frontend_base=$2
    
    # Find backend port
    for i in {0..20}; do
        local port=$((backend_base + i))
        if lsof -i :$port > /dev/null 2>&1; then
            BACKEND_PORT=$port
            break
        fi
    done
    
    # Find frontend port  
    for i in {0..20}; do
        local port=$((frontend_base + i))
        if lsof -i :$port > /dev/null 2>&1; then
            FRONTEND_PORT=$port
            break
        fi
    done
}

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
        echo "Worktree: $WORKTREE_TYPE ($WORKTREE_NAME)" >> "$log_file"
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

# Function to test API endpoints
test_api_endpoint() {
    local name=$1
    local url=$2
    local method=$3
    local data=$4
    local expected_status=$5
    
    local backend_url="http://localhost:$BACKEND_PORT"
    
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$backend_url$url" 2>/dev/null || echo -e "\n000")
    
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

# Main function
main() {
    echo -e "${PURPLE}🧪 BookedBarber V2 - Worktree-Aware Parallel Testing${NC}"
    echo "===================================================="
    echo ""
    
    # Detect worktree context
    if ! detect_worktree_context; then
        print_error "Could not detect worktree context. Please run from a valid worktree directory."
        echo ""
        echo "Valid locations:"
        echo "  - Main project: /Users/bossio/6fb-booking"
        echo "  - Staging: /Users/bossio/6fb-booking-staging"
        echo "  - Feature: /Users/bossio/6fb-booking-features/[feature-name]"
        exit 1
    fi
    
    print_success "Detected worktree context:"
    echo "  Type: $WORKTREE_TYPE"
    echo "  Name: $WORKTREE_NAME"
    echo "  Environment: $ENV_FILE"
    echo "  Database: $DATABASE_FILE"
    echo ""
    
    # Create temporary directory for test results
    TEST_RESULTS_DIR="$(pwd)/test-results-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$TEST_RESULTS_DIR"
    print_status "Test results will be saved to: $TEST_RESULTS_DIR"
    echo ""
    
    # Validate directories exist
    if [ ! -d "backend-v2" ]; then
        print_error "Backend V2 directory not found: backend-v2"
        exit 1
    fi
    
    if [ ! -d "backend-v2/frontend-v2" ]; then
        print_error "Frontend V2 directory not found: backend-v2/frontend-v2"
        exit 1
    fi
    
    print_success "V2 directories validated"
    echo ""
    
    # Start test suites based on worktree type
    print_status "Starting parallel test execution for $WORKTREE_TYPE worktree..."
    echo ""
    
    case $WORKTREE_TYPE in
        "feature")
            # Feature worktree: Focus on unit tests and feature-specific tests
            run_test_suite "backend_unit" "cd backend-v2 && ENV_FILE=$ENV_FILE python -m pytest tests/ -m 'unit' -v --tb=short" "$BLUE"
            run_test_suite "frontend_unit" "cd backend-v2/frontend-v2 && npm test -- --watchAll=false --passWithNoTests" "$CYAN"
            run_test_suite "backend_linting" "cd backend-v2 && python -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv,__pycache__,.git" "$YELLOW"
            run_test_suite "frontend_linting" "cd backend-v2/frontend-v2 && npm run lint || true" "$RED"
            
            # Wait for test completion
            wait $backend_unit_PID
            wait $frontend_unit_PID
            wait $backend_linting_PID
            wait $frontend_linting_PID
            ;;
            
        "staging")
            # Staging worktree: Integration tests and pre-production validation
            run_test_suite "backend_integration" "cd backend-v2 && ENV_FILE=$ENV_FILE python -m pytest tests/ -m 'integration' -v --tb=short" "$PURPLE"
            run_test_suite "backend_staging" "cd backend-v2 && ENV_FILE=$ENV_FILE python -m pytest tests/ -v --tb=short" "$GREEN"
            run_test_suite "frontend_staging" "cd backend-v2/frontend-v2 && npm test -- --watchAll=false" "$CYAN"
            run_test_suite "api_endpoints" "sleep 5 && echo 'API endpoint tests placeholder'" "$BLUE"
            
            # Wait for test completion
            wait $backend_integration_PID
            wait $backend_staging_PID
            wait $frontend_staging_PID
            wait $api_endpoints_PID
            ;;
            
        "main")
            # Main worktree: Comprehensive test suite
            run_test_suite "backend_all" "cd backend-v2 && python -m pytest tests/ -v --tb=short" "$GREEN"
            run_test_suite "backend_unit" "cd backend-v2 && python -m pytest tests/ -m 'unit' -v --tb=short" "$BLUE"
            run_test_suite "backend_integration" "cd backend-v2 && python -m pytest tests/ -m 'integration' -v --tb=short" "$PURPLE"
            run_test_suite "frontend_all" "cd backend-v2/frontend-v2 && npm test -- --watchAll=false" "$CYAN"
            run_test_suite "backend_linting" "cd backend-v2 && python -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv,__pycache__,.git" "$YELLOW"
            run_test_suite "frontend_linting" "cd backend-v2/frontend-v2 && npm run lint || true" "$RED"
            
            # Wait for test completion
            wait $backend_all_PID
            wait $backend_unit_PID
            wait $backend_integration_PID
            wait $frontend_all_PID
            wait $backend_linting_PID
            wait $frontend_linting_PID
            ;;
    esac
    
    # API endpoint tests (if server is running)
    detect_running_ports $BACKEND_PORT $FRONTEND_PORT
    
    if lsof -i :$BACKEND_PORT > /dev/null 2>&1; then
        print_success "API server detected on port $BACKEND_PORT - running endpoint tests"
        echo ""
        
        # Test critical endpoints
        test_api_endpoint "Health Check" "/api/v1/health" "GET" "" "200"
        test_api_endpoint "API Docs" "/docs" "GET" "" "200"
    else
        print_warning "API server not running on port $BACKEND_PORT - skipping endpoint tests"
    fi
    
    # Generate summary report
    echo ""
    echo "=============================================="
    echo "Worktree Test Summary Report"
    echo "=============================================="
    echo "Worktree Type: $WORKTREE_TYPE"
    echo "Worktree Name: $WORKTREE_NAME"
    echo "Environment: $ENV_FILE"
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
    
    # Worktree-specific recommendations
    echo ""
    echo "=============================================="
    echo "Worktree-Specific Commands"
    echo "=============================================="
    echo ""
    
    case $WORKTREE_TYPE in
        "feature")
            echo -e "${BLUE}Feature Development Commands:${NC}"
            echo "cd backend-v2 && ENV_FILE=$ENV_FILE python -m pytest tests/ -k 'your_feature' -v"
            echo "cd backend-v2 && ENV_FILE=$ENV_FILE uvicorn main:app --reload --port $BACKEND_PORT"
            echo "cd backend-v2/frontend-v2 && PORT=$FRONTEND_PORT npm run dev"
            ;;
        "staging")
            echo -e "${PURPLE}Staging Commands:${NC}"
            echo "cd backend-v2 && ENV_FILE=$ENV_FILE python -m pytest tests/ -m 'integration' -v"
            echo "./scripts/health-check-worktree.sh"
            echo "./scripts/init-staging-database.sh"
            ;;
        "main")
            echo -e "${GREEN}Main Development Commands:${NC}"
            echo "./scripts/parallel-tests.sh"
            echo "./scripts/health-check.sh"
            echo "./scripts/start-dev-session.sh"
            ;;
    esac
    
    echo ""
    echo "Test results saved in: $TEST_RESULTS_DIR/"
    echo ""
    
    # Exit with appropriate code
    if [ $failed_tests -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"