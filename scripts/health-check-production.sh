#!/bin/bash

# =============================================================================
# 6FB Booking Platform - Production Health Check Script
# =============================================================================
# Comprehensive health monitoring for production deployment

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/health-check-$(date +%Y%m%d-%H%M%S).log"

# Health check configuration
HEALTH_CHECK_TIMEOUT=30
RETRY_ATTEMPTS=3
RETRY_DELAY=5

# Service endpoints
API_BASE_URL="${API_BASE_URL:-http://localhost}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"
MONITORING_URL="${MONITORING_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"

# Critical endpoints to check
CRITICAL_ENDPOINTS=(
    "$API_BASE_URL/api/v1/health"
    "$API_BASE_URL/api/v1/auth/health"
    "$FRONTEND_URL/api/health"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# DOCKER HEALTH CHECKS
# =============================================================================

check_docker_services() {
    log_info "Checking Docker service status..."

    local services=(
        "6fb-backend"
        "6fb-frontend"
        "6fb-nginx"
        "6fb-postgres"
        "6fb-redis"
    )

    local failed_services=()

    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "^$service.*Up"; then
            # Check health status if available
            local health_status
            health_status=$(docker inspect --format="{{.State.Health.Status}}" "$service" 2>/dev/null || echo "none")

            if [[ "$health_status" == "healthy" ]] || [[ "$health_status" == "none" ]]; then
                log_success "Service $service is running and healthy"
            else
                log_warning "Service $service is running but health status: $health_status"
                failed_services+=("$service")
            fi
        else
            log_error "Service $service is not running"
            failed_services+=("$service")
        fi
    done

    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "Failed services: ${failed_services[*]}"
        return 1
    fi

    return 0
}

# =============================================================================
# ENDPOINT HEALTH CHECKS
# =============================================================================

check_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-$HEALTH_CHECK_TIMEOUT}"

    log_info "Checking endpoint: $url"

    for attempt in $(seq 1 $RETRY_ATTEMPTS); do
        local response
        local status_code

        response=$(curl -s -w "\n%{http_code}" --max-time "$timeout" "$url" || echo -e "\nERROR")
        status_code=$(echo "$response" | tail -n1)

        if [[ "$status_code" == "$expected_status" ]]; then
            log_success "Endpoint $url responded with status $status_code"
            return 0
        else
            log_warning "Endpoint $url attempt $attempt/$RETRY_ATTEMPTS failed (status: $status_code)"
            if [[ $attempt -lt $RETRY_ATTEMPTS ]]; then
                sleep $RETRY_DELAY
            fi
        fi
    done

    log_error "Endpoint $url failed after $RETRY_ATTEMPTS attempts"
    return 1
}

check_api_endpoints() {
    log_info "Checking API endpoints..."

    local failed_endpoints=()

    for endpoint in "${CRITICAL_ENDPOINTS[@]}"; do
        if ! check_endpoint "$endpoint"; then
            failed_endpoints+=("$endpoint")
        fi
    done

    # Test authentication endpoint
    log_info "Testing authentication endpoint..."
    local auth_response
    auth_response=$(curl -s -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"invalid"}' \
        "$API_BASE_URL/api/v1/auth/login" || echo "ERROR")

    local auth_status="${auth_response: -3}"
    if [[ "$auth_status" == "401" ]] || [[ "$auth_status" == "422" ]]; then
        log_success "Authentication endpoint is responding correctly"
    else
        log_error "Authentication endpoint responded with unexpected status: $auth_status"
        failed_endpoints+=("$API_BASE_URL/api/v1/auth/login")
    fi

    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_error "Failed endpoints: ${failed_endpoints[*]}"
        return 1
    fi

    return 0
}

# =============================================================================
# DATABASE HEALTH CHECKS
# =============================================================================

check_database_health() {
    log_info "Checking database connectivity..."

    # Check if database container is responding
    if docker exec 6fb-postgres pg_isready -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; then
        log_success "Database is accepting connections"
    else
        log_error "Database is not accepting connections"
        return 1
    fi

    # Check database tables exist via API
    local tables_response
    tables_response=$(curl -s -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" \
        "$API_BASE_URL/api/v1/health/database" || echo "ERROR")

    local tables_status="${tables_response: -3}"
    if [[ "$tables_status" == "200" ]]; then
        log_success "Database tables are accessible"
    else
        log_warning "Database tables check returned status: $tables_status"
    fi

    return 0
}

# =============================================================================
# REDIS HEALTH CHECKS
# =============================================================================

check_redis_health() {
    log_info "Checking Redis connectivity..."

    # Check if Redis container is responding
    if docker exec 6fb-redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is responding to ping"
    else
        log_error "Redis is not responding to ping"
        return 1
    fi

    # Check Redis memory usage
    local redis_info
    redis_info=$(docker exec 6fb-redis redis-cli info memory | grep used_memory_human || echo "N/A")
    log_info "Redis memory usage: $redis_info"

    return 0
}

# =============================================================================
# SSL CERTIFICATE CHECKS
# =============================================================================

check_ssl_certificates() {
    log_info "Checking SSL certificate status..."

    if [[ -n "${DOMAIN:-}" ]]; then
        local cert_expiry
        cert_expiry=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | \
                     openssl x509 -noout -dates | grep notAfter | cut -d= -f2 || echo "N/A")

        if [[ "$cert_expiry" != "N/A" ]]; then
            log_success "SSL certificate expires: $cert_expiry"

            # Check if certificate expires within 30 days
            local expiry_timestamp
            expiry_timestamp=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
            local current_timestamp
            current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

            if [[ $days_until_expiry -lt 30 ]]; then
                log_warning "SSL certificate expires in $days_until_expiry days"
            fi
        else
            log_warning "Could not verify SSL certificate"
        fi
    else
        log_info "DOMAIN not set, skipping SSL certificate check"
    fi
}

# =============================================================================
# PERFORMANCE CHECKS
# =============================================================================

check_performance_metrics() {
    log_info "Checking performance metrics..."

    # Check response times
    local start_time
    local end_time
    local response_time

    start_time=$(date +%s%N)
    curl -s --max-time "$HEALTH_CHECK_TIMEOUT" "$API_BASE_URL/api/v1/health" > /dev/null || true
    end_time=$(date +%s%N)

    response_time=$(( ($end_time - $start_time) / 1000000 ))  # Convert to milliseconds

    log_info "API response time: ${response_time}ms"

    if [[ $response_time -gt 5000 ]]; then
        log_warning "API response time is high: ${response_time}ms"
    fi

    # Check container resource usage
    log_info "Checking container resource usage..."

    local backend_stats
    backend_stats=$(docker stats 6fb-backend --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" | tail -n 1 || echo "N/A N/A")
    log_info "Backend container: CPU: $(echo "$backend_stats" | cut -f1), Memory: $(echo "$backend_stats" | cut -f2)"

    local frontend_stats
    frontend_stats=$(docker stats 6fb-frontend --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" | tail -n 1 || echo "N/A N/A")
    log_info "Frontend container: CPU: $(echo "$frontend_stats" | cut -f1), Memory: $(echo "$frontend_stats" | cut -f2)"
}

# =============================================================================
# MONITORING SYSTEM CHECKS
# =============================================================================

check_monitoring_systems() {
    log_info "Checking monitoring systems..."

    # Check Prometheus
    if check_endpoint "$MONITORING_URL/-/healthy" 200; then
        log_success "Prometheus is healthy"
    else
        log_warning "Prometheus health check failed"
    fi

    # Check Grafana
    if check_endpoint "$GRAFANA_URL/api/health" 200; then
        log_success "Grafana is healthy"
    else
        log_warning "Grafana health check failed"
    fi
}

# =============================================================================
# SECURITY CHECKS
# =============================================================================

check_security_headers() {
    log_info "Checking security headers..."

    local security_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )

    for header in "${security_headers[@]}"; do
        local header_value
        header_value=$(curl -s -I --max-time "$HEALTH_CHECK_TIMEOUT" "$FRONTEND_URL" | \
                      grep -i "^$header:" | cut -d' ' -f2- | tr -d '\r' || echo "MISSING")

        if [[ "$header_value" == "MISSING" ]]; then
            log_warning "Security header missing: $header"
        else
            log_success "Security header present: $header: $header_value"
        fi
    done
}

# =============================================================================
# BACKUP VERIFICATION
# =============================================================================

check_backup_status() {
    log_info "Checking backup status..."

    local backup_dir="$PROJECT_ROOT/backups"
    if [[ -d "$backup_dir" ]]; then
        local latest_backup
        latest_backup=$(find "$backup_dir" -name "*.sql" -type f -printf '%T@ %p\n' 2>/dev/null | \
                       sort -n | tail -1 | cut -d' ' -f2- || echo "")

        if [[ -n "$latest_backup" ]]; then
            local backup_age
            backup_age=$(stat -c %Y "$latest_backup" 2>/dev/null || echo "0")
            local current_time
            current_time=$(date +%s)
            local hours_since_backup=$(( (current_time - backup_age) / 3600 ))

            log_info "Latest backup: $latest_backup (${hours_since_backup}h ago)"

            if [[ $hours_since_backup -gt 24 ]]; then
                log_warning "Latest backup is more than 24 hours old"
            fi
        else
            log_warning "No database backups found"
        fi
    else
        log_warning "Backup directory not found"
    fi
}

# =============================================================================
# COMPREHENSIVE HEALTH REPORT
# =============================================================================

generate_health_report() {
    log_info "Generating comprehensive health report..."

    local report_file="$PROJECT_ROOT/logs/health-report-$(date +%Y%m%d-%H%M%S).json"

    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "deployment_id": "${DEPLOYMENT_ID:-unknown}",
    "environment": "production",
    "checks": {
        "docker_services": $(check_docker_services && echo "true" || echo "false"),
        "api_endpoints": $(check_api_endpoints && echo "true" || echo "false"),
        "database": $(check_database_health && echo "true" || echo "false"),
        "redis": $(check_redis_health && echo "true" || echo "false"),
        "monitoring": $(check_monitoring_systems && echo "true" || echo "false")
    },
    "log_file": "$LOG_FILE"
}
EOF

    log_info "Health report saved to: $report_file"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    log_info "Starting comprehensive production health check"

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    local failed_checks=0

    # Run all health checks
    check_docker_services || ((failed_checks++))
    check_api_endpoints || ((failed_checks++))
    check_database_health || ((failed_checks++))
    check_redis_health || ((failed_checks++))
    check_ssl_certificates || ((failed_checks++))
    check_performance_metrics
    check_monitoring_systems
    check_security_headers
    check_backup_status

    # Generate comprehensive report
    generate_health_report

    # Final status
    if [[ $failed_checks -eq 0 ]]; then
        log_success "All critical health checks passed!"
        echo "HEALTH_CHECK_STATUS=HEALTHY" > "$PROJECT_ROOT/.health_status"
        exit 0
    else
        log_error "$failed_checks critical health check(s) failed"
        echo "HEALTH_CHECK_STATUS=UNHEALTHY" > "$PROJECT_ROOT/.health_status"
        exit 1
    fi
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
