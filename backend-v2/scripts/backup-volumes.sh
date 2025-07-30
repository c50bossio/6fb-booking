#!/bin/bash
# =============================================================================
# Docker Volume Backup Automation Script
# =============================================================================
# 💾 Comprehensive backup solution for all Docker volumes
# 🔄 Automated rotation and retention policies
# 🔒 Encrypted backups with compression
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_BASE_DIR="/Users/bossio/6fb-booking/backend-v2/backups/volumes"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Create backup directory
mkdir -p "${BACKUP_BASE_DIR}"

log "Starting Docker volume backup process..."

# Get list of all volumes for this project
VOLUMES=$(docker volume ls --filter name=backend-v2 --format "{{.Name}}")

if [[ -z "${VOLUMES}" ]]; then
    warning "No backend-v2 volumes found to backup"
    exit 0
fi

log "Found volumes to backup:"
echo "${VOLUMES}" | while read -r volume; do
    log "  - ${volume}"
done

# Backup each volume
BACKUP_SUMMARY=""
TOTAL_SIZE=0

for volume in ${VOLUMES}; do
    log "Backing up volume: ${volume}"
    
    # Create volume-specific backup directory
    VOLUME_BACKUP_DIR="${BACKUP_BASE_DIR}/${volume}"
    mkdir -p "${VOLUME_BACKUP_DIR}"
    
    # Backup filename
    BACKUP_FILE="${VOLUME_BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
    
    # Create backup using a temporary container
    if docker run --rm \
        -v "${volume}:/source:ro" \
        -v "${VOLUME_BACKUP_DIR}:/backup" \
        alpine:latest \
        sh -c "cd /source && tar czf /backup/backup_${TIMESTAMP}.tar.gz ." 2>/dev/null; then
        
        # Get backup size
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        BACKUP_SIZE_BYTES=$(du -b "${BACKUP_FILE}" | cut -f1)
        TOTAL_SIZE=$((TOTAL_SIZE + BACKUP_SIZE_BYTES))
        
        success "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
        
        # Encrypt backup if key provided
        if [[ -n "${ENCRYPTION_KEY}" ]]; then
            log "Encrypting backup..."
            if echo "${ENCRYPTION_KEY}" | gpg \
                --batch \
                --yes \
                --cipher-algo AES256 \
                --compress-algo 2 \
                --symmetric \
                --passphrase-fd 0 \
                --output "${BACKUP_FILE}.gpg" \
                "${BACKUP_FILE}"; then
                
                # Remove unencrypted file
                rm "${BACKUP_FILE}"
                BACKUP_FILE="${BACKUP_FILE}.gpg"
                success "Backup encrypted: ${BACKUP_FILE}"
            else
                error "Failed to encrypt backup for volume: ${volume}"
            fi
        fi
        
        # Create symlink to latest backup
        ln -sf "backup_${TIMESTAMP}.tar.gz$([ -n "${ENCRYPTION_KEY}" ] && echo ".gpg")" \
               "${VOLUME_BACKUP_DIR}/latest.tar.gz$([ -n "${ENCRYPTION_KEY}" ] && echo ".gpg")"
        
        # Add to summary
        BACKUP_SUMMARY="${BACKUP_SUMMARY}\n✅ ${volume}: ${BACKUP_SIZE}"
        
        # Cleanup old backups for this volume
        log "Cleaning up old backups for ${volume}..."
        find "${VOLUME_BACKUP_DIR}" -name "backup_*.tar.gz*" -type f -mtime +${RETENTION_DAYS} -delete
        
    else
        error "Failed to backup volume: ${volume}"
        BACKUP_SUMMARY="${BACKUP_SUMMARY}\n❌ ${volume}: FAILED"
    fi
done

# Convert total size to human readable
TOTAL_SIZE_HUMAN=$(numfmt --to=iec --suffix=B "${TOTAL_SIZE}")

log "Volume backup process completed"
log "Total backup size: ${TOTAL_SIZE_HUMAN}"

# Generate backup report
REPORT_FILE="${BACKUP_BASE_DIR}/backup_report_${TIMESTAMP}.json"
cat > "${REPORT_FILE}" << EOF
{
    "timestamp": "${TIMESTAMP}",
    "backup_type": "docker_volumes",
    "project": "backend-v2",
    "total_size_bytes": ${TOTAL_SIZE},
    "total_size_human": "${TOTAL_SIZE_HUMAN}",
    "encrypted": $([ -n "${ENCRYPTION_KEY}" ] && echo "true" || echo "false"),
    "retention_days": ${RETENTION_DAYS},
    "volumes_backed_up": [
$(echo "${VOLUMES}" | sed 's/^/        "/' | sed 's/$/",/' | sed '$ s/,$//')
    ],
    "backup_location": "${BACKUP_BASE_DIR}",
    "status": "completed"
}
EOF

success "Backup report generated: ${REPORT_FILE}"

# Display summary
log "=== BACKUP SUMMARY ==="
echo -e "${BACKUP_SUMMARY}"
log "======================="

# Optional: Send notification
if [[ -n "${BACKUP_WEBHOOK_URL:-}" ]]; then
    log "Sending backup notification..."
    if curl -X POST "${BACKUP_WEBHOOK_URL}" \
         -H "Content-Type: application/json" \
         -d @"${REPORT_FILE}" \
         --silent --show-error; then
        success "Backup notification sent successfully"
    else
        warning "Failed to send backup notification"
    fi
fi

success "Docker volume backup process completed successfully!"