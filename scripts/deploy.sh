#!/bin/bash

# 6FB Booking Platform - Production Deployment Script
# This script automates the deployment process with rollback capabilities

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
DEPLOYMENT_LOG="/var/log/6fb-booking/deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="/var/backups/6fb-booking"
DEPLOYMENT_USER="${DEPLOYMENT_USER:-www-data}"
DEPLOYMENT_GROUP="${DEPLOYMENT_GROUP:-www-data}"

# Ensure log directory exists
mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# Check if running as appropriate user
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root!"
        exit 1
    fi
}

# Create deployment backup
create_backup() {
    log "Creating deployment backup..." "$BLUE"
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/deployment-$BACKUP_TIMESTAMP"
    
    # Backup database
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log "Backing up database..."
        
        # Parse PostgreSQL URL
        if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASS="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
            
            PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                > "$BACKUP_PATH-database.sql" 2>> "$DEPLOYMENT_LOG"
            
            log "Database backup completed: $BACKUP_PATH-database.sql"
        else
            warning "Could not parse DATABASE_URL for backup"
        fi
    fi
    
    # Backup current code
    log "Backing up current code..."
    tar -czf "$BACKUP_PATH-code.tar.gz" \
        --exclude="node_modules" \
        --exclude="venv" \
        --exclude="__pycache__" \
        --exclude=".git" \
        -C "$PROJECT_ROOT" . 2>> "$DEPLOYMENT_LOG"
    
    log "Code backup completed: $BACKUP_PATH-code.tar.gz"
    
    # Save current git hash for rollback
    cd "$PROJECT_ROOT"
    git rev-parse HEAD > "$BACKUP_PATH-git-hash.txt"
    
    echo "$BACKUP_PATH" > "$BACKUP_DIR/latest-backup.txt"
}

# Pull latest code
pull_latest_code() {
    log "Pulling latest code from repository..." "$BLUE"
    
    cd "$PROJECT_ROOT"
    
    # Stash any local changes
    git stash push -m "Deployment stash $(date +%Y%m%d-%H%M%S)" >> "$DEPLOYMENT_LOG" 2>&1
    
    # Pull latest changes
    git pull origin main >> "$DEPLOYMENT_LOG" 2>&1
    
    # Get current commit hash
    CURRENT_COMMIT=$(git rev-parse HEAD)
    log "Deployed commit: $CURRENT_COMMIT"
}

# Install/Update backend dependencies
install_backend_dependencies() {
    log "Installing backend dependencies..." "$BLUE"
    
    cd "$PROJECT_ROOT/backend"
    
    # Activate virtual environment
    if [[ ! -d "venv" ]]; then
        log "Creating virtual environment..."
        python3 -m venv venv >> "$DEPLOYMENT_LOG" 2>&1
    fi
    
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip >> "$DEPLOYMENT_LOG" 2>&1
    
    # Install requirements
    pip install -r requirements.txt >> "$DEPLOYMENT_LOG" 2>&1
    
    log "Backend dependencies installed successfully"
}

# Install/Update frontend dependencies
install_frontend_dependencies() {
    log "Installing frontend dependencies..." "$BLUE"
    
    cd "$PROJECT_ROOT/frontend"
    
    # Clean install for production
    rm -rf node_modules package-lock.json
    
    # Install dependencies
    npm ci --production >> "$DEPLOYMENT_LOG" 2>&1
    
    log "Frontend dependencies installed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..." "$BLUE"
    
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    
    # Check current migration status
    alembic current >> "$DEPLOYMENT_LOG" 2>&1
    
    # Run migrations
    alembic upgrade head >> "$DEPLOYMENT_LOG" 2>&1
    
    log "Database migrations completed successfully"
}

# Build frontend
build_frontend() {
    log "Building frontend application..." "$BLUE"
    
    cd "$PROJECT_ROOT/frontend"
    
    # Build Next.js application
    npm run build >> "$DEPLOYMENT_LOG" 2>&1
    
    log "Frontend build completed successfully"
}

# Update environment configuration
update_environment() {
    log "Updating environment configuration..." "$BLUE"
    
    # Ensure production environment variables are set
    if [[ ! -f "$PROJECT_ROOT/backend/.env" ]]; then
        error "Backend .env file not found!"
        return 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/frontend/.env.local" ]]; then
        error "Frontend .env.local file not found!"
        return 1
    fi
    
    # Verify critical environment variables
    source "$PROJECT_ROOT/backend/.env"
    
    REQUIRED_VARS=(
        "SECRET_KEY"
        "JWT_SECRET_KEY"
        "DATABASE_URL"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
        "STRIPE_WEBHOOK_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set!"
            return 1
        fi
    done
    
    log "Environment configuration verified"
}

# Stop services
stop_services() {
    log "Stopping services..." "$BLUE"
    
    # Stop backend service
    if systemctl is-active --quiet 6fb-backend; then
        sudo systemctl stop 6fb-backend >> "$DEPLOYMENT_LOG" 2>&1
        log "Backend service stopped"
    fi
    
    # Stop frontend service
    if systemctl is-active --quiet 6fb-frontend; then
        sudo systemctl stop 6fb-frontend >> "$DEPLOYMENT_LOG" 2>&1
        log "Frontend service stopped"
    fi
    
    # Give services time to stop gracefully
    sleep 5
}

# Start services
start_services() {
    log "Starting services..." "$BLUE"
    
    # Start backend service
    sudo systemctl start 6fb-backend >> "$DEPLOYMENT_LOG" 2>&1
    log "Backend service started"
    
    # Start frontend service
    sudo systemctl start 6fb-frontend >> "$DEPLOYMENT_LOG" 2>&1
    log "Frontend service started"
    
    # Enable services if not already enabled
    sudo systemctl enable 6fb-backend >> "$DEPLOYMENT_LOG" 2>&1
    sudo systemctl enable 6fb-frontend >> "$DEPLOYMENT_LOG" 2>&1
    
    # Give services time to start
    sleep 10
}

# Run health checks
run_health_checks() {
    log "Running health checks..." "$BLUE"
    
    # Check backend health
    BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
    if curl -f -s "$BACKEND_URL/api/v1/health" > /dev/null; then
        log "Backend health check passed"
    else
        error "Backend health check failed!"
        return 1
    fi
    
    # Check frontend health
    FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        log "Frontend health check passed"
    else
        error "Frontend health check failed!"
        return 1
    fi
    
    # Check database connectivity
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    
    if python -c "from config.database import engine; engine.connect().close(); print('Database connection successful')" >> "$DEPLOYMENT_LOG" 2>&1; then
        log "Database connectivity check passed"
    else
        error "Database connectivity check failed!"
        return 1
    fi
    
    log "All health checks passed successfully"
}

# Clear caches
clear_caches() {
    log "Clearing caches..." "$BLUE"
    
    # Clear Python cache
    find "$PROJECT_ROOT/backend" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Clear Next.js cache
    rm -rf "$PROJECT_ROOT/frontend/.next/cache" 2>/dev/null || true
    
    # Clear any Redis cache if configured
    if command -v redis-cli &> /dev/null && [[ -n "${REDIS_URL:-}" ]]; then
        redis-cli FLUSHDB >> "$DEPLOYMENT_LOG" 2>&1 || true
        log "Redis cache cleared"
    fi
    
    log "Caches cleared successfully"
}

# Rollback deployment
rollback() {
    error "Deployment failed! Starting rollback..."
    
    LATEST_BACKUP=$(cat "$BACKUP_DIR/latest-backup.txt" 2>/dev/null || echo "")
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        error "No backup found for rollback!"
        exit 1
    fi
    
    log "Rolling back to backup: $LATEST_BACKUP" "$YELLOW"
    
    # Stop services
    stop_services
    
    # Restore code
    if [[ -f "$LATEST_BACKUP-code.tar.gz" ]]; then
        log "Restoring code backup..."
        cd "$PROJECT_ROOT"
        tar -xzf "$LATEST_BACKUP-code.tar.gz" >> "$DEPLOYMENT_LOG" 2>&1
    fi
    
    # Restore database
    if [[ -f "$LATEST_BACKUP-database.sql" ]] && [[ -n "${DATABASE_URL:-}" ]]; then
        log "Restoring database backup..."
        
        if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASS="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
            
            PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                < "$LATEST_BACKUP-database.sql" >> "$DEPLOYMENT_LOG" 2>&1
        fi
    fi
    
    # Restore git state
    if [[ -f "$LATEST_BACKUP-git-hash.txt" ]]; then
        cd "$PROJECT_ROOT"
        git checkout "$(cat "$LATEST_BACKUP-git-hash.txt")" >> "$DEPLOYMENT_LOG" 2>&1
    fi
    
    # Start services
    start_services
    
    warning "Rollback completed. Please investigate the deployment failure."
}

# Set proper permissions
set_permissions() {
    log "Setting file permissions..." "$BLUE"
    
    # Set ownership
    sudo chown -R "$DEPLOYMENT_USER:$DEPLOYMENT_GROUP" "$PROJECT_ROOT"
    
    # Set directory permissions
    find "$PROJECT_ROOT" -type d -exec chmod 755 {} +
    
    # Set file permissions
    find "$PROJECT_ROOT" -type f -exec chmod 644 {} +
    
    # Set executable permissions for scripts
    find "$PROJECT_ROOT" -name "*.sh" -exec chmod +x {} +
    
    # Ensure upload directories are writable
    chmod 775 "$PROJECT_ROOT/backend/uploads" 2>/dev/null || true
    chmod 775 "$PROJECT_ROOT/backend/logs" 2>/dev/null || true
    
    log "Permissions set successfully"
}

# Main deployment function
main() {
    log "Starting 6FB Booking Platform deployment..." "$GREEN"
    
    # Set trap for rollback on error
    trap 'rollback' ERR
    
    # Check user
    check_user
    
    # Create backup
    create_backup
    
    # Stop services
    stop_services
    
    # Pull latest code
    pull_latest_code
    
    # Update environment
    update_environment
    
    # Install dependencies
    install_backend_dependencies
    install_frontend_dependencies
    
    # Run migrations
    run_migrations
    
    # Build frontend
    build_frontend
    
    # Clear caches
    clear_caches
    
    # Set permissions
    set_permissions
    
    # Start services
    start_services
    
    # Run health checks
    run_health_checks
    
    # Remove trap on success
    trap - ERR
    
    log "Deployment completed successfully!" "$GREEN"
    log "Deployment log: $DEPLOYMENT_LOG"
    
    # Clean up old backups (keep last 5)
    ls -t "$BACKUP_DIR"/deployment-* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
}

# Run main function
main "$@"