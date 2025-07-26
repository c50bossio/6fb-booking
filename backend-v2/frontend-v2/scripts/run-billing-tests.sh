#!/bin/bash

# Billing Settings Page Test Runner
# Comprehensive test execution script for billing functionality

set -e

echo "🔥 BookedBarber V2 - Billing Settings Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directories
UNIT_TESTS="__tests__/app/settings/billing/page.unit.test.tsx"
INTEGRATION_TESTS="__tests__/app/settings/billing/page.integration.test.tsx"
E2E_TESTS="__tests__/e2e/billing-settings.e2e.test.ts"
SECURITY_TESTS="__tests__/security/billing-security.test.tsx"
PERFORMANCE_TESTS="__tests__/performance/billing-performance.test.tsx"

# Test results directory
RESULTS_DIR="test-results/billing"
mkdir -p "$RESULTS_DIR"

# Generate timestamp for test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/billing_test_run_$TIMESTAMP.log"

echo "📝 Test run logged to: $LOG_FILE"
echo ""

# Function to run tests with proper error handling
run_test_suite() {
    local test_name=$1
    local test_file=$2
    local test_type=$3
    
    echo -e "${BLUE}🧪 Running $test_name...${NC}"
    
    if [ "$test_type" == "e2e" ]; then
        # Run E2E tests with Playwright
        if npx playwright test "$test_file" --reporter=html,json 2>&1 | tee -a "$LOG_FILE"; then
            echo -e "${GREEN}✅ $test_name passed${NC}"
            return 0
        else
            echo -e "${RED}❌ $test_name failed${NC}"
            return 1
        fi
    else
        # Run Jest tests
        if npm test -- "$test_file" --coverage --watchAll=false --verbose 2>&1 | tee -a "$LOG_FILE"; then
            echo -e "${GREEN}✅ $test_name passed${NC}"
            return 0
        else
            echo -e "${RED}❌ $test_name failed${NC}"
            return 1
        fi
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    # Check if Node.js version is compatible
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js 18+ is required (current: $(node --version))${NC}"
        exit 1
    fi
    
    # Check if test files exist
    for test_file in "$UNIT_TESTS" "$INTEGRATION_TESTS" "$SECURITY_TESTS" "$PERFORMANCE_TESTS"; do
        if [ ! -f "$test_file" ]; then
            echo -e "${RED}❌ Test file not found: $test_file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to setup test environment
setup_test_environment() {
    echo -e "${BLUE}🛠️  Setting up test environment...${NC}"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Check for test-specific environment variables
    if [ -f ".env.test" ]; then
        echo "🔧 Loading test environment variables..."
        export $(cat .env.test | grep -v '#' | xargs)
    fi
    
    # Setup test database (if needed)
    if [ -f "scripts/setup-test-db.sh" ]; then
        echo "🗄️  Setting up test database..."
        ./scripts/setup-test-db.sh
    fi
    
    # Clear any existing coverage reports
    rm -rf coverage/
    
    echo -e "${GREEN}✅ Test environment setup complete${NC}"
    echo ""
}

# Function to generate test report
generate_test_report() {
    local exit_code=$1
    
    echo ""
    echo -e "${BLUE}📊 Generating test report...${NC}"
    
    # Create comprehensive test report
    cat > "$RESULTS_DIR/billing_test_report_$TIMESTAMP.md" << EOF
# Billing Settings Test Report

**Test Run:** $TIMESTAMP  
**Exit Code:** $exit_code  
**Status:** $([ $exit_code -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")

## Test Coverage

### Unit Tests
- **File:** $UNIT_TESTS
- **Focus:** Component rendering, user interactions, data display
- **Status:** $([ -f "$RESULTS_DIR/unit_test_result.txt" ] && cat "$RESULTS_DIR/unit_test_result.txt" || echo "Not run")

### Integration Tests  
- **File:** $INTEGRATION_TESTS
- **Focus:** API integration, Stripe integration, error handling
- **Status:** $([ -f "$RESULTS_DIR/integration_test_result.txt" ] && cat "$RESULTS_DIR/integration_test_result.txt" || echo "Not run")

### E2E Tests
- **File:** $E2E_TESTS
- **Focus:** Complete user workflows, cross-browser compatibility
- **Status:** $([ -f "$RESULTS_DIR/e2e_test_result.txt" ] && cat "$RESULTS_DIR/e2e_test_result.txt" || echo "Not run")

### Security Tests
- **File:** $SECURITY_TESTS
- **Focus:** PCI compliance, data protection, authentication
- **Status:** $([ -f "$RESULTS_DIR/security_test_result.txt" ] && cat "$RESULTS_DIR/security_test_result.txt" || echo "Not run")

### Performance Tests
- **File:** $PERFORMANCE_TESTS
- **Focus:** Load times, memory usage, rendering performance
- **Status:** $([ -f "$RESULTS_DIR/performance_test_result.txt" ] && cat "$RESULTS_DIR/performance_test_result.txt" || echo "Not run")

## Test Artifacts

- **Full Log:** $LOG_FILE
- **Coverage Report:** coverage/lcov-report/index.html
- **E2E Report:** playwright-report/index.html

## Next Steps

$([ $exit_code -eq 0 ] && echo "✅ All tests passed! Ready for deployment." || echo "❌ Tests failed. Review logs and fix issues before proceeding.")

EOF

    echo -e "${GREEN}✅ Test report generated: $RESULTS_DIR/billing_test_report_$TIMESTAMP.md${NC}"
}

# Function to run security audit
run_security_audit() {
    echo -e "${BLUE}🔒 Running security audit...${NC}"
    
    # Run npm audit
    if npm audit --audit-level high 2>&1 | tee -a "$LOG_FILE"; then
        echo -e "${GREEN}✅ Security audit passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Security vulnerabilities found - check log for details${NC}"
    fi
    
    # Check for sensitive data in code
    if grep -r "sk_live\|pk_live\|password\|secret" __tests__/ --exclude-dir=node_modules --exclude="*.log" > /dev/null 2>&1; then
        echo -e "${RED}❌ Potential sensitive data found in test files${NC}"
        return 1
    else
        echo -e "${GREEN}✅ No sensitive data found in test files${NC}"
    fi
    
    echo ""
}

# Function to cleanup after tests
cleanup_test_environment() {
    echo -e "${BLUE}🧹 Cleaning up test environment...${NC}"
    
    # Stop any background processes
    pkill -f "jest\|playwright" || true
    
    # Clear test cache
    npm run test -- --clearCache > /dev/null 2>&1 || true
    
    # Remove temporary files
    rm -f *.tmp
    rm -f test-*.json
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main execution flow
main() {
    local exit_code=0
    local failed_tests=()
    
    echo "🚀 Starting Billing Settings comprehensive test suite..."
    echo ""
    
    # Prerequisites and setup
    check_prerequisites
    setup_test_environment
    run_security_audit
    
    # Run test suites
    echo -e "${BLUE}📋 Test Execution Plan:${NC}"
    echo "1. Unit Tests (Component behavior)"
    echo "2. Integration Tests (API integration)"  
    echo "3. Security Tests (PCI compliance)"
    echo "4. Performance Tests (Load & memory)"
    echo "5. E2E Tests (User workflows)"
    echo ""
    
    # Unit Tests
    if run_test_suite "Unit Tests" "$UNIT_TESTS" "unit"; then
        echo "PASSED" > "$RESULTS_DIR/unit_test_result.txt"
    else
        echo "FAILED" > "$RESULTS_DIR/unit_test_result.txt"
        failed_tests+=("Unit Tests")
        exit_code=1
    fi
    echo ""
    
    # Integration Tests
    if run_test_suite "Integration Tests" "$INTEGRATION_TESTS" "integration"; then
        echo "PASSED" > "$RESULTS_DIR/integration_test_result.txt"
    else
        echo "FAILED" > "$RESULTS_DIR/integration_test_result.txt"
        failed_tests+=("Integration Tests")
        exit_code=1
    fi
    echo ""
    
    # Security Tests
    if run_test_suite "Security Tests" "$SECURITY_TESTS" "security"; then
        echo "PASSED" > "$RESULTS_DIR/security_test_result.txt"
    else
        echo "FAILED" > "$RESULTS_DIR/security_test_result.txt"
        failed_tests+=("Security Tests")
        exit_code=1
    fi
    echo ""
    
    # Performance Tests
    if run_test_suite "Performance Tests" "$PERFORMANCE_TESTS" "performance"; then
        echo "PASSED" > "$RESULTS_DIR/performance_test_result.txt"
    else
        echo "FAILED" > "$RESULTS_DIR/performance_test_result.txt"
        failed_tests+=("Performance Tests")
        exit_code=1
    fi
    echo ""
    
    # E2E Tests (run last as they take longest)
    if [ -f "$E2E_TESTS" ]; then
        if run_test_suite "E2E Tests" "$E2E_TESTS" "e2e"; then
            echo "PASSED" > "$RESULTS_DIR/e2e_test_result.txt"
        else
            echo "FAILED" > "$RESULTS_DIR/e2e_test_result.txt"
            failed_tests+=("E2E Tests")
            exit_code=1
        fi
    else
        echo -e "${YELLOW}⚠️  E2E tests not found - skipping${NC}"
        echo "SKIPPED" > "$RESULTS_DIR/e2e_test_result.txt"
    fi
    echo ""
    
    # Generate final report
    generate_test_report $exit_code
    cleanup_test_environment
    
    # Final summary
    echo ""
    echo "==============================================="
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL BILLING TESTS PASSED!${NC}"
        echo -e "${GREEN}✅ Ready for production deployment${NC}"
    else
        echo -e "${RED}❌ SOME TESTS FAILED${NC}"
        echo -e "${RED}Failed test suites: ${failed_tests[*]}${NC}"
        echo -e "${YELLOW}📋 Check the test report for details: $RESULTS_DIR/billing_test_report_$TIMESTAMP.md${NC}"
    fi
    echo "==============================================="
    
    exit $exit_code
}

# Handle script interruption
trap cleanup_test_environment EXIT INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            UNIT_TESTS_ONLY=true
            shift
            ;;
        --integration-only)
            INTEGRATION_TESTS_ONLY=true
            shift
            ;;
        --security-only)
            SECURITY_TESTS_ONLY=true
            shift
            ;;
        --performance-only)
            PERFORMANCE_TESTS_ONLY=true
            shift
            ;;
        --e2e-only)
            E2E_TESTS_ONLY=true
            shift
            ;;
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --unit-only         Run only unit tests"
            echo "  --integration-only  Run only integration tests"
            echo "  --security-only     Run only security tests"
            echo "  --performance-only  Run only performance tests"
            echo "  --e2e-only          Run only E2E tests"
            echo "  --skip-e2e          Skip E2E tests"
            echo "  --verbose           Enable verbose output"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run appropriate test suites based on flags
if [ "$UNIT_TESTS_ONLY" = true ]; then
    check_prerequisites
    setup_test_environment
    run_test_suite "Unit Tests" "$UNIT_TESTS" "unit"
    exit $?
elif [ "$INTEGRATION_TESTS_ONLY" = true ]; then
    check_prerequisites
    setup_test_environment
    run_test_suite "Integration Tests" "$INTEGRATION_TESTS" "integration"
    exit $?
elif [ "$SECURITY_TESTS_ONLY" = true ]; then
    check_prerequisites
    setup_test_environment
    run_security_audit
    run_test_suite "Security Tests" "$SECURITY_TESTS" "security"
    exit $?
elif [ "$PERFORMANCE_TESTS_ONLY" = true ]; then
    check_prerequisites
    setup_test_environment
    run_test_suite "Performance Tests" "$PERFORMANCE_TESTS" "performance"
    exit $?
elif [ "$E2E_TESTS_ONLY" = true ]; then
    check_prerequisites
    setup_test_environment
    run_test_suite "E2E Tests" "$E2E_TESTS" "e2e"
    exit $?
else
    # Run full test suite
    main
fi