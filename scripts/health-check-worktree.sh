#!/bin/bash

# Worktree-Aware Health Check Script for BookedBarber V2
# This script validates deployment and system health across different worktrees

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Worktree context variables
WORKTREE_TYPE=""
WORKTREE_NAME=""
BACKEND_PORT=""
FRONTEND_PORT=""
ENV_FILE=""
DATABASE_FILE=""

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

# Test result tracking
pass_test() {
    ((TESTS_PASSED++))
    print_success "$1"
}

fail_test() {
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
    print_error "$1"
}

# Function to detect current worktree context
detect_worktree_context() {
    local current_path=$(pwd)
    local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Check if we're in a feature worktree
    if [[ "$current_path" == *"/6fb-booking-features/"* ]]; then
        WORKTREE_TYPE="feature"
        WORKTREE_NAME=$(basename "$current_path")
        BACKEND_PORT=8002
        FRONTEND_PORT=3002
        ENV_FILE=".env"
        DATABASE_FILE="feature_$(echo $WORKTREE_NAME | sed 's/feature-//').db"
        return 0
    fi
    
    # Check if we're in staging worktree
    if [[ "$current_path" == *"/6fb-booking-staging"* ]]; then
        WORKTREE_TYPE="staging"
        WORKTREE_NAME="staging"
        BACKEND_PORT=8001
        FRONTEND_PORT=3001
        ENV_FILE=".env.staging"
        DATABASE_FILE="staging_6fb_booking.db"
        return 0
    fi
    
    # Check if we're in main project
    if [[ "$current_path" == *"/6fb-booking"* ]] && [[ "$current_path" != *"/6fb-booking-"* ]]; then
        WORKTREE_TYPE="main"
        WORKTREE_NAME="main"
        BACKEND_PORT=8000
        FRONTEND_PORT=3000
        ENV_FILE=".env"
        DATABASE_FILE="6fb_booking.db"
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

# Check worktree-specific environment
check_worktree_environment() {
    print_status "Checking worktree environment..."
    
    # Check directory structure
    if [ -d "backend-v2" ] && [ -d "backend-v2/frontend-v2" ]; then
        pass_test "Worktree directory structure is correct"
    else
        fail_test "Invalid worktree directory structure"
        return 1
    fi
    
    # Check environment file
    if [ -f "backend-v2/$ENV_FILE" ]; then
        pass_test "Environment file exists: backend-v2/$ENV_FILE"
    else
        fail_test "Environment file missing: backend-v2/$ENV_FILE"
    fi
    
    # Check database file (for SQLite)
    if [ -f "backend-v2/$DATABASE_FILE" ]; then
        local db_size=$(ls -lh "backend-v2/$DATABASE_FILE" | awk '{print $5}')
        pass_test "Database file exists: $DATABASE_FILE (Size: $db_size)"
    else
        fail_test "Database file missing: $DATABASE_FILE"
    fi
    
    # Check git worktree status
    local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    case $WORKTREE_TYPE in
        "feature")
            if [[ "$current_branch" == feature/* ]]; then
                pass_test "On correct feature branch: $current_branch"
            else
                fail_test "Expected feature branch, found: $current_branch"
            fi
            ;;
        "staging")
            if [[ "$current_branch" == "staging" ]]; then
                pass_test "On correct staging branch: $current_branch"
            else
                fail_test "Expected staging branch, found: $current_branch"
            fi
            ;;
        "main")
            if [[ "$current_branch" == "develop" ]] || [[ "$current_branch" == "main" ]]; then
                pass_test "On correct main branch: $current_branch"
            else
                print_warning "On branch: $current_branch (expected develop or main)"
            fi
            ;;
    esac
}

# Check port availability and conflicts
check_ports() {
    print_status "Checking port usage..."
    
    # Detect actual running ports
    case $WORKTREE_TYPE in
        "feature")
            detect_running_ports 8002 3002
            ;;
        "staging")
            detect_running_ports 8001 3001
            ;;
        "main")
            detect_running_ports 8000 3000
            ;;
    esac
    
    # Check backend port
    if lsof -i :$BACKEND_PORT > /dev/null 2>&1; then
        local pid=$(lsof -ti:$BACKEND_PORT)
        pass_test "Backend running on port $BACKEND_PORT (PID: $pid)"
    else
        fail_test "Backend not running on port $BACKEND_PORT"
    fi
    
    # Check frontend port
    if lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
        local pid=$(lsof -ti:$FRONTEND_PORT)
        pass_test "Frontend running on port $FRONTEND_PORT (PID: $pid)"
    else
        fail_test "Frontend not running on port $FRONTEND_PORT"
    fi
}

# Check application health endpoints
check_application_health() {
    print_status "Checking application health endpoints..."
    
    local backend_url="http://localhost:$BACKEND_PORT"
    local frontend_url="http://localhost:$FRONTEND_PORT"
    
    # Check backend health
    if curl -f -s --max-time 10 "$backend_url/api/v1/health" > /dev/null 2>&1; then
        local health_data=$(curl -s --max-time 10 "$backend_url/api/v1/health" | python3 -m json.tool 2>/dev/null || echo "Invalid JSON")
        pass_test "Backend health endpoint responding"
        print_status "Backend health: $health_data"
    else
        fail_test "Backend health endpoint not responding at $backend_url/api/v1/health"
    fi
    
    # Check frontend
    if curl -f -s --max-time 10 "$frontend_url" > /dev/null 2>&1; then
        pass_test "Frontend responding at $frontend_url"
    else
        fail_test "Frontend not responding at $frontend_url"
    fi
}

# Check database connectivity (SQLite specific)
check_database_connectivity() {
    print_status "Checking database connectivity..."
    
    cd backend-v2
    
    # Check if database file exists and is accessible
    if [ -f "$DATABASE_FILE" ]; then
        # Try to connect and run a simple query
        if sqlite3 "$DATABASE_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" > /dev/null 2>&1; then
            local table_count=$(sqlite3 "$DATABASE_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
            pass_test "Database connectivity working ($table_count tables)"
            
            # Check for essential tables
            local user_table_exists=$(sqlite3 "$DATABASE_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null || echo "0")
            if [ "$user_table_exists" -gt 0 ]; then
                pass_test "Essential table 'users' exists"
            else
                fail_test "Essential table 'users' missing"
            fi
        else
            fail_test "Database file exists but is not accessible"
        fi
    else
        fail_test "Database file not found: $DATABASE_FILE"
    fi
    
    cd ..
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check backend dependencies
    if [ -d "backend-v2/venv" ]; then
        pass_test "Backend virtual environment exists"
    else
        fail_test "Backend virtual environment missing"
    fi
    
    # Check frontend dependencies
    if [ -d "backend-v2/frontend-v2/node_modules" ]; then
        pass_test "Frontend dependencies installed"
    else
        fail_test "Frontend dependencies not installed"
    fi
}

# Check worktree isolation
check_worktree_isolation() {
    print_status "Checking worktree isolation..."
    
    # Check that this worktree has its own database
    local other_databases=0
    case $WORKTREE_TYPE in
        "feature")
            if [ -f "../6fb-booking/backend-v2/6fb_booking.db" ]; then
                ((other_databases++))
            fi
            if [ -f "../6fb-booking-staging/backend-v2/staging_6fb_booking.db" ]; then
                ((other_databases++))
            fi
            ;;
        "staging")
            if [ -f "../6fb-booking/backend-v2/6fb_booking.db" ]; then
                ((other_databases++))
            fi
            ;;
        "main")
            if [ -f "../6fb-booking-staging/backend-v2/staging_6fb_booking.db" ]; then
                ((other_databases++))
            fi
            ;;
    esac
    
    if [ $other_databases -gt 0 ]; then
        pass_test "Other worktree databases detected ($other_databases) - good isolation"
    else
        print_warning "No other worktree databases found"
    fi
    
    # Check environment isolation
    if [ -f "backend-v2/$ENV_FILE" ]; then
        local current_db_url=$(grep "DATABASE_URL" "backend-v2/$ENV_FILE" | cut -d'=' -f2)
        if [[ "$current_db_url" == *"$DATABASE_FILE"* ]]; then
            pass_test "Database URL correctly isolated to this worktree"
        else
            fail_test "Database URL not properly isolated: $current_db_url"
        fi
    fi
}

# Performance tests specific to worktree
check_performance() {
    print_status "Running performance tests..."
    
    local backend_url="http://localhost:$BACKEND_PORT"
    local frontend_url="http://localhost:$FRONTEND_PORT"
    
    # Test API response time
    if command -v curl &> /dev/null; then
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$backend_url/api/v1/health" 2>/dev/null || echo "10.0")
        local response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "10000")
        
        if [[ $response_ms -lt 1000 ]]; then
            pass_test "API response time: ${response_ms}ms"
        elif [[ $response_ms -lt 3000 ]]; then
            print_warning "API response time is slow: ${response_ms}ms"
        else
            fail_test "API response time is very slow: ${response_ms}ms"
        fi
    fi
    
    # Test frontend response time
    local frontend_response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$frontend_url" 2>/dev/null || echo "10.0")
    local frontend_response_ms=$(echo "$frontend_response_time * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "10000")
    
    if [[ $frontend_response_ms -lt 2000 ]]; then
        pass_test "Frontend response time: ${frontend_response_ms}ms"
    elif [[ $frontend_response_ms -lt 5000 ]]; then
        print_warning "Frontend response time is slow: ${frontend_response_ms}ms"
    else
        fail_test "Frontend response time is very slow: ${frontend_response_ms}ms"
    fi
}

# Generate health report
generate_report() {
    print_status "Generating health check report..."
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=$((TESTS_PASSED * 100 / total_tests))
    
    echo
    echo "============================================="
    echo "BookedBarber V2 - Worktree Health Check Report"
    echo "============================================="
    echo "Timestamp: $(date)"
    echo "Worktree Type: $WORKTREE_TYPE"
    echo "Worktree Name: $WORKTREE_NAME"
    echo "Backend Port: $BACKEND_PORT"
    echo "Frontend Port: $FRONTEND_PORT"
    echo "Database File: $DATABASE_FILE"
    echo "Environment File: $ENV_FILE"
    echo
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo "Success Rate: $success_rate%"
    echo
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}✅ All health checks passed!${NC}"
        echo -e "${GREEN}Worktree is healthy and ready for development.${NC}"
    else
        echo -e "${RED}❌ Some health checks failed:${NC}"
        for failed_test in "${FAILED_TESTS[@]}"; do
            echo -e "${RED}  - $failed_test${NC}"
        done
        echo
        echo -e "${YELLOW}Please review and fix the failed checks before proceeding.${NC}"
    fi
    
    echo
    echo "============================================="
}

# Main health check function
main() {
    echo -e "${PURPLE}🏥 BookedBarber V2 - Worktree-Aware Health Check${NC}"
    echo "=================================================="
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
    echo "  Directory: $(pwd)"
    echo ""
    
    # Run all health checks
    check_worktree_environment
    check_dependencies
    check_ports
    check_database_connectivity
    check_application_health
    check_worktree_isolation
    check_performance
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [[ $TESTS_FAILED -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --help             Show this help message"
            echo ""
            echo "This script automatically detects the worktree context and performs"
            echo "appropriate health checks for the detected environment."
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"