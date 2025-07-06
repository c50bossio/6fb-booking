#!/bin/bash

# Puppeteer E2E Test Runner Script for BookedBarber V2
# This script provides convenient commands to run different test suites

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../../../.." && pwd)"

echo -e "${BLUE}🚀 BookedBarber V2 - Puppeteer E2E Test Runner${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if servers are running
check_servers() {
    echo -e "${YELLOW}Checking if servers are running...${NC}"
    
    # Check backend
    if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server is running (localhost:8000)${NC}"
    else
        echo -e "${RED}❌ Backend server not running on localhost:8000${NC}"
        echo -e "${YELLOW}Please start the backend server:${NC}"
        echo -e "cd $PROJECT_ROOT/backend-v2 && uvicorn main:app --reload"
        exit 1
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend server is running (localhost:3000)${NC}"
    else
        echo -e "${RED}❌ Frontend server not running on localhost:3000${NC}"
        echo -e "${YELLOW}Please start the frontend server:${NC}"
        echo -e "cd $PROJECT_ROOT/backend-v2/frontend-v2 && npm run dev"
        exit 1
    fi
    
    echo ""
}

# Function to show usage
show_usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  $0 [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo -e "  ${GREEN}all${NC}           Run all test suites"
    echo -e "  ${GREEN}quick${NC}         Run quick test suites only"
    echo -e "  ${GREEN}auth${NC}          Run authentication tests"
    echo -e "  ${GREEN}registration${NC}  Run registration flow tests"
    echo -e "  ${GREEN}booking${NC}       Run booking flow tests"
    echo -e "  ${GREEN}dashboard${NC}     Run dashboard tests"
    echo -e "  ${GREEN}mobile${NC}        Run mobile responsiveness tests"
    echo -e "  ${GREEN}performance${NC}   Run performance tests"
    echo -e "  ${GREEN}errors${NC}        Run error handling tests"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  ${GREEN}--headed${NC}      Run with visible browser (default: headless)"
    echo -e "  ${GREEN}--no-check${NC}    Skip server availability check"
    echo -e "  ${GREEN}--help${NC}        Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 all                    # Run all tests headless"
    echo -e "  $0 quick --headed         # Run quick tests with visible browser"
    echo -e "  $0 auth --headed          # Debug authentication tests"
    echo -e "  $0 performance            # Run performance tests only"
}

# Parse arguments
COMMAND=""
OPTIONS=""
SKIP_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        all|quick|auth|registration|booking|dashboard|mobile|performance|errors)
            COMMAND="$1"
            shift
            ;;
        --headed)
            OPTIONS="$OPTIONS --headed"
            shift
            ;;
        --no-check)
            SKIP_CHECK=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Default to 'all' if no command specified
if [[ -z "$COMMAND" ]]; then
    COMMAND="all"
fi

# Check servers unless skipped
if [[ "$SKIP_CHECK" == false ]]; then
    check_servers
fi

# Change to test directory
cd "$TEST_DIR"

# Create necessary directories
mkdir -p test-screenshots test-reports

echo -e "${BLUE}Running tests with command: ${GREEN}$COMMAND${NC}"
if [[ -n "$OPTIONS" ]]; then
    echo -e "${BLUE}Options: ${GREEN}$OPTIONS${NC}"
fi
echo ""

# Run the appropriate test command
case $COMMAND in
    all)
        echo -e "${YELLOW}🧪 Running ALL test suites...${NC}"
        node run-all-tests.js $OPTIONS
        ;;
    quick)
        echo -e "${YELLOW}⚡ Running QUICK test suites...${NC}"
        node run-all-tests.js --quick $OPTIONS
        ;;
    auth)
        echo -e "${YELLOW}🔐 Running AUTHENTICATION tests...${NC}"
        node auth-flow-test.js $OPTIONS
        ;;
    registration)
        echo -e "${YELLOW}📝 Running REGISTRATION tests...${NC}"
        node registration-flow-test.js $OPTIONS
        ;;
    booking)
        echo -e "${YELLOW}📅 Running BOOKING tests...${NC}"
        node booking-flow-test.js $OPTIONS
        ;;
    dashboard)
        echo -e "${YELLOW}📊 Running DASHBOARD tests...${NC}"
        node dashboard-test.js $OPTIONS
        ;;
    mobile)
        echo -e "${YELLOW}📱 Running MOBILE RESPONSIVENESS tests...${NC}"
        node mobile-responsive-test.js $OPTIONS
        ;;
    performance)
        echo -e "${YELLOW}⚡ Running PERFORMANCE tests...${NC}"
        node performance-test.js $OPTIONS
        ;;
    errors)
        echo -e "${YELLOW}🚨 Running ERROR HANDLING tests...${NC}"
        node error-handling-test.js $OPTIONS
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        show_usage
        exit 1
        ;;
esac

# Check exit code
if [[ $? -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✅ Tests completed successfully!${NC}"
    
    # Show where results are saved
    echo -e "${BLUE}📁 Results saved to:${NC}"
    echo -e "   Screenshots: ${TEST_DIR}/test-screenshots/"
    echo -e "   Reports: ${TEST_DIR}/test-reports/"
    
    # Show latest report
    LATEST_REPORT=$(ls -t test-reports/*.json 2>/dev/null | head -1)
    if [[ -n "$LATEST_REPORT" ]]; then
        echo -e "   Latest report: ${LATEST_REPORT}"
    fi
else
    echo ""
    echo -e "${RED}❌ Tests failed! Check the output above for details.${NC}"
    exit 1
fi