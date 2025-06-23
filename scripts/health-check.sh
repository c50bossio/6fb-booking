#!/bin/bash

# 6FB Booking Platform - Health Check Script
# This script validates the deployment and system health

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HEALTH_LOG="/var/log/6fb-booking/health-check-$(date +%Y%m%d-%H%M%S).log"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
DOMAIN="${DOMAIN:-localhost}"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Ensure log directory exists
mkdir -p "$(dirname "$HEALTH_LOG")" 2>/dev/null || true

# Logging function
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$HEALTH_LOG" 2>/dev/null || echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$HEALTH_LOG" 2>/dev/null || echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$HEALTH_LOG" 2>/dev/null || echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$HEALTH_LOG" 2>/dev/null || echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Test result tracking
pass_test() {
    ((TESTS_PASSED++))
    success "$1"
}

fail_test() {
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
    error "$1"
}

# Check if running as root (should not be)
check_user() {
    log "Checking user permissions..." "$BLUE"

    if [[ $EUID -eq 0 ]]; then
        warning "Running as root - this is not recommended for production"
    else
        pass_test "Running as non-root user: $(whoami)"
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..." "$BLUE"

    # Check memory
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    USED_MEM=$(free -m | awk '/^Mem:/{print $3}')
    MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

    if [[ $MEM_PERCENT -lt 80 ]]; then
        pass_test "Memory usage: ${MEM_PERCENT}% (${USED_MEM}MB / ${TOTAL_MEM}MB)"
    else
        fail_test "High memory usage: ${MEM_PERCENT}% (${USED_MEM}MB / ${TOTAL_MEM}MB)"
    fi

    # Check disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $DISK_USAGE -lt 80 ]]; then
        pass_test "Disk usage: ${DISK_USAGE}%"
    else
        fail_test "High disk usage: ${DISK_USAGE}%"
    fi

    # Check load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    LOAD_NUM=$(echo "$LOAD_AVG" | cut -d. -f1)
    CPU_COUNT=$(nproc)

    if [[ $LOAD_NUM -lt $CPU_COUNT ]]; then
        pass_test "Load average: $LOAD_AVG (CPUs: $CPU_COUNT)"
    else
        warning "High load average: $LOAD_AVG (CPUs: $CPU_COUNT)"
    fi
}

# Check required services
check_services() {
    log "Checking system services..." "$BLUE"

    REQUIRED_SERVICES=("nginx" "6fb-backend" "6fb-frontend")
    OPTIONAL_SERVICES=("redis-server" "fail2ban")

    # Check required services
    for service in "${REQUIRED_SERVICES[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            STATUS=$(systemctl show -p SubState --value "$service")
            pass_test "Service $service is running ($STATUS)"
        else
            fail_test "Service $service is not running"
        fi
    done

    # Check optional services
    for service in "${OPTIONAL_SERVICES[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            STATUS=$(systemctl show -p SubState --value "$service")
            pass_test "Optional service $service is running ($STATUS)"
        else
            warning "Optional service $service is not running"
        fi
    done
}

# Check network connectivity
check_network() {
    log "Checking network connectivity..." "$BLUE"

    # Check if ports are listening
    BACKEND_PORT=8000
    FRONTEND_PORT=3000
    NGINX_PORT=80

    if netstat -tuln 2>/dev/null | grep -q ":$BACKEND_PORT "; then
        pass_test "Backend port $BACKEND_PORT is listening"
    else
        fail_test "Backend port $BACKEND_PORT is not listening"
    fi

    if netstat -tuln 2>/dev/null | grep -q ":$FRONTEND_PORT "; then
        pass_test "Frontend port $FRONTEND_PORT is listening"
    else
        fail_test "Frontend port $FRONTEND_PORT is not listening"
    fi

    if netstat -tuln 2>/dev/null | grep -q ":$NGINX_PORT "; then
        pass_test "Nginx port $NGINX_PORT is listening"
    else
        fail_test "Nginx port $NGINX_PORT is not listening"
    fi

    # Check external connectivity
    if curl -s --max-time 5 google.com > /dev/null; then
        pass_test "External internet connectivity is working"
    else
        fail_test "External internet connectivity is not working"
    fi
}

# Check application health endpoints
check_application_health() {
    log "Checking application health endpoints..." "$BLUE"

    # Check backend health
    if curl -f -s --max-time 10 "$BACKEND_URL/api/v1/health" > /dev/null 2>&1; then
        HEALTH_DATA=$(curl -s --max-time 10 "$BACKEND_URL/api/v1/health" | python3 -m json.tool 2>/dev/null || echo "Invalid JSON")
        pass_test "Backend health endpoint is responding"
        log "Backend health data: $HEALTH_DATA" "$BLUE"
    else
        fail_test "Backend health endpoint is not responding at $BACKEND_URL/api/v1/health"
    fi

    # Check frontend
    if curl -f -s --max-time 10 "$FRONTEND_URL" > /dev/null 2>&1; then
        pass_test "Frontend is responding at $FRONTEND_URL"
    else
        fail_test "Frontend is not responding at $FRONTEND_URL"
    fi

    # Check through Nginx proxy
    if [[ "$DOMAIN" != "localhost" ]]; then
        if curl -f -s --max-time 10 "http://$DOMAIN" > /dev/null 2>&1; then
            pass_test "Nginx proxy is working for $DOMAIN"
        else
            fail_test "Nginx proxy is not working for $DOMAIN"
        fi

        # Check HTTPS if available
        if curl -f -s --max-time 10 "https://$DOMAIN" > /dev/null 2>&1; then
            pass_test "HTTPS is working for $DOMAIN"
        else
            warning "HTTPS is not working for $DOMAIN"
        fi
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..." "$BLUE"

    if [[ -f "$PROJECT_ROOT/backend/.env" ]]; then
        cd "$PROJECT_ROOT/backend"

        # Activate virtual environment if available
        if [[ -f "venv/bin/activate" ]]; then
            source venv/bin/activate
        fi

        # Test database connection
        if python3 -c "
from config.database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT 1 as test')
        print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
" 2>>"$HEALTH_LOG"; then
            pass_test "Database connectivity is working"
        else
            fail_test "Database connectivity is not working"
        fi

        # Check if migrations are up to date
        if alembic current 2>>"$HEALTH_LOG" | grep -q "head"; then
            pass_test "Database migrations are up to date"
        else
            warning "Database migrations may not be up to date"
        fi
    else
        warning "Backend .env file not found - skipping database checks"
    fi
}

# Check file permissions
check_permissions() {
    log "Checking file permissions..." "$BLUE"

    if [[ -d "$PROJECT_ROOT" ]]; then
        # Check if application directories exist and have correct permissions
        DIRS_TO_CHECK=(
            "/var/log/6fb-booking"
            "/var/lib/6fb-booking"
            "/var/backups/6fb-booking"
        )

        for dir in "${DIRS_TO_CHECK[@]}"; do
            if [[ -d "$dir" ]]; then
                OWNER=$(stat -c '%U:%G' "$dir" 2>/dev/null || echo "unknown")
                pass_test "Directory $dir exists with owner: $OWNER"
            else
                warning "Directory $dir does not exist"
            fi
        done

        # Check if log files are writable
        if [[ -w "/var/log/6fb-booking" ]]; then
            pass_test "Log directory is writable"
        else
            fail_test "Log directory is not writable"
        fi
    else
        fail_test "Project root directory $PROJECT_ROOT not found"
    fi
}

# Check security configuration
check_security() {
    log "Checking security configuration..." "$BLUE"

    # Check firewall status
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            pass_test "UFW firewall is active"
        else
            warning "UFW firewall is not active"
        fi
    elif command -v firewall-cmd &> /dev/null; then
        if firewall-cmd --state &>/dev/null; then
            pass_test "Firewalld is active"
        else
            warning "Firewalld is not active"
        fi
    else
        warning "No firewall detected"
    fi

    # Check fail2ban
    if systemctl status fail2ban &>/dev/null; then
        if systemctl is-active --quiet fail2ban; then
            BANNED_IPS=$(fail2ban-client status 2>/dev/null | grep "Jail list" | wc -w || echo "0")
            pass_test "Fail2ban is active (monitoring $BANNED_IPS jails)"
        else
            warning "Fail2ban is installed but not active"
        fi
    else
        warning "Fail2ban is not installed"
    fi

    # Check SSL certificate if not localhost
    if [[ "$DOMAIN" != "localhost" ]]; then
        SSL_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2 || echo "No SSL certificate")
        if [[ "$SSL_EXPIRY" != "No SSL certificate" ]]; then
            pass_test "SSL certificate valid until: $SSL_EXPIRY"
        else
            warning "No SSL certificate found for $DOMAIN"
        fi
    fi
}

# Check API endpoints
check_api_endpoints() {
    log "Checking API endpoints..." "$BLUE"

    # Test critical API endpoints
    API_ENDPOINTS=(
        "/api/v1/health"
        "/api/v1/auth/status"
    )

    for endpoint in "${API_ENDPOINTS[@]}"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL$endpoint" 2>/dev/null || echo "000")

        if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
            pass_test "API endpoint $endpoint responds with HTTP $HTTP_CODE"
        else
            fail_test "API endpoint $endpoint responds with HTTP $HTTP_CODE"
        fi
    done
}

# Check environment configuration
check_environment() {
    log "Checking environment configuration..." "$BLUE"

    if [[ -f "$PROJECT_ROOT/backend/.env" ]]; then
        # Check critical environment variables without exposing values
        REQUIRED_VARS=(
            "SECRET_KEY"
            "JWT_SECRET_KEY"
            "DATABASE_URL"
        )

        source "$PROJECT_ROOT/backend/.env"

        for var in "${REQUIRED_VARS[@]}"; do
            if [[ -n "${!var:-}" ]]; then
                pass_test "Environment variable $var is set"
            else
                fail_test "Environment variable $var is not set"
            fi
        done

        # Check if using default/weak secrets
        if [[ "${SECRET_KEY:-}" == "your-secret-key-here" ]] || [[ ${#SECRET_KEY} -lt 32 ]]; then
            fail_test "SECRET_KEY appears to be default or too short"
        else
            pass_test "SECRET_KEY appears to be properly configured"
        fi

    else
        fail_test "Backend .env file not found"
    fi
}

# Performance tests
check_performance() {
    log "Running basic performance tests..." "$BLUE"

    # Test API response time
    if command -v curl &> /dev/null; then
        RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$BACKEND_URL/api/v1/health" 2>/dev/null || echo "10.0")
        RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "10000")

        if [[ $RESPONSE_MS -lt 1000 ]]; then
            pass_test "API response time: ${RESPONSE_MS}ms"
        elif [[ $RESPONSE_MS -lt 3000 ]]; then
            warning "API response time is slow: ${RESPONSE_MS}ms"
        else
            fail_test "API response time is very slow: ${RESPONSE_MS}ms"
        fi
    fi

    # Test frontend response time
    FRONTEND_RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "10.0")
    FRONTEND_RESPONSE_MS=$(echo "$FRONTEND_RESPONSE_TIME * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "10000")

    if [[ $FRONTEND_RESPONSE_MS -lt 2000 ]]; then
        pass_test "Frontend response time: ${FRONTEND_RESPONSE_MS}ms"
    elif [[ $FRONTEND_RESPONSE_MS -lt 5000 ]]; then
        warning "Frontend response time is slow: ${FRONTEND_RESPONSE_MS}ms"
    else
        fail_test "Frontend response time is very slow: ${FRONTEND_RESPONSE_MS}ms"
    fi
}

# Check logs for errors
check_logs() {
    log "Checking recent logs for errors..." "$BLUE"

    # Check system logs
    if journalctl --since "1 hour ago" -p err --no-pager -q 2>/dev/null | head -5 | wc -l | grep -q "0"; then
        pass_test "No recent system errors in logs"
    else
        ERROR_COUNT=$(journalctl --since "1 hour ago" -p err --no-pager -q 2>/dev/null | wc -l)
        warning "Found $ERROR_COUNT system errors in the last hour"
    fi

    # Check application logs
    if [[ -d "/var/log/6fb-booking" ]]; then
        RECENT_ERRORS=$(find /var/log/6fb-booking -name "*.log" -mtime -1 -exec grep -i "error\|exception\|fatal" {} \; 2>/dev/null | wc -l)
        if [[ $RECENT_ERRORS -eq 0 ]]; then
            pass_test "No recent application errors in logs"
        else
            warning "Found $RECENT_ERRORS application errors in recent logs"
        fi
    fi

    # Check Nginx logs
    if [[ -f "/var/log/nginx/error.log" ]]; then
        NGINX_ERRORS=$(tail -100 /var/log/nginx/error.log 2>/dev/null | grep "$(date '+%Y/%m/%d')" | wc -l)
        if [[ $NGINX_ERRORS -eq 0 ]]; then
            pass_test "No recent Nginx errors"
        else
            warning "Found $NGINX_ERRORS Nginx errors today"
        fi
    fi
}

# Generate health report
generate_report() {
    log "Generating health check report..." "$BLUE"

    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

    echo
    echo "============================================="
    echo "6FB Booking Platform Health Check Report"
    echo "============================================="
    echo "Timestamp: $(date)"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo "Success Rate: $SUCCESS_RATE%"
    echo

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}✅ All health checks passed!${NC}"
        echo -e "${GREEN}System is healthy and ready for production.${NC}"
    else
        echo -e "${RED}❌ Some health checks failed:${NC}"
        for failed_test in "${FAILED_TESTS[@]}"; do
            echo -e "${RED}  - $failed_test${NC}"
        done
        echo
        echo -e "${YELLOW}Please review and fix the failed checks before proceeding.${NC}"
    fi

    echo
    echo "Detailed log: $HEALTH_LOG"
    echo "============================================="
}

# Main health check function
main() {
    log "Starting 6FB Booking Platform health check..." "$GREEN"

    # Run all health checks
    check_user
    check_system_resources
    check_services
    check_network
    check_permissions
    check_environment
    check_database
    check_application_health
    check_api_endpoints
    check_security
    check_performance
    check_logs

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
        --backend-url=*)
            BACKEND_URL="${1#*=}"
            shift
            ;;
        --frontend-url=*)
            FRONTEND_URL="${1#*=}"
            shift
            ;;
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --backend-url=URL   Backend URL (default: http://localhost:8000)"
            echo "  --frontend-url=URL  Frontend URL (default: http://localhost:3000)"
            echo "  --domain=DOMAIN     Domain name (default: localhost)"
            echo "  --help             Show this help message"
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
