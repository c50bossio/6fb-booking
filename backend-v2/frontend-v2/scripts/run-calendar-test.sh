#!/bin/bash

# Calendar Views End-to-End Test Runner
# Tests complete appointment flow and calendar verification

set -e  # Exit on any error

echo "🚀 BookedBarber V2 - Calendar Views E2E Test Runner"
echo "=================================================="

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3001
SCREENSHOTS_DIR="test-results/screenshots"
REPORTS_DIR="test-results/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $name to be ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404\|302"; then
            print_success "$name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$name failed to start within $(($max_attempts * 2)) seconds"
    return 1
}

# Cleanup function
cleanup() {
    echo ""
    print_status "Cleaning up..."
    
    # Kill background processes if they were started by this script
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend server (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_status "Cleanup completed"
}

# Set up cleanup trap
trap cleanup EXIT

# Create directories
print_status "Setting up test directories..."
mkdir -p "$SCREENSHOTS_DIR"
mkdir -p "$REPORTS_DIR"

# Check current directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the frontend-v2 directory"
    exit 1
fi

# Navigate to backend directory for server checks
cd ..

print_status "Checking server status..."

# Check if backend is running
if ! check_port $BACKEND_PORT; then
    print_warning "Backend not running on port $BACKEND_PORT, starting it..."
    
    # Start backend
    print_status "Starting backend server..."
    uvicorn main:app --reload --port $BACKEND_PORT > backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    if ! wait_for_service "http://localhost:$BACKEND_PORT" "Backend"; then
        print_error "Failed to start backend server"
        exit 1
    fi
else
    print_success "Backend already running on port $BACKEND_PORT"
fi

# Navigate back to frontend
cd frontend-v2

# Check if frontend is running
if ! check_port $FRONTEND_PORT; then
    print_warning "Frontend not running on port $FRONTEND_PORT, starting it..."
    
    # Start frontend
    print_status "Starting frontend server..."
    npm run staging > frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"; then
        print_error "Failed to start frontend server"
        exit 1
    fi
else
    print_success "Frontend already running on port $FRONTEND_PORT"
fi

# Verify both services are healthy
print_status "Verifying service health..."

backend_health=$(curl -s "http://localhost:$BACKEND_PORT/health" || echo "unhealthy")
if [[ $backend_health == *"healthy"* ]] || [[ $backend_health == *"6FB Booking"* ]]; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
    exit 1
fi

frontend_health=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT")
if [ "$frontend_health" == "200" ]; then
    print_success "Frontend health check passed"
else
    print_error "Frontend health check failed (HTTP $frontend_health)"
    exit 1
fi

# Install test dependencies if needed
if [ ! -d "node_modules/@playwright" ]; then
    print_status "Installing Playwright..."
    npx playwright install
fi

# Set environment variables for testing
export E2E_FRONTEND_URL="http://localhost:$FRONTEND_PORT"
export E2E_BACKEND_URL="http://localhost:$BACKEND_PORT" 
export E2E_LIVE_PAYMENTS="true"
export E2E_WEBHOOKS="true"

print_status "Environment configured:"
echo "  Frontend: $E2E_FRONTEND_URL"
echo "  Backend: $E2E_BACKEND_URL"
echo "  Live Payments: $E2E_LIVE_PAYMENTS"

# Run the tests
print_status "Running calendar views E2E tests..."
echo ""

# Test 1: Complete appointment flow with calendar verification
print_status "Test 1: Complete appointment booking and calendar verification"
npx playwright test tests/e2e/calendar-views.spec.ts --project=chromium --reporter=html --reporter=line

# Check test results
test_exit_code=$?

if [ $test_exit_code -eq 0 ]; then
    print_success "All calendar view tests passed!"
    
    # Generate summary report
    print_status "Generating test summary..."
    
    echo "📊 Test Results Summary" > "$REPORTS_DIR/summary.md"
    echo "======================" >> "$REPORTS_DIR/summary.md"
    echo "" >> "$REPORTS_DIR/summary.md"
    echo "**Test Date:** $(date)" >> "$REPORTS_DIR/summary.md"
    echo "**Duration:** $SECONDS seconds" >> "$REPORTS_DIR/summary.md"
    echo "**Status:** ✅ PASSED" >> "$REPORTS_DIR/summary.md"
    echo "" >> "$REPORTS_DIR/summary.md"
    echo "## Tests Completed" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Customer appointment booking flow" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Live Stripe payment processing" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Appointment appears in Monthly calendar view" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Appointment appears in Weekly calendar view" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Appointment appears in Daily calendar view" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Appointment details accuracy verification" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Database and webhook integration" >> "$REPORTS_DIR/summary.md"
    echo "- ✅ Test data cleanup" >> "$REPORTS_DIR/summary.md"
    echo "" >> "$REPORTS_DIR/summary.md"
    echo "## Screenshots Available" >> "$REPORTS_DIR/summary.md"
    echo "Check \`$SCREENSHOTS_DIR/\` for visual documentation of each test step." >> "$REPORTS_DIR/summary.md"
    
    print_success "Test summary saved to $REPORTS_DIR/summary.md"
    print_success "Screenshots saved to $SCREENSHOTS_DIR/"
    
    # Display quick summary
    echo ""
    echo "📋 Quick Summary:"
    echo "✅ Appointment booking: WORKING"
    echo "✅ Stripe payment: WORKING"  
    echo "✅ Monthly calendar: APPOINTMENT VISIBLE"
    echo "✅ Weekly calendar: APPOINTMENT VISIBLE"
    echo "✅ Daily calendar: APPOINTMENT VISIBLE"
    echo "✅ Full integration: WORKING"
    
else
    print_error "Calendar view tests failed!"
    
    echo "❌ Test Results Summary" > "$REPORTS_DIR/summary.md"
    echo "======================" >> "$REPORTS_DIR/summary.md"
    echo "" >> "$REPORTS_DIR/summary.md"
    echo "**Test Date:** $(date)" >> "$REPORTS_DIR/summary.md"
    echo "**Duration:** $SECONDS seconds" >> "$REPORTS_DIR/summary.md"
    echo "**Status:** ❌ FAILED" >> "$REPORTS_DIR/summary.md"
    echo "" >> "$REPORTS_DIR/summary.md"
    echo "Check the Playwright HTML report for detailed failure information." >> "$REPORTS_DIR/summary.md"
    
    print_error "Check playwright-report/index.html for detailed failure information"
    exit 1
fi

# Optional: Open test report
if command -v open >/dev/null 2>&1; then
    print_status "Opening test report..."
    open playwright-report/index.html
elif command -v xdg-open >/dev/null 2>&1; then
    print_status "Opening test report..."
    xdg-open playwright-report/index.html
fi

echo ""
print_success "Calendar views E2E testing completed successfully!"
echo "🎯 Your BookedBarber V2 appointment system is working end-to-end!"
echo "💰 Live Stripe payments are processing correctly!"
echo "📅 Appointments are visible in all calendar views!"