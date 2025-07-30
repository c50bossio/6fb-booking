#!/bin/bash
# =============================================================================
# PostgreSQL Automated Backup Script
# =============================================================================
# 🔄 Creates compressed, encrypted backups with rotation
# 📅 Configurable retention policies
# 🔒 GPG encryption for sensitive data
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="postgres_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.gpg"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting PostgreSQL backup process..."

# Create database backup
log "Creating database dump..."
if ! pg_dump \
    --host="${PGHOST}" \
    --username="${PGUSER}" \
    --dbname="${PGDATABASE}" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --file="${BACKUP_DIR}/${BACKUP_FILE}"; then
    log "ERROR: Database backup failed"
    exit 1
fi

# Compress backup
log "Compressing backup..."
if ! gzip "${BACKUP_DIR}/${BACKUP_FILE}"; then
    log "ERROR: Backup compression failed"
    exit 1
fi

# Encrypt backup if encryption key is provided
if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
    log "Encrypting backup..."
    if ! echo "${BACKUP_ENCRYPTION_KEY}" | gpg \
        --batch \
        --yes \
        --cipher-algo AES256 \
        --compress-algo 2 \
        --symmetric \
        --passphrase-fd 0 \
        --output "${BACKUP_DIR}/${ENCRYPTED_FILE}" \
        "${BACKUP_DIR}/${COMPRESSED_FILE}"; then
        log "ERROR: Backup encryption failed"
        exit 1
    fi
    
    # Remove unencrypted file
    rm "${BACKUP_DIR}/${COMPRESSED_FILE}"
    FINAL_FILE="${ENCRYPTED_FILE}"
else
    FINAL_FILE="${COMPRESSED_FILE}"
fi

# Create symlink to latest backup
ln -sf "${FINAL_FILE}" "${BACKUP_DIR}/latest.sql.gz$([ -n "${BACKUP_ENCRYPTION_KEY:-}" ] && echo ".gpg")"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${FINAL_FILE}" | cut -f1)
log "Backup completed successfully: ${FINAL_FILE} (${BACKUP_SIZE})"

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "postgres_backup_*.sql.gz*" -type f -mtime +${RETENTION_DAYS} -delete

# Backup verification
log "Verifying backup integrity..."
if [[ "${FINAL_FILE}" == *.gpg ]]; then
    # Verify encrypted backup
    if echo "${BACKUP_ENCRYPTION_KEY}" | gpg --batch --yes --decrypt --passphrase-fd 0 "${BACKUP_DIR}/${FINAL_FILE}" | head -10 | grep -q "PostgreSQL database dump"; then
        log "✅ Backup verification successful"
    else
        log "❌ Backup verification failed"
        exit 1
    fi
else
    # Verify compressed backup
    if zcat "${BACKUP_DIR}/${FINAL_FILE}" | head -10 | grep -q "PostgreSQL database dump"; then
        log "✅ Backup verification successful"
    else
        log "❌ Backup verification failed"
        exit 1
    fi
fi

# Generate backup report
cat > "${BACKUP_DIR}/backup_report_${TIMESTAMP}.json" << EOF
{
    "timestamp": "${TIMESTAMP}",
    "backup_file": "${FINAL_FILE}",
    "backup_size": "${BACKUP_SIZE}",
    "database": "${PGDATABASE}",
    "host": "${PGHOST}",
    "encrypted": $([ -n "${BACKUP_ENCRYPTION_KEY:-}" ] && echo "true" || echo "false"),
    "retention_days": ${RETENTION_DAYS},
    "status": "success"
}
EOF

log "Backup process completed successfully"

# Optional: Send notification (webhook, email, etc.)
if [[ -n "${BACKUP_WEBHOOK_URL:-}" ]]; then
    curl -X POST "${BACKUP_WEBHOOK_URL}" \
         -H "Content-Type: application/json" \
         -d @"${BACKUP_DIR}/backup_report_${TIMESTAMP}.json" \
         --silent --show-error || log "Warning: Failed to send backup notification"
fi