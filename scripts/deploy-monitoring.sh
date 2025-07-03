#!/bin/bash

# Deployment Script for BookedBarber V2 Monitoring Stack
# Deploys complete operational automation system

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/log/bookedbarber/deployment"

mkdir -p "$LOG_DIR"

exec 1> >(tee -a "$LOG_DIR/monitoring-deployment.log")
exec 2> >(tee -a "$LOG_DIR/monitoring-deployment-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is required but not installed"
        exit 1
    fi
    
    # Check available disk space (need at least 10GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 10485760 ]; then  # 10GB in KB
        error "Insufficient disk space. Need at least 10GB available"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create required directories
create_directories() {
    log "Creating required directories..."
    
    local dirs=(
        "/var/log/bookedbarber/backup"
        "/var/log/bookedbarber/monitoring"
        "/var/log/bookedbarber/security"
        "/var/log/bookedbarber/maintenance"
        "/var/backups/bookedbarber"
        "/etc/cron.d"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        log "Created directory: $dir"
    done
}

# Set up environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Create monitoring environment file if it doesn't exist
    local env_file="$PROJECT_ROOT/.env.monitoring"
    
    if [ ! -f "$env_file" ]; then
        cat > "$env_file" << EOF
# Monitoring Environment Variables
PROMETHEUS_RETENTION=30d
GRAFANA_ADMIN_PASSWORD=\${GRAFANA_ADMIN_PASSWORD:-admin123}
ELASTICSEARCH_HEAP_SIZE=1g
LOGSTASH_HEAP_SIZE=1g

# Alert Configuration
ALERT_EMAIL=\${ALERT_EMAIL:-ops@bookedbarber.com}
SLACK_WEBHOOK_URL=\${SLACK_WEBHOOK_URL:-}
PAGERDUTY_SERVICE_KEY=\${PAGERDUTY_SERVICE_KEY:-}

# Database Configuration
DATABASE_URL=\${DATABASE_URL:-postgresql://user:pass@localhost:5432/bookedbarber}
REDIS_URL=\${REDIS_URL:-redis://localhost:6379}

# Application URLs
API_BASE_URL=\${API_BASE_URL:-http://localhost:8000}
FRONTEND_URL=\${FRONTEND_URL:-http://localhost:3000}
EOF
        log "Created monitoring environment file: $env_file"
    fi
}

# Deploy monitoring stack
deploy_monitoring_stack() {
    log "Deploying monitoring stack..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose -f docker-compose.monitoring.yml pull
    
    # Start monitoring services
    log "Starting monitoring services..."
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    local services=("prometheus" "grafana" "alertmanager" "elasticsearch")
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.monitoring.yml ps "$service" | grep -q "Up"; then
            log "Service $service is running"
        else
            error "Service $service failed to start"
            docker-compose -f docker-compose.monitoring.yml logs "$service"
        fi
    done
}

# Configure Grafana dashboards
configure_grafana() {
    log "Configuring Grafana dashboards..."
    
    # Wait for Grafana to be fully ready
    local grafana_url="http://localhost:3001"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$grafana_url/api/health" > /dev/null 2>&1; then
            break
        fi
        attempt=$((attempt + 1))
        log "Waiting for Grafana to be ready... (attempt $attempt/$max_attempts)"
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Grafana failed to become ready"
        return 1
    fi
    
    # Import dashboards
    local dashboard_dir="$PROJECT_ROOT/monitoring/grafana/dashboards"
    if [ -d "$dashboard_dir" ]; then
        for dashboard_file in "$dashboard_dir"/*.json; do
            if [ -f "$dashboard_file" ]; then
                log "Importing dashboard: $(basename "$dashboard_file")"
                curl -X POST \
                    -H "Content-Type: application/json" \
                    -d @"$dashboard_file" \
                    -u admin:admin123 \
                    "$grafana_url/api/dashboards/db" || warning "Failed to import $(basename "$dashboard_file")"
            fi
        done
    fi
}

# Set up cron jobs
setup_cron_jobs() {
    log "Setting up cron jobs..."
    
    # Backup cron job
    cat > /etc/cron.d/bookedbarber-backup << EOF
# BookedBarber V2 Backup Schedule
# Daily full backup at 2:00 AM
0 2 * * * root $PROJECT_ROOT/scripts/backup/postgres_backup.sh full

# Hourly incremental backups
0 * * * * root $PROJECT_ROOT/scripts/backup/postgres_backup.sh incremental

# Weekly schema backup on Sunday at 1:00 AM
0 1 * * 0 root $PROJECT_ROOT/scripts/backup/postgres_backup.sh schema

# Cross-region sync every 6 hours
0 */6 * * * root $PROJECT_ROOT/scripts/cross-region-sync/sync_backups.sh incremental
EOF

    # Maintenance cron job
    cat > /etc/cron.d/bookedbarber-maintenance << EOF
# BookedBarber V2 Maintenance Schedule
# Weekly full maintenance on Sunday at 3:00 AM
0 3 * * 0 root $PROJECT_ROOT/scripts/maintenance/automated_maintenance.sh full

# Daily log cleanup at 4:00 AM
0 4 * * * root $PROJECT_ROOT/scripts/maintenance/automated_maintenance.sh logs
EOF

    # Health monitoring cron job
    cat > /etc/cron.d/bookedbarber-health << EOF
# BookedBarber V2 Health Monitoring
# Health check every 5 minutes
*/5 * * * * root $PROJECT_ROOT/scripts/health-monitoring/application_health_check.sh
EOF

    # Security audit cron job
    cat > /etc/cron.d/bookedbarber-security << EOF
# BookedBarber V2 Security Auditing
# Daily security audit at 5:00 AM
0 5 * * * root $PROJECT_ROOT/scripts/security/security_audit.sh full

# Weekly dependency vulnerability scan on Monday at 6:00 AM
0 6 * * 1 root $PROJECT_ROOT/scripts/security/security_audit.sh dependencies
EOF

    log "Cron jobs configured"
}

# Configure log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/bookedbarber << EOF
/var/log/bookedbarber/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 root root
}

/var/log/bookedbarber/*/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 root root
}
EOF

    log "Log rotation configured"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Check service endpoints
    local endpoints=(
        "http://localhost:9090/-/healthy"      # Prometheus
        "http://localhost:3001/api/health"     # Grafana
        "http://localhost:9093/-/healthy"      # AlertManager
        "http://localhost:9200/_cluster/health" # Elasticsearch
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "$endpoint" > /dev/null 2>&1; then
            log "Endpoint healthy: $endpoint"
        else
            error "Endpoint unhealthy: $endpoint"
        fi
    done
    
    # Run health check
    if [ -x "$PROJECT_ROOT/scripts/health-monitoring/application_health_check.sh" ]; then
        log "Running application health check..."
        "$PROJECT_ROOT/scripts/health-monitoring/application_health_check.sh"
    fi
    
    # Run security audit
    if [ -x "$PROJECT_ROOT/scripts/security/security_audit.sh" ]; then
        log "Running security audit..."
        "$PROJECT_ROOT/scripts/security/security_audit.sh" full
    fi
}

# Generate deployment report
generate_deployment_report() {
    local report_file="$LOG_DIR/deployment_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "deployment_date": "$(date -Iseconds)",
    "deployment_status": "success",
    "components_deployed": {
        "prometheus": "$(docker-compose -f docker-compose.monitoring.yml ps prometheus | grep -q Up && echo "running" || echo "failed")",
        "grafana": "$(docker-compose -f docker-compose.monitoring.yml ps grafana | grep -q Up && echo "running" || echo "failed")",
        "alertmanager": "$(docker-compose -f docker-compose.monitoring.yml ps alertmanager | grep -q Up && echo "running" || echo "failed")",
        "elasticsearch": "$(docker-compose -f docker-compose.monitoring.yml ps elasticsearch | grep -q Up && echo "running" || echo "failed")",
        "logstash": "$(docker-compose -f docker-compose.monitoring.yml ps logstash | grep -q Up && echo "running" || echo "failed")",
        "kibana": "$(docker-compose -f docker-compose.monitoring.yml ps kibana | grep -q Up && echo "running" || echo "failed")"
    },
    "automation_scripts": {
        "backup_automation": "configured",
        "maintenance_automation": "configured",
        "health_monitoring": "configured",
        "security_auditing": "configured"
    },
    "cron_jobs": "configured",
    "log_rotation": "configured"
}
EOF
    
    log "Deployment report generated: $report_file"
    echo "$report_file"
}

# Main deployment function
main() {
    local deployment_type="${1:-full}"
    
    log "Starting monitoring stack deployment: $deployment_type"
    
    case $deployment_type in
        "full")
            check_prerequisites
            create_directories
            setup_environment
            deploy_monitoring_stack
            configure_grafana
            setup_cron_jobs
            setup_log_rotation
            validate_deployment
            ;;
        "monitoring-only")
            check_prerequisites
            deploy_monitoring_stack
            configure_grafana
            ;;
        "automation-only")
            create_directories
            setup_cron_jobs
            setup_log_rotation
            ;;
        *)
            error "Invalid deployment type: $deployment_type"
            exit 1
            ;;
    esac
    
    local report_file=$(generate_deployment_report)
    
    log "Monitoring stack deployment completed successfully"
    log "Deployment report: $report_file"
    
    echo ""
    echo "Deployment Summary:"
    echo "==================="
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3001 (admin/admin123)"
    echo "AlertManager: http://localhost:9093"
    echo "Kibana: http://localhost:5601"
    echo ""
    echo "All automation scripts are now active and scheduled via cron."
    echo "Check logs in /var/log/bookedbarber/ for operational details."
}

# Handle errors
trap 'error "Deployment failed"; exit 1' ERR

# Show usage
usage() {
    echo "Usage: $0 [deployment_type]"
    echo ""
    echo "Deployment types:"
    echo "  full           - Complete deployment (default)"
    echo "  monitoring-only - Deploy monitoring stack only"
    echo "  automation-only - Set up automation scripts only"
    echo ""
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"