#!/bin/bash

# 6FB Booking Platform - Rollback Script
# This script handles rollback to previous deployment state

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
ROLLBACK_LOG="/var/log/6fb-booking/rollback-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="/var/backups/6fb-booking"

# Ensure log directory exists
mkdir -p "$(dirname "$ROLLBACK_LOG")"

# Logging function
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$ROLLBACK_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$ROLLBACK_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$ROLLBACK_LOG"
}

# Check if running as appropriate user
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root!"
        exit 1
    fi
}

# List available backups
list_backups() {
    log "Available backups:" "$BLUE"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory $BACKUP_DIR does not exist!"
        exit 1
    fi

    BACKUPS=($(ls -t "$BACKUP_DIR"/deployment-* 2>/dev/null | head -10 || true))

    if [[ ${#BACKUPS[@]} -eq 0 ]]; then
        error "No backups found in $BACKUP_DIR"
        exit 1
    fi

    echo
    echo "Available backups (most recent first):"
    for i in "${!BACKUPS[@]}"; do
        BACKUP_BASE=$(basename "${BACKUPS[$i]}" | sed 's/-code\.tar\.gz$//' | sed 's/-database\.sql$//')
        BACKUP_DATE=$(echo "$BACKUP_BASE" | sed 's/deployment-//' | sed 's/-/ /' | sed 's/\(..\)\(..\)\(..\)-\(..\)\(..\)\(..\)/20\1-\2-\3 \4:\5:\6/')

        # Check what files exist for this backup
        CODE_EXISTS=""
        DB_EXISTS=""

        if [[ -f "$BACKUP_DIR/$BACKUP_BASE-code.tar.gz" ]]; then
            CODE_EXISTS="✓ Code"
        fi

        if [[ -f "$BACKUP_DIR/$BACKUP_BASE-database.sql" ]]; then
            DB_EXISTS="✓ Database"
        fi

        echo "  $((i+1)). $BACKUP_DATE - $CODE_EXISTS $DB_EXISTS"
    done
    echo
}

# Get backup selection from user
get_backup_selection() {
    BACKUPS=($(ls -t "$BACKUP_DIR"/deployment-* 2>/dev/null | head -10 || true))

    if [[ -n "${BACKUP_INDEX:-}" ]]; then
        # Use provided index
        if [[ $BACKUP_INDEX -ge 1 && $BACKUP_INDEX -le ${#BACKUPS[@]} ]]; then
            SELECTED_BACKUP=$(basename "${BACKUPS[$((BACKUP_INDEX-1))]}" | sed 's/-code\.tar\.gz$//' | sed 's/-database\.sql$//')
            log "Using backup: $SELECTED_BACKUP"
        else
            error "Invalid backup index: $BACKUP_INDEX"
            exit 1
        fi
    else
        # Interactive selection
        echo "Enter backup number (1-${#BACKUPS[@]}) or 'q' to quit:"
        read -r SELECTION

        if [[ "$SELECTION" == "q" ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi

        if [[ "$SELECTION" =~ ^[0-9]+$ ]] && [[ $SELECTION -ge 1 && $SELECTION -le ${#BACKUPS[@]} ]]; then
            SELECTED_BACKUP=$(basename "${BACKUPS[$((SELECTION-1))]}" | sed 's/-code\.tar\.gz$//' | sed 's/-database\.sql$//')
            log "Selected backup: $SELECTED_BACKUP"
        else
            error "Invalid selection: $SELECTION"
            exit 1
        fi
    fi

    BACKUP_PATH="$BACKUP_DIR/$SELECTED_BACKUP"
}

# Confirm rollback
confirm_rollback() {
    if [[ "${FORCE_ROLLBACK:-}" == "true" ]]; then
        log "Force rollback enabled - skipping confirmation"
        return
    fi

    echo
    warning "⚠️  WARNING: This will rollback your application to a previous state!"
    echo "Current deployment will be replaced with backup: $SELECTED_BACKUP"
    echo
    echo "This action will:"
    echo "  - Stop running services"
    echo "  - Replace current application code"
    echo "  - Restore database from backup (if available)"
    echo "  - Restart services"
    echo
    echo "Are you sure you want to continue? (yes/no)"
    read -r CONFIRM

    if [[ "$CONFIRM" != "yes" ]]; then
        log "Rollback cancelled by user"
        exit 0
    fi
}

# Create pre-rollback backup
create_pre_rollback_backup() {
    log "Creating pre-rollback backup..." "$BLUE"

    PRE_ROLLBACK_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    PRE_ROLLBACK_PATH="$BACKUP_DIR/pre-rollback-$PRE_ROLLBACK_TIMESTAMP"

    # Backup current database
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log "Backing up current database..."

        if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASS="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"

            PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                > "$PRE_ROLLBACK_PATH-database.sql" 2>> "$ROLLBACK_LOG"
        fi
    fi

    # Backup current code
    log "Backing up current code..."
    cd "$PROJECT_ROOT"
    tar -czf "$PRE_ROLLBACK_PATH-code.tar.gz" \
        --exclude="node_modules" \
        --exclude="venv" \
        --exclude="__pycache__" \
        --exclude=".git" \
        . 2>> "$ROLLBACK_LOG"

    # Save current git hash
    git rev-parse HEAD > "$PRE_ROLLBACK_PATH-git-hash.txt" 2>/dev/null || echo "unknown" > "$PRE_ROLLBACK_PATH-git-hash.txt"

    log "Pre-rollback backup created: $PRE_ROLLBACK_PATH"
}

# Stop services
stop_services() {
    log "Stopping services..." "$BLUE"

    # Stop backend service
    if systemctl is-active --quiet 6fb-backend 2>/dev/null; then
        sudo systemctl stop 6fb-backend >> "$ROLLBACK_LOG" 2>&1
        log "Backend service stopped"
    else
        log "Backend service was not running"
    fi

    # Stop frontend service
    if systemctl is-active --quiet 6fb-frontend 2>/dev/null; then
        sudo systemctl stop 6fb-frontend >> "$ROLLBACK_LOG" 2>&1
        log "Frontend service stopped"
    else
        log "Frontend service was not running"
    fi

    # Give services time to stop gracefully
    sleep 5
}

# Restore code from backup
restore_code() {
    log "Restoring code from backup..." "$BLUE"

    if [[ -f "$BACKUP_PATH-code.tar.gz" ]]; then
        cd "$PROJECT_ROOT"

        # Extract backup
        tar -xzf "$BACKUP_PATH-code.tar.gz" >> "$ROLLBACK_LOG" 2>&1

        log "Code restored successfully"
    else
        error "Code backup not found: $BACKUP_PATH-code.tar.gz"
        exit 1
    fi
}

# Restore database from backup
restore_database() {
    log "Restoring database from backup..." "$BLUE"

    if [[ -f "$BACKUP_PATH-database.sql" ]]; then
        if [[ -n "${DATABASE_URL:-}" ]]; then
            if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
                DB_USER="${BASH_REMATCH[1]}"
                DB_PASS="${BASH_REMATCH[2]}"
                DB_HOST="${BASH_REMATCH[3]}"
                DB_PORT="${BASH_REMATCH[4]}"
                DB_NAME="${BASH_REMATCH[5]}"

                log "Restoring database: $DB_NAME"

                # Drop and recreate database to ensure clean restore
                PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
                    -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" >> "$ROLLBACK_LOG" 2>&1

                PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
                    -c "CREATE DATABASE \"$DB_NAME\";" >> "$ROLLBACK_LOG" 2>&1

                PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                    < "$BACKUP_PATH-database.sql" >> "$ROLLBACK_LOG" 2>&1

                log "Database restored successfully"
            else
                error "Could not parse DATABASE_URL for database restore"
                exit 1
            fi
        else
            warning "DATABASE_URL not set - skipping database restore"
        fi
    else
        warning "Database backup not found: $BACKUP_PATH-database.sql"
    fi
}

# Restore git state
restore_git_state() {
    log "Restoring git state..." "$BLUE"

    if [[ -f "$BACKUP_PATH-git-hash.txt" ]]; then
        cd "$PROJECT_ROOT"
        GIT_HASH=$(cat "$BACKUP_PATH-git-hash.txt")

        if [[ "$GIT_HASH" != "unknown" ]]; then
            git checkout "$GIT_HASH" >> "$ROLLBACK_LOG" 2>&1
            log "Git state restored to: $GIT_HASH"
        else
            warning "Git hash unknown - cannot restore git state"
        fi
    else
        warning "Git hash file not found - cannot restore git state"
    fi
}

# Reinstall dependencies
reinstall_dependencies() {
    log "Reinstalling dependencies..." "$BLUE"

    # Backend dependencies
    cd "$PROJECT_ROOT/backend"

    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate
        pip install -r requirements.txt >> "$ROLLBACK_LOG" 2>&1
        log "Backend dependencies reinstalled"
    else
        warning "Backend virtual environment not found"
    fi

    # Frontend dependencies
    cd "$PROJECT_ROOT/frontend"

    if [[ -f "package.json" ]]; then
        npm ci >> "$ROLLBACK_LOG" 2>&1
        npm run build >> "$ROLLBACK_LOG" 2>&1
        log "Frontend dependencies reinstalled and built"
    else
        warning "Frontend package.json not found"
    fi
}

# Start services
start_services() {
    log "Starting services..." "$BLUE"

    # Start backend service
    sudo systemctl start 6fb-backend >> "$ROLLBACK_LOG" 2>&1
    log "Backend service started"

    # Start frontend service
    sudo systemctl start 6fb-frontend >> "$ROLLBACK_LOG" 2>&1
    log "Frontend service started"

    # Give services time to start
    sleep 10
}

# Run health checks
run_health_checks() {
    log "Running health checks..." "$BLUE"

    # Check backend health
    BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
    MAX_RETRIES=5
    RETRY_COUNT=0

    while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
        if curl -f -s "$BACKEND_URL/api/v1/health" > /dev/null 2>&1; then
            log "Backend health check passed"
            break
        else
            ((RETRY_COUNT++))
            if [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; then
                log "Backend health check failed, retrying in 5 seconds... ($RETRY_COUNT/$MAX_RETRIES)"
                sleep 5
            else
                error "Backend health check failed after $MAX_RETRIES attempts"
                return 1
            fi
        fi
    done

    # Check frontend health
    FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
    if curl -f -s "$FRONTEND_URL" > /dev/null 2>&1; then
        log "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi

    # Check database connectivity
    cd "$PROJECT_ROOT/backend"
    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate

        if python -c "from config.database import engine; engine.connect().close(); print('Database connection successful')" >> "$ROLLBACK_LOG" 2>&1; then
            log "Database connectivity check passed"
        else
            error "Database connectivity check failed"
            return 1
        fi
    fi

    log "All health checks passed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..." "$BLUE"

    # Keep last 10 backups
    OLD_BACKUPS=($(ls -t "$BACKUP_DIR"/deployment-* "$BACKUP_DIR"/pre-rollback-* 2>/dev/null | tail -n +11 || true))

    if [[ ${#OLD_BACKUPS[@]} -gt 0 ]]; then
        for backup in "${OLD_BACKUPS[@]}"; do
            rm -f "$backup" 2>/dev/null || true
        done
        log "Cleaned up ${#OLD_BACKUPS[@]} old backups"
    fi
}

# Main rollback function
main() {
    log "Starting 6FB Booking Platform rollback..." "$GREEN"

    # Check user
    check_user

    # Load environment variables if available
    if [[ -f "$PROJECT_ROOT/backend/.env" ]]; then
        source "$PROJECT_ROOT/backend/.env"
    fi

    # List available backups
    list_backups

    # Get backup selection
    get_backup_selection

    # Confirm rollback
    confirm_rollback

    # Create pre-rollback backup
    create_pre_rollback_backup

    # Stop services
    stop_services

    # Restore from backup
    restore_code
    restore_database
    restore_git_state

    # Reinstall dependencies
    reinstall_dependencies

    # Start services
    start_services

    # Run health checks
    if run_health_checks; then
        log "Rollback completed successfully!" "$GREEN"
        log "Rollback log: $ROLLBACK_LOG"

        # Clean up old backups
        cleanup_old_backups

        echo
        echo "✅ Rollback completed successfully!"
        echo "📋 Rolled back to: $SELECTED_BACKUP"
        echo "💾 Pre-rollback backup created: $PRE_ROLLBACK_PATH"
        echo "📄 Rollback log: $ROLLBACK_LOG"
    else
        error "Rollback completed but health checks failed!"
        echo
        echo "❌ Rollback completed but health checks failed!"
        echo "🔍 Please check the logs and investigate issues"
        echo "📄 Rollback log: $ROLLBACK_LOG"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-index=*)
            BACKUP_INDEX="${1#*=}"
            shift
            ;;
        --force)
            FORCE_ROLLBACK="true"
            shift
            ;;
        --backend-url=*)
            BACKEND_URL="${1#*=}"
            shift
            ;;
        --frontend-url=*)
            FRONTEND_URL="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --backup-index=N    Use backup number N (1-based, skips interactive selection)"
            echo "  --force            Skip confirmation prompt"
            echo "  --backend-url=URL   Backend URL for health checks (default: http://localhost:8000)"
            echo "  --frontend-url=URL  Frontend URL for health checks (default: http://localhost:3000)"
            echo "  --help             Show this help message"
            echo
            echo "Examples:"
            echo "  $0                           # Interactive rollback"
            echo "  $0 --backup-index=1 --force  # Rollback to latest backup without confirmation"
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
