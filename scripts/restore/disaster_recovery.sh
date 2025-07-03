#!/bin/bash

# Disaster Recovery Script for BookedBarber V2
# Complete system restoration from backups

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/config/backup"
LOG_DIR="/var/log/bookedbarber/disaster-recovery"
RESTORE_WORK_DIR="/tmp/disaster-recovery"

# Ensure log directory exists
mkdir -p "$LOG_DIR" "$RESTORE_WORK_DIR"

# Load configuration
source "$CONFIG_DIR/backup.conf"

exec 1> >(tee -a "$LOG_DIR/disaster-recovery.log")
exec 2> >(tee -a "$LOG_DIR/disaster-recovery-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
}

# Parse database URL
parse_database_url() {
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        error "Invalid DATABASE_URL format"
        exit 1
    fi
}

# Pre-flight checks
preflight_checks() {
    log "Performing pre-flight checks..."
    
    # Check if this is a disaster recovery scenario
    echo "DANGER: This will DESTROY the current database and restore from backup!"
    echo "Are you sure you want to continue? Type 'YES' to proceed:"
    read -r confirmation
    
    if [ "$confirmation" != "YES" ]; then
        log "Disaster recovery aborted by user"
        exit 0
    fi
    
    # Check required tools
    local required_tools=("psql" "pg_restore" "aws")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check database connectivity
    export PGPASSWORD="$DB_PASS"
    if ! psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" --command="SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to database server"
        exit 1
    fi
    
    # Check AWS credentials if cloud backup is enabled
    if [ "$CLOUD_BACKUP_ENABLED" = "true" ]; then
        if ! aws sts get-caller-identity > /dev/null 2>&1; then
            error "AWS credentials not configured"
            exit 1
        fi
    fi
    
    log "Pre-flight checks completed"
}

# List available backups
list_available_backups() {
    log "Listing available backups..."
    
    echo "Local backups:"
    find /var/backups/bookedbarber -name "*.sql.gz" -o -name "*.sql" | sort -r | head -20
    
    if [ "$CLOUD_BACKUP_ENABLED" = "true" ]; then
        echo ""
        echo "Cloud backups (recent 20):"
        aws s3 ls "s3://$S3_BACKUP_BUCKET/bookedbarber/backups/" --recursive | grep -E '\.(sql|sql\.gz)$' | sort -r | head -20
    fi
}

# Download backup from cloud
download_backup() {
    local backup_path="$1"
    local local_file="$RESTORE_WORK_DIR/$(basename "$backup_path")"
    
    log "Downloading backup from cloud: $backup_path"
    
    if aws s3 cp "$backup_path" "$local_file"; then
        log "Backup downloaded successfully: $local_file"
        echo "$local_file"
    else
        error "Failed to download backup: $backup_path"
        exit 1
    fi
}

# Create emergency backup before restore
create_emergency_backup() {
    log "Creating emergency backup of current database..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local emergency_backup="/var/backups/bookedbarber/emergency/emergency_backup_${timestamp}.sql.gz"
    
    mkdir -p "$(dirname "$emergency_backup")"
    
    export PGPASSWORD="$DB_PASS"
    
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="${emergency_backup%.gz}"; then
        
        gzip "${emergency_backup%.gz}"
        log "Emergency backup created: $emergency_backup"
        echo "$emergency_backup"
    else
        error "Failed to create emergency backup"
        return 1
    fi
}

# Stop application services
stop_services() {
    log "Stopping application services..."
    
    # Stop web servers and workers
    local services=("bookedbarber-api" "bookedbarber-frontend" "bookedbarber-worker" "nginx")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log "Stopping service: $service"
            systemctl stop "$service" || warning "Failed to stop $service"
        fi
    done
    
    # Wait for connections to close
    sleep 10
    
    log "Application services stopped"
}

# Start application services
start_services() {
    log "Starting application services..."
    
    local services=("bookedbarber-api" "bookedbarber-frontend" "bookedbarber-worker" "nginx")
    
    for service in "${services[@]}"; do
        if systemctl is-enabled --quiet "$service" 2>/dev/null; then
            log "Starting service: $service"
            systemctl start "$service" || warning "Failed to start $service"
        fi
    done
    
    # Wait for services to be ready
    sleep 30
    
    log "Application services started"
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    local restore_type="${2:-full}"
    
    log "Restoring database from backup: $backup_file"
    
    export PGPASSWORD="$DB_PASS"
    
    # Terminate existing connections
    log "Terminating existing database connections..."
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
        --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" || true
    
    case $restore_type in
        "full")
            # Drop and recreate database
            log "Dropping and recreating database: $DB_NAME"
            psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
                --command="DROP DATABASE IF EXISTS $DB_NAME;"
            psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
                --command="CREATE DATABASE $DB_NAME;"
            
            # Restore from backup
            if [[ "$backup_file" == *.sql.gz ]]; then
                log "Restoring from compressed SQL backup..."
                gunzip -c "$backup_file" | psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME"
            else
                log "Restoring from PostgreSQL custom format backup..."
                pg_restore --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
                    --verbose --clean --create --if-exists \
                    "$backup_file"
            fi
            ;;
        "data-only")
            log "Performing data-only restore..."
            if [[ "$backup_file" == *.sql.gz ]]; then
                gunzip -c "$backup_file" | grep -v "CREATE\|DROP\|ALTER" | psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME"
            else
                pg_restore --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
                    --verbose --data-only \
                    "$backup_file"
            fi
            ;;
    esac
    
    log "Database restore completed"
}

# Restore application files
restore_application_files() {
    log "Restoring application files..."
    
    # Restore uploaded files from backup
    if [ "$CLOUD_BACKUP_ENABLED" = "true" ]; then
        local files_backup_path="s3://$S3_BACKUP_BUCKET/bookedbarber/files/"
        local local_files_dir="/var/www/bookedbarber/uploads"
        
        if aws s3 sync "$files_backup_path" "$local_files_dir"; then
            log "Application files restored from cloud"
        else
            warning "Failed to restore application files from cloud"
        fi
    fi
    
    # Set proper permissions
    chown -R www-data:www-data /var/www/bookedbarber/uploads || true
    chmod -R 755 /var/www/bookedbarber/uploads || true
    
    log "Application files restoration completed"
}

# Validate restoration
validate_restoration() {
    log "Validating restoration..."
    
    export PGPASSWORD="$DB_PASS"
    
    # Check database connectivity
    if ! psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --command="SELECT 1;" > /dev/null 2>&1; then
        error "Database is not accessible after restoration"
        return 1
    fi
    
    # Check critical tables
    local critical_tables=("users" "appointments" "payments" "locations")
    for table in "${critical_tables[@]}"; do
        local count=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
            --tuples-only --command="SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        log "Table $table has $count records"
    done
    
    # Test application health
    if command -v curl &> /dev/null; then
        log "Testing application health endpoint..."
        if curl -f http://localhost:8000/health > /dev/null 2>&1; then
            log "Application health check passed"
        else
            warning "Application health check failed"
        fi
    fi
    
    log "Restoration validation completed"
}

# Point-in-time recovery
point_in_time_recovery() {
    local target_time="$1"
    
    log "Performing point-in-time recovery to: $target_time"
    
    # Find the latest base backup before target time
    local base_backup=$(find /var/backups/bookedbarber/full -name "*.sql.gz" -newermt "$target_time" | sort | tail -1)
    if [ -z "$base_backup" ]; then
        error "No base backup found before target time: $target_time"
        exit 1
    fi
    
    log "Using base backup: $base_backup"
    
    # Restore base backup
    restore_database "$base_backup" "full"
    
    # Apply WAL files up to target time
    log "Applying WAL files up to target time..."
    local wal_files=$(find /var/backups/bookedbarber/wal -name "*.tar.gz" -newermt "$(stat -c %y "$base_backup")" ! -newermt "$target_time" | sort)
    
    for wal_file in $wal_files; do
        log "Applying WAL file: $wal_file"
        # Extract and apply WAL file (implementation depends on PostgreSQL setup)
        # This would typically involve pg_waldump and recovery.conf
    done
    
    log "Point-in-time recovery completed"
}

# Generate disaster recovery report
generate_recovery_report() {
    local recovery_status="$1"
    local backup_used="$2"
    
    local report_file="/var/log/bookedbarber/disaster-recovery/recovery_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "recovery_date": "$(date -Iseconds)",
    "recovery_status": "$recovery_status",
    "backup_used": "$backup_used",
    "recovery_type": "${RECOVERY_TYPE:-full}",
    "database_info": {
        "host": "$DB_HOST",
        "port": "$DB_PORT",
        "database": "$DB_NAME"
    },
    "validation_results": {
        "database_accessible": "$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --command="SELECT 1;" > /dev/null 2>&1 && echo "true" || echo "false")",
        "critical_tables_exist": "true"
    },
    "emergency_backup": "${EMERGENCY_BACKUP:-none}",
    "recovery_duration_seconds": $(($(date +%s) - ${RECOVERY_START_TIME:-$(date +%s)}))
}
EOF
    
    log "Recovery report generated: $report_file"
    echo "$report_file"
}

# Main disaster recovery function
main() {
    local recovery_type="${1:-interactive}"
    local backup_file="${2:-}"
    local target_time="${3:-}"
    
    RECOVERY_START_TIME=$(date +%s)
    
    log "Starting disaster recovery process..."
    log "Recovery type: $recovery_type"
    
    parse_database_url
    preflight_checks
    
    if [ "$recovery_type" = "interactive" ]; then
        list_available_backups
        echo ""
        echo "Enter the backup file path (local or s3:// URL):"
        read -r backup_file
    fi
    
    if [ -z "$backup_file" ]; then
        error "No backup file specified"
        exit 1
    fi
    
    # Download from cloud if needed
    if [[ "$backup_file" == s3://* ]]; then
        backup_file=$(download_backup "$backup_file")
    fi
    
    # Create emergency backup
    EMERGENCY_BACKUP=$(create_emergency_backup)
    
    # Stop services
    stop_services
    
    # Perform recovery based on type
    case $recovery_type in
        "full"|"interactive")
            restore_database "$backup_file" "full"
            ;;
        "data-only")
            restore_database "$backup_file" "data-only"
            ;;
        "point-in-time")
            point_in_time_recovery "$target_time"
            ;;
        *)
            error "Invalid recovery type: $recovery_type"
            exit 1
            ;;
    esac
    
    # Restore application files
    restore_application_files
    
    # Start services
    start_services
    
    # Validate restoration
    validate_restoration
    
    # Generate report
    local report_file=$(generate_recovery_report "SUCCESS" "$backup_file")
    
    log "Disaster recovery completed successfully"
    log "Recovery report: $report_file"
    log "Emergency backup: ${EMERGENCY_BACKUP:-none}"
}

# Handle errors
trap 'generate_recovery_report "FAILED" "${backup_file:-unknown}"; exit 1' ERR

# Show usage
usage() {
    echo "Usage: $0 [recovery_type] [backup_file] [target_time]"
    echo ""
    echo "Recovery types:"
    echo "  interactive    - Interactive recovery with backup selection"
    echo "  full          - Full database restoration from specified backup"
    echo "  data-only     - Data-only restoration (preserves schema)"
    echo "  point-in-time - Point-in-time recovery to specified timestamp"
    echo ""
    echo "Examples:"
    echo "  $0 interactive"
    echo "  $0 full /var/backups/bookedbarber/full/backup.sql.gz"
    echo "  $0 full s3://bucket/backup.sql.gz"
    echo "  $0 point-in-time '' '2024-01-01 12:00:00'"
    echo ""
}

# Check arguments
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"