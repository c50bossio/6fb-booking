#!/bin/bash

# Six Figure Barber - Test Runner Script
# This script runs all tests for both backend and frontend with coverage reports

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$SCRIPT_DIR/frontend-v2"
COVERAGE_DIR="$SCRIPT_DIR/coverage"

# Exit codes
EXIT_SUCCESS=0
EXIT_BACKEND_FAIL=1
EXIT_FRONTEND_FAIL=2
EXIT_BOTH_FAIL=3

# Track test results
BACKEND_PASSED=false
FRONTEND_PASSED=false

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "info")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "success")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "error")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
}

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to ensure virtual environment is activated
ensure_venv() {
    if [[ -z "$VIRTUAL_ENV" ]]; then
        if [[ -f "$BACKEND_DIR/venv/bin/activate" ]]; then
            print_status "info" "Activating virtual environment..."
            source "$BACKEND_DIR/venv/bin/activate"
        else
            print_status "warning" "No virtual environment found. Creating one..."
            python3 -m venv "$BACKEND_DIR/venv"
            source "$BACKEND_DIR/venv/bin/activate"
            pip install -r "$BACKEND_DIR/requirements.txt"
        fi
    fi
}

# Function to run backend tests
run_backend_tests() {
    print_header "RUNNING BACKEND TESTS"
    
    cd "$BACKEND_DIR" || exit 1
    
    # Ensure virtual environment is active
    ensure_venv
    
    # Check if pytest is installed
    if ! command_exists pytest; then
        print_status "warning" "pytest not found. Installing..."
        pip install pytest pytest-cov pytest-asyncio httpx
    fi
    
    # Create coverage directory if it doesn't exist
    mkdir -p "$COVERAGE_DIR"
    
    # Run tests with coverage
    print_status "info" "Running backend tests with coverage..."
    
    # Run pytest with coverage
    if pytest \
        --cov=. \
        --cov-report=term-missing \
        --cov-report=html:"$COVERAGE_DIR/backend-html" \
        --cov-report=json:"$COVERAGE_DIR/backend-coverage.json" \
        --cov-config=.coveragerc \
        -v \
        --tb=short \
        --strict-markers \
        --disable-warnings \
        tests/; then
        
        print_status "success" "Backend tests passed!"
        BACKEND_PASSED=true
        
        # Show coverage summary
        echo ""
        print_status "info" "Backend coverage report saved to: $COVERAGE_DIR/backend-html/index.html"
        
        # Extract coverage percentage
        if [[ -f "$COVERAGE_DIR/backend-coverage.json" ]]; then
            COVERAGE=$(python3 -c "import json; data=json.load(open('$COVERAGE_DIR/backend-coverage.json')); print(f\"{data['totals']['percent_covered']:.1f}%\")" 2>/dev/null || echo "N/A")
            print_status "info" "Backend test coverage: $COVERAGE"
        fi
    else
        print_status "error" "Backend tests failed!"
        BACKEND_PASSED=false
    fi
    
    cd - > /dev/null
}

# Function to run frontend tests
run_frontend_tests() {
    print_header "RUNNING FRONTEND TESTS"
    
    # Check if frontend directory exists
    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_status "warning" "Frontend directory not found at $FRONTEND_DIR"
        print_status "info" "Skipping frontend tests..."
        FRONTEND_PASSED=true
        return
    fi
    
    cd "$FRONTEND_DIR" || exit 2
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        print_status "warning" "node_modules not found. Running npm install..."
        if command_exists npm; then
            npm install
        else
            print_status "error" "npm not found. Please install Node.js"
            FRONTEND_PASSED=false
            return
        fi
    fi
    
    # Check if test script exists in package.json
    if grep -q '"test"' package.json 2>/dev/null; then
        print_status "info" "Running frontend tests with coverage..."
        
        # Run tests with coverage
        if npm test -- --coverage --watchAll=false \
            --coverageDirectory="$COVERAGE_DIR/frontend-coverage" \
            --json --outputFile="$COVERAGE_DIR/frontend-test-results.json"; then
            
            print_status "success" "Frontend tests passed!"
            FRONTEND_PASSED=true
            
            # Show coverage summary
            echo ""
            print_status "info" "Frontend coverage report saved to: $COVERAGE_DIR/frontend-coverage/lcov-report/index.html"
            
            # Extract test results
            if [[ -f "$COVERAGE_DIR/frontend-test-results.json" ]]; then
                TOTAL_TESTS=$(python3 -c "import json; data=json.load(open('$COVERAGE_DIR/frontend-test-results.json')); print(data.get('numTotalTests', 'N/A'))" 2>/dev/null || echo "N/A")
                PASSED_TESTS=$(python3 -c "import json; data=json.load(open('$COVERAGE_DIR/frontend-test-results.json')); print(data.get('numPassedTests', 'N/A'))" 2>/dev/null || echo "N/A")
                print_status "info" "Frontend tests: $PASSED_TESTS/$TOTAL_TESTS passed"
            fi
        else
            print_status "error" "Frontend tests failed!"
            FRONTEND_PASSED=false
        fi
    else
        print_status "warning" "No test script found in package.json"
        print_status "info" "Skipping frontend tests..."
        FRONTEND_PASSED=true
    fi
    
    cd - > /dev/null
}

# Function to generate combined coverage report
generate_combined_report() {
    print_header "TEST SUMMARY"
    
    echo -e "Backend Tests: $([ "$BACKEND_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo -e "Frontend Tests: $([ "$FRONTEND_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    
    echo ""
    print_status "info" "Coverage reports available at:"
    echo "  - Backend HTML: $COVERAGE_DIR/backend-html/index.html"
    echo "  - Frontend HTML: $COVERAGE_DIR/frontend-coverage/lcov-report/index.html"
    
    # Create a simple HTML index file linking to both reports
    cat > "$COVERAGE_DIR/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Six Figure Barber - Test Coverage</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .report-link { 
            display: inline-block; 
            margin: 10px; 
            padding: 10px 20px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
        }
        .report-link:hover { background: #0056b3; }
        .status { 
            display: inline-block; 
            padding: 5px 10px; 
            border-radius: 3px; 
            margin-left: 10px; 
        }
        .passed { background: #28a745; color: white; }
        .failed { background: #dc3545; color: white; }
    </style>
</head>
<body>
    <h1>Six Figure Barber - Test Coverage Reports</h1>
    <p>Generated on: $(date)</p>
    
    <h2>Test Results</h2>
    <p>Backend: <span class="status $([ "$BACKEND_PASSED" = true ] && echo "passed" || echo "failed")">$([ "$BACKEND_PASSED" = true ] && echo "PASSED" || echo "FAILED")</span></p>
    <p>Frontend: <span class="status $([ "$FRONTEND_PASSED" = true ] && echo "passed" || echo "failed")">$([ "$FRONTEND_PASSED" = true ] && echo "PASSED" || echo "FAILED")</span></p>
    
    <h2>Coverage Reports</h2>
    <a href="backend-html/index.html" class="report-link">Backend Coverage</a>
    <a href="frontend-coverage/lcov-report/index.html" class="report-link">Frontend Coverage</a>
</body>
</html>
EOF
    
    print_status "info" "Combined report: $COVERAGE_DIR/index.html"
}

# Function to clean up
cleanup() {
    print_status "info" "Cleaning up..."
    # Add any cleanup tasks here
}

# Main execution
main() {
    print_header "SIX FIGURE BARBER TEST RUNNER"
    print_status "info" "Starting test execution..."
    
    # Parse command line arguments
    SKIP_BACKEND=false
    SKIP_FRONTEND=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backend)
                SKIP_BACKEND=true
                shift
                ;;
            --skip-frontend)
                SKIP_FRONTEND=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-backend    Skip backend tests"
                echo "  --skip-frontend   Skip frontend tests"
                echo "  --help, -h        Show this help message"
                exit 0
                ;;
            *)
                print_status "error" "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run tests
    if [[ "$SKIP_BACKEND" = false ]]; then
        run_backend_tests
    else
        print_status "info" "Skipping backend tests (--skip-backend flag)"
        BACKEND_PASSED=true
    fi
    
    if [[ "$SKIP_FRONTEND" = false ]]; then
        run_frontend_tests
    else
        print_status "info" "Skipping frontend tests (--skip-frontend flag)"
        FRONTEND_PASSED=true
    fi
    
    # Generate summary
    generate_combined_report
    
    # Cleanup
    cleanup
    
    # Determine exit code
    if [[ "$BACKEND_PASSED" = true ]] && [[ "$FRONTEND_PASSED" = true ]]; then
        print_status "success" "All tests passed!"
        exit $EXIT_SUCCESS
    elif [[ "$BACKEND_PASSED" = false ]] && [[ "$FRONTEND_PASSED" = false ]]; then
        print_status "error" "Both backend and frontend tests failed!"
        exit $EXIT_BOTH_FAIL
    elif [[ "$BACKEND_PASSED" = false ]]; then
        print_status "error" "Backend tests failed!"
        exit $EXIT_BACKEND_FAIL
    else
        print_status "error" "Frontend tests failed!"
        exit $EXIT_FRONTEND_FAIL
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"