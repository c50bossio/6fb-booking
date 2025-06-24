#!/bin/bash

# 6FB Booking Platform - Staging Docker Entrypoint
# Handles initialization and setup for staging environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

# Function to wait for database
wait_for_db() {
    log "Waiting for database to be ready..."

    # Extract database connection details from DATABASE_URL
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL not set"
        exit 1
    fi

    # Parse database URL
    # Format: postgresql://user:password@host:port/database
    DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@\([^:]*\):.*/\1/')
    DB_PORT=$(echo "$DATABASE_URL" | sed 's/.*:\([0-9]*\)\/.*/\1/')
    DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
    DB_USER=$(echo "$DATABASE_URL" | sed 's/.*\/\/\([^:]*\):.*/\1/')

    # Wait for database to be ready
    timeout=60
    counter=0

    while [ $counter -lt $timeout ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            log_success "Database is ready"
            return 0
        fi

        log "Database not ready, waiting... ($counter/$timeout)"
        sleep 2
        counter=$((counter + 2))
    done

    log_error "Database did not become ready within $timeout seconds"
    exit 1
}

# Function to wait for Redis
wait_for_redis() {
    log "Waiting for Redis to be ready..."

    if [ -z "${REDIS_URL:-}" ]; then
        log_warning "REDIS_URL not set, skipping Redis check"
        return 0
    fi

    # Extract Redis connection details
    REDIS_HOST=$(echo "$REDIS_URL" | sed 's/redis:\/\/\([^:]*\):.*/\1/')
    REDIS_PORT=$(echo "$REDIS_URL" | sed 's/.*:\([0-9]*\)\/.*/\1/')

    timeout=30
    counter=0

    while [ $counter -lt $timeout ]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
            log_success "Redis is ready"
            return 0
        fi

        log "Redis not ready, waiting... ($counter/$timeout)"
        sleep 2
        counter=$((counter + 2))
    done

    log_warning "Redis did not become ready within $timeout seconds (continuing anyway)"
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."

    # Check if Alembic is configured
    if [ ! -f "alembic.ini" ]; then
        log_warning "alembic.ini not found, skipping migrations"
        return 0
    fi

    # Run migrations
    if python -m alembic upgrade head; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        exit 1
    fi
}

# Function to seed staging data
seed_staging_data() {
    # Only seed data if SEED_TEST_DATA is enabled
    if [ "${SEED_TEST_DATA:-false}" != "true" ]; then
        log "Test data seeding disabled, skipping..."
        return 0
    fi

    log "Seeding staging test data..."

    # Check if seed script exists
    if [ -f "scripts/seed_staging_data.py" ]; then
        if python scripts/seed_staging_data.py; then
            log_success "Test data seeded successfully"
        else
            log_warning "Test data seeding failed (continuing anyway)"
        fi
    else
        log_warning "Seed script not found, skipping test data"
    fi
}

# Function to validate environment
validate_environment() {
    log "Validating environment configuration..."

    # Check required environment variables
    required_vars=(
        "DATABASE_URL"
        "SECRET_KEY"
        "ENVIRONMENT"
    )

    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi

    # Validate environment value
    if [ "$ENVIRONMENT" != "staging" ]; then
        log_warning "ENVIRONMENT is not set to 'staging' (current: $ENVIRONMENT)"
    fi

    log_success "Environment validation passed"
}

# Function to setup logging
setup_logging() {
    log "Setting up logging..."

    # Create log directory if it doesn't exist
    mkdir -p /app/logs

    # Set log file permissions
    touch /app/logs/staging.log
    chmod 664 /app/logs/staging.log

    log_success "Logging setup completed"
}

# Function to health check dependencies
health_check_dependencies() {
    log "Running dependency health checks..."

    # Test database connection
    if python -c "
import psycopg2
import os
import sys
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.close()
    print('Database connection: OK')
except Exception as e:
    print(f'Database connection: FAILED - {e}')
    sys.exit(1)
"; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        exit 1
    fi

    # Test Redis connection (if configured)
    if [ -n "${REDIS_URL:-}" ]; then
        if python -c "
import redis
import os
import sys
try:
    r = redis.from_url(os.environ['REDIS_URL'])
    r.ping()
    print('Redis connection: OK')
except Exception as e:
    print(f'Redis connection: FAILED - {e}')
    sys.exit(1)
"; then
            log_success "Redis health check passed"
        else
            log_warning "Redis health check failed (continuing anyway)"
        fi
    fi
}

# Function to start development features
setup_development_features() {
    if [ "${ENVIRONMENT:-}" = "staging" ]; then
        log "Setting up staging-specific features..."

        # Enable debug endpoints if configured
        if [ "${ENABLE_DEBUG_ENDPOINTS:-false}" = "true" ]; then
            log "Debug endpoints enabled"
        fi

        # Setup performance monitoring
        if [ "${ENABLE_PERFORMANCE_MONITORING:-false}" = "true" ]; then
            log "Performance monitoring enabled"
        fi

        log_success "Staging features configured"
    fi
}

# Function to display startup information
display_startup_info() {
    log ""
    log "6FB Booking Platform - Staging Environment"
    log "=========================================="
    log "Environment: ${ENVIRONMENT:-unknown}"
    log "Python Version: $(python --version)"
    log "Working Directory: $(pwd)"
    log "User: $(whoami)"
    log "Database: ${DATABASE_URL}"
    log "Redis: ${REDIS_URL:-not configured}"
    log ""
    log "Starting application..."
    log ""
}

# Main initialization function
main() {
    log "Starting 6FB Booking Platform staging initialization..."

    # Run initialization steps
    validate_environment
    setup_logging
    wait_for_db
    wait_for_redis
    run_migrations
    seed_staging_data
    health_check_dependencies
    setup_development_features
    display_startup_info

    log_success "Staging environment initialization completed"
    log "Executing command: $*"

    # Execute the main command
    exec "$@"
}

# Handle signals for graceful shutdown
trap 'log "Received shutdown signal, cleaning up..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
