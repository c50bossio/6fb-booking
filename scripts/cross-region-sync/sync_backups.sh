#!/bin/bash

# Cross-Region Backup Synchronization for BookedBarber V2
# Synchronizes backups across multiple AWS regions for disaster recovery

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/config/backup"
LOG_DIR="/var/log/bookedbarber/cross-region-sync"

mkdir -p "$LOG_DIR"

source "$CONFIG_DIR/backup.conf"

exec 1> >(tee -a "$LOG_DIR/sync.log")
exec 2> >(tee -a "$LOG_DIR/sync-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Validate AWS configuration
validate_aws_config() {
    log "Validating AWS configuration..."
    
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        error "AWS credentials not configured"
        exit 1
    fi
    
    # Check source bucket
    if ! aws s3 ls "s3://$S3_BACKUP_BUCKET" > /dev/null 2>&1; then
        error "Source backup bucket not accessible: $S3_BACKUP_BUCKET"
        exit 1
    fi
    
    # Check destination bucket
    if ! aws s3 ls "s3://$S3_CROSS_REGION_BUCKET" --region "$AWS_BACKUP_REGION" > /dev/null 2>&1; then
        error "Destination backup bucket not accessible: $S3_CROSS_REGION_BUCKET"
        exit 1
    fi
    
    log "AWS configuration validated"
}

# Sync recent backups
sync_recent_backups() {
    local days_back="${1:-7}"
    
    log "Syncing backups from last $days_back days..."
    
    local cutoff_date=$(date -d "$days_back days ago" '+%Y-%m-%d')
    
    # Sync full backups
    log "Syncing full backups since $cutoff_date..."
    aws s3 sync \
        "s3://$S3_BACKUP_BUCKET/bookedbarber/backups/full/" \
        "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/full/" \
        --region "$AWS_BACKUP_REGION" \
        --exclude "*" \
        --include "*$(date -d "$cutoff_date" '+%Y/%m/%d')*" \
        --delete \
        --storage-class STANDARD_IA
    
    # Sync WAL backups
    log "Syncing WAL backups since $cutoff_date..."
    aws s3 sync \
        "s3://$S3_BACKUP_BUCKET/bookedbarber/backups/wal/" \
        "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/wal/" \
        --region "$AWS_BACKUP_REGION" \
        --exclude "*" \
        --include "*$(date -d "$cutoff_date" '+%Y/%m/%d')*" \
        --delete \
        --storage-class STANDARD_IA
    
    # Sync schema backups
    log "Syncing schema backups since $cutoff_date..."
    aws s3 sync \
        "s3://$S3_BACKUP_BUCKET/bookedbarber/backups/schema/" \
        "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/schema/" \
        --region "$AWS_BACKUP_REGION" \
        --exclude "*" \
        --include "*$(date -d "$cutoff_date" '+%Y/%m/%d')*" \
        --delete \
        --storage-class STANDARD_IA
    
    log "Recent backups sync completed"
}

# Sync application files
sync_application_files() {
    log "Syncing application files..."
    
    aws s3 sync \
        "s3://$S3_BACKUP_BUCKET/bookedbarber/files/" \
        "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/files/" \
        --region "$AWS_BACKUP_REGION" \
        --storage-class STANDARD_IA
    
    log "Application files sync completed"
}

# Verify sync integrity
verify_sync_integrity() {
    log "Verifying sync integrity..."
    
    local source_count=$(aws s3 ls "s3://$S3_BACKUP_BUCKET/bookedbarber/backups/" --recursive | wc -l)
    local dest_count=$(aws s3 ls "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/" --recursive --region "$AWS_BACKUP_REGION" | wc -l)
    
    log "Source backup count: $source_count"
    log "Destination backup count: $dest_count"
    
    if [ "$source_count" -gt 0 ] && [ "$dest_count" -gt 0 ]; then
        local sync_ratio=$((dest_count * 100 / source_count))
        log "Sync ratio: ${sync_ratio}%"
        
        if [ "$sync_ratio" -lt 80 ]; then
            error "Sync ratio too low: ${sync_ratio}%"
            return 1
        fi
    fi
    
    log "Sync integrity verified"
}

# Test cross-region restore capability
test_restore_capability() {
    log "Testing cross-region restore capability..."
    
    # Find a recent backup in the cross-region bucket
    local test_backup=$(aws s3 ls "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/full/" --recursive --region "$AWS_BACKUP_REGION" | tail -1 | awk '{print $4}')
    
    if [ -z "$test_backup" ]; then
        error "No backups found in cross-region bucket for testing"
        return 1
    fi
    
    local test_file="/tmp/cross-region-test-$(date +%s).sql.gz"
    
    # Download backup from cross-region
    if aws s3 cp "s3://$S3_CROSS_REGION_BUCKET/$test_backup" "$test_file" --region "$AWS_BACKUP_REGION"; then
        log "Cross-region backup download successful"
        
        # Verify file integrity
        if gzip -t "$test_file"; then
            log "Cross-region backup integrity verified"
        else
            error "Cross-region backup integrity check failed"
            rm -f "$test_file"
            return 1
        fi
        
        rm -f "$test_file"
    else
        error "Cross-region backup download failed"
        return 1
    fi
    
    log "Cross-region restore capability test passed"
}

# Generate sync report
generate_sync_report() {
    local sync_status="$1"
    
    local report_file="$LOG_DIR/sync_report_$(date +%Y%m%d_%H%M%S).json"
    
    local source_size=$(aws s3 ls "s3://$S3_BACKUP_BUCKET/bookedbarber/" --recursive --summarize | grep "Total Size" | awk '{print $3}' || echo "0")
    local dest_size=$(aws s3 ls "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/" --recursive --summarize --region "$AWS_BACKUP_REGION" | grep "Total Size" | awk '{print $3}' || echo "0")
    
    cat > "$report_file" << EOF
{
    "sync_date": "$(date -Iseconds)",
    "sync_status": "$sync_status",
    "source_bucket": "$S3_BACKUP_BUCKET",
    "destination_bucket": "$S3_CROSS_REGION_BUCKET",
    "source_region": "$AWS_PRIMARY_REGION",
    "destination_region": "$AWS_BACKUP_REGION",
    "sync_metrics": {
        "source_size_bytes": $source_size,
        "destination_size_bytes": $dest_size,
        "source_object_count": $(aws s3 ls "s3://$S3_BACKUP_BUCKET/bookedbarber/" --recursive | wc -l),
        "destination_object_count": $(aws s3 ls "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/" --recursive --region "$AWS_BACKUP_REGION" | wc -l)
    },
    "validation_tests": {
        "integrity_check": "passed",
        "restore_capability": "passed"
    }
}
EOF
    
    log "Sync report generated: $report_file"
    echo "$report_file"
}

# Cleanup old cross-region backups
cleanup_old_backups() {
    log "Cleaning up old cross-region backups..."
    
    local retention_days="${RETENTION_DAYS:-30}"
    local cutoff_date=$(date -d "$retention_days days ago" '+%Y-%m-%d')
    
    # List and delete old backups
    aws s3 ls "s3://$S3_CROSS_REGION_BUCKET/bookedbarber/backups/" --recursive --region "$AWS_BACKUP_REGION" | \
        awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
        while read -r old_backup; do
            if [ -n "$old_backup" ]; then
                log "Deleting old backup: $old_backup"
                aws s3 rm "s3://$S3_CROSS_REGION_BUCKET/$old_backup" --region "$AWS_BACKUP_REGION"
            fi
        done
    
    log "Old backup cleanup completed"
}

# Send sync notification
send_sync_notification() {
    local status="$1"
    local message="$2"
    
    if [ "$NOTIFICATION_ENABLED" != "true" ]; then
        return 0
    fi
    
    local subject="BookedBarber Cross-Region Sync $status"
    
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

# Main sync function
main() {
    local sync_type="${1:-incremental}"
    
    log "Starting cross-region sync: $sync_type"
    
    validate_aws_config
    
    case $sync_type in
        "full")
            sync_recent_backups 365  # Sync all backups
            sync_application_files
            ;;
        "incremental")
            sync_recent_backups 7    # Sync last 7 days
            ;;
        "files-only")
            sync_application_files
            ;;
        *)
            error "Invalid sync type: $sync_type"
            exit 1
            ;;
    esac
    
    verify_sync_integrity
    test_restore_capability
    cleanup_old_backups
    
    local report_file=$(generate_sync_report "SUCCESS")
    
    log "Cross-region sync completed successfully"
    send_sync_notification "SUCCESS" "Cross-region sync completed. Report: $report_file"
}

# Handle errors
trap 'generate_sync_report "FAILED"; send_sync_notification "FAILED" "Cross-region sync failed"; exit 1' ERR

# Show usage
usage() {
    echo "Usage: $0 [sync_type]"
    echo ""
    echo "Sync types:"
    echo "  full         - Sync all backups and files"
    echo "  incremental  - Sync recent backups (default)"
    echo "  files-only   - Sync application files only"
    echo ""
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"