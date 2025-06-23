#!/bin/bash

# ==============================================================================
# PRODUCTION STARTUP SCRIPT FOR 6FB BOOKING PLATFORM
# ==============================================================================
# This script handles production deployment with proper error handling,
# health checks, and graceful startup procedures.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
export PYTHONPATH="/app"
export ENVIRONMENT="${ENVIRONMENT:-production}"
export WORKERS="${WORKERS:-4}"
export WORKER_CLASS="${WORKER_CLASS:-uvicorn.workers.UvicornWorker}"
export MAX_REQUESTS="${MAX_REQUESTS:-10000}"
export MAX_REQUESTS_JITTER="${MAX_REQUESTS_JITTER:-1000}"
export TIMEOUT="${TIMEOUT:-30}"
export KEEP_ALIVE="${KEEP_ALIVE:-2}"
export BIND_ADDRESS="${BIND_ADDRESS:-0.0.0.0:8000}"

# ==============================================================================
# STARTUP VALIDATION
# ==============================================================================
log "Starting 6FB Booking Platform production server..."
log "Environment: $ENVIRONMENT"
log "Workers: $WORKERS"
log "Bind Address: $BIND_ADDRESS"

# Validate critical environment variables
validate_environment() {
    log "Validating environment configuration..."

    local errors=0

    # Check required environment variables
    local required_vars=(
        "SECRET_KEY"
        "JWT_SECRET_KEY"
        "DATABASE_URL"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            ((errors++))
        fi
    done

    # Validate database URL format
    if [[ -n "${DATABASE_URL:-}" ]]; then
        if [[ "$DATABASE_URL" == *"sqlite"* ]] && [[ "$ENVIRONMENT" == "production" ]]; then
            error "SQLite database not recommended for production"
            ((errors++))
        fi
    fi

    # Check payment configuration for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ -z "${STRIPE_SECRET_KEY:-}" || -z "${STRIPE_PUBLISHABLE_KEY:-}" ]]; then
            warning "Payment processing not configured - some features may be disabled"
        fi
    fi

    # Check email configuration
    if [[ -z "${SMTP_USERNAME:-}" && -z "${SENDGRID_API_KEY:-}" && -z "${MAILGUN_API_KEY:-}" ]]; then
        warning "No email service configured - email notifications will be disabled"
    fi

    if [[ $errors -gt 0 ]]; then
        error "Environment validation failed with $errors errors"
        exit 1
    fi

    success "Environment validation completed"
}

# ==============================================================================
# DATABASE OPERATIONS
# ==============================================================================
wait_for_database() {
    log "Waiting for database connection..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if python -c "
import sys
sys.path.insert(0, '/app')
try:
    from config.database import check_database_health
    result = check_database_health()
    if result['status'] == 'healthy':
        exit(0)
    else:
        exit(1)
except Exception as e:
    print(f'Database check failed: {e}')
    exit(1)
        "; then
            success "Database connection established"
            return 0
        fi

        warning "Database not ready (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    error "Database connection failed after $max_attempts attempts"
    exit 1
}

run_migrations() {
    log "Running database migrations..."

    if ! alembic upgrade head; then
        error "Database migration failed"
        exit 1
    fi

    success "Database migrations completed"
}

# ==============================================================================
# APPLICATION HEALTH CHECKS
# ==============================================================================
validate_application_startup() {
    log "Validating application configuration..."

    if ! python -c "
import sys
sys.path.insert(0, '/app')
try:
    from config.settings import validate_startup_requirements
    validate_startup_requirements()
    print('Application configuration validated successfully')
except Exception as e:
    print(f'Application validation failed: {e}')
    sys.exit(1)
    "; then
        error "Application startup validation failed"
        exit 1
    fi

    success "Application configuration validated"
}

# ==============================================================================
# SECURITY SETUP
# ==============================================================================
setup_security() {
    log "Configuring security settings..."

    # Set restrictive file permissions
    chmod 600 .env* 2>/dev/null || true

    # Create secure log directories
    mkdir -p logs
    chmod 755 logs

    # Create uploads directory with restrictions
    mkdir -p uploads
    chmod 755 uploads

    success "Security configuration completed"
}

# ==============================================================================
# LOGGING SETUP
# ==============================================================================
setup_logging() {
    log "Configuring logging..."

    # Initialize logging configuration
    python -c "
import sys
sys.path.insert(0, '/app')
from utils.logging import setup_logging
setup_logging()
print('Logging configured successfully')
    "

    success "Logging configuration completed"
}

# ==============================================================================
# STARTUP SEQUENCE
# ==============================================================================
main() {
    # Run startup sequence
    validate_environment
    setup_security
    setup_logging
    wait_for_database
    run_migrations
    validate_application_startup

    log "Starting application server..."

    # Production server command with optimized settings
    exec gunicorn main:app \
        --worker-class "$WORKER_CLASS" \
        --workers "$WORKERS" \
        --worker-connections 1000 \
        --max-requests "$MAX_REQUESTS" \
        --max-requests-jitter "$MAX_REQUESTS_JITTER" \
        --timeout "$TIMEOUT" \
        --keep-alive "$KEEP_ALIVE" \
        --bind "$BIND_ADDRESS" \
        --preload \
        --access-logfile - \
        --error-logfile - \
        --log-level info \
        --capture-output \
        --enable-stdio-inheritance
}

# ==============================================================================
# SIGNAL HANDLERS
# ==============================================================================
# Handle shutdown signals gracefully
shutdown() {
    log "Received shutdown signal, gracefully stopping..."
    exit 0
}

trap shutdown SIGTERM SIGINT

# ==============================================================================
# EXECUTE MAIN FUNCTION
# ==============================================================================
main "$@"
