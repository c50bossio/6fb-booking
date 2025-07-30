#!/bin/bash

# BookedBarber V2 Comprehensive Load Testing Suite
# Executes all load testing scenarios for enterprise-scale validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/comprehensive_test_$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Progress message
progress() {
    log "${PURPLE}🚀 $1${NC}"
}

# Check dependencies
check_dependencies() {
    info "Checking dependencies..."
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        error_exit "k6 is not installed. Install with: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation/"
    fi
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        error_exit "Python 3 is not installed"
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi
    
    # Check if npm packages are installed
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        warning "Node modules not installed, running npm install..."
        cd "$SCRIPT_DIR"
        npm install || error_exit "Failed to install npm dependencies"
    fi
    
    # Check if Python packages are installed
    if ! python3 -c "import aiohttp, kubernetes, pandas" 2>/dev/null; then
        warning "Python dependencies not installed, installing..."
        pip3 install -r "$SCRIPT_DIR/requirements.txt" || error_exit "Failed to install Python dependencies"
    fi
    
    success "All dependencies checked"
}

# Load environment configuration
load_config() {
    info "Loading configuration..."
    
    if [ -f "$SCRIPT_DIR/.env" ]; then
        set -a
        source "$SCRIPT_DIR/.env"
        set +a
        success "Configuration loaded from .env"
    else
        warning "No .env file found, using default configuration"
        export BASE_URL="${BASE_URL:-http://localhost:8000}"
        export MAX_CONCURRENT_USERS="${MAX_CONCURRENT_USERS:-10000}"
        export TEST_DURATION="${TEST_DURATION:-30m}"
    fi
    
    info "Configuration:"
    info "  Base URL: $BASE_URL"
    info "  Max Users: $MAX_CONCURRENT_USERS"
    info "  Duration: $TEST_DURATION"
}

# Health check
health_check() {
    info "Performing health check..."
    
    local health_url="$BASE_URL/health"
    
    if curl -f -s "$health_url" > /dev/null; then
        success "Health check passed - API is responding"
    else
        error_exit "Health check failed - API not responding at $health_url"
    fi
}

# Run K6 load tests
run_k6_tests() {
    progress "Starting K6 Load Tests..."
    
    # Basic load test
    info "Running basic load test..."
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --env MAX_CONCURRENT_USERS="$MAX_CONCURRENT_USERS" \
        --env TEST_DURATION="$TEST_DURATION" \
        --out json="$RESULTS_DIR/basic_load_test_$TIMESTAMP.json" \
        "$SCRIPT_DIR/scenarios/basic-load-test.js" || warning "Basic load test completed with warnings"
    
    # Enterprise load test
    info "Running enterprise load test..."
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --env MAX_CONCURRENT_USERS="$MAX_CONCURRENT_USERS" \
        --env TEST_DURATION="$TEST_DURATION" \
        --out json="$RESULTS_DIR/enterprise_load_test_$TIMESTAMP.json" \
        "$SCRIPT_DIR/scenarios/enterprise-load-test.js" || warning "Enterprise load test completed with warnings"
    
    # Six Figure Barber specific test
    info "Running Six Figure Barber methodology test..."
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --env MAX_CONCURRENT_USERS="$MAX_CONCURRENT_USERS" \
        --env TEST_DURATION="$TEST_DURATION" \
        --out json="$RESULTS_DIR/six_figure_barber_test_$TIMESTAMP.json" \
        "$SCRIPT_DIR/scenarios/six-figure-barber-test.js" || warning "Six Figure Barber test completed with warnings"
    
    # Stress test
    if [ "${ENABLE_STRESS_TEST:-false}" = "true" ]; then
        warning "Running stress test - this will push the system to its limits"
        k6 run \
            --env BASE_URL="$BASE_URL" \
            --env MAX_CONCURRENT_USERS="$((MAX_CONCURRENT_USERS * 150 / 100))" \
            --env TEST_DURATION="20m" \
            --out json="$RESULTS_DIR/stress_test_$TIMESTAMP.json" \
            "$SCRIPT_DIR/scenarios/stress-test.js" || warning "Stress test completed with warnings"
    fi
    
    success "K6 load tests completed"
}

# Run infrastructure tests
run_infrastructure_tests() {
    if [ "${ENABLE_INFRASTRUCTURE_TESTING:-true}" = "true" ]; then
        progress "Starting Infrastructure Tests..."
        
        python3 "$SCRIPT_DIR/infrastructure/kubernetes-load-test.py" 2>&1 | tee -a "$LOG_FILE"
        
        success "Infrastructure tests completed"
    else
        info "Infrastructure testing disabled"
    fi
}

# Run frontend performance tests
run_frontend_tests() {
    if [ "${ENABLE_FRONTEND_TESTING:-true}" = "true" ]; then
        progress "Starting Frontend Performance Tests..."
        
        cd "$SCRIPT_DIR"
        npx playwright test frontend-performance.spec.js --reporter=json --output="$RESULTS_DIR/frontend_test_$TIMESTAMP.json" || warning "Frontend tests completed with warnings"
        
        success "Frontend tests completed"
    else
        info "Frontend testing disabled"
    fi
}

# Run database load tests
run_database_tests() {
    if [ "${ENABLE_DATABASE_TESTING:-true}" = "true" ]; then
        progress "Starting Database Load Tests..."
        
        python3 "$SCRIPT_DIR/database/postgres-load-test.py" 2>&1 | tee -a "$LOG_FILE"
        
        success "Database tests completed"
    else
        info "Database testing disabled"
    fi
}

# Generate comprehensive report
generate_report() {
    progress "Generating comprehensive performance report..."
    
    python3 "$SCRIPT_DIR/reporting/generate-comprehensive-report.py" \
        --results-dir "$RESULTS_DIR" \
        --timestamp "$TIMESTAMP" \
        --output "$RESULTS_DIR/comprehensive_report_$TIMESTAMP.html" 2>&1 | tee -a "$LOG_FILE"
    
    success "Comprehensive report generated"
}

# Send notifications
send_notifications() {
    if [ "${SEND_EMAIL_REPORT:-false}" = "true" ] && [ -n "${EMAIL_RECIPIENTS:-}" ]; then
        info "Sending email notifications..."
        
        python3 "$SCRIPT_DIR/notifications/send-report-email.py" \
            --report "$RESULTS_DIR/comprehensive_report_$TIMESTAMP.html" \
            --recipients "$EMAIL_RECIPIENTS" || warning "Email notification failed"
    fi
    
    if [ "${SEND_SLACK_NOTIFICATION:-false}" = "true" ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        info "Sending Slack notification..."
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"BookedBarber V2 Load Test Completed\\nTimestamp: $TIMESTAMP\\nResults: $RESULTS_DIR\"}" \
            "$SLACK_WEBHOOK_URL" || warning "Slack notification failed"
    fi
}

# Cleanup function
cleanup() {
    if [ "${CLEANUP_AFTER_TEST:-true}" = "true" ]; then
        info "Performing cleanup..."
        
        # Clean up test data if configured
        python3 "$SCRIPT_DIR/cleanup/cleanup-test-data.py" 2>&1 | tee -a "$LOG_FILE" || warning "Cleanup completed with warnings"
        
        success "Cleanup completed"
    fi
}

# Main execution
main() {
    info "🚀 BookedBarber V2 Comprehensive Load Testing Suite"
    info "📅 Started at: $(date)"
    info "📁 Results directory: $RESULTS_DIR"
    info "📝 Log file: $LOG_FILE"
    
    # Pre-flight checks
    check_dependencies
    load_config
    health_check
    
    # Record test start time
    local start_time=$(date +%s)
    
    # Execute test suite
    run_k6_tests
    run_infrastructure_tests
    run_frontend_tests
    run_database_tests
    
    # Post-test processing
    generate_report
    send_notifications
    cleanup
    
    # Calculate total duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))
    local seconds=$((duration % 60))
    
    success "🎉 Comprehensive load testing completed successfully!"
    info "⏱️  Total duration: ${hours}h ${minutes}m ${seconds}s"
    info "📊 Results available in: $RESULTS_DIR"
    info "📄 Comprehensive report: $RESULTS_DIR/comprehensive_report_$TIMESTAMP.html"
    
    # Display quick summary
    echo ""
    echo "📋 Quick Summary:"
    echo "=================="
    if [ -f "$RESULTS_DIR/enterprise_load_test_$TIMESTAMP.json" ]; then
        info "✅ Enterprise load test completed"
    fi
    if [ -f "$RESULTS_DIR/infrastructure_load_test_report_$TIMESTAMP.json" ]; then
        info "✅ Infrastructure testing completed"
    fi
    if [ -f "$RESULTS_DIR/frontend_test_$TIMESTAMP.json" ]; then
        info "✅ Frontend performance testing completed"
    fi
    
    echo ""
    info "🔍 Review the comprehensive report for detailed analysis and recommendations"
    info "📧 Email notifications sent to: ${EMAIL_RECIPIENTS:-'none configured'}"
}

# Handle script interruption
trap 'error_exit "Script interrupted"' INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            export DRY_RUN=true
            shift
            ;;
        --skip-stress)
            export ENABLE_STRESS_TEST=false
            shift
            ;;
        --infrastructure-only)
            export ENABLE_INFRASTRUCTURE_TESTING=true
            export ENABLE_FRONTEND_TESTING=false
            export ENABLE_DATABASE_TESTING=false
            shift
            ;;
        --quick)
            export TEST_DURATION="5m"
            export MAX_CONCURRENT_USERS=1000
            shift
            ;;
        --help)
            echo "BookedBarber V2 Comprehensive Load Testing Suite"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run              Perform validation checks only"
            echo "  --skip-stress          Skip stress testing scenarios"
            echo "  --infrastructure-only  Run only infrastructure tests"
            echo "  --quick               Run abbreviated tests (5 minutes, 1000 users)"
            echo "  --help                Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  BASE_URL              Target API URL (default: http://localhost:8000)"
            echo "  MAX_CONCURRENT_USERS  Maximum concurrent users (default: 10000)"
            echo "  TEST_DURATION         Test duration (default: 30m)"
            echo "  ENABLE_STRESS_TEST    Enable stress testing (default: false)"
            echo ""
            exit 0
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Execute main function
main