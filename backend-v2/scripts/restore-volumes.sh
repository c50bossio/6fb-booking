#!/bin/bash
# =============================================================================
# Docker Volume Restoration Script
# =============================================================================
# 🔄 Restore Docker volumes from encrypted backups
# 🎯 Selective volume restoration with validation
# 🛡️ Safety checks and confirmation prompts
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_BASE_DIR="/Users/bossio/6fb-booking/backend-v2/backups/volumes"
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
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

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <volume_name> [backup_file]

Restore Docker volumes from backups

OPTIONS:
    -l, --list          List available backups
    -f, --force         Skip confirmation prompts
    -h, --help          Show this help message
    
ARGUMENTS:
    volume_name         Name of the volume to restore
    backup_file         Specific backup file (optional, uses latest if not specified)

EXAMPLES:
    $0 -l                                   # List all available backups
    $0 backend-v2_postgres_data             # Restore latest backup
    $0 backend-v2_redis_data backup_20240730_143022.tar.gz    # Restore specific backup

EOF
}

# List available backups
list_backups() {
    log "Available volume backups:"
    
    if [[ ! -d "${BACKUP_BASE_DIR}" ]]; then
        warning "No backup directory found: ${BACKUP_BASE_DIR}"
        return 1
    fi
    
    for volume_dir in "${BACKUP_BASE_DIR}"/*/; do
        if [[ -d "${volume_dir}" ]]; then
            volume_name=$(basename "${volume_dir}")
            log "📦 Volume: ${volume_name}"
            
            # List backup files
            find "${volume_dir}" -name "backup_*.tar.gz*" -type f | sort -r | head -5 | while read -r backup_file; do
                backup_name=$(basename "${backup_file}")
                backup_size=$(du -h "${backup_file}" | cut -f1)
                backup_date=$(echo "${backup_name}" | grep -o '[0-9]\{8\}_[0-9]\{6\}' | sed 's/_/ /' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
                echo "    └── ${backup_name} (${backup_size}) - ${backup_date}"
            done
            echo
        fi
    done
}

# Confirm restoration
confirm_restore() {
    local volume_name="$1"
    local backup_file="$2"
    
    warning "This will COMPLETELY REPLACE the contents of volume: ${volume_name}"
    warning "Current data will be PERMANENTLY LOST!"
    echo
    log "Backup file: ${backup_file}"
    echo
    
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restoration cancelled by user"
        exit 0
    fi
}

# Restore volume function
restore_volume() {
    local volume_name="$1"
    local backup_file="$2"
    local force_restore="${3:-false}"
    
    log "Starting restoration of volume: ${volume_name}"
    
    # Check if volume exists
    if ! docker volume inspect "${volume_name}" >/dev/null 2>&1; then
        log "Volume ${volume_name} does not exist. Creating it..."
        docker volume create "${volume_name}"
    fi
    
    # Stop containers using this volume (with confirmation)
    log "Checking for containers using volume: ${volume_name}"
    CONTAINERS=$(docker ps -q --filter volume="${volume_name}" || true)
    
    if [[ -n "${CONTAINERS}" ]]; then
        warning "The following containers are using this volume:"
        docker ps --filter volume="${volume_name}" --format "table {{.Names}}\t{{.Status}}"
        
        if [[ "${force_restore}" != "true" ]]; then
            read -p "Stop these containers? (yes/no): " -r
            if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                error "Cannot restore volume while containers are using it"
                exit 1
            fi
        fi
        
        log "Stopping containers..."
        echo "${CONTAINERS}" | xargs -r docker stop
        success "Containers stopped"
    fi
    
    # Prepare backup file
    local restore_file="${backup_file}"
    
    # Check if backup is encrypted
    if [[ "${backup_file}" == *.gpg ]]; then
        if [[ -z "${ENCRYPTION_KEY}" ]]; then
            error "Backup is encrypted but no encryption key provided"
            error "Set BACKUP_ENCRYPTION_KEY environment variable"
            exit 1
        fi
        
        log "Decrypting backup file..."
        restore_file="${backup_file%.gpg}"
        
        if ! echo "${ENCRYPTION_KEY}" | gpg \
            --batch \
            --yes \
            --decrypt \
            --passphrase-fd 0 \
            --output "${restore_file}" \
            "${backup_file}"; then
            error "Failed to decrypt backup file"
            exit 1
        fi
        
        success "Backup decrypted successfully"
    fi
    
    # Verify backup file
    log "Verifying backup file integrity..."
    if ! tar -tzf "${restore_file}" >/dev/null 2>&1; then
        error "Backup file is corrupted or invalid: ${restore_file}"
        # Cleanup decrypted file if it was created
        [[ "${restore_file}" != "${backup_file}" ]] && rm -f "${restore_file}"
        exit 1
    fi
    success "Backup file verified successfully"
    
    # Perform restoration
    log "Restoring volume data..."
    if docker run --rm \
        -v "${volume_name}:/target" \
        -v "$(dirname "${restore_file}"):/backup:ro" \
        alpine:latest \
        sh -c "cd /target && rm -rf ./* && tar xzf /backup/$(basename "${restore_file}")"; then
        
        success "Volume restoration completed successfully"
        
        # Cleanup decrypted file if it was created
        [[ "${restore_file}" != "${backup_file}" ]] && rm -f "${restore_file}"
        
        # Restart containers if they were stopped
        if [[ -n "${CONTAINERS}" ]]; then
            log "Restarting containers..."
            echo "${CONTAINERS}" | xargs -r docker start
            success "Containers restarted"
        fi
        
    else
        error "Failed to restore volume: ${volume_name}"
        # Cleanup decrypted file if it was created
        [[ "${restore_file}" != "${backup_file}" ]] && rm -f "${restore_file}"
        exit 1
    fi
}

# Parse command line arguments
FORCE_RESTORE=false
LIST_BACKUPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--list)
            LIST_BACKUPS=true
            shift
            ;;
        -f|--force)
            FORCE_RESTORE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

# Handle list backups
if [[ "${LIST_BACKUPS}" == "true" ]]; then
    list_backups
    exit 0
fi

# Check arguments
if [[ $# -lt 1 ]]; then
    error "Volume name is required"
    usage
    exit 1
fi

VOLUME_NAME="$1"
BACKUP_FILE="${2:-latest}"

# Determine backup file path
VOLUME_BACKUP_DIR="${BACKUP_BASE_DIR}/${VOLUME_NAME}"

if [[ ! -d "${VOLUME_BACKUP_DIR}" ]]; then
    error "No backups found for volume: ${VOLUME_NAME}"
    log "Available volumes:"
    ls -1 "${BACKUP_BASE_DIR}" 2>/dev/null || echo "  No backups available"
    exit 1
fi

# Use latest backup if not specified
if [[ "${BACKUP_FILE}" == "latest" ]]; then
    if [[ -L "${VOLUME_BACKUP_DIR}/latest.tar.gz" ]]; then
        BACKUP_FILE="${VOLUME_BACKUP_DIR}/latest.tar.gz"
    elif [[ -L "${VOLUME_BACKUP_DIR}/latest.tar.gz.gpg" ]]; then
        BACKUP_FILE="${VOLUME_BACKUP_DIR}/latest.tar.gz.gpg"
    else
        # Find most recent backup
        BACKUP_FILE=$(find "${VOLUME_BACKUP_DIR}" -name "backup_*.tar.gz*" -type f | sort -r | head -1)
    fi
    
    if [[ -z "${BACKUP_FILE}" ]]; then
        error "No backup files found for volume: ${VOLUME_NAME}"
        exit 1
    fi
else
    # Use specified backup file
    if [[ ! -f "${VOLUME_BACKUP_DIR}/${BACKUP_FILE}" ]]; then
        error "Backup file not found: ${VOLUME_BACKUP_DIR}/${BACKUP_FILE}"
        exit 1
    fi
    BACKUP_FILE="${VOLUME_BACKUP_DIR}/${BACKUP_FILE}"
fi

# Confirm restoration unless forced
if [[ "${FORCE_RESTORE}" != "true" ]]; then
    confirm_restore "${VOLUME_NAME}" "${BACKUP_FILE}"
fi

# Perform restoration
restore_volume "${VOLUME_NAME}" "${BACKUP_FILE}" "${FORCE_RESTORE}"

success "Volume restoration process completed successfully!"