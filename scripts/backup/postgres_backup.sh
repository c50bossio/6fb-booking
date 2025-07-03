#!/bin/bash

# PostgreSQL Automated Backup Script for BookedBarber V2
# Supports daily backups, transaction log backups, and cross-region replication

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/config/backup"
LOG_DIR="/var/log/bookedbarber/backup"
BACKUP_BASE_DIR="/var/backups/bookedbarber"
TEMP_DIR="/tmp/bookedbarber-backup"

# Load configuration
source "$CONFIG_DIR/backup.conf"

# Ensure required directories exist
mkdir -p "$LOG_DIR" "$BACKUP_BASE_DIR" "$TEMP_DIR"

# Logging setup
exec 1> >(tee -a "$LOG_DIR/backup.log")
exec 2> >(tee -a "$LOG_DIR/backup-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null && [ "$CROSS_REGION_ENABLED" = "true" ]; then
        error "AWS CLI not found but cross-region backup is enabled"
        exit 1
    fi
    
    if [ -z "${DATABASE_URL:-}" ]; then
        error "DATABASE_URL not set"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Parse database URL
parse_database_url() {
    # Extract components from DATABASE_URL
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

# Create database backup
create_database_backup() {
    local backup_type="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_dir="$BACKUP_BASE_DIR/$backup_type/$(date '+%Y/%m/%d')"
    local backup_file="$backup_dir/bookedbarber_${backup_type}_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    mkdir -p "$backup_dir"
    
    log "Creating $backup_type backup: $compressed_file"
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASS"
    
    case $backup_type in
        "full")
            pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --verbose \
                --clean \
                --create \
                --if-exists \
                --format=custom \
                --compress=9 \
                --file="$backup_file"
            ;;
        "schema")
            pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --schema-only \
                --verbose \
                --clean \
                --create \
                --if-exists \
                --file="$backup_file"
            gzip "$backup_file"
            ;;
        "data")
            pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --data-only \
                --verbose \
                --format=custom \
                --compress=9 \
                --file="$backup_file"
            ;;
    esac
    
    # Compress if not already compressed
    if [ "$backup_type" != "schema" ] && [ ! -f "$compressed_file" ]; then
        gzip "$backup_file"
    fi
    
    # Verify backup integrity
    if [ -f "$compressed_file" ]; then
        log "Backup created successfully: $compressed_file"
        echo "$compressed_file"
    else
        error "Backup creation failed"
        exit 1
    fi
}

# Create transaction log backup
create_wal_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local wal_dir="$BACKUP_BASE_DIR/wal/$(date '+%Y/%m/%d')"
    local wal_backup="$wal_dir/wal_backup_${timestamp}.tar.gz"
    
    mkdir -p "$wal_dir"
    
    log "Creating WAL backup: $wal_backup"
    
    # Get WAL directory from PostgreSQL
    export PGPASSWORD="$DB_PASS"
    local pg_wal_dir=$(psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --tuples-only \
        --command="SHOW data_directory;" | xargs -I {} echo {}/pg_wal)
    
    if [ -d "$pg_wal_dir" ]; then
        tar -czf "$wal_backup" -C "$(dirname "$pg_wal_dir")" "$(basename "$pg_wal_dir")"
        log "WAL backup created: $wal_backup"
        echo "$wal_backup"
    else
        error "WAL directory not accessible: $pg_wal_dir"
        return 1
    fi
}

# Upload to cloud storage
upload_to_cloud() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [ "$CLOUD_BACKUP_ENABLED" != "true" ]; then
        return 0
    fi
    
    log "Uploading to cloud storage: $backup_file"
    
    local cloud_path="s3://$S3_BACKUP_BUCKET/bookedbarber/backups/$backup_type/$(date '+%Y/%m/%d')/$(basename "$backup_file")"
    
    if aws s3 cp "$backup_file" "$cloud_path" --storage-class "$S3_STORAGE_CLASS"; then
        log "Cloud upload successful: $cloud_path"
    else
        error "Cloud upload failed: $backup_file"
        return 1
    fi
}

# Cross-region replication
replicate_cross_region() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [ "$CROSS_REGION_ENABLED" != "true" ]; then
        return 0
    fi
    
    log "Replicating to cross-region: $backup_file"
    
    local source_path="s3://$S3_BACKUP_BUCKET/bookedbarber/backups/$backup_type/$(date '+%Y/%m/%d')/$(basename "$backup_file")"
    local dest_path="s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/$backup_type/$(date '+%Y/%m/%d')/$(basename "$backup_file")"
    
    if aws s3 cp "$source_path" "$dest_path" --source-region "$AWS_PRIMARY_REGION" --region "$AWS_BACKUP_REGION"; then
        log "Cross-region replication successful: $dest_path"
    else
        error "Cross-region replication failed: $backup_file"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Cleanup local backups
    find "$BACKUP_BASE_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_BASE_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Cleanup empty directories
    find "$BACKUP_BASE_DIR" -type d -empty -delete
    
    # Cleanup cloud backups if enabled
    if [ "$CLOUD_BACKUP_ENABLED" = "true" ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y/%m/%d')
        aws s3 rm "s3://$S3_BACKUP_BUCKET/bookedbarber/backups/" --recursive \
            --exclude "*" --include "*${cutoff_date}*" || true
    fi
    
    log "Cleanup completed"
}

# Send notifications
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ "$NOTIFICATION_ENABLED" != "true" ]; then
        return 0
    fi
    
    local subject="BookedBarber Backup $status"
    
    case $NOTIFICATION_METHOD in
        "email")
            echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
            ;;
        "slack")
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"$subject: $message\"}" \
                "$SLACK_WEBHOOK_URL"
            ;;
        "webhook")
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"status\":\"$status\",\"message\":\"$message\"}" \
                "$WEBHOOK_URL"
            ;;
    esac
}

# Main backup function
main() {
    local backup_type="${1:-full}"
    
    log "Starting $backup_type backup process..."
    
    check_prerequisites
    parse_database_url
    
    case $backup_type in
        "full")
            local backup_file=$(create_database_backup "full")
            upload_to_cloud "$backup_file" "full"
            replicate_cross_region "$backup_file" "full"
            ;;
        "incremental")
            local wal_backup=$(create_wal_backup)
            upload_to_cloud "$wal_backup" "wal"
            replicate_cross_region "$wal_backup" "wal"
            ;;
        "schema")
            local schema_backup=$(create_database_backup "schema")
            upload_to_cloud "$schema_backup" "schema"
            ;;
        *)
            error "Invalid backup type: $backup_type"
            exit 1
            ;;
    esac
    
    cleanup_old_backups
    
    log "Backup process completed successfully"
    send_notification "SUCCESS" "Backup completed successfully for $backup_type"
}

# Handle errors
trap 'send_notification "FAILED" "Backup process failed with error"; exit 1' ERR

# Run main function
main "$@"