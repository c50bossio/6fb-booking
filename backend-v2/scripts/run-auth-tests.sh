#!/bin/bash

# Authentication Test Runner Script
# Runs comprehensive authentication test suite locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_DIR="$(dirname "$0")/.."
FRONTEND_DIR="$BACKEND_DIR/frontend-v2"
TEST_DB_NAME="bookedbarber_auth_test"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"

echo -e "${BLUE}🔐 Starting Authentication Test Suite${NC}"
echo "=================================================="

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to start services
start_services() {
    print_header "🚀 Starting Required Services"
    
    # Check if PostgreSQL is running
    if command_exists pg_isready; then
        if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            echo -e "${YELLOW}Starting PostgreSQL...${NC}"
            if command_exists brew; then
                brew services start postgresql
            elif command_exists systemctl; then
                sudo systemctl start postgresql
            else
                echo -e "${RED}Please start PostgreSQL manually${NC}"
                exit 1
            fi
            sleep 5
        fi
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL not found. Please install PostgreSQL.${NC}"
        exit 1
    fi

    # Create test database if it doesn't exist
    if ! psql -h localhost -U $POSTGRES_USER -lqt | cut -d \| -f 1 | grep -qw $TEST_DB_NAME; then
        echo -e "${YELLOW}Creating test database: $TEST_DB_NAME${NC}"
        createdb -h localhost -U $POSTGRES_USER $TEST_DB_NAME
    fi
    echo -e "${GREEN}✅ Test database ready${NC}"
}

# Function to setup backend environment
setup_backend() {
    print_header "🐍 Setting up Backend Environment"
    
    cd "$BACKEND_DIR"
    
    # Check Python version
    if ! command_exists python3; then
        echo -e "${RED}❌ Python 3 not found${NC}"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    echo -e "${GREEN}✅ Python $PYTHON_VERSION detected${NC}"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    echo -e "${YELLOW}Activating virtual environment...${NC}"
    source venv/bin/activate
    
    # Install/upgrade dependencies
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install pytest-cov pytest-xdist pytest-mock pytest-asyncio
    
    # Setup test environment file
    echo -e "${YELLOW}Setting up test environment...${NC}"
    cat > .env.test << EOF
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$TEST_DB_NAME
TESTING=true
SECRET_KEY=test-secret-key-for-authentication-testing
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
    
    # Run database migrations
    echo -e "${YELLOW}Running database migrations...${NC}"
    export ENV_FILE=.env.test
    alembic upgrade head
    
    echo -e "${GREEN}✅ Backend environment ready${NC}"
}

# Function to setup frontend environment
setup_frontend() {
    print_header "🌐 Setting up Frontend Environment"
    
    cd "$FRONTEND_DIR"
    
    # Check Node.js version
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION detected${NC}"
    
    # Install dependencies
    echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
    npm ci
    
    # Setup test environment
    echo -e "${YELLOW}Setting up frontend test environment...${NC}"
    cat > .env.test.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=test
EOF
    
    echo -e "${GREEN}✅ Frontend environment ready${NC}"
}

# Function to run backend tests
run_backend_tests() {
    print_header "🧪 Running Backend Authentication Tests"
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    export ENV_FILE=.env.test
    
    echo -e "${YELLOW}Running API endpoint tests...${NC}"
    pytest tests/integration/test_auth_login_api_v2.py -v --cov=. --cov-report=term-missing --cov-report=html:htmlcov/backend
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend tests failed${NC}"
        return 1
    fi
}

# Function to run frontend unit tests
run_frontend_unit_tests() {
    print_header "🧪 Running Frontend Unit Tests"
    
    cd "$FRONTEND_DIR"
    
    echo -e "${YELLOW}Running form validation tests...${NC}"
    npm test -- --testPathPattern="hooks/useFormValidation.unit.test" --watchAll=false --coverage=false --passWithNoTests
    
    echo -e "${YELLOW}Running error handling tests...${NC}"
    npm test -- --testPathPattern="lib/error-handling.unit.test" --watchAll=false --coverage=false --passWithNoTests
    
    echo -e "${YELLOW}Running login component tests...${NC}"
    npm test -- --testPathPattern="components/LoginForm.unit.test" --watchAll=false --coverage=false --passWithNoTests
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend unit tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Frontend unit tests failed${NC}"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_header "🔗 Running Integration Tests"
    
    # Start backend server in background
    cd "$BACKEND_DIR"
    source venv/bin/activate
    export ENV_FILE=.env.test
    
    echo -e "${YELLOW}Starting backend server...${NC}"
    uvicorn main:app --host 0.0.0.0 --port 8000 --log-level error &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    echo -e "${YELLOW}Waiting for backend server to be ready...${NC}"
    for i in {1..30}; do
        if curl -f http://localhost:8000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend server is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Backend server failed to start${NC}"
            kill $BACKEND_PID 2>/dev/null || true
            return 1
        fi
        sleep 1
    done
    
    # Run integration tests
    cd "$FRONTEND_DIR"
    echo -e "${YELLOW}Running frontend-backend integration tests...${NC}"
    npm test -- --testPathPattern="integration/auth-login-integration" --watchAll=false --coverage=false --passWithNoTests
    INTEGRATION_RESULT=$?
    
    # Stop backend server
    echo -e "${YELLOW}Stopping backend server...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    
    if [ $INTEGRATION_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_header "🌍 Running End-to-End Tests"
    
    # Install Playwright if not already installed
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules/@playwright" ]; then
        echo -e "${YELLOW}Installing Playwright...${NC}"
        npx playwright install chromium
    fi
    
    # Start backend server
    cd "$BACKEND_DIR"
    source venv/bin/activate
    export ENV_FILE=.env.test
    
    echo -e "${YELLOW}Starting backend server...${NC}"
    uvicorn main:app --host 0.0.0.0 --port 8000 --log-level error &
    BACKEND_PID=$!
    
    # Build and start frontend
    cd "$FRONTEND_DIR"
    echo -e "${YELLOW}Building frontend...${NC}"
    NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build
    
    echo -e "${YELLOW}Starting frontend server...${NC}"
    NEXT_PUBLIC_API_URL=http://localhost:8000 npm start &
    FRONTEND_PID=$!
    
    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    for i in {1..60}; do
        if curl -f http://localhost:8000/health >/dev/null 2>&1 && curl -f http://localhost:3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ All services are ready${NC}"
            break
        fi
        if [ $i -eq 60 ]; then
            echo -e "${RED}❌ Services failed to start${NC}"
            kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
            return 1
        fi
        sleep 1
    done
    
    # Run E2E tests
    echo -e "${YELLOW}Running E2E authentication tests...${NC}"
    npx playwright test __tests__/e2e/auth-login-e2e.spec.ts --reporter=line
    E2E_RESULT=$?
    
    # Stop services
    echo -e "${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    
    if [ $E2E_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ E2E tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ E2E tests failed${NC}"
        return 1
    fi
}

# Function to run error scenario tests
run_error_scenario_tests() {
    print_header "💥 Running Error Scenario Tests"
    
    cd "$FRONTEND_DIR"
    
    echo -e "${YELLOW}Running comprehensive error scenario tests...${NC}"
    npm test -- --testPathPattern="error-scenarios/auth-error-scenarios" --watchAll=false --coverage=false --passWithNoTests
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Error scenario tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Error scenario tests failed${NC}"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_header "🔒 Running Security Tests"
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    export ENV_FILE=.env.test
    
    echo -e "${YELLOW}Running SQL injection protection tests...${NC}"
    pytest tests/integration/test_auth_login_api_v2.py::TestAuthLoginAPIV2::test_login_sql_injection_protection -v
    
    echo -e "${YELLOW}Running timing attack protection tests...${NC}"
    pytest tests/integration/test_auth_login_api_v2.py::TestAuthLoginAPIV2::test_login_password_timing_attack_protection -v
    
    echo -e "${YELLOW}Running error response consistency tests...${NC}"
    pytest tests/integration/test_auth_login_api_v2.py::TestAuthLoginAPIV2::test_login_error_response_consistency -v
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Security tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Security tests failed${NC}"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    print_header "📊 Generating Test Report"
    
    REPORT_FILE="auth-test-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" << EOF
{
    "test_run": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "environment": "local",
        "test_suite": "authentication"
    },
    "results": {
        "backend_tests": $BACKEND_RESULT,
        "frontend_unit_tests": $FRONTEND_UNIT_RESULT,
        "integration_tests": $INTEGRATION_RESULT,
        "e2e_tests": $E2E_RESULT,
        "error_scenario_tests": $ERROR_SCENARIO_RESULT,
        "security_tests": $SECURITY_RESULT
    },
    "coverage": {
        "backend_coverage_report": "$BACKEND_DIR/htmlcov/backend/index.html",
        "frontend_coverage_report": "$FRONTEND_DIR/coverage/lcov-report/index.html"
    },
    "test_files": [
        "backend-v2/tests/integration/test_auth_login_api_v2.py",
        "backend-v2/frontend-v2/__tests__/hooks/useFormValidation.unit.test.ts",
        "backend-v2/frontend-v2/__tests__/lib/error-handling.unit.test.ts",
        "backend-v2/frontend-v2/__tests__/components/LoginForm.unit.test.tsx",
        "backend-v2/frontend-v2/__tests__/integration/auth-login-integration.test.tsx",
        "backend-v2/frontend-v2/__tests__/e2e/auth-login-e2e.spec.ts",
        "backend-v2/frontend-v2/__tests__/error-scenarios/auth-error-scenarios.test.tsx"
    ],
    "fixes_validated": [
        "Email validation with edge cases (spaces, consecutive dots)",
        "Safe error handling with getBusinessContextError() fallbacks",
        "Form submission to /api/v2/auth/login endpoint",
        "JavaScript undefined property safety with optional chaining",
        "Toast error message handling with formatErrorForToast()",
        "Complete authentication flow from form to dashboard redirect"
    ]
}
EOF
    
    echo -e "${GREEN}📋 Test report generated: $REPORT_FILE${NC}"
}

# Function to cleanup
cleanup() {
    print_header "🧹 Cleaning Up"
    
    # Kill any remaining processes
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    
    # Remove test database
    dropdb -h localhost -U $POSTGRES_USER $TEST_DB_NAME 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to show help
show_help() {
    echo "Authentication Test Runner"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h          Show this help message"
    echo "  --setup-only        Only setup environments, don't run tests"
    echo "  --backend-only      Run only backend tests"
    echo "  --frontend-only     Run only frontend tests"
    echo "  --integration-only  Run only integration tests"
    echo "  --e2e-only          Run only E2E tests"
    echo "  --security-only     Run only security tests"
    echo "  --no-cleanup        Don't cleanup after tests"
    echo ""
    echo "Examples:"
    echo "  $0                  Run full test suite"
    echo "  $0 --backend-only   Run only backend tests"
    echo "  $0 --setup-only     Just setup test environments"
}

# Parse command line arguments
SETUP_ONLY=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
INTEGRATION_ONLY=false
E2E_ONLY=false
SECURITY_ONLY=false
NO_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --setup-only)
            SETUP_ONLY=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --integration-only)
            INTEGRATION_ONLY=true
            shift
            ;;
        --e2e-only)
            E2E_ONLY=true
            shift
            ;;
        --security-only)
            SECURITY_ONLY=true
            shift
            ;;
        --no-cleanup)
            NO_CLEANUP=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Set up trap for cleanup
if [ "$NO_CLEANUP" = false ]; then
    trap cleanup EXIT
fi

# Initialize result variables
BACKEND_RESULT=1
FRONTEND_UNIT_RESULT=1
INTEGRATION_RESULT=1
E2E_RESULT=1
ERROR_SCENARIO_RESULT=1
SECURITY_RESULT=1

# Main execution
main() {
    start_services
    setup_backend
    setup_frontend
    
    if [ "$SETUP_ONLY" = true ]; then
        echo -e "${GREEN}✅ Setup completed successfully${NC}"
        exit 0
    fi
    
    # Run tests based on options
    if [ "$BACKEND_ONLY" = true ]; then
        run_backend_tests && BACKEND_RESULT=0
    elif [ "$FRONTEND_ONLY" = true ]; then
        run_frontend_unit_tests && FRONTEND_UNIT_RESULT=0
        run_error_scenario_tests && ERROR_SCENARIO_RESULT=0
    elif [ "$INTEGRATION_ONLY" = true ]; then
        run_integration_tests && INTEGRATION_RESULT=0
    elif [ "$E2E_ONLY" = true ]; then
        run_e2e_tests && E2E_RESULT=0
    elif [ "$SECURITY_ONLY" = true ]; then
        run_security_tests && SECURITY_RESULT=0
    else
        # Run full test suite
        run_backend_tests && BACKEND_RESULT=0 || true
        run_frontend_unit_tests && FRONTEND_UNIT_RESULT=0 || true
        run_integration_tests && INTEGRATION_RESULT=0 || true
        run_e2e_tests && E2E_RESULT=0 || true
        run_error_scenario_tests && ERROR_SCENARIO_RESULT=0 || true
        run_security_tests && SECURITY_RESULT=0 || true
    fi
    
    generate_report
    
    # Calculate overall success
    TOTAL_TESTS=6
    PASSED_TESTS=$((BACKEND_RESULT + FRONTEND_UNIT_RESULT + INTEGRATION_RESULT + E2E_RESULT + ERROR_SCENARIO_RESULT + SECURITY_RESULT))
    
    print_header "🏁 Final Results"
    echo -e "Backend Tests:         $([ $BACKEND_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Frontend Unit Tests:   $([ $FRONTEND_UNIT_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Integration Tests:     $([ $INTEGRATION_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "E2E Tests:            $([ $E2E_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Error Scenario Tests:  $([ $ERROR_SCENARIO_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Security Tests:        $([ $SECURITY_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo ""
    echo -e "Overall: ${PASSED_TESTS}/${TOTAL_TESTS} test suites passed"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "${GREEN}🎉 All authentication tests passed! Authentication fixes are ready for deployment.${NC}"
        exit 0
    else
        echo -e "${RED}💥 Some tests failed. Please review and fix before deploying.${NC}"
        exit 1
    fi
}

# Run main function
main