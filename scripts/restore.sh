#!/bin/bash
# Restore script for 6FB Platform

set -e

# Configuration
BACKUP_DIR="/backup"

# Function to list available backups
list_backups() {
    echo "Available backups:"
    ls -la $BACKUP_DIR/*.gz | awk '{print NR")", $9, $5, $6, $7, $8}'
}

# Function to restore database
restore_database() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo "Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "Restoring database from $backup_file..."
    
    # Create temporary uncompressed file
    gunzip -c $backup_file > /tmp/restore.sql
    
    # Restore database
    PGPASSWORD=$POSTGRES_PASSWORD psql \
        -h $POSTGRES_HOST \
        -U $POSTGRES_USER \
        -d $POSTGRES_DB \
        < /tmp/restore.sql
    
    # Clean up
    rm /tmp/restore.sql
    
    echo "Database restored successfully"
}

# Function to restore uploads
restore_uploads() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo "Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "Restoring uploads from $backup_file..."
    
    # Extract uploads
    tar -xzf $backup_file -C /app/data/
    
    echo "Uploads restored successfully"
}

# Main script
case "$1" in
    list)
        list_backups
        ;;
    db)
        if [ -z "$2" ]; then
            echo "Usage: $0 db <backup_file>"
            exit 1
        fi
        restore_database "$2"
        ;;
    uploads)
        if [ -z "$2" ]; then
            echo "Usage: $0 uploads <backup_file>"
            exit 1
        fi
        restore_uploads "$2"
        ;;
    full)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 full <db_backup_file> <uploads_backup_file>"
            exit 1
        fi
        restore_database "$2"
        restore_uploads "$3"
        ;;
    *)
        echo "Usage: $0 {list|db|uploads|full} [backup_file(s)]"
        exit 1
        ;;
esac