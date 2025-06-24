#!/bin/bash

# =============================================================================
# 6FB Booking Platform - Production Deployment Script
# =============================================================================
# This script handles automated deployment with comprehensive health checks,
# rollback capabilities, and production safety measures.

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/deployment-$(date +%Y%m%d-%H%M%S).log"
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"

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

cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here
}

rollback() {
    if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
        log_warning "Initiating rollback procedure..."
        
        # Tag current state as failed
        git tag -a "deployment-failed-$(date +%Y%m%d-%H%M%S)" -m "Failed deployment, rolling back"
        
        # Restore previous version
        if [[ -n "${PREVIOUS_VERSION:-}" ]]; then
            log_info "Rolling back to version: $PREVIOUS_VERSION"
            git checkout "$PREVIOUS_VERSION"
            
            # Restart services with previous version
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d --build
            
            # Wait for services to be healthy
            if check_health; then
                log_success "Rollback completed successfully"
                return 0
            else
                log_error "Rollback failed - manual intervention required"
                return 1
            fi
        else
            log_error "No previous version found for rollback"
            return 1
        fi
    else
        log_warning "Rollback is disabled"
        return 1
    fi
}

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

check_environment() {
    log_info "Checking deployment environment..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/docker-compose.prod.yml" ]]; then
        log_error "docker-compose.prod.yml not found. Are you in the correct directory?"
        return 1
    fi
    
    # Check if required environment files exist
    if [[ ! -f "$PROJECT_ROOT/.env.production" ]] && [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "Production environment variables not configured"
        log_info "Please ensure .env.production exists or environment variables are set"
        return 1
    fi
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        return 1
    fi
    
    # Check if user can run Docker commands
    if ! docker info &> /dev/null; then
        log_error "Cannot run Docker commands. Check permissions or Docker daemon status"
        return 1
    fi
    
    log_success "Environment check passed"
    return 0
}

validate_environment_variables() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "SECRET_KEY"
        "JWT_SECRET_KEY"
        "DATABASE_URL"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
    )
    
    local missing_vars=()
    
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
    
    # Validate SECRET_KEY length
    if [[ ${#SECRET_KEY} -lt 32 ]]; then
        log_error "SECRET_KEY must be at least 32 characters long"
        return 1
    fi
    
    # Validate JWT_SECRET_KEY length
    if [[ ${#JWT_SECRET_KEY} -lt 32 ]]; then
        log_error "JWT_SECRET_KEY must be at least 32 characters long"
        return 1
    fi
    
    # Validate Stripe keys format
    if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_live_ ]]; then
        log_error "STRIPE_SECRET_KEY must be a live key (starts with sk_live_)"
        return 1
    fi
    
    if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_live_ ]]; then
        log_error "STRIPE_PUBLISHABLE_KEY must be a live key (starts with pk_live_)"
        return 1
    fi
    
    log_success "Environment variables validation passed"
    return 0
}

check_database_connection() {
    log_info "Checking database connection..."
    
    # Extract database details from DATABASE_URL
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        local db_user="${BASH_REMATCH[1]}"
        local db_pass="${BASH_REMATCH[2]}"
        local db_host="${BASH_REMATCH[3]}"
        local db_port="${BASH_REMATCH[4]}"
        local db_name="${BASH_REMATCH[5]}"
        
        # Test connection using psql if available
        if command -v psql &> /dev/null; then
            if PGPASSWORD="$db_pass" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1;" &> /dev/null; then
                log_success "Database connection test passed"
                return 0
            else
                log_error "Database connection test failed"
                return 1
            fi
        else
            log_warning "psql not available, skipping direct database connection test"
            return 0
        fi
    else
        log_error "Invalid DATABASE_URL format"
        return 1
    fi
}

check_service_health() {
    local service="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    log_info "Checking health of $service at $url"
    
    local start_time=$(date +%s)
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $HEALTH_CHECK_TIMEOUT ]]; then
            log_error "$service health check timed out after ${HEALTH_CHECK_TIMEOUT}s"
            return 1
        fi
        
        local status_code
        status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        
        if [[ "$status_code" == "$expected_status" ]]; then
            log_success "$service is healthy (status: $status_code)"
            return 0
        else
            log_info "$service not ready yet (status: $status_code), retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
}

check_health() {
    log_info "Performing comprehensive health checks..."
    
    # Wait for containers to start
    log_info "Waiting for containers to start..."
    sleep 20
    
    # Check container status
    local containers=(
        "6fb-backend"
        "6fb-frontend" 
        "6fb-nginx"
        "6fb-postgres"
        "6fb-redis"
    )
    
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            log_error "Container $container is not running"
            return 1
        fi
        
        local health_status
        health_status=$(docker inspect --format="{{.State.Health.Status}}" "$container" 2>/dev/null || echo "none")
        
        if [[ "$health_status" == "unhealthy" ]]; then
            log_error "Container $container is unhealthy"
            return 1
        fi
    done
    
    # Check service endpoints
    if ! check_service_health "Backend API" "http://localhost/api/v1/health" "200"; then
        return 1
    fi
    
    if ! check_service_health "Frontend" "http://localhost/api/health" "200"; then
        return 1
    fi
    
    # Test critical endpoints
    log_info "Testing critical API endpoints..."
    
    # Test authentication endpoint
    local auth_status
    auth_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"invalid"}' \
        "http://localhost/api/v1/auth/login" || echo "000")
    
    if [[ "$auth_status" != "401" ]] && [[ "$auth_status" != "422" ]]; then
        log_error "Authentication endpoint not responding correctly (status: $auth_status)"
        return 1
    fi
    
    log_success "All health checks passed"
    return 0
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

create_backup() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        log_info "Backup is disabled, skipping..."
        return 0
    fi
    
    log_info "Creating backup before deployment..."
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if command -v pg_dump &> /dev/null; then
        log_info "Creating database backup..."
        if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
            local db_user="${BASH_REMATCH[1]}"
            local db_pass="${BASH_REMATCH[2]}"
            local db_host="${BASH_REMATCH[3]}"
            local db_port="${BASH_REMATCH[4]}"
            local db_name="${BASH_REMATCH[5]}"
            
            PGPASSWORD="$db_pass" pg_dump \
                -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
                --no-password --verbose \
                > "$backup_dir/database.sql"
            
            if [[ $? -eq 0 ]]; then
                log_success "Database backup created: $backup_dir/database.sql"
            else
                log_error "Database backup failed"
                return 1
            fi
        fi
    else
        log_warning "pg_dump not available, skipping database backup"
    fi
    
    # Backup application files
    log_info "Creating application backup..."
    tar -czf "$backup_dir/application.tar.gz" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=backups \
        --exclude=venv \
        "$PROJECT_ROOT"
    
    log_success "Application backup created: $backup_dir/application.tar.gz"
    
    # Store backup path for potential rollback
    echo "$backup_dir" > "$PROJECT_ROOT/.last_backup"
    
    return 0
}

build_and_deploy() {
    log_info "Starting build and deployment process..."
    
    # Store current version for potential rollback
    PREVIOUS_VERSION=$(git rev-parse HEAD)
    export PREVIOUS_VERSION
    
    # Pull latest changes (if this is a CI/CD deployment)
    if [[ "${CI_CD_MODE:-false}" == "true" ]]; then
        log_info "Pulling latest changes from repository..."
        git pull origin main || {
            log_error "Failed to pull latest changes"
            return 1
        }
    fi
    
    # Build and start services
    log_info "Building and starting services..."
    
    # Stop existing services
    docker-compose -f docker-compose.prod.yml down || true
    
    # Build new images
    docker-compose -f docker-compose.prod.yml build --no-cache || {
        log_error "Docker build failed"
        return 1
    }
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d || {
        log_error "Failed to start services"
        return 1
    }
    
    log_success "Services started successfully"
    return 0
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for backend to be ready
    sleep 30
    
    # Run migrations
    if docker exec 6fb-backend alembic upgrade head; then
        log_success "Database migrations completed"
        return 0
    else
        log_error "Database migrations failed"
        return 1
    fi
}

# =============================================================================
# MAIN DEPLOYMENT PROCESS
# =============================================================================

main() {
    log_info "Starting production deployment for 6FB Booking Platform"
    log_info "Deployment ID: $(date +%Y%m%d-%H%M%S)"
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Trap for cleanup on exit
    trap cleanup EXIT
    
    # Step 1: Environment checks
    if ! check_environment; then
        log_error "Environment check failed"
        exit 1
    fi
    
    # Step 2: Load environment variables
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        log_info "Loading production environment variables..."
        set -a
        source "$PROJECT_ROOT/.env.production"
        set +a
    fi
    
    # Step 3: Validate environment variables
    if ! validate_environment_variables; then
        log_error "Environment validation failed"
        exit 1
    fi
    
    # Step 4: Check database connection
    if ! check_database_connection; then
        log_error "Database connection check failed"
        exit 1
    fi
    
    # Step 5: Create backup
    if ! create_backup; then
        log_error "Backup creation failed"
        exit 1
    fi
    
    # Step 6: Build and deploy
    if ! build_and_deploy; then
        log_error "Build and deployment failed"
        rollback
        exit 1
    fi
    
    # Step 7: Run migrations
    if ! run_migrations; then
        log_error "Migration failed"
        rollback
        exit 1
    fi
    
    # Step 8: Health checks
    if ! check_health; then
        log_error "Health checks failed"
        rollback
        exit 1
    fi
    
    # Step 9: Tag successful deployment
    local deployment_tag="deployment-$(date +%Y%m%d-%H%M%S)"
    git tag -a "$deployment_tag" -m "Successful production deployment"
    
    log_success "Deployment completed successfully!"
    log_info "Deployment tag: $deployment_tag"
    log_info "Log file: $LOG_FILE"
    
    # Clean up old backups (keep last 5)
    if [[ -d "$PROJECT_ROOT/backups" ]]; then
        log_info "Cleaning up old backups..."
        cd "$PROJECT_ROOT/backups"
        ls -t | tail -n +6 | xargs -r rm -rf
    fi
    
    return 0
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi