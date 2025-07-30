#!/bin/bash

# Comprehensive Test Suite Runner for BookedBarber V2
# ==================================================
# 
# This script runs all comprehensive test suites with proper configuration,
# parallel execution, and comprehensive reporting.
#
# Usage:
#   ./run_all_tests.sh                    # Run all tests
#   ./run_all_tests.sh --suite smoke      # Run smoke tests only
#   ./run_all_tests.sh --parallel         # Run with parallelization
#   ./run_all_tests.sh --coverage         # Include coverage report
#   ./run_all_tests.sh --benchmark        # Run performance benchmarks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}BookedBarber V2 Comprehensive Test Suite${NC}"
echo -e "${BLUE}=======================================${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Test Directory: $SCRIPT_DIR"
echo ""

# Check if we're in the right directory
if [[ ! -f "$PROJECT_ROOT/main.py" ]]; then
    echo -e "${RED}Error: main.py not found. Please run this script from the tests directory.${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Parse command line arguments
SUITE="all"
PARALLEL=""
COVERAGE=""
VERBOSE=""
BENCHMARK=""
FAST=""
SAVE_REPORT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --suite)
            SUITE="$2"
            shift 2
            ;;
        --parallel|-p)
            PARALLEL="--parallel"
            shift
            ;;
        --coverage|-c)
            COVERAGE="--coverage"
            shift
            ;;
        --verbose|-v)
            VERBOSE="--verbose"
            shift
            ;;
        --benchmark)
            BENCHMARK="--benchmark"
            shift
            ;;
        --fast)
            FAST="--fast"
            shift
            ;;
        --save-report)
            SAVE_REPORT="--save-report $2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --suite SUITE         Test suite to run (all, smoke, auth, security, performance, ai, integration, api, frontend, e2e, critical)"
            echo "  --parallel, -p        Run tests in parallel"
            echo "  --coverage, -c        Generate coverage report"
            echo "  --verbose, -v         Verbose output"
            echo "  --benchmark           Run performance benchmarks"
            echo "  --fast                Run only fast tests"
            echo "  --save-report FILE    Save test report to JSON file"
            echo "  --help, -h            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                              # Run all tests"
            echo "  $0 --suite smoke --fast         # Quick smoke tests"
            echo "  $0 --suite security --verbose   # Security tests with verbose output"
            echo "  $0 --parallel --coverage        # All tests with parallelization and coverage"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Test Configuration:${NC}"
echo "  Suite: $SUITE"
echo "  Parallel: ${PARALLEL:-disabled}"
echo "  Coverage: ${COVERAGE:-disabled}"
echo "  Verbose: ${VERBOSE:-disabled}"
echo "  Benchmark: ${BENCHMARK:-disabled}"
echo "  Fast mode: ${FAST:-disabled}"
echo ""

# Create necessary directories
mkdir -p coverage/html
mkdir -p tests/reports
mkdir -p logs

# Check Python and dependencies
echo -e "${BLUE}Checking Prerequisites...${NC}"

# Check Python version
python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
echo "Python version: $python_version"

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}Warning: No virtual environment detected. Consider activating your venv.${NC}"
fi

# Check if pytest is installed
if ! python3 -c "import pytest" 2>/dev/null; then
    echo -e "${RED}Error: pytest not installed. Installing...${NC}"
    pip install pytest pytest-asyncio pytest-cov pytest-xdist
fi

# Check test runner prerequisites
echo "Checking test runner prerequisites..."
python3 tests/test_runner_comprehensive.py --check-prereq
if [[ $? -ne 0 ]]; then
    echo -e "${RED}Prerequisites check failed. Installing missing packages...${NC}"
    pip install pytest pytest-asyncio pytest-cov pytest-xdist
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# Run tests using the comprehensive test runner
echo -e "${BLUE}Starting Test Execution...${NC}"
echo "Time: $(date)"
echo ""

# Build the command
CMD="python3 tests/test_runner_comprehensive.py --suite $SUITE"

if [[ -n "$PARALLEL" ]]; then
    CMD="$CMD $PARALLEL"
fi

if [[ -n "$COVERAGE" ]]; then
    CMD="$CMD $COVERAGE"
fi

if [[ -n "$VERBOSE" ]]; then
    CMD="$CMD $VERBOSE"
fi

if [[ -n "$BENCHMARK" ]]; then
    CMD="$CMD $BENCHMARK"
fi

if [[ -n "$FAST" ]]; then
    CMD="$CMD $FAST"
fi

if [[ -n "$SAVE_REPORT" ]]; then
    CMD="$CMD $SAVE_REPORT"
fi

echo "Executing: $CMD"
echo ""

# Execute the test runner
start_time=$(date +%s)

if eval $CMD; then
    exit_code=0
    echo -e "${GREEN}✓ Test execution completed successfully${NC}"
else
    exit_code=$?
    echo -e "${RED}✗ Test execution failed with exit code $exit_code${NC}"
fi

end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
echo -e "${BLUE}Test Execution Summary:${NC}"
echo "Duration: ${duration}s"
echo "Exit Code: $exit_code"

# Show coverage report location if coverage was enabled
if [[ -n "$COVERAGE" ]] && [[ -d "coverage/html" ]]; then
    echo -e "${BLUE}Coverage Report: ${GREEN}coverage/html/index.html${NC}"
fi

# Show test report location if report was saved
if [[ -n "$SAVE_REPORT" ]] && [[ -d "tests/reports" ]]; then
    echo -e "${BLUE}Test Reports: ${GREEN}tests/reports/${NC}"
    ls -la tests/reports/ | tail -5
fi

echo ""

# Additional information based on test results
if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}🎉 All tests passed! Ready for deployment. 🎉${NC}"
    
    # Suggest next steps
    echo ""
    echo -e "${BLUE}Suggested next steps:${NC}"
    echo "  1. Review coverage report: open coverage/html/index.html"
    echo "  2. Check performance metrics in test output"
    echo "  3. Commit changes if all tests pass"
    echo "  4. Deploy to staging environment"
    
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    
    # Suggest debugging steps
    echo ""
    echo -e "${BLUE}Debugging suggestions:${NC}"
    echo "  1. Run with --verbose for more details: $0 --suite $SUITE --verbose"
    echo "  2. Run specific failing test suite only"
    echo "  3. Check logs in the logs/ directory"
    echo "  4. Review test output for specific error messages"
    
    # Show recent log files if they exist
    if [[ -d "logs" ]] && [[ -n "$(ls -A logs 2>/dev/null)" ]]; then
        echo ""
        echo -e "${BLUE}Recent log files:${NC}"
        ls -la logs/ | tail -3
    fi
fi

echo ""
echo "Test execution completed at $(date)"

exit $exit_code