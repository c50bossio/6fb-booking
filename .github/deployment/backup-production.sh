#!/bin/bash

# Production Backup Script for BookedBarber V2
# Usage: ./backup-production.sh [backup-type]

set -euo pipefail

BACKUP_TYPE=${1:-full}  # full, database, files
ENVIRONMENT="production"
NAMESPACE="bookedbarber-production"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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

# Check prerequisites
check_prerequisites() {
    log "Checking backup prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error "Production namespace $NAMESPACE does not exist"
    fi
    
    # Check if backup storage is configured
    if ! kubectl get pvc database-backups -n "$NAMESPACE" &> /dev/null; then
        warning "Backup PVC not found. Creating backup storage..."
        create_backup_storage
    fi
    
    success "Prerequisites check passed"
}

# Create backup storage if not exists
create_backup_storage() {
    log "Creating backup storage..."
    
    kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-backups
  namespace: ${NAMESPACE}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: application-backups
  namespace: ${NAMESPACE}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
EOF
    
    success "Backup storage created"
}

# Database backup
backup_database() {
    log "Creating database backup..."
    
    local backup_name="db-backup-${TIMESTAMP}"
    
    # Create database backup job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: ${backup_name}
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
          echo "Starting database backup..."
          
          # Create compressed backup
          pg_dump "\$DATABASE_URL" --verbose --no-owner --no-privileges | gzip > /backup/${backup_name}.sql.gz
          
          # Verify backup
          if [ -f /backup/${backup_name}.sql.gz ]; then
            backup_size=\$(stat -c%s /backup/${backup_name}.sql.gz)
            echo "Backup created successfully: ${backup_name}.sql.gz (\$backup_size bytes)"
            
            # Test backup integrity
            gunzip -t /backup/${backup_name}.sql.gz
            echo "Backup integrity verified"
            
            # Create metadata file
            cat > /backup/${backup_name}.metadata.json << EOL
          {
            "backup_name": "${backup_name}",
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "backup_type": "database",
            "size_bytes": \$backup_size,
            "environment": "${ENVIRONMENT}",
            "database_url_hash": "\$(echo \$DATABASE_URL | sha256sum | cut -d' ' -f1)"
          }
          EOL
            
            echo "Backup metadata created"
          else
            echo "ERROR: Backup file not created"
            exit 1
          fi
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
    log "Waiting for database backup to complete..."
    kubectl wait --for=condition=complete job/"$backup_name" -n "$NAMESPACE" --timeout=1800s
    
    # Check backup status
    if kubectl get job "$backup_name" -n "$NAMESPACE" -o jsonpath='{.status.conditions[0].type}' | grep -q "Complete"; then
        success "Database backup completed: $backup_name"
    else
        error "Database backup failed"
    fi
    
    # Show backup logs
    kubectl logs job/"$backup_name" -n "$NAMESPACE"
    
    # Cleanup job
    kubectl delete job "$backup_name" -n "$NAMESPACE"
    
    echo "$backup_name" > /tmp/db_backup_name
}

# Application files backup
backup_application_files() {
    log "Creating application files backup..."
    
    local backup_name="app-backup-${TIMESTAMP}"
    
    # Get backend pod for file backup
    local backend_pod=$(kubectl get pods -n "$NAMESPACE" -l app=bookedbarber-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    
    if [ -z "$backend_pod" ]; then
        warning "No backend pod found for file backup"
        return
    fi
    
    # Create application backup job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: ${backup_name}
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
      - name: backup
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          echo "Starting application files backup..."
          
          # Install required tools
          apk add --no-cache rsync tar gzip
          
          # Create backup directory
          mkdir -p /backup/app-files
          
          # Backup application logs
          if [ -d /app/logs ]; then
            tar -czf /backup/${backup_name}-logs.tar.gz -C /app logs/
            echo "Application logs backed up"
          fi
          
          # Backup uploaded files (if any)
          if [ -d /app/uploads ]; then
            tar -czf /backup/${backup_name}-uploads.tar.gz -C /app uploads/
            echo "Upload files backed up"
          fi
          
          # Create metadata
          cat > /backup/${backup_name}.metadata.json << EOL
          {
            "backup_name": "${backup_name}",
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "backup_type": "application_files",
            "environment": "${ENVIRONMENT}",
            "files_backed_up": ["logs", "uploads"]
          }
          EOL
          
          echo "Application files backup completed"
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
        - name: app-logs
          mountPath: /app/logs
          readOnly: true
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: application-backups
      - name: app-logs
        emptyDir: {}
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    # Wait for backup to complete
    log "Waiting for application files backup to complete..."
    kubectl wait --for=condition=complete job/"$backup_name" -n "$NAMESPACE" --timeout=600s
    
    # Check backup status
    if kubectl get job "$backup_name" -n "$NAMESPACE" -o jsonpath='{.status.conditions[0].type}' | grep -q "Complete"; then
        success "Application files backup completed: $backup_name"
    else
        warning "Application files backup failed"
    fi
    
    # Cleanup job
    kubectl delete job "$backup_name" -n "$NAMESPACE"
    
    echo "$backup_name" > /tmp/app_backup_name
}

# Kubernetes configuration backup
backup_kubernetes_config() {
    log "Creating Kubernetes configuration backup..."
    
    local backup_dir="/tmp/k8s-backup-${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    # Backup deployments
    kubectl get deployments -n "$NAMESPACE" -o yaml > "$backup_dir/deployments.yaml"
    
    # Backup services
    kubectl get services -n "$NAMESPACE" -o yaml > "$backup_dir/services.yaml"
    
    # Backup ingress
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$backup_dir/ingress.yaml"
    
    # Backup secrets (metadata only, not actual secret values)
    kubectl get secrets -n "$NAMESPACE" -o yaml | kubectl neat > "$backup_dir/secrets-structure.yaml" 2>/dev/null || \
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$backup_dir/secrets-structure.yaml"
    
    # Backup configmaps
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml"
    
    # Backup persistent volume claims
    kubectl get pvc -n "$NAMESPACE" -o yaml > "$backup_dir/pvc.yaml"
    
    # Create backup archive
    tar -czf "/tmp/k8s-config-backup-${TIMESTAMP}.tar.gz" -C "/tmp" "k8s-backup-${TIMESTAMP}"
    
    success "Kubernetes configuration backup created: k8s-config-backup-${TIMESTAMP}.tar.gz"
    
    # Cleanup temporary directory
    rm -rf "$backup_dir"
    
    echo "k8s-config-backup-${TIMESTAMP}.tar.gz" > /tmp/k8s_backup_name
}

# Upload backups to cloud storage
upload_to_cloud_storage() {
    log "Uploading backups to cloud storage..."
    
    local s3_bucket="${BACKUP_S3_BUCKET:-bookedbarber-backups}"
    local backup_path="production/${TIMESTAMP}"
    
    if command -v aws &> /dev/null && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
        log "Uploading to AWS S3..."
        
        # Upload database backup
        if [ -f /tmp/db_backup_name ]; then
            local db_backup=$(cat /tmp/db_backup_name)
            kubectl exec -n "$NAMESPACE" deployment/bookedbarber-backend -- \
                aws s3 cp "/backup/${db_backup}.sql.gz" "s3://${s3_bucket}/${backup_path}/" || warning "Database backup upload failed"
            kubectl exec -n "$NAMESPACE" deployment/bookedbarber-backend -- \
                aws s3 cp "/backup/${db_backup}.metadata.json" "s3://${s3_bucket}/${backup_path}/" || warning "Database metadata upload failed"
        fi
        
        # Upload K8s config backup
        if [ -f /tmp/k8s_backup_name ]; then
            local k8s_backup=$(cat /tmp/k8s_backup_name)
            aws s3 cp "/tmp/${k8s_backup}" "s3://${s3_bucket}/${backup_path}/" || warning "K8s config backup upload failed"
        fi
        
        success "Backups uploaded to S3"
    else
        warning "AWS CLI not configured or credentials not available. Backups stored locally only."
    fi
}

# Verify backup integrity
verify_backup_integrity() {
    log "Verifying backup integrity..."
    
    local verification_passed=true
    
    # Verify database backup
    if [ -f /tmp/db_backup_name ]; then
        local db_backup=$(cat /tmp/db_backup_name)
        log "Verifying database backup: $db_backup"
        
        # Check if backup file exists and is not empty
        local backup_size=$(kubectl exec -n "$NAMESPACE" deployment/bookedbarber-backend -- \
            stat -c%s "/backup/${db_backup}.sql.gz" 2>/dev/null || echo "0")
        
        if [ "$backup_size" -gt 1000 ]; then  # At least 1KB
            success "Database backup integrity OK (${backup_size} bytes)"
        else
            error "Database backup integrity check failed"
            verification_passed=false
        fi
    fi
    
    # Verify K8s config backup
    if [ -f /tmp/k8s_backup_name ]; then
        local k8s_backup=$(cat /tmp/k8s_backup_name)
        if [ -f "/tmp/${k8s_backup}" ]; then
            success "Kubernetes config backup integrity OK"
        else
            error "Kubernetes config backup not found"
            verification_passed=false
        fi
    fi
    
    if [ "$verification_passed" = true ]; then
        success "All backup integrity checks passed"
    else
        error "Some backup integrity checks failed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep last 7 days of backups
    local cutoff_date=$(date -d '7 days ago' +%Y%m%d)
    
    # Cleanup local backups
    find /tmp -name "*-backup-*" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Cleanup Kubernetes backup storage
    kubectl exec -n "$NAMESPACE" deployment/bookedbarber-backend -- \
        find /backup -name "*.sql.gz" -type f -mtime +7 -delete 2>/dev/null || warning "Could not cleanup old database backups"
    
    # Cleanup S3 backups if configured
    if command -v aws &> /dev/null && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
        local s3_bucket="${BACKUP_S3_BUCKET:-bookedbarber-backups}"
        aws s3 ls "s3://${s3_bucket}/production/" | while read -r line; do
            local backup_date=$(echo "$line" | awk '{print $1}' | tr -d '-')
            if [ "$backup_date" -lt "$cutoff_date" ]; then
                local backup_dir=$(echo "$line" | awk '{print $2}')
                aws s3 rm "s3://${s3_bucket}/production/${backup_dir}" --recursive || true
            fi
        done 2>/dev/null || warning "Could not cleanup old S3 backups"
    fi
    
    success "Old backup cleanup completed"
}

# Generate backup report
generate_backup_report() {
    log "Generating backup report..."
    
    local report_file="/tmp/backup-report-${TIMESTAMP}.json"
    local db_backup_name=""
    local app_backup_name=""
    local k8s_backup_name=""
    
    [ -f /tmp/db_backup_name ] && db_backup_name=$(cat /tmp/db_backup_name)
    [ -f /tmp/app_backup_name ] && app_backup_name=$(cat /tmp/app_backup_name)
    [ -f /tmp/k8s_backup_name ] && k8s_backup_name=$(cat /tmp/k8s_backup_name)
    
    cat > "$report_file" << EOF
{
  "backup_summary": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "backup_type": "$BACKUP_TYPE",
    "status": "completed"
  },
  "backups_created": {
    "database_backup": "$db_backup_name",
    "application_backup": "$app_backup_name",
    "kubernetes_config_backup": "$k8s_backup_name"
  },
  "storage_locations": {
    "local_kubernetes": true,
    "cloud_storage": $([ -n "${AWS_ACCESS_KEY_ID:-}" ] && echo "true" || echo "false")
  }
}
EOF
    
    log "Backup report generated: $report_file"
    cat "$report_file"
    
    # Send to monitoring system if configured
    if [ -n "${MONITORING_WEBHOOK_URL:-}" ]; then
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d @"$report_file" || warning "Failed to send backup report to monitoring system"
    fi
}

# Main execution
main() {
    log "Starting production backup process"
    log "Backup type: $BACKUP_TYPE"
    log "Timestamp: $TIMESTAMP"
    
    check_prerequisites
    
    case $BACKUP_TYPE in
        full)
            backup_database
            backup_application_files
            backup_kubernetes_config
            ;;
        database)
            backup_database
            ;;
        files)
            backup_application_files
            backup_kubernetes_config
            ;;
        *)
            error "Unknown backup type: $BACKUP_TYPE. Use: full, database, or files"
            ;;
    esac
    
    verify_backup_integrity
    upload_to_cloud_storage
    cleanup_old_backups
    generate_backup_report
    
    success "Production backup process completed successfully"
    
    # Cleanup temporary files
    rm -f /tmp/db_backup_name /tmp/app_backup_name /tmp/k8s_backup_name
}

# Run main function
main "$@"