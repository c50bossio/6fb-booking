#!/bin/bash

# 6FB Booking Platform - Staging Health Check Script
# This script performs comprehensive health checks on the staging environment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.staging.yml"
HEALTH_LOG="/tmp/6fb-staging-health-$(date +%Y%m%d-%H%M%S).log"

# Service endpoints
BACKEND_URL="http://localhost:8001"
FRONTEND_URL="http://localhost:3001"
MAILHOG_URL="http://localhost:8025"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5433"
REDIS_HOST="localhost"
REDIS_PORT="6380"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$HEALTH_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$HEALTH_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$HEALTH_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$HEALTH_LOG"
}

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to run a health check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local expected_result="${3:-0}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Running check: $check_name"

    if eval "$check_command" >/dev/null 2>&1; then
        if [ $? -eq "$expected_result" ]; then
            log_success "$check_name"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        else
            log_error "$check_name - Command succeeded but with unexpected result"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        fi
    else
        log_error "$check_name - Command failed"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to run a health check with warning on failure
run_check_warning() {
    local check_name="$1"
    local check_command="$2"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Running check: $check_name"

    if eval "$check_command" >/dev/null 2>&1; then
        log_success "$check_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        log_warning "$check_name - Check failed (non-critical)"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        return 1
    fi
}

# Function to check Docker containers
check_docker_containers() {
    log "Checking Docker containers..."

    cd "$PROJECT_ROOT"

    # Check if Docker Compose file exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        return 1
    fi

    # Check core services
    local services=("postgres-staging" "redis-staging" "backend-staging" "frontend-staging")

    for service in "${services[@]}"; do
        run_check "Container $service is running" \
            "docker-compose -f '$DOCKER_COMPOSE_FILE' ps '$service' | grep -q 'Up'"

        run_check "Container $service is healthy" \
            "docker-compose -f '$DOCKER_COMPOSE_FILE' ps '$service' | grep -E 'healthy|Up.*Up'"
    done

    # Check optional services
    local optional_services=("mailhog" "prometheus-staging" "grafana-staging")

    for service in "${optional_services[@]}"; do
        run_check_warning "Optional container $service" \
            "docker-compose -f '$DOCKER_COMPOSE_FILE' ps '$service' | grep -q 'Up'"
    done
}

# Function to check network connectivity
check_network_connectivity() {
    log "Checking network connectivity..."

    # Check if services can communicate
    run_check "Backend can connect to PostgreSQL" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging python -c \"
import psycopg2
import os
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.close()
    exit(0)
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
\""

    run_check "Backend can connect to Redis" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging python -c \"
import redis
import os
try:
    r = redis.from_url(os.environ['REDIS_URL'])
    r.ping()
    exit(0)
except Exception as e:
    print(f'Redis connection failed: {e}')
    exit(1)
\""
}

# Function to check service endpoints
check_service_endpoints() {
    log "Checking service endpoints..."

    # Backend health endpoint
    run_check "Backend health endpoint" \
        "curl -f -s '$BACKEND_URL/health'"

    # Backend API documentation
    run_check "Backend API docs endpoint" \
        "curl -f -s '$BACKEND_URL/docs'"

    # Frontend health endpoint
    run_check_warning "Frontend health endpoint" \
        "curl -f -s '$FRONTEND_URL/api/health'"

    # Frontend main page
    run_check "Frontend main page" \
        "curl -f -s '$FRONTEND_URL' | grep -q 'html'"

    # Mailhog web interface
    run_check_warning "Mailhog web interface" \
        "curl -f -s '$MAILHOG_URL'"
}

# Function to check database
check_database() {
    log "Checking database..."

    # Check PostgreSQL connection
    run_check "PostgreSQL connection" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T postgres-staging pg_isready -U staging_user -d 6fb_booking_staging"

    # Check database tables exist
    run_check "Database tables exist" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T postgres-staging psql -U staging_user -d 6fb_booking_staging -c '\dt' | grep -q 'public'"

    # Check if Alembic migrations are up to date
    run_check "Database migrations are up to date" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging python -c \"
import subprocess
import sys
try:
    result = subprocess.run(['python', '-m', 'alembic', 'current'], capture_output=True, text=True)
    if 'head' in result.stdout or len(result.stdout.strip()) > 0:
        sys.exit(0)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
\""
}

# Function to check Redis
check_redis() {
    log "Checking Redis..."

    # Check Redis connection
    run_check "Redis connection" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T redis-staging redis-cli ping"

    # Check Redis memory usage
    run_check_warning "Redis memory usage acceptable" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T redis-staging redis-cli info memory | grep 'used_memory_human' | grep -E '[0-9]+[KM]B'"
}

# Function to check API functionality
check_api_functionality() {
    log "Checking API functionality..."

    # Test authentication endpoint
    run_check_warning "Auth endpoint responds" \
        "curl -f -s -X POST '$BACKEND_URL/api/v1/auth/login' -H 'Content-Type: application/json' -d '{}' | grep -q 'error\\|detail'"

    # Test users endpoint
    run_check_warning "Users endpoint responds" \
        "curl -f -s '$BACKEND_URL/api/v1/users/' | grep -q '\\[\\]\\|error'"

    # Test appointments endpoint
    run_check_warning "Appointments endpoint responds" \
        "curl -f -s '$BACKEND_URL/api/v1/appointments/' | grep -q '\\[\\]\\|error'"
}

# Function to check file permissions and volumes
check_file_system() {
    log "Checking file system..."

    # Check log directory permissions
    run_check "Backend log directory writable" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging test -w /app/logs"

    # Check upload directory permissions
    run_check_warning "Backend upload directory writable" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging test -w /app/uploads"

    # Check if volumes are mounted correctly
    run_check "Database volume mounted" \
        "docker volume ls | grep -q '6fb.*postgres.*staging'"

    run_check "Redis volume mounted" \
        "docker volume ls | grep -q '6fb.*redis.*staging'"
}

# Function to check security settings
check_security() {
    log "Checking security settings..."

    # Check if HTTPS is enforced (for staging it might be optional)
    run_check_warning "HTTPS enforcement configured" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging python -c \"
import os
force_https = os.environ.get('FORCE_HTTPS', 'false').lower()
print(f'FORCE_HTTPS: {force_https}')
exit(0 if force_https in ['true', '1', 'yes'] else 1)
\""

    # Check environment variable security
    run_check "Environment variables loaded" \
        "docker-compose -f '$DOCKER_COMPOSE_FILE' exec -T backend-staging python -c \"
import os
required_vars = ['SECRET_KEY', 'DATABASE_URL', 'REDIS_URL']
missing = [var for var in required_vars if not os.environ.get(var)]
if missing:
    print(f'Missing environment variables: {missing}')
    exit(1)
exit(0)
\""
}

# Function to check performance
check_performance() {
    log "Checking performance..."

    # Check backend response time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$BACKEND_URL/health" || echo "999")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_success "Backend response time acceptable (${response_time}s)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log_warning "Backend response time slow (${response_time}s)"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # Check memory usage of containers
    run_check_warning "Container memory usage acceptable" \
        "docker stats --no-stream --format 'table {{.Container}}\t{{.MemUsage}}' | grep staging | awk '{print \$2}' | sed 's/MiB//g' | awk '\$1 < 1000'"
}

# Function to generate health report
generate_health_report() {
    local report_file="/tmp/6fb-staging-health-report-$(date +%Y%m%d-%H%M%S).json"

    log "Generating health report..."

    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "staging",
    "project": "6fb-booking-platform",
    "health_check_summary": {
        "total_checks": $TOTAL_CHECKS,
        "passed_checks": $PASSED_CHECKS,
        "failed_checks": $FAILED_CHECKS,
        "warning_checks": $WARNING_CHECKS,
        "success_rate": "$(echo "scale=2; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)%"
    },
    "service_status": {
        "backend": "$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" || echo "000")",
        "frontend": "$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")",
        "mailhog": "$(curl -s -o /dev/null -w "%{http_code}" "$MAILHOG_URL" || echo "000")"
    },
    "containers": $(docker-compose -f "$DOCKER_COMPOSE_FILE" ps --format json 2>/dev/null || echo "[]"),
    "volumes": $(docker volume ls --format json 2>/dev/null | jq -c '[.[] | select(.Name | contains("6fb") and contains("staging"))]' 2>/dev/null || echo "[]"),
    "log_file": "$HEALTH_LOG",
    "report_file": "$report_file"
}
EOF

    log "Health report generated: $report_file"
    echo "$report_file"
}

# Function to show health summary
show_health_summary() {
    log ""
    log "Health Check Summary"
    log "==================="
    log "Total Checks: $TOTAL_CHECKS"
    log "Passed: $PASSED_CHECKS"
    log "Failed: $FAILED_CHECKS"
    log "Warnings: $WARNING_CHECKS"

    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            log_success "All health checks passed!"
        else
            log_warning "Health checks passed with $WARNING_CHECKS warnings"
        fi
    else
        log_error "$FAILED_CHECKS critical health checks failed!"
    fi

    local success_rate=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)
    log "Success Rate: ${success_rate}%"

    log ""
    log "Detailed log: $HEALTH_LOG"

    # Generate and show report file location
    local report_file=$(generate_health_report)
    log "JSON Report: $report_file"

    # Return appropriate exit code
    if [ $FAILED_CHECKS -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# Help function
show_help() {
    cat << EOF
6FB Booking Platform - Staging Health Check Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -v, --verbose           Show verbose output
    -q, --quick             Run only critical health checks
    --api-only              Check only API endpoints
    --db-only               Check only database connectivity

Examples:
    $0                      # Run all health checks
    $0 -v                   # Run with verbose output
    $0 --quick              # Run only critical checks
    $0 --api-only           # Check only API endpoints

EOF
}

# Parse command line arguments
VERBOSE=false
QUICK=false
API_ONLY=false
DB_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quick)
            QUICK=true
            shift
            ;;
        --api-only)
            API_ONLY=true
            shift
            ;;
        --db-only)
            DB_ONLY=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main function
main() {
    log "Starting 6FB Booking Platform Staging Health Check"
    log "================================================="
    log "Health check log: $HEALTH_LOG"
    log ""

    # Prerequisites check
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is required but not installed"
        exit 1
    fi

    if ! command -v docker >/dev/null 2>&1; then
        log_error "docker is required but not installed"
        exit 1
    fi

    if ! command -v bc >/dev/null 2>&1; then
        log_warning "bc is not installed, some calculations may be skipped"
    fi

    # Run health checks based on options
    if [ "$API_ONLY" = true ]; then
        check_service_endpoints
        check_api_functionality
    elif [ "$DB_ONLY" = true ]; then
        check_database
        check_redis
    elif [ "$QUICK" = true ]; then
        check_docker_containers
        check_service_endpoints
        check_database
    else
        # Run all checks
        check_docker_containers
        check_network_connectivity
        check_service_endpoints
        check_database
        check_redis
        check_api_functionality
        check_file_system
        check_security
        check_performance
    fi

    # Show summary and exit with appropriate code
    show_health_summary
}

# Execute main function
main "$@"
