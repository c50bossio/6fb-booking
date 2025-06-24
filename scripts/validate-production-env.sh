#!/bin/bash

# =============================================================================
# 6FB Booking Platform - Production Environment Validation Script
# =============================================================================
# Validates production environment before deployment

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
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

validate_environment_file() {
    local env_file="$1"
    
    log_info "Validating environment file: $env_file"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    # Source the environment file
    set -a
    source "$env_file"
    set +a
    
    return 0
}

validate_required_variables() {
    log_info "Validating required environment variables..."
    
    local required_vars=(
        "SECRET_KEY"
        "JWT_SECRET_KEY"
        "DATABASE_URL"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "SENDGRID_API_KEY"
        "FROM_EMAIL"
        "FRONTEND_URL"
        "NEXT_PUBLIC_API_URL"
        "ALLOWED_ORIGINS"
    )
    
    local missing_vars=()
    local validation_errors=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        return 1
    fi
    
    # Validate specific variable formats
    
    # SECRET_KEY validation
    if [[ ${#SECRET_KEY} -lt 32 ]]; then
        validation_errors+=("SECRET_KEY must be at least 32 characters long")
    fi
    
    # JWT_SECRET_KEY validation
    if [[ ${#JWT_SECRET_KEY} -lt 32 ]]; then
        validation_errors+=("JWT_SECRET_KEY must be at least 32 characters long")
    fi
    
    # Database URL validation
    if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
        validation_errors+=("DATABASE_URL must be a PostgreSQL connection string")
    fi
    
    # Stripe keys validation (production)
    if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_live_ ]]; then
        validation_errors+=("STRIPE_SECRET_KEY must be a live key (starts with sk_live_)")
    fi
    
    if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_live_ ]]; then
        validation_errors+=("STRIPE_PUBLISHABLE_KEY must be a live key (starts with pk_live_)")
    fi
    
    if [[ ! "$STRIPE_WEBHOOK_SECRET" =~ ^whsec_ ]]; then
        validation_errors+=("STRIPE_WEBHOOK_SECRET must start with whsec_")
    fi
    
    # SendGrid API key validation
    if [[ ! "$SENDGRID_API_KEY" =~ ^SG\. ]]; then
        validation_errors+=("SENDGRID_API_KEY must start with SG.")
    fi
    
    # Email validation
    if [[ ! "$FROM_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]]; then
        validation_errors+=("FROM_EMAIL must be a valid email address")
    fi
    
    # URL validation
    if [[ ! "$FRONTEND_URL" =~ ^https:// ]]; then
        validation_errors+=("FRONTEND_URL must be an HTTPS URL")
    fi
    
    if [[ ! "$NEXT_PUBLIC_API_URL" =~ ^https:// ]]; then
        validation_errors+=("NEXT_PUBLIC_API_URL must be an HTTPS URL")
    fi
    
    if [[ ${#validation_errors[@]} -gt 0 ]]; then
        log_error "Environment variable validation errors:"
        for error in "${validation_errors[@]}"; do
            log_error "  - $error"
        done
        return 1
    fi
    
    log_success "All required environment variables are valid"
    return 0
}

validate_optional_variables() {
    log_info "Validating optional environment variables..."
    
    local warnings=()
    
    # Twilio configuration
    if [[ -n "${TWILIO_ACCOUNT_SID:-}" ]] && [[ -n "${TWILIO_AUTH_TOKEN:-}" ]]; then
        if [[ ! "$TWILIO_ACCOUNT_SID" =~ ^AC ]]; then
            warnings+=("TWILIO_ACCOUNT_SID should start with AC")
        fi
        log_success "Twilio configuration found"
    else
        warnings+=("Twilio configuration missing - SMS notifications will not work")
    fi
    
    # Google Calendar integration
    if [[ -n "${GOOGLE_CLIENT_ID:-}" ]] && [[ -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
        log_success "Google Calendar configuration found"
    else
        warnings+=("Google Calendar configuration missing - calendar integration will not work")
    fi
    
    # Monitoring configuration
    if [[ -n "${SENTRY_DSN:-}" ]]; then
        if [[ ! "$SENTRY_DSN" =~ ^https:// ]]; then
            warnings+=("SENTRY_DSN should be an HTTPS URL")
        else
            log_success "Sentry configuration found"
        fi
    else
        warnings+=("Sentry configuration missing - error tracking will not work")
    fi
    
    # Redis configuration
    if [[ -n "${REDIS_URL:-}" ]]; then
        log_success "Redis configuration found"
    else
        warnings+=("Redis configuration missing - caching will be limited")
    fi
    
    # Display warnings
    if [[ ${#warnings[@]} -gt 0 ]]; then
        log_warning "Configuration warnings:"
        for warning in "${warnings[@]}"; do
            log_warning "  - $warning"
        done
    fi
    
    return 0
}

test_database_connection() {
    log_info "Testing database connection..."
    
    # Extract database details from DATABASE_URL
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        local db_user="${BASH_REMATCH[1]}"
        local db_pass="${BASH_REMATCH[2]}"
        local db_host="${BASH_REMATCH[3]}"
        local db_port="${BASH_REMATCH[4]}"
        local db_name="${BASH_REMATCH[5]}"
        
        log_info "Database: $db_name on $db_host:$db_port"
        
        # Test connection using psql if available
        if command -v psql &> /dev/null; then
            if PGPASSWORD="$db_pass" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT version();" &> /dev/null; then
                log_success "Database connection successful"
                
                # Check database version
                local db_version
                db_version=$(PGPASSWORD="$db_pass" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
                log_info "Database version: $db_version"
                
                return 0
            else
                log_error "Database connection failed"
                return 1
            fi
        else
            log_warning "psql not available, skipping database connection test"
            return 0
        fi
    else
        log_error "Invalid DATABASE_URL format"
        return 1
    fi
}

test_external_services() {
    log_info "Testing external service connectivity..."
    
    local services=(
        "Stripe API:https://api.stripe.com/v1"
        "SendGrid API:https://api.sendgrid.com/v3"
    )
    
    if [[ -n "${TWILIO_ACCOUNT_SID:-}" ]]; then
        services+=("Twilio API:https://api.twilio.com/2010-04-01")
    fi
    
    if [[ -n "${SENTRY_DSN:-}" ]]; then
        local sentry_host
        sentry_host=$(echo "$SENTRY_DSN" | sed -n 's|^https://[^@]*@\([^/]*\)/.*|\1|p')
        if [[ -n "$sentry_host" ]]; then
            services+=("Sentry:https://$sentry_host")
        fi
    fi
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local url="${service#*:}"
        
        log_info "Testing $name connectivity..."
        
        local status_code
        status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
        
        if [[ "$status_code" =~ ^[23] ]]; then
            log_success "$name is reachable (status: $status_code)"
        else
            log_error "$name is not reachable (status: $status_code)"
            failed_services+=("$name")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "Failed to reach external services: ${failed_services[*]}"
        return 1
    fi
    
    log_success "All external services are reachable"
    return 0
}

validate_ssl_certificates() {
    log_info "Validating SSL certificates..."
    
    local cert_dir="$PROJECT_ROOT/nginx/ssl"
    local cert_file="$cert_dir/cert.pem"
    local key_file="$cert_dir/key.pem"
    
    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        log_warning "SSL certificates not found in $cert_dir"
        log_warning "Make sure to configure SSL certificates before production deployment"
        return 0
    fi
    
    # Check certificate validity
    if command -v openssl &> /dev/null; then
        log_info "Checking certificate validity..."
        
        # Check certificate expiration
        local expiry_date
        expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
        local expiry_timestamp
        expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_timestamp
        current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [[ $days_until_expiry -lt 0 ]]; then
            log_error "SSL certificate has expired"
            return 1
        elif [[ $days_until_expiry -lt 30 ]]; then
            log_warning "SSL certificate expires in $days_until_expiry days"
        else
            log_success "SSL certificate is valid (expires in $days_until_expiry days)"
        fi
        
        # Check if private key matches certificate
        local cert_modulus
        local key_modulus
        cert_modulus=$(openssl x509 -in "$cert_file" -noout -modulus | openssl md5)
        key_modulus=$(openssl rsa -in "$key_file" -noout -modulus | openssl md5)
        
        if [[ "$cert_modulus" == "$key_modulus" ]]; then
            log_success "Private key matches certificate"
        else
            log_error "Private key does not match certificate"
            return 1
        fi
    else
        log_warning "openssl not available, skipping certificate validation"
    fi
    
    return 0
}

validate_docker_environment() {
    log_info "Validating Docker environment..."
    
    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return 1
    fi
    
    # Check Docker Compose installation
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        return 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or not accessible"
        return 1
    fi
    
    # Check Docker Compose file
    if [[ ! -f "$PROJECT_ROOT/docker-compose.prod.yml" ]]; then
        log_error "Production Docker Compose file not found"
        return 1
    fi
    
    # Validate Docker Compose file
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" config &> /dev/null; then
        log_success "Docker Compose configuration is valid"
    else
        log_error "Docker Compose configuration is invalid"
        return 1
    fi
    
    log_success "Docker environment is ready"
    return 0
}

generate_validation_report() {
    local env_file="$1"
    local report_file="$PROJECT_ROOT/validation-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log_info "Generating validation report: $report_file"
    
    cat > "$report_file" << EOF
6FB Booking Platform - Production Environment Validation Report
===============================================================

Generated: $(date)
Environment File: $env_file

ENVIRONMENT VARIABLES
--------------------
EOF
    
    # Add environment variables (excluding sensitive ones)
    local safe_vars=(
        "ENVIRONMENT"
        "NODE_ENV"
        "LOG_LEVEL"
        "FRONTEND_URL"
        "NEXT_PUBLIC_API_URL"
        "FROM_EMAIL"
        "EMAIL_FROM_NAME"
        "ALLOWED_ORIGINS"
    )
    
    for var in "${safe_vars[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            echo "$var=${!var}" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

CONFIGURATION STATUS
-------------------
Database: $(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***:***@|')
Stripe: $(echo "$STRIPE_SECRET_KEY" | sed 's/sk_live_.*/sk_live_***/')
SendGrid: $(echo "$SENDGRID_API_KEY" | sed 's/SG\..*/SG.***/')
$(if [[ -n "${TWILIO_ACCOUNT_SID:-}" ]]; then echo "Twilio: ${TWILIO_ACCOUNT_SID}"; fi)
$(if [[ -n "${GOOGLE_CLIENT_ID:-}" ]]; then echo "Google Calendar: Configured"; fi)
$(if [[ -n "${SENTRY_DSN:-}" ]]; then echo "Sentry: Configured"; fi)

VALIDATION RESULTS
-----------------
$(date): Validation completed
EOF
    
    log_success "Validation report generated: $report_file"
    return 0
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    local env_file="${1:-$PROJECT_ROOT/.env.production}"
    
    log_info "Starting production environment validation"
    log_info "Environment file: $env_file"
    
    local validation_passed=true
    
    # Step 1: Validate environment file exists and load it
    if ! validate_environment_file "$env_file"; then
        validation_passed=false
    fi
    
    # Step 2: Validate required variables
    if ! validate_required_variables; then
        validation_passed=false
    fi
    
    # Step 3: Validate optional variables
    validate_optional_variables  # This doesn't fail validation
    
    # Step 4: Test database connection
    if ! test_database_connection; then
        validation_passed=false
    fi
    
    # Step 5: Test external services
    if ! test_external_services; then
        validation_passed=false
    fi
    
    # Step 6: Validate SSL certificates
    if ! validate_ssl_certificates; then
        validation_passed=false
    fi
    
    # Step 7: Validate Docker environment
    if ! validate_docker_environment; then
        validation_passed=false
    fi
    
    # Step 8: Generate validation report
    generate_validation_report "$env_file"
    
    # Final result
    if [[ "$validation_passed" == "true" ]]; then
        log_success "Production environment validation passed!"
        log_info "The environment is ready for production deployment"
        exit 0
    else
        log_error "Production environment validation failed!"
        log_error "Please fix the issues above before proceeding with deployment"
        exit 1
    fi
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi