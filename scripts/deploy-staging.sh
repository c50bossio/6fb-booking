#!/bin/bash

# 6FB Booking Platform - Staging Deployment Script
# This script handles automated deployment to the staging environment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGING_ENV_FILE="$PROJECT_ROOT/backend/.env.staging"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.staging.yml"
DEPLOYMENT_LOG="/tmp/6fb-staging-deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# Error handler
error_exit() {
    log_error "Deployment failed: $1"
    log "Check the deployment log at: $DEPLOYMENT_LOG"
    exit 1
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        log_warning "Deployment failed, cleaning up..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down || true
    fi
}

trap cleanup EXIT

# Help function
show_help() {
    cat << EOF
6FB Booking Platform - Staging Deployment Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -f, --force             Force deployment without confirmation
    -s, --skip-tests        Skip running tests before deployment
    -m, --with-monitoring   Deploy with monitoring stack (Prometheus, Grafana)
    -c, --with-celery       Deploy with background job processing (Celery)
    -d, --dry-run           Show what would be deployed without actually deploying
    --seed-data             Seed the database with test data after deployment
    --reset-db              Reset the database before deployment (DANGEROUS)

Examples:
    $0                      # Interactive deployment
    $0 -f                   # Force deployment without confirmation
    $0 -m -c                # Deploy with monitoring and Celery
    $0 --dry-run            # Preview deployment without executing

EOF
}

# Default options
FORCE=false
SKIP_TESTS=false
WITH_MONITORING=false
WITH_CELERY=false
DRY_RUN=false
SEED_DATA=false
RESET_DB=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -m|--with-monitoring)
            WITH_MONITORING=true
            shift
            ;;
        -c|--with-celery)
            WITH_CELERY=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --seed-data)
            SEED_DATA=true
            shift
            ;;
        --reset-db)
            RESET_DB=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker >/dev/null 2>&1; then
        error_exit "Docker is not installed"
    fi

    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker daemon is not running"
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error_exit "Docker Compose is not installed"
    fi

    # Check if project files exist
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error_exit "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
    fi

    if [ ! -f "$STAGING_ENV_FILE" ]; then
        error_exit "Staging environment file not found: $STAGING_ENV_FILE"
    fi

    log_success "Prerequisites check passed"
}

# Function to check Git status
check_git_status() {
    log "Checking Git status..."

    cd "$PROJECT_ROOT"

    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_warning "Not in a Git repository, skipping Git checks"
        return 0
    fi

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "There are uncommitted changes in the repository"
        if [ "$FORCE" = false ]; then
            read -p "Continue with uncommitted changes? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error_exit "Deployment cancelled due to uncommitted changes"
            fi
        fi
    fi

    # Get current branch and commit
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    CURRENT_COMMIT=$(git rev-parse --short HEAD)

    log "Current branch: $CURRENT_BRANCH"
    log "Current commit: $CURRENT_COMMIT"

    log_success "Git status check completed"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping tests as requested"
        return 0
    fi

    log "Running tests before deployment..."

    cd "$PROJECT_ROOT"

    # Run backend tests
    log "Running backend tests..."
    if [ -f "./scripts/parallel-tests.sh" ]; then
        chmod +x "./scripts/parallel-tests.sh"
        if ! "./scripts/parallel-tests.sh"; then
            if [ "$FORCE" = false ]; then
                error_exit "Backend tests failed. Use -f to force deployment or fix the tests."
            else
                log_warning "Backend tests failed but continuing due to --force"
            fi
        fi
    else
        log_warning "Test script not found, skipping tests"
    fi

    log_success "Tests completed"
}

# Function to backup current staging environment
backup_staging() {
    log "Creating backup of current staging environment..."

    BACKUP_DIR="/tmp/6fb-staging-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup database
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q postgres-staging; then
        log "Backing up PostgreSQL database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres-staging \
            pg_dump -U staging_user 6fb_booking_staging > "$BACKUP_DIR/database.sql" || true
    fi

    # Backup uploaded files
    if [ -d "$PROJECT_ROOT/backend/uploads" ]; then
        log "Backing up uploaded files..."
        cp -r "$PROJECT_ROOT/backend/uploads" "$BACKUP_DIR/" || true
    fi

    log "Backup created at: $BACKUP_DIR"
    echo "$BACKUP_DIR" > /tmp/6fb-staging-backup-latest

    log_success "Backup completed"
}

# Function to stop existing services
stop_services() {
    log "Stopping existing staging services..."

    cd "$PROJECT_ROOT"

    # Stop all services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true

    # Prune unused containers and networks
    docker system prune -f --volumes || true

    log_success "Services stopped and cleaned up"
}

# Function to build and start services
start_services() {
    log "Building and starting staging services..."

    cd "$PROJECT_ROOT"

    # Build Docker profiles
    COMPOSE_PROFILES=""

    if [ "$WITH_MONITORING" = true ]; then
        COMPOSE_PROFILES="$COMPOSE_PROFILES monitoring"
    fi

    if [ "$WITH_CELERY" = true ]; then
        COMPOSE_PROFILES="$COMPOSE_PROFILES celery"
    fi

    # Set environment for Docker Compose
    export COMPOSE_FILE="$DOCKER_COMPOSE_FILE"
    export COMPOSE_PROJECT_NAME="6fb-staging"

    if [ -n "$COMPOSE_PROFILES" ]; then
        export COMPOSE_PROFILES="$COMPOSE_PROFILES"
        log "Starting services with profiles: $COMPOSE_PROFILES"
    fi

    # Build and start services
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would execute:"
        log "docker-compose -f $DOCKER_COMPOSE_FILE build"
        log "docker-compose -f $DOCKER_COMPOSE_FILE up -d"
        return 0
    fi

    # Build images
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --parallel

    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    log_success "Services started successfully"
}

# Function to run database migrations and seeding
setup_database() {
    log "Setting up database..."

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would run database migrations and seeding"
        return 0
    fi

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout=60
    counter=0

    while [ $counter -lt $timeout ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres-staging pg_isready -U staging_user -d 6fb_booking_staging >/dev/null 2>&1; then
            break
        fi
        sleep 2
        counter=$((counter + 2))
    done

    if [ $counter -ge $timeout ]; then
        error_exit "Database did not become ready within $timeout seconds"
    fi

    # Reset database if requested
    if [ "$RESET_DB" = true ]; then
        log_warning "Resetting database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres-staging \
            psql -U staging_user -d postgres -c "DROP DATABASE IF EXISTS 6fb_booking_staging;"
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres-staging \
            psql -U staging_user -d postgres -c "CREATE DATABASE 6fb_booking_staging;"
    fi

    # Run migrations
    log "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile migration up db-migration-staging

    # Seed test data if requested
    if [ "$SEED_DATA" = true ]; then
        log "Seeding test data..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend-staging \
            python scripts/seed_staging_data.py
    fi

    log_success "Database setup completed"
}

# Function to run health checks
run_health_checks() {
    log "Running health checks..."

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would run health checks"
        return 0
    fi

    # Wait for services to be healthy
    timeout=120
    counter=0

    services=("backend-staging" "frontend-staging" "postgres-staging" "redis-staging")

    for service in "${services[@]}"; do
        log "Checking health of $service..."

        while [ $counter -lt $timeout ]; do
            if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep "$service" | grep -q "healthy\|Up"; then
                log_success "$service is healthy"
                break
            fi
            sleep 5
            counter=$((counter + 5))
        done

        if [ $counter -ge $timeout ]; then
            log_error "$service did not become healthy within $timeout seconds"
            # Show logs for debugging
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50 "$service"
            error_exit "Health check failed for $service"
        fi

        counter=0
    done

    # Run specific health check script
    if [ -f "$SCRIPT_DIR/staging-health-check.sh" ]; then
        log "Running comprehensive health checks..."
        chmod +x "$SCRIPT_DIR/staging-health-check.sh"
        "$SCRIPT_DIR/staging-health-check.sh"
    fi

    log_success "All health checks passed"
}

# Function to show deployment summary
show_deployment_summary() {
    log "Deployment Summary:"
    log "=================="
    log "Environment: Staging"
    log "Project Root: $PROJECT_ROOT"
    log "Docker Compose File: $DOCKER_COMPOSE_FILE"
    log "Environment File: $STAGING_ENV_FILE"
    log "Deployment Log: $DEPLOYMENT_LOG"

    if [ "$DRY_RUN" = false ]; then
        log ""
        log "Services Status:"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps

        log ""
        log "Service URLs:"
        log "- Frontend: http://localhost:3001"
        log "- Backend API: http://localhost:8001"
        log "- API Documentation: http://localhost:8001/docs"
        log "- Mailhog UI: http://localhost:8025"
        log "- PostgreSQL: localhost:5433"
        log "- Redis: localhost:6380"

        if [ "$WITH_MONITORING" = true ]; then
            log "- Prometheus: http://localhost:9090"
            log "- Grafana: http://localhost:3000 (admin/staging_admin_password)"
        fi

        log ""
        log "Useful Commands:"
        log "- View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f [service]"
        log "- Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
        log "- Restart service: docker-compose -f $DOCKER_COMPOSE_FILE restart [service]"
        log "- Run health check: $SCRIPT_DIR/staging-health-check.sh"
    fi

    log_success "Deployment completed successfully!"
}

# Main deployment function
main() {
    log "Starting 6FB Booking Platform Staging Deployment"
    log "==============================================="

    # Show configuration
    log "Configuration:"
    log "- Force: $FORCE"
    log "- Skip Tests: $SKIP_TESTS"
    log "- With Monitoring: $WITH_MONITORING"
    log "- With Celery: $WITH_CELERY"
    log "- Dry Run: $DRY_RUN"
    log "- Seed Data: $SEED_DATA"
    log "- Reset DB: $RESET_DB"
    log ""

    # Ask for confirmation unless forced or dry run
    if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
        read -p "Continue with staging deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Execute deployment steps
    check_prerequisites
    check_git_status
    run_tests

    if [ "$DRY_RUN" = false ]; then
        backup_staging
        stop_services
    fi

    start_services

    if [ "$DRY_RUN" = false ]; then
        setup_database
        run_health_checks
    fi

    show_deployment_summary
}

# Execute main function
main "$@"
