#!/bin/bash
# Backup script for 6FB Platform

set -e

# Configuration
BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database backup
echo "Starting database backup..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h $POSTGRES_HOST \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Compress the backup
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Backup uploaded files (if any)
if [ -d "/app/data/uploads" ]; then
    echo "Backing up uploaded files..."
    tar -czf $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz -C /app/data uploads/
fi

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 cp $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz s3://$AWS_S3_BUCKET/backups/

    if [ -f "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" ]; then
        aws s3 cp $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz s3://$AWS_S3_BUCKET/backups/
    fi
fi

echo "Backup completed successfully at $(date)"
