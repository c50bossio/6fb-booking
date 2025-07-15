#!/bin/bash

# Database Migration Safety Check Script
# Usage: ./migration-safety-check.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-staging}
NAMESPACE="bookedbarber-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if migration job is needed
check_migration_needed() {
    log "Checking if database migrations are needed..."
    
    # Get current database schema version
    CURRENT_VERSION=$(kubectl run migration-check --rm -i --restart=Never \
        --image=ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${GITHUB_SHA} \
        -n "$NAMESPACE" -- python -c "
import alembic.config
import alembic.script
import alembic.runtime.environment
from sqlalchemy import create_engine
import os

engine = create_engine(os.environ['DATABASE_URL'])
config = alembic.config.Config('alembic.ini')
script = alembic.script.ScriptDirectory.from_config(config)

with engine.connect() as connection:
    context = alembic.runtime.environment.EnvironmentContext(
        config,
        script,
        fn=lambda rev, context: None
    )
    context.configure(connection=connection)
    current_head = context.get_current_revision()
    print(current_head or 'None')
")
    
    # Get target schema version
    TARGET_VERSION=$(kubectl run migration-target-check --rm -i --restart=Never \
        --image=ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${GITHUB_SHA} \
        -n "$NAMESPACE" -- python -c "
import alembic.config
import alembic.script

config = alembic.config.Config('alembic.ini')
script = alembic.script.ScriptDirectory.from_config(config)
head_revision = script.get_current_head()
print(head_revision or 'None')
")
    
    log "Current database version: $CURRENT_VERSION"
    log "Target database version: $TARGET_VERSION"
    
    if [ "$CURRENT_VERSION" == "$TARGET_VERSION" ]; then
        log "No migrations needed"
        return 1
    else
        log "Migrations needed: $CURRENT_VERSION -> $TARGET_VERSION"
        return 0
    fi
}

# Analyze migration safety
analyze_migration_safety() {
    log "Analyzing migration safety..."
    
    # Get list of pending migrations
    PENDING_MIGRATIONS=$(kubectl run migration-analysis --rm -i --restart=Never \
        --image=ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${GITHUB_SHA} \
        -n "$NAMESPACE" -- python -c "
import alembic.config
import alembic.script
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine
import os

engine = create_engine(os.environ['DATABASE_URL'])
config = alembic.config.Config('alembic.ini')
script = alembic.script.ScriptDirectory.from_config(config)

with engine.connect() as connection:
    context = MigrationContext.configure(connection)
    current_head = context.get_current_head()
    
    for revision in script.walk_revisions():
        if revision.revision == current_head:
            break
        print(f'{revision.revision}:{revision.doc}')
")
    
    # Analyze each migration for safety
    RISKY_OPERATIONS=()
    
    while IFS= read -r migration; do
        if [ -n "$migration" ]; then
            REVISION=$(echo "$migration" | cut -d':' -f1)
            DESCRIPTION=$(echo "$migration" | cut -d':' -f2-)
            
            log "Analyzing migration $REVISION: $DESCRIPTION"
            
            # Check for risky operations in migration content
            MIGRATION_CONTENT=$(kubectl run migration-content-check --rm -i --restart=Never \
                --image=ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${GITHUB_SHA} \
                -n "$NAMESPACE" -- python -c "
import alembic.config
import alembic.script

config = alembic.config.Config('alembic.ini')
script = alembic.script.ScriptDirectory.from_config(config)
revision = script.get_revision('$REVISION')

if revision:
    with open(revision.path, 'r') as f:
        print(f.read())
")
            
            # Check for risky patterns
            if echo "$MIGRATION_CONTENT" | grep -iE "(drop table|drop column|alter column.*not null|add constraint.*not null)" > /dev/null; then
                warning "RISKY: Migration $REVISION contains potentially destructive operations"
                RISKY_OPERATIONS+=("$REVISION:$DESCRIPTION")
            fi
            
            if echo "$MIGRATION_CONTENT" | grep -iE "(create index|drop index)" > /dev/null; then
                log "INFO: Migration $REVISION contains index operations (may cause locks)"
            fi
        fi
    done <<< "$PENDING_MIGRATIONS"
    
    # Report risky operations
    if [ ${#RISKY_OPERATIONS[@]} -gt 0 ]; then
        warning "Found ${#RISKY_OPERATIONS[@]} potentially risky migration(s):"
        for risky in "${RISKY_OPERATIONS[@]}"; do
            warning "  - $risky"
        done
        
        if [ "$ENVIRONMENT" == "production" ]; then
            error "Cannot proceed with risky migrations in production without manual approval"
        else
            warning "Proceeding with risky migrations in $ENVIRONMENT environment"
        fi
    fi
    
    success "Migration safety analysis completed"
}

# Create database backup before migration
create_backup() {
    log "Creating database backup before migration..."
    
    BACKUP_NAME="pre-migration-$(date +%Y%m%d-%H%M%S)"
    
    # Create backup job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-backup-${BACKUP_NAME}
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
      - name: backup
        image: postgres:15-alpine
        command:
        - /bin/bash
        - -c
        - |
          pg_dump "\$DATABASE_URL" | gzip > /backup/${BACKUP_NAME}.sql.gz
          echo "Backup completed: ${BACKUP_NAME}.sql.gz"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: database-url
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: database-backups
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    # Wait for backup to complete
    log "Waiting for backup to complete..."
    kubectl wait --for=condition=complete job/db-backup-${BACKUP_NAME} -n "$NAMESPACE" --timeout=600s
    
    # Verify backup was created
    if kubectl logs job/db-backup-${BACKUP_NAME} -n "$NAMESPACE" | grep "Backup completed" > /dev/null; then
        success "Database backup created: ${BACKUP_NAME}.sql.gz"
        echo "$BACKUP_NAME" > /tmp/backup_name
    else
        error "Database backup failed"
    fi
    
    # Cleanup backup job
    kubectl delete job db-backup-${BACKUP_NAME} -n "$NAMESPACE"
}

# Run migrations with monitoring
run_migrations() {
    log "Running database migrations..."
    
    # Create migration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%Y%m%d-%H%M%S)
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
      - name: migration
        image: ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${GITHUB_SHA}
        command:
        - /bin/bash
        - -c
        - |
          echo "Starting database migration..."
          alembic upgrade head
          echo "Migration completed successfully"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: database-url
        - name: ENVIRONMENT
          value: "${ENVIRONMENT}"
      restartPolicy: Never
  backoffLimit: 1
EOF
    
    # Get the job name
    MIGRATION_JOB=$(kubectl get jobs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp -o name | tail -1)
    
    # Monitor migration progress
    log "Monitoring migration progress..."
    kubectl wait --for=condition=complete "$MIGRATION_JOB" -n "$NAMESPACE" --timeout=600s || {
        error "Migration timed out or failed"
    }
    
    # Check migration status
    if kubectl get "$MIGRATION_JOB" -n "$NAMESPACE" -o jsonpath='{.status.conditions[0].type}' | grep -q "Complete"; then
        success "Database migration completed successfully"
    else
        error "Database migration failed"
    fi
    
    # Show migration logs
    log "Migration logs:"
    kubectl logs "$MIGRATION_JOB" -n "$NAMESPACE"
    
    # Cleanup migration job
    kubectl delete "$MIGRATION_JOB" -n "$NAMESPACE"
}

# Verify database integrity after migration
verify_database_integrity() {
    log "Verifying database integrity after migration..."
    
    # Run basic connectivity and integrity checks
    kubectl run db-integrity-check --rm -i --restart=Never \
        --image=ghcr.io/${GITHUB_REPOSITORY}/backend-v2:${GITHUB_SHA} \
        -n "$NAMESPACE" -- python -c "
import os
from sqlalchemy import create_engine, text
import sys

try:
    engine = create_engine(os.environ['DATABASE_URL'])
    with engine.connect() as conn:
        # Check basic connectivity
        result = conn.execute(text('SELECT 1'))
        assert result.fetchone()[0] == 1
        
        # Check key tables exist
        tables = ['users', 'appointments', 'barbers', 'services']
        for table in tables:
            result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
            count = result.fetchone()[0]
            print(f'Table {table}: {count} rows')
        
        print('Database integrity check passed')
        
except Exception as e:
    print(f'Database integrity check failed: {e}')
    sys.exit(1)
"
    
    success "Database integrity verification completed"
}

# Rollback migration if needed
rollback_migration() {
    if [ -f /tmp/backup_name ]; then
        BACKUP_NAME=$(cat /tmp/backup_name)
        warning "Rolling back to backup: $BACKUP_NAME"
        
        # Create rollback job
        kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-rollback-$(date +%Y%m%d-%H%M%S)
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
      - name: rollback
        image: postgres:15-alpine
        command:
        - /bin/bash
        - -c
        - |
          echo "Rolling back database from backup..."
          gunzip -c /backup/${BACKUP_NAME}.sql.gz | psql "\$DATABASE_URL"
          echo "Rollback completed"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bookedbarber-secrets
              key: database-url
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: database-backups
      restartPolicy: Never
  backoffLimit: 1
EOF
        
        ROLLBACK_JOB=$(kubectl get jobs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp -o name | tail -1)
        kubectl wait --for=condition=complete "$ROLLBACK_JOB" -n "$NAMESPACE" --timeout=600s
        kubectl delete "$ROLLBACK_JOB" -n "$NAMESPACE"
        
        error "Database rolled back to pre-migration state"
    else
        error "No backup available for rollback"
    fi
}

# Main execution
main() {
    trap rollback_migration ERR
    
    log "Starting database migration safety check for environment: $ENVIRONMENT"
    
    if check_migration_needed; then
        analyze_migration_safety
        create_backup
        run_migrations
        verify_database_integrity
        
        success "Database migration completed successfully!"
    else
        success "No database migrations needed"
    fi
    
    # Cleanup temp files
    rm -f /tmp/backup_name
}

# Run main function
main "$@"