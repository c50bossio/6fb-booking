#!/bin/bash

# BookedBarber V2 Domain Backup and Restore Script
# Backs up and restores domain configurations, DNS records, and SSL certificates

set -e

# Configuration
BACKUP_DIR="/var/backups/bookedbarber-domains"
NGINX_DIR="/etc/nginx"
SSL_DIR="/etc/letsencrypt"
CONFIG_DIR="/Users/bossio/6fb-booking/domains"
RETENTION_DAYS=30

# Remote backup configuration
REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"
S3_BUCKET="${S3_BUCKET:-}"
RSYNC_HOST="${RSYNC_HOST:-}"
RSYNC_PATH="${RSYNC_PATH:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
LOG_FILE="/var/log/domain-backup.log"
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to create backup directory
setup_backup_dir() {
    sudo mkdir -p "$BACKUP_DIR"
    sudo chmod 755 "$BACKUP_DIR"
    log "Backup directory created: $BACKUP_DIR"
}

# Function to backup nginx configuration
backup_nginx() {
    local backup_path="$1/nginx"
    
    log "Backing up nginx configuration..."
    
    sudo mkdir -p "$backup_path"
    
    # Backup main nginx config
    if [ -f "$NGINX_DIR/nginx.conf" ]; then
        sudo cp "$NGINX_DIR/nginx.conf" "$backup_path/"
        log "✓ Backed up nginx.conf"
    fi
    
    # Backup sites-available
    if [ -d "$NGINX_DIR/sites-available" ]; then
        sudo cp -r "$NGINX_DIR/sites-available" "$backup_path/"
        log "✓ Backed up sites-available"
    fi
    
    # Backup sites-enabled
    if [ -d "$NGINX_DIR/sites-enabled" ]; then
        sudo cp -r "$NGINX_DIR/sites-enabled" "$backup_path/"
        log "✓ Backed up sites-enabled"
    fi
    
    # Backup SSL params
    if [ -f "$NGINX_DIR/ssl-params.conf" ]; then
        sudo cp "$NGINX_DIR/ssl-params.conf" "$backup_path/"
        log "✓ Backed up ssl-params.conf"
    fi
    
    # Backup password files
    sudo find "$NGINX_DIR" -name ".htpasswd*" -exec cp {} "$backup_path/" \; 2>/dev/null || true
    
    log "Nginx backup completed"
}

# Function to backup SSL certificates
backup_ssl() {
    local backup_path="$1/ssl"
    
    log "Backing up SSL certificates..."
    
    sudo mkdir -p "$backup_path"
    
    if [ -d "$SSL_DIR" ]; then
        # Backup entire letsencrypt directory
        sudo cp -r "$SSL_DIR"/* "$backup_path/" 2>/dev/null || true
        log "✓ Backed up SSL certificates"
    else
        log "No SSL certificates found"
    fi
    
    # Backup Diffie-Hellman parameters
    if [ -f "/etc/ssl/certs/dhparam.pem" ]; then
        sudo cp "/etc/ssl/certs/dhparam.pem" "$backup_path/"
        log "✓ Backed up Diffie-Hellman parameters"
    fi
    
    log "SSL backup completed"
}

# Function to backup domain configurations
backup_domain_configs() {
    local backup_path="$1/domain-configs"
    
    log "Backing up domain configurations..."
    
    mkdir -p "$backup_path"
    
    if [ -d "$CONFIG_DIR" ]; then
        cp -r "$CONFIG_DIR"/* "$backup_path/"
        log "✓ Backed up domain configurations"
    else
        log "No domain configurations found"
    fi
    
    log "Domain configurations backup completed"
}

# Function to backup DNS records
backup_dns() {
    local backup_path="$1/dns"
    
    log "Backing up DNS records..."
    
    mkdir -p "$backup_path"
    
    # Backup CloudFlare DNS (if configured)
    if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ]; then
        log "Backing up CloudFlare DNS records..."
        
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" > "$backup_path/cloudflare-dns.json"
        
        if [ $? -eq 0 ]; then
            log "✓ Backed up CloudFlare DNS records"
        else
            log "✗ Failed to backup CloudFlare DNS records"
        fi
    fi
    
    # Backup Route53 DNS (if configured)
    if [ -n "$AWS_HOSTED_ZONE_ID" ] && command -v aws &> /dev/null; then
        log "Backing up Route53 DNS records..."
        
        aws route53 list-resource-record-sets \
            --hosted-zone-id "$AWS_HOSTED_ZONE_ID" \
            --output json > "$backup_path/route53-dns.json" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log "✓ Backed up Route53 DNS records"
        else
            log "✗ Failed to backup Route53 DNS records"
        fi
    fi
    
    # Backup current DNS resolution
    local domains=("bookedbarber.com" "www.bookedbarber.com" "api.bookedbarber.com" "app.bookedbarber.com" "admin.bookedbarber.com")
    
    for domain in "${domains[@]}"; do
        dig "$domain" > "$backup_path/dig-$domain.txt" 2>/dev/null || true
    done
    
    log "DNS backup completed"
}

# Function to backup system state
backup_system_state() {
    local backup_path="$1/system"
    
    log "Backing up system state..."
    
    mkdir -p "$backup_path"
    
    # Backup systemd services
    systemctl list-units --type=service --state=running | grep -E "(nginx|fail2ban)" > "$backup_path/services.txt" 2>/dev/null || true
    
    # Backup crontab
    crontab -l > "$backup_path/crontab.txt" 2>/dev/null || true
    
    # Backup firewall rules
    if command -v ufw &> /dev/null; then
        sudo ufw status verbose > "$backup_path/ufw.txt" 2>/dev/null || true
    fi
    
    if command -v iptables &> /dev/null; then
        sudo iptables -L -n > "$backup_path/iptables.txt" 2>/dev/null || true
    fi
    
    # Backup package list
    if command -v dpkg &> /dev/null; then
        dpkg -l > "$backup_path/packages-dpkg.txt" 2>/dev/null || true
    fi
    
    if command -v rpm &> /dev/null; then
        rpm -qa > "$backup_path/packages-rpm.txt" 2>/dev/null || true
    fi
    
    log "System state backup completed"
}

# Function to create backup metadata
create_backup_metadata() {
    local backup_path="$1"
    
    cat > "$backup_path/metadata.json" << EOF
{
    "backup_date": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "backup_type": "full",
    "bookedbarber_version": "v2",
    "nginx_version": "$(nginx -v 2>&1 | grep -o '[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+')",
    "openssl_version": "$(openssl version | awk '{print $2}')",
    "os_release": "$(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')",
    "backup_size": "$(du -sh "$backup_path" | cut -f1)",
    "files_count": $(find "$backup_path" -type f | wc -l),
    "primary_server": "$PRIMARY_SERVER",
    "backup_server": "$BACKUP_SERVER",
    "domains": [
        "bookedbarber.com",
        "www.bookedbarber.com",
        "api.bookedbarber.com",
        "app.bookedbarber.com",
        "admin.bookedbarber.com"
    ]
}
EOF

    log "Backup metadata created"
}

# Function to compress backup
compress_backup() {
    local backup_path="$1"
    local backup_name=$(basename "$backup_path")
    local backup_dir=$(dirname "$backup_path")
    
    log "Compressing backup..."
    
    cd "$backup_dir"
    tar -czf "$backup_name.tar.gz" "$backup_name"
    
    if [ $? -eq 0 ]; then
        local original_size=$(du -sh "$backup_name" | cut -f1)
        local compressed_size=$(du -sh "$backup_name.tar.gz" | cut -f1)
        
        log "✓ Backup compressed: $original_size -> $compressed_size"
        
        # Remove uncompressed backup
        rm -rf "$backup_name"
        
        echo "$backup_dir/$backup_name.tar.gz"
    else
        log "✗ Failed to compress backup"
        return 1
    fi
}

# Function to upload to remote storage
upload_to_remote() {
    local backup_file="$1"
    
    if [ "$REMOTE_BACKUP_ENABLED" = "true" ]; then
        log "Uploading backup to remote storage..."
        
        if [ -n "$S3_BUCKET" ]; then
            log "Uploading to S3: $S3_BUCKET"
            aws s3 cp "$backup_file" "s3://$S3_BUCKET/domain-backups/" 2>/dev/null
            if [ $? -eq 0 ]; then
                log "✓ Uploaded to S3"
            else
                log "✗ Failed to upload to S3"
            fi
        fi
        
        if [ -n "$RSYNC_HOST" ] && [ -n "$RSYNC_PATH" ]; then
            log "Uploading via rsync: $RSYNC_HOST:$RSYNC_PATH"
            rsync -avz "$backup_file" "$RSYNC_HOST:$RSYNC_PATH/" 2>/dev/null
            if [ $? -eq 0 ]; then
                log "✓ Uploaded via rsync"
            else
                log "✗ Failed to upload via rsync"
            fi
        fi
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    local remaining=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" | wc -l)
    log "Cleanup completed. $remaining backup(s) remaining"
}

# Function to create full backup
create_backup() {
    local backup_timestamp=$(date '+%Y%m%d-%H%M%S')
    local backup_path="$BACKUP_DIR/backup-$backup_timestamp"
    
    log "Starting full backup: $backup_timestamp"
    
    # Setup backup directory
    setup_backup_dir
    mkdir -p "$backup_path"
    
    # Perform backups
    backup_nginx "$backup_path"
    backup_ssl "$backup_path"
    backup_domain_configs "$backup_path"
    backup_dns "$backup_path"
    backup_system_state "$backup_path"
    
    # Create metadata
    create_backup_metadata "$backup_path"
    
    # Compress backup
    local compressed_backup=$(compress_backup "$backup_path")
    
    if [ $? -eq 0 ]; then
        log "Backup created successfully: $compressed_backup"
        
        # Upload to remote storage
        upload_to_remote "$compressed_backup"
        
        # Cleanup old backups
        cleanup_old_backups
        
        return 0
    else
        log "Backup failed"
        return 1
    fi
}

# Function to list available backups
list_backups() {
    echo -e "${BLUE}Available Backups${NC}"
    echo "=================="
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backup directory found"
        return 1
    fi
    
    local backups=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f | sort -r)
    
    if [ -z "$backups" ]; then
        echo "No backups found"
        return 1
    fi
    
    echo "$backups" | while read -r backup; do
        local backup_name=$(basename "$backup")
        local backup_date=$(echo "$backup_name" | sed 's/backup-//; s/.tar.gz//')
        local backup_size=$(du -sh "$backup" | cut -f1)
        local backup_time=$(stat -c %y "$backup" | cut -d' ' -f1-2)
        
        echo "  $backup_name ($backup_size) - $backup_time"
    done
}

# Function to restore backup
restore_backup() {
    local backup_name="$1"
    local backup_file="$BACKUP_DIR/$backup_name"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Backup file not found: $backup_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}WARNING: This will restore configuration from backup and may overwrite current settings!${NC}"
    echo "Backup: $backup_name"
    echo ""
    read -p "Continue with restore? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled"
        return 0
    fi
    
    log "Starting restore from: $backup_name"
    
    # Create temporary restore directory
    local temp_dir="/tmp/restore-$(date +%s)"
    mkdir -p "$temp_dir"
    
    # Extract backup
    log "Extracting backup..."
    tar -xzf "$backup_file" -C "$temp_dir"
    
    local extracted_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "backup-*" | head -n1)
    
    if [ ! -d "$extracted_dir" ]; then
        log "Failed to extract backup"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Restore nginx configuration
    if [ -d "$extracted_dir/nginx" ]; then
        log "Restoring nginx configuration..."
        
        # Backup current config
        sudo cp -r "$NGINX_DIR" "$NGINX_DIR.backup.$(date +%s)" 2>/dev/null || true
        
        # Restore nginx config
        sudo cp "$extracted_dir/nginx/nginx.conf" "$NGINX_DIR/" 2>/dev/null || true
        sudo cp -r "$extracted_dir/nginx/sites-available" "$NGINX_DIR/" 2>/dev/null || true
        sudo cp -r "$extracted_dir/nginx/sites-enabled" "$NGINX_DIR/" 2>/dev/null || true
        sudo cp "$extracted_dir/nginx/ssl-params.conf" "$NGINX_DIR/" 2>/dev/null || true
        
        # Test nginx configuration
        if sudo nginx -t 2>/dev/null; then
            log "✓ Nginx configuration restored and tested"
        else
            log "✗ Nginx configuration test failed - review manually"
        fi
    fi
    
    # Restore SSL certificates
    if [ -d "$extracted_dir/ssl" ]; then
        log "Restoring SSL certificates..."
        
        # Backup current certs
        sudo cp -r "$SSL_DIR" "$SSL_DIR.backup.$(date +%s)" 2>/dev/null || true
        
        # Restore certificates
        sudo cp -r "$extracted_dir/ssl"/* "$SSL_DIR/" 2>/dev/null || true
        
        log "✓ SSL certificates restored"
    fi
    
    # Restore domain configurations
    if [ -d "$extracted_dir/domain-configs" ]; then
        log "Restoring domain configurations..."
        
        cp -r "$extracted_dir/domain-configs"/* "$CONFIG_DIR/" 2>/dev/null || true
        
        log "✓ Domain configurations restored"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log "Restore completed successfully"
    
    echo ""
    echo -e "${GREEN}Restore completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test nginx configuration: sudo nginx -t"
    echo "2. Reload nginx: sudo systemctl reload nginx"
    echo "3. Test all domains and SSL certificates"
    echo "4. Review and update any environment-specific settings"
}

# Function to show backup details
show_backup_details() {
    local backup_name="$1"
    local backup_file="$BACKUP_DIR/$backup_name"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Backup file not found: $backup_file${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Backup Details: $backup_name${NC}"
    echo "============================"
    
    # Extract and show metadata
    local temp_dir="/tmp/backup-details-$(date +%s)"
    mkdir -p "$temp_dir"
    
    tar -xzf "$backup_file" -C "$temp_dir" --wildcards "*/metadata.json" 2>/dev/null
    
    local metadata_file=$(find "$temp_dir" -name "metadata.json" | head -n1)
    
    if [ -f "$metadata_file" ]; then
        echo "Backup Date: $(jq -r '.backup_date' "$metadata_file")"
        echo "Hostname: $(jq -r '.hostname' "$metadata_file")"
        echo "OS Release: $(jq -r '.os_release' "$metadata_file")"
        echo "Nginx Version: $(jq -r '.nginx_version' "$metadata_file")"
        echo "OpenSSL Version: $(jq -r '.openssl_version' "$metadata_file")"
        echo "Backup Size: $(jq -r '.backup_size' "$metadata_file")"
        echo "Files Count: $(jq -r '.files_count' "$metadata_file")"
        echo ""
        echo "Domains:"
        jq -r '.domains[]' "$metadata_file" | sed 's/^/  - /'
    else
        echo "No metadata found in backup"
    fi
    
    rm -rf "$temp_dir"
}

# Main function
main() {
    case "${1:-backup}" in
        "backup"|"create")
            create_backup
            ;;
        "list")
            list_backups
            ;;
        "restore")
            if [ -z "$2" ]; then
                echo "Usage: $0 restore <backup-name>"
                echo ""
                echo "Available backups:"
                list_backups | grep "backup-" | sed 's/^/  /'
                exit 1
            fi
            restore_backup "$2"
            ;;
        "details"|"info")
            if [ -z "$2" ]; then
                echo "Usage: $0 details <backup-name>"
                exit 1
            fi
            show_backup_details "$2"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "BookedBarber V2 Domain Backup and Restore"
            echo ""
            echo "Usage: $0 {backup|list|restore|details|cleanup}"
            echo ""
            echo "Commands:"
            echo "  backup              - Create full backup (default)"
            echo "  list                - List available backups"
            echo "  restore <name>      - Restore from backup"
            echo "  details <name>      - Show backup details"
            echo "  cleanup             - Remove old backups"
            echo ""
            echo "Environment variables:"
            echo "  REMOTE_BACKUP_ENABLED - Enable remote backup upload (true/false)"
            echo "  S3_BUCKET            - S3 bucket for remote backup"
            echo "  RSYNC_HOST           - Rsync host for remote backup"
            echo "  RSYNC_PATH           - Rsync path for remote backup"
            echo "  RETENTION_DAYS       - Backup retention period (default: 30)"
            exit 1
            ;;
    esac
}

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required${NC}"
    exit 1
fi

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"