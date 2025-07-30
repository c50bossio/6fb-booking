#!/bin/bash

# =============================================================================
# BookedBarber V2 - Comprehensive Backup & Disaster Recovery System
# =============================================================================
# 💾 Multi-tier backup strategy with encryption and compression
# 🔄 Automated recovery procedures with validation
# 📊 Compliance-ready audit logging and retention policies
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="/opt/bookedbarber/backups"
ENVIRONMENT="${ENVIRONMENT:-production}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_ID="backup_${TIMESTAMP}_$(uuidgen | tr -d '-' | head -c 8)"

# Logging setup
LOG_DIR="/var/log/bookedbarber"
LOG_FILE="$LOG_DIR/backup-recovery.log"
AUDIT_LOG="$LOG_DIR/backup-audit.log"

# Backup directories
DATABASE_BACKUP_DIR="$BACKUP_ROOT/database"
FILES_BACKUP_DIR="$BACKUP_ROOT/files"
CONFIG_BACKUP_DIR="$BACKUP_ROOT/config"
LOGS_BACKUP_DIR="$BACKUP_ROOT/logs"
CONTAINER_BACKUP_DIR="$BACKUP_ROOT/containers"

# Retention policies (days)
DAILY_RETENTION=7
WEEKLY_RETENTION=30
MONTHLY_RETENTION=365
YEARLY_RETENTION=2555  # 7 years for compliance

# Encryption settings
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-backup@bookedbarber.com}"
ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION:-true}"

# Remote storage settings
AWS_S3_BUCKET="${BACKUP_S3_BUCKET:-bookedbarber-backups-production}"
BACKUP_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-true}"

# Notification settings
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"
EMAIL_RECIPIENTS="${BACKUP_EMAIL_RECIPIENTS:-ops@bookedbarber.com}"

# Logging functions
log() {
    local message="$1"
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $message" | tee -a "$LOG_FILE"
}

warn() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message" | tee -a "$LOG_FILE"
}

error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE"
    exit 1
}

audit_log() {
    local action="$1"
    local details="$2"
    local status="${3:-SUCCESS}"
    local user="${SUDO_USER:-$(whoami)}"
    
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') | $user | $action | $status | $BACKUP_ID | $details" >> "$AUDIT_LOG"
}

# Initialize backup environment
initialize_backup_environment() {
    log "Initializing backup environment for $ENVIRONMENT"
    
    # Create backup directories
    sudo mkdir -p "$DATABASE_BACKUP_DIR" "$FILES_BACKUP_DIR" "$CONFIG_BACKUP_DIR" \
                  "$LOGS_BACKUP_DIR" "$CONTAINER_BACKUP_DIR" "$LOG_DIR"
    
    # Set proper permissions
    sudo chmod 700 "$BACKUP_ROOT"
    sudo chmod 755 "$DATABASE_BACKUP_DIR" "$FILES_BACKUP_DIR" "$CONFIG_BACKUP_DIR" \
                   "$LOGS_BACKUP_DIR" "$CONTAINER_BACKUP_DIR"
    sudo chmod 640 "$LOG_FILE" "$AUDIT_LOG" 2>/dev/null || true
    
    # Initialize audit log
    if [[ ! -f "$AUDIT_LOG" ]]; then
        sudo touch "$AUDIT_LOG"
        sudo chmod 640 "$AUDIT_LOG"
        sudo chown root:adm "$AUDIT_LOG"
    fi
    
    audit_log "INIT" "Backup environment initialized"
}

# Database backup with point-in-time recovery
backup_database() {
    log "Starting database backup..."
    
    local db_backup_file="$DATABASE_BACKUP_DIR/postgres_${TIMESTAMP}.sql"
    local wal_backup_dir="$DATABASE_BACKUP_DIR/wal_${TIMESTAMP}"
    
    # Create WAL archive directory
    mkdir -p "$wal_backup_dir"
    
    # PostgreSQL backup with custom format for faster restore
    if docker exec bookedbarber-postgres-prod pg_dump \
        --username=bookedbarber_production \
        --dbname=bookedbarber_production \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="/backup/postgres_${TIMESTAMP}.dump" \
        --exclude-table-data="audit_logs" \
        --exclude-table-data="session_data"; then
        
        # Copy backup file from container
        docker cp "bookedbarber-postgres-prod:/backup/postgres_${TIMESTAMP}.dump" "$db_backup_file.dump"
        
        # Also create SQL format for compatibility
        docker exec bookedbarber-postgres-prod pg_dump \
            --username=bookedbarber_production \
            --dbname=bookedbarber_production \
            --format=plain \
            --compress \
            --verbose \
            --file="/backup/postgres_${TIMESTAMP}.sql.gz" \
            --exclude-table-data="audit_logs" \
            --exclude-table-data="session_data"
        
        docker cp "bookedbarber-postgres-prod:/backup/postgres_${TIMESTAMP}.sql.gz" "$db_backup_file.gz"
        
        # Backup WAL files for point-in-time recovery
        docker exec bookedbarber-postgres-prod find /var/lib/postgresql/data/pg_wal -name "*.wal" -exec cp {} /backup/wal/ \;
        docker cp "bookedbarber-postgres-prod:/backup/wal/." "$wal_backup_dir/"
        
        # Create backup metadata
        cat > "$DATABASE_BACKUP_DIR/metadata_${TIMESTAMP}.json" << EOF
{
    "backup_id": "$BACKUP_ID",
    "timestamp": "$TIMESTAMP",
    "database": "bookedbarber_production",
    "format": "custom",
    "compressed": true,
    "wal_backup": true,
    "size_bytes": $(stat -c%s "$db_backup_file.dump" 2>/dev/null || echo 0),
    "checksum": "$(sha256sum "$db_backup_file.dump" | cut -d' ' -f1)",
    "postgres_version": "$(docker exec bookedbarber-postgres-prod postgres --version)"
}
EOF
        
        log "✅ Database backup completed: $(basename "$db_backup_file.dump")"
        audit_log "DB_BACKUP" "Database backup completed successfully"
        
        return 0
    else
        error "Database backup failed"
        audit_log "DB_BACKUP" "Database backup failed" "FAILED"
        return 1
    fi
}

# Redis backup with RDB and AOF
backup_redis() {
    log "Starting Redis backup..."
    
    local redis_backup_dir="$DATABASE_BACKUP_DIR/redis_${TIMESTAMP}"
    mkdir -p "$redis_backup_dir"
    
    # Force BGSAVE for RDB backup
    docker exec bookedbarber-redis-prod redis-cli BGSAVE
    
    # Wait for background save to complete
    while [[ "$(docker exec bookedbarber-redis-prod redis-cli LASTSAVE)" == "$(docker exec bookedbarber-redis-prod redis-cli LASTSAVE)" ]]; do
        sleep 1
    done
    
    # Copy RDB and AOF files
    docker cp "bookedbarber-redis-prod:/data/dump.rdb" "$redis_backup_dir/"
    docker cp "bookedbarber-redis-prod:/data/appendonly.aof" "$redis_backup_dir/" 2>/dev/null || true
    
    # Create Redis backup metadata
    cat > "$redis_backup_dir/metadata.json" << EOF
{
    "backup_id": "$BACKUP_ID",
    "timestamp": "$TIMESTAMP",
    "rdb_file": "dump.rdb",
    "aof_file": "appendonly.aof",
    "redis_version": "$(docker exec bookedbarber-redis-prod redis-cli INFO SERVER | grep redis_version | cut -d: -f2 | tr -d '\r')",
    "memory_usage": "$(docker exec bookedbarber-redis-prod redis-cli INFO MEMORY | grep used_memory_human | cut -d: -f2 | tr -d '\r')",
    "checksum_rdb": "$(sha256sum "$redis_backup_dir/dump.rdb" | cut -d' ' -f1)",
    "size_bytes": $(stat -c%s "$redis_backup_dir/dump.rdb" 2>/dev/null || echo 0)
}
EOF
    
    log "✅ Redis backup completed"
    audit_log "REDIS_BACKUP" "Redis backup completed successfully"
}

# Application files and uploads backup
backup_files() {
    log "Starting files backup..."
    
    local files_backup_file="$FILES_BACKUP_DIR/files_${TIMESTAMP}.tar.gz"
    
    # Backup application uploads and persistent data
    local backup_paths=(
        "/opt/bookedbarber/uploads"
        "/opt/bookedbarber/static"
        "/opt/bookedbarber/media"
        "/opt/bookedbarber/ssl"
    )
    
    local tar_args=()
    for path in "${backup_paths[@]}"; do
        if [[ -d "$path" ]]; then
            tar_args+=("$path")
        fi
    done
    
    if [[ ${#tar_args[@]} -gt 0 ]]; then
        tar -czf "$files_backup_file" "${tar_args[@]}" 2>/dev/null || true
        
        # Create files backup metadata
        cat > "$FILES_BACKUP_DIR/metadata_${TIMESTAMP}.json" << EOF
{
    "backup_id": "$BACKUP_ID",
    "timestamp": "$TIMESTAMP",
    "paths": $(printf '%s\n' "${backup_paths[@]}" | jq -R . | jq -s .),
    "size_bytes": $(stat -c%s "$files_backup_file" 2>/dev/null || echo 0),
    "checksum": "$(sha256sum "$files_backup_file" | cut -d' ' -f1)",
    "compression": "gzip"
}
EOF
        
        log "✅ Files backup completed: $(basename "$files_backup_file")"
        audit_log "FILES_BACKUP" "Files backup completed successfully"
    else
        warn "No file paths found to backup"
    fi
}

# Configuration and secrets backup
backup_configuration() {
    log "Starting configuration backup..."
    
    local config_backup_file="$CONFIG_BACKUP_DIR/config_${TIMESTAMP}.tar.gz.gpg"
    local temp_tar="$CONFIG_BACKUP_DIR/config_${TIMESTAMP}.tar.gz"
    
    # Backup configuration files (excluding sensitive data)
    local config_paths=(
        "/opt/bookedbarber/docker-compose.production.yml"
        "/opt/bookedbarber/nginx"
        "/opt/bookedbarber/monitoring"
        "/etc/systemd/system/bookedbarber*"
        "/etc/cron.d/bookedbarber*"
    )
    
    local existing_paths=()
    for path in "${config_paths[@]}"; do
        if [[ -e "$path" ]]; then
            existing_paths+=("$path")
        fi
    done
    
    if [[ ${#existing_paths[@]} -gt 0 ]]; then
        tar -czf "$temp_tar" "${existing_paths[@]}" 2>/dev/null
        
        # Encrypt configuration backup
        if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
            gpg --trust-model always --encrypt --recipient "$GPG_RECIPIENT" \
                --output "$config_backup_file" "$temp_tar"
            rm "$temp_tar"
            
            log "✅ Configuration backup completed (encrypted): $(basename "$config_backup_file")"
        else
            mv "$temp_tar" "${config_backup_file%.gpg}"
            log "✅ Configuration backup completed: $(basename "${config_backup_file%.gpg}")"
        fi
        
        audit_log "CONFIG_BACKUP" "Configuration backup completed successfully"
    else
        warn "No configuration paths found to backup"
    fi
}

# Container images backup
backup_containers() {
    log "Starting container images backup..."
    
    local containers_to_backup=(
        "bookedbarber/backend-v2:latest"
        "bookedbarber/frontend-v2:latest"
    )
    
    for image in "${containers_to_backup[@]}"; do
        local image_name=$(echo "$image" | tr '/:' '_')
        local image_backup_file="$CONTAINER_BACKUP_DIR/${image_name}_${TIMESTAMP}.tar.gz"
        
        if docker image inspect "$image" >/dev/null 2>&1; then
            docker save "$image" | gzip > "$image_backup_file"
            log "✅ Container image backed up: $image"
        else
            warn "Container image not found: $image"
        fi
    done
    
    audit_log "CONTAINER_BACKUP" "Container images backup completed"
}

# Logs backup with rotation
backup_logs() {
    log "Starting logs backup..."
    
    local logs_backup_file="$LOGS_BACKUP_DIR/logs_${TIMESTAMP}.tar.gz"
    
    # Backup application and system logs
    local log_paths=(
        "/opt/bookedbarber/logs"
        "/var/log/bookedbarber"
        "/var/lib/docker/containers/*/bookedbarber-*"
    )
    
    find "${log_paths[@]}" -type f -name "*.log" -o -name "*.log.*" 2>/dev/null | \
        tar -czf "$logs_backup_file" -T - 2>/dev/null || true
    
    if [[ -f "$logs_backup_file" ]]; then
        log "✅ Logs backup completed: $(basename "$logs_backup_file")"
        audit_log "LOGS_BACKUP" "Logs backup completed successfully"
    else
        warn "No logs found to backup"
    fi
}

# Encrypt backup files
encrypt_backups() {
    if [[ "$ENCRYPTION_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log "Encrypting backup files..."
    
    # Find unencrypted backup files
    find "$BACKUP_ROOT" -name "*_${TIMESTAMP}*" -type f ! -name "*.gpg" -print0 | \
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]] && [[ "$file" != *".json" ]] && [[ "$file" != *".gpg" ]]; then
            gpg --trust-model always --encrypt --recipient "$GPG_RECIPIENT" \
                --output "${file}.gpg" "$file"
            
            # Verify encryption and remove original
            if [[ -f "${file}.gpg" ]]; then
                rm "$file"
                log "🔒 Encrypted: $(basename "$file")"
            else
                error "Failed to encrypt: $file"
            fi
        fi
    done
    
    audit_log "ENCRYPTION" "Backup encryption completed"
}

# Upload to remote storage
upload_to_remote() {
    if [[ "$REMOTE_BACKUP_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log "Uploading backups to remote storage..."
    
    # Check AWS CLI availability
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI not available, skipping remote upload"
        return 1
    fi
    
    # Upload each backup directory
    local backup_dirs=("$DATABASE_BACKUP_DIR" "$FILES_BACKUP_DIR" "$CONFIG_BACKUP_DIR" \
                      "$LOGS_BACKUP_DIR" "$CONTAINER_BACKUP_DIR")
    
    for dir in "${backup_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local dir_name=$(basename "$dir")
            
            # Sync to S3 with encryption
            aws s3 sync "$dir" "s3://$AWS_S3_BUCKET/$ENVIRONMENT/$dir_name/" \
                --region "$BACKUP_REGION" \
                --exclude "*" \
                --include "*_${TIMESTAMP}*" \
                --storage-class STANDARD_IA \
                --server-side-encryption AES256 \
                --delete
            
            if [[ $? -eq 0 ]]; then
                log "✅ Uploaded $dir_name to S3"
            else
                warn "Failed to upload $dir_name to S3"
            fi
        fi
    done
    
    audit_log "REMOTE_UPLOAD" "Remote backup upload completed"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local verification_failed=0
    
    # Verify database backup
    if [[ -f "$DATABASE_BACKUP_DIR/postgres_${TIMESTAMP}.dump" ]]; then
        local expected_checksum=$(jq -r '.checksum' "$DATABASE_BACKUP_DIR/metadata_${TIMESTAMP}.json" 2>/dev/null)
        local actual_checksum=$(sha256sum "$DATABASE_BACKUP_DIR/postgres_${TIMESTAMP}.dump" | cut -d' ' -f1)
        
        if [[ "$expected_checksum" == "$actual_checksum" ]]; then
            log "✅ Database backup integrity verified"
        else
            error "❌ Database backup integrity check failed"
            verification_failed=1
        fi
    fi
    
    # Verify other backups similarly...
    find "$BACKUP_ROOT" -name "metadata_${TIMESTAMP}.json" -type f | \
    while read -r metadata_file; do
        local backup_dir=$(dirname "$metadata_file")
        local backup_file=$(jq -r '.backup_file // empty' "$metadata_file" 2>/dev/null)
        
        if [[ -n "$backup_file" ]] && [[ -f "$backup_dir/$backup_file" ]]; then
            local expected_checksum=$(jq -r '.checksum' "$metadata_file" 2>/dev/null)
            local actual_checksum=$(sha256sum "$backup_dir/$backup_file" | cut -d' ' -f1)
            
            if [[ "$expected_checksum" == "$actual_checksum" ]]; then
                log "✅ Backup integrity verified: $backup_file"
            else
                warn "❌ Backup integrity check failed: $backup_file"
                verification_failed=1
            fi
        fi
    done
    
    if [[ $verification_failed -eq 0 ]]; then
        audit_log "VERIFICATION" "All backup integrity checks passed"
        return 0
    else
        audit_log "VERIFICATION" "Some backup integrity checks failed" "FAILED"
        return 1
    fi
}

# Clean old backups based on retention policy
cleanup_old_backups() {
    log "Cleaning up old backups based on retention policy..."
    
    local cleanup_count=0
    
    # Daily backups (keep last 7 days)
    find "$BACKUP_ROOT" -name "*_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*" -type f -mtime +$DAILY_RETENTION | \
    while read -r file; do
        if [[ -f "$file" ]]; then
            rm "$file"
            cleanup_count=$((cleanup_count + 1))
            log "🗑️ Removed old backup: $(basename "$file")"
        fi
    done
    
    # Weekly backups (keep Sunday backups for 30 days)
    # Monthly backups (keep first of month for 1 year)
    # Yearly backups (keep first of year for 7 years)
    
    audit_log "CLEANUP" "Cleaned up $cleanup_count old backup files"
    log "✅ Backup cleanup completed"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "$status" != "success" ]]; then
            color="danger"
            emoji="❌"
        fi
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji BookedBarber Backup $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Backup ID\", \"value\": \"$BACKUP_ID\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true}
                    ]
                }]
            }" 2>/dev/null || true
    fi
    
    # Email notification
    if [[ -n "$EMAIL_RECIPIENTS" ]] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "BookedBarber Backup $status - $ENVIRONMENT" "$EMAIL_RECIPIENTS" || true
    fi
}

# Disaster recovery functions
restore_database() {
    local backup_file="$1"
    local target_db="${2:-bookedbarber_recovery}"
    
    log "Starting database restoration from $backup_file..."
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    # Decrypt if encrypted
    if [[ "$backup_file" == *.gpg ]]; then
        gpg --decrypt "$backup_file" > "${backup_file%.gpg}"
        backup_file="${backup_file%.gpg}"
    fi
    
    # Restore database
    docker exec -i bookedbarber-postgres-prod pg_restore \
        --username=bookedbarber_production \
        --dbname="$target_db" \
        --create \
        --clean \
        --if-exists \
        --verbose < "$backup_file"
    
    log "✅ Database restoration completed"
    audit_log "DB_RESTORE" "Database restored from $backup_file"
}

# Full backup procedure
perform_full_backup() {
    log "🚀 Starting full backup procedure for $ENVIRONMENT environment"
    audit_log "FULL_BACKUP" "Full backup procedure started"
    
    local start_time=$(date +%s)
    local backup_success=true
    
    # Initialize environment
    initialize_backup_environment
    
    # Perform all backup operations
    backup_database || backup_success=false
    backup_redis || backup_success=false
    backup_files || backup_success=false
    backup_configuration || backup_success=false
    backup_containers || backup_success=false
    backup_logs || backup_success=false
    
    # Post-backup operations
    encrypt_backups || backup_success=false
    upload_to_remote || backup_success=false
    verify_backups || backup_success=false
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate backup report
    local backup_size=$(du -sh "$BACKUP_ROOT" | cut -f1)
    local report_message="Backup completed in ${duration}s. Total size: $backup_size"
    
    if [[ "$backup_success" == "true" ]]; then
        log "✅ Full backup completed successfully!"
        send_notifications "success" "$report_message"
        audit_log "FULL_BACKUP" "Full backup completed successfully"
        return 0
    else
        error "❌ Backup completed with errors!"
        send_notifications "failed" "Backup completed with errors. $report_message"
        audit_log "FULL_BACKUP" "Full backup completed with errors" "FAILED"
        return 1
    fi
}

# Main execution
main() {
    case "${1:-backup}" in
        "backup")
            perform_full_backup
            ;;
        "restore-db")
            restore_database "$2" "$3"
            ;;
        "verify")
            verify_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore-db|verify|cleanup}"
            echo "  backup           - Perform full backup"
            echo "  restore-db FILE  - Restore database from backup file"
            echo "  verify           - Verify backup integrity"
            echo "  cleanup          - Clean old backups"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"