#!/bin/bash

# Backup Validation Script for BookedBarber V2
# Validates backup integrity and performs test restores

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/config/backup"
LOG_DIR="/var/log/bookedbarber/backup"
TEST_DB_NAME="bookedbarber_backup_test"

source "$CONFIG_DIR/backup.conf"

exec 1> >(tee -a "$LOG_DIR/validation.log")
exec 2> >(tee -a "$LOG_DIR/validation-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
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

# Validate backup file integrity
validate_file_integrity() {
    local backup_file="$1"
    
    log "Validating file integrity: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is compressed
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file"; then
            error "Compressed backup file is corrupted: $backup_file"
            return 1
        fi
    fi
    
    # Check file size (should be > 1MB for a real database)
    local file_size=$(stat -c%s "$backup_file")
    if [ "$file_size" -lt 1048576 ]; then
        error "Backup file suspiciously small: $backup_file ($file_size bytes)"
        return 1
    fi
    
    log "File integrity check passed: $backup_file"
    return 0
}

# Validate PostgreSQL backup format
validate_pg_backup() {
    local backup_file="$1"
    
    log "Validating PostgreSQL backup format: $backup_file"
    
    export PGPASSWORD="$DB_PASS"
    
    # For custom format backups
    if [[ "$backup_file" == *.sql ]] && ! [[ "$backup_file" == *.gz ]]; then
        if ! pg_restore --list "$backup_file" > /dev/null 2>&1; then
            error "Invalid PostgreSQL custom format backup: $backup_file"
            return 1
        fi
    fi
    
    # For SQL format backups
    if [[ "$backup_file" == *.sql.gz ]]; then
        local temp_file="/tmp/backup_validation_$$.sql"
        if ! gunzip -c "$backup_file" > "$temp_file"; then
            error "Failed to decompress backup: $backup_file"
            return 1
        fi
        
        # Basic SQL syntax validation
        if ! grep -q "CREATE DATABASE\|CREATE TABLE" "$temp_file"; then
            error "Backup does not contain expected SQL statements: $backup_file"
            rm -f "$temp_file"
            return 1
        fi
        
        rm -f "$temp_file"
    fi
    
    log "PostgreSQL backup format validation passed: $backup_file"
    return 0
}

# Perform test restore
test_restore() {
    local backup_file="$1"
    
    log "Performing test restore: $backup_file"
    
    export PGPASSWORD="$DB_PASS"
    
    # Drop test database if exists
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
        --command="DROP DATABASE IF EXISTS $TEST_DB_NAME;" || true
    
    # Create test database
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
        --command="CREATE DATABASE $TEST_DB_NAME;"
    
    # Restore backup to test database
    if [[ "$backup_file" == *.sql.gz ]]; then
        # SQL format restore
        gunzip -c "$backup_file" | psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME"
    else
        # Custom format restore
        pg_restore --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
            --verbose --clean --if-exists "$backup_file"
    fi
    
    # Validate restored database
    local table_count=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
        --tuples-only --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    if [ "$table_count" -lt 5 ]; then
        error "Test restore resulted in too few tables: $table_count"
        return 1
    fi
    
    # Check for critical tables
    local critical_tables=("users" "appointments" "payments" "locations")
    for table in "${critical_tables[@]}"; do
        local exists=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
            --tuples-only --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
        if [ "$exists" -eq 0 ]; then
            error "Critical table missing from restore: $table"
            return 1
        fi
    done
    
    # Cleanup test database
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
        --command="DROP DATABASE $TEST_DB_NAME;"
    
    log "Test restore completed successfully: $backup_file"
    return 0
}

# Validate backup metadata
validate_metadata() {
    local backup_file="$1"
    
    log "Validating backup metadata: $backup_file"
    
    # Check modification time (should be recent)
    local mod_time=$(stat -c %Y "$backup_file")
    local current_time=$(date +%s)
    local age=$((current_time - mod_time))
    
    # If backup is older than 7 days, warn
    if [ "$age" -gt 604800 ]; then
        log "WARNING: Backup file is older than 7 days: $backup_file"
    fi
    
    # Extract metadata if available
    local backup_dir=$(dirname "$backup_file")
    local metadata_file="${backup_dir}/$(basename "$backup_file" .sql.gz).metadata"
    
    if [ -f "$metadata_file" ]; then
        log "Metadata found: $metadata_file"
        cat "$metadata_file"
    else
        log "No metadata file found for: $backup_file"
    fi
    
    return 0
}

# Generate validation report
generate_report() {
    local backup_file="$1"
    local validation_status="$2"
    
    local report_file="/var/log/bookedbarber/backup/validation_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "backup_file": "$backup_file",
    "validation_date": "$(date -Iseconds)",
    "validation_status": "$validation_status",
    "file_size": $(stat -c%s "$backup_file"),
    "file_age_seconds": $(($(date +%s) - $(stat -c %Y "$backup_file"))),
    "checksums": {
        "md5": "$(md5sum "$backup_file" | cut -d' ' -f1)",
        "sha256": "$(sha256sum "$backup_file" | cut -d' ' -f1)"
    },
    "validation_details": {
        "file_integrity": "$(validate_file_integrity "$backup_file" && echo "PASS" || echo "FAIL")",
        "pg_format": "$(validate_pg_backup "$backup_file" && echo "PASS" || echo "FAIL")",
        "test_restore": "$validation_status"
    }
}
EOF
    
    log "Validation report generated: $report_file"
    echo "$report_file"
}

# Main validation function
main() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Usage: $0 <backup_file>"
        exit 1
    fi
    
    log "Starting backup validation: $backup_file"
    
    parse_database_url
    
    local validation_status="PASS"
    
    # Run all validation checks
    if ! validate_file_integrity "$backup_file"; then
        validation_status="FAIL"
    fi
    
    if ! validate_pg_backup "$backup_file"; then
        validation_status="FAIL"
    fi
    
    if ! test_restore "$backup_file"; then
        validation_status="FAIL"
    fi
    
    validate_metadata "$backup_file"
    
    # Generate report
    local report_file=$(generate_report "$backup_file" "$validation_status")
    
    if [ "$validation_status" = "PASS" ]; then
        log "Backup validation PASSED: $backup_file"
        exit 0
    else
        error "Backup validation FAILED: $backup_file"
        exit 1
    fi
}

# Run main function
main "$@"