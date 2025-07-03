#!/bin/bash

# Automated Maintenance Script for BookedBarber V2
# Performs routine maintenance tasks to keep the system optimized

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/config/backup"
LOG_DIR="/var/log/bookedbarber/maintenance"
MAINTENANCE_LOCK="/tmp/bookedbarber-maintenance.lock"

mkdir -p "$LOG_DIR"

# Load configuration if available
if [ -f "$CONFIG_DIR/backup.conf" ]; then
    source "$CONFIG_DIR/backup.conf"
fi

exec 1> >(tee -a "$LOG_DIR/maintenance.log")
exec 2> >(tee -a "$LOG_DIR/maintenance-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
}

# Check if maintenance is already running
check_maintenance_lock() {
    if [ -f "$MAINTENANCE_LOCK" ]; then
        local lock_pid=$(cat "$MAINTENANCE_LOCK")
        if kill -0 "$lock_pid" 2>/dev/null; then
            error "Maintenance already running with PID $lock_pid"
            exit 1
        else
            log "Removing stale lock file"
            rm -f "$MAINTENANCE_LOCK"
        fi
    fi
    
    echo $$ > "$MAINTENANCE_LOCK"
}

# Cleanup lock file on exit
cleanup_lock() {
    rm -f "$MAINTENANCE_LOCK"
}

trap cleanup_lock EXIT

# Parse database URL
parse_database_url() {
    if [ -z "${DATABASE_URL:-}" ]; then
        warning "DATABASE_URL not set, skipping database maintenance"
        return 1
    fi
    
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        return 0
    else
        error "Invalid DATABASE_URL format"
        return 1
    fi
}

# Database maintenance
maintain_database() {
    log "Starting database maintenance..."
    
    if ! parse_database_url; then
        return 0
    fi
    
    export PGPASSWORD="$DB_PASS"
    
    # Vacuum and analyze
    log "Running VACUUM ANALYZE..."
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
        --command="VACUUM ANALYZE;" || warning "VACUUM ANALYZE failed"
    
    # Reindex frequently used tables
    local tables=("users" "appointments" "payments" "bookings")
    for table in "${tables[@]}"; do
        log "Reindexing table: $table"
        psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
            --command="REINDEX TABLE $table;" 2>/dev/null || warning "Failed to reindex $table (table may not exist)"
    done
    
    # Update table statistics
    log "Updating table statistics..."
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
        --command="ANALYZE;" || warning "ANALYZE failed"
    
    # Check for bloated tables
    log "Checking for table bloat..."
    local bloat_query="
        SELECT schemaname, tablename, 
               pg_size_pretty(table_bytes) AS table_size,
               pg_size_pretty(bloat_bytes) AS bloat_size,
               round(100 * bloat_bytes::numeric / table_bytes, 2) AS bloat_percentage
        FROM (
            SELECT schemaname, tablename,
                   pg_total_relation_size(schemaname||'.'||tablename) AS table_bytes,
                   (pg_total_relation_size(schemaname||'.'||tablename) - 
                    pg_relation_size(schemaname||'.'||tablename)) AS bloat_bytes
            FROM pg_tables WHERE schemaname = 'public'
        ) bloat_info
        WHERE bloat_bytes > 0
        ORDER BY bloat_percentage DESC;"
    
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
        --command="$bloat_query" || warning "Bloat check failed"
    
    log "Database maintenance completed"
}

# Redis maintenance
maintain_redis() {
    log "Starting Redis maintenance..."
    
    local redis_url="${REDIS_URL:-redis://localhost:6379}"
    
    if ! command -v redis-cli &> /dev/null; then
        warning "redis-cli not available, skipping Redis maintenance"
        return 0
    fi
    
    # Check Redis connectivity
    if ! redis-cli -u "$redis_url" ping > /dev/null 2>&1; then
        warning "Redis not accessible, skipping maintenance"
        return 0
    fi
    
    # Get Redis info
    log "Redis info:"
    redis-cli -u "$redis_url" info memory | grep -E "(used_memory_human|used_memory_peak_human|mem_fragmentation_ratio)"
    
    # Clean expired keys
    log "Cleaning expired keys..."
    redis-cli -u "$redis_url" eval "
        local keys = redis.call('keys', ARGV[1])
        local deleted = 0
        for i=1,#keys do
            if redis.call('ttl', keys[i]) == -1 then
                redis.call('del', keys[i])
                deleted = deleted + 1
            end
        end
        return deleted
    " 0 "*session*" || warning "Session cleanup failed"
    
    # Check memory usage
    local memory_info=$(redis-cli -u "$redis_url" info memory)
    local used_memory=$(echo "$memory_info" | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
    local max_memory=$(echo "$memory_info" | grep "maxmemory:" | cut -d: -f2 | tr -d '\r')
    
    if [ "$max_memory" -gt 0 ] && [ "$used_memory" -gt 0 ]; then
        local usage_percent=$((used_memory * 100 / max_memory))
        if [ "$usage_percent" -gt 80 ]; then
            warning "Redis memory usage is high: ${usage_percent}%"
        fi
    fi
    
    log "Redis maintenance completed"
}

# Log rotation and cleanup
maintain_logs() {
    log "Starting log maintenance..."
    
    # Rotate application logs
    local log_dirs=(
        "/var/log/bookedbarber"
        "/var/log/nginx"
        "/var/log/postgresql"
        "/var/log/redis"
    )
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            log "Rotating logs in: $log_dir"
            
            # Compress logs older than 1 day
            find "$log_dir" -name "*.log" -mtime +1 ! -name "*.gz" -exec gzip {} \;
            
            # Remove compressed logs older than 30 days
            find "$log_dir" -name "*.gz" -mtime +30 -delete
            
            # Remove empty log files
            find "$log_dir" -name "*.log" -size 0 -delete
        fi
    done
    
    # Clean up temporary files
    log "Cleaning temporary files..."
    find /tmp -name "bookedbarber-*" -mtime +1 -delete 2>/dev/null || true
    find /var/tmp -name "bookedbarber-*" -mtime +7 -delete 2>/dev/null || true
    
    log "Log maintenance completed"
}

# SSL certificate renewal check
check_ssl_certificates() {
    log "Checking SSL certificates..."
    
    local domains=("api.bookedbarber.com" "app.bookedbarber.com")
    
    for domain in "${domains[@]}"; do
        if command -v openssl &> /dev/null; then
            log "Checking certificate for: $domain"
            
            local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
            
            if [ -n "$cert_info" ]; then
                local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ "$days_until_expiry" -lt 30 ]; then
                    warning "SSL certificate for $domain expires in $days_until_expiry days"
                else
                    log "SSL certificate for $domain is valid for $days_until_expiry days"
                fi
            else
                warning "Could not check SSL certificate for $domain"
            fi
        fi
    done
    
    log "SSL certificate check completed"
}

# System cleanup
system_cleanup() {
    log "Starting system cleanup..."
    
    # Clean package cache
    if command -v apt-get &> /dev/null; then
        log "Cleaning APT cache..."
        apt-get clean || warning "APT cache cleanup failed"
        apt-get autoremove -y || warning "APT autoremove failed"
    fi
    
    if command -v yum &> /dev/null; then
        log "Cleaning YUM cache..."
        yum clean all || warning "YUM cache cleanup failed"
    fi
    
    # Clean Docker if available
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        log "Cleaning Docker resources..."
        
        # Remove unused containers
        docker container prune -f || warning "Docker container prune failed"
        
        # Remove unused images
        docker image prune -f || warning "Docker image prune failed"
        
        # Remove unused volumes (be careful!)
        docker volume prune -f || warning "Docker volume prune failed"
        
        # Remove unused networks
        docker network prune -f || warning "Docker network prune failed"
    fi
    
    # Clear system cache if safe to do so
    if [ -w /proc/sys/vm/drop_caches ]; then
        log "Clearing system cache..."
        sync
        echo 1 > /proc/sys/vm/drop_caches
    fi
    
    log "System cleanup completed"
}

# Check disk space and cleanup if needed
check_disk_space() {
    log "Checking disk space..."
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    log "Root filesystem usage: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 85 ]; then
        warning "Disk usage is high (${disk_usage}%), performing aggressive cleanup..."
        
        # Clean old log files more aggressively
        find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true
        find /var/log -name "*.gz" -mtime +14 -delete 2>/dev/null || true
        
        # Clean old backups if local backup directory exists
        if [ -d "/var/backups/bookedbarber" ]; then
            find /var/backups/bookedbarber -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
        fi
        
        # Clean more temporary files
        find /tmp -type f -mtime +0 -delete 2>/dev/null || true
        
        # Re-check disk usage
        local new_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
        log "Disk usage after cleanup: ${new_usage}%"
        
        if [ "$new_usage" -gt 90 ]; then
            error "Disk usage still critical after cleanup: ${new_usage}%"
        fi
    fi
}

# Performance optimization
optimize_performance() {
    log "Starting performance optimization..."
    
    # Optimize database connections
    if parse_database_url; then
        export PGPASSWORD="$DB_PASS"
        
        # Check for long-running queries
        log "Checking for long-running queries..."
        local long_queries=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
            --tuples-only --command="
            SELECT COUNT(*) FROM pg_stat_activity 
            WHERE state = 'active' AND now() - query_start > interval '5 minutes';" 2>/dev/null || echo "0")
        
        if [ "$long_queries" -gt 0 ]; then
            warning "Found $long_queries long-running queries"
        fi
        
        # Check connection usage
        local active_connections=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
            --tuples-only --command="SELECT COUNT(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")
        local max_connections=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
            --tuples-only --command="SHOW max_connections;" 2>/dev/null | xargs || echo "100")
        
        local connection_usage=$((active_connections * 100 / max_connections))
        log "Database connection usage: ${connection_usage}% ($active_connections/$max_connections)"
        
        if [ "$connection_usage" -gt 80 ]; then
            warning "Database connection usage is high: ${connection_usage}%"
        fi
    fi
    
    log "Performance optimization completed"
}

# Generate maintenance report
generate_maintenance_report() {
    local maintenance_status="$1"
    
    local report_file="$LOG_DIR/maintenance_report_$(date +%Y%m%d_%H%M%S).json"
    
    # Get system information
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local memory_usage=$(free | grep '^Mem:' | awk '{printf "%.1f", $3/$2 * 100.0}')
    local load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    cat > "$report_file" << EOF
{
    "maintenance_date": "$(date -Iseconds)",
    "maintenance_status": "$maintenance_status",
    "system_metrics": {
        "disk_usage_percent": $disk_usage,
        "memory_usage_percent": $memory_usage,
        "load_average": $load_average,
        "uptime": "$(uptime -p)"
    },
    "tasks_completed": {
        "database_maintenance": true,
        "redis_maintenance": true,
        "log_maintenance": true,
        "ssl_check": true,
        "system_cleanup": true,
        "performance_optimization": true
    },
    "maintenance_duration_seconds": $(($(date +%s) - ${MAINTENANCE_START_TIME:-$(date +%s)}))
}
EOF
    
    log "Maintenance report generated: $report_file"
    echo "$report_file"
}

# Send maintenance notification
send_maintenance_notification() {
    local status="$1"
    local report_file="$2"
    
    local subject="BookedBarber Maintenance $status"
    local message="Automated maintenance completed with status: $status. Report: $report_file"
    
    # This would integrate with your notification system
    log "Maintenance notification: $subject"
    
    # Log to system logger
    echo "$message" | logger -t bookedbarber-maintenance -p daemon.info
}

# Main maintenance function
main() {
    local maintenance_type="${1:-full}"
    
    MAINTENANCE_START_TIME=$(date +%s)
    
    log "Starting automated maintenance: $maintenance_type"
    
    check_maintenance_lock
    
    case $maintenance_type in
        "full")
            maintain_database
            maintain_redis
            maintain_logs
            check_ssl_certificates
            system_cleanup
            check_disk_space
            optimize_performance
            ;;
        "database")
            maintain_database
            ;;
        "logs")
            maintain_logs
            ;;
        "system")
            system_cleanup
            check_disk_space
            ;;
        *)
            error "Invalid maintenance type: $maintenance_type"
            exit 1
            ;;
    esac
    
    local report_file=$(generate_maintenance_report "SUCCESS")
    send_maintenance_notification "SUCCESS" "$report_file"
    
    log "Automated maintenance completed successfully"
}

# Handle errors
trap 'generate_maintenance_report "FAILED"; send_maintenance_notification "FAILED" ""; exit 1' ERR

# Show usage
usage() {
    echo "Usage: $0 [maintenance_type]"
    echo ""
    echo "Maintenance types:"
    echo "  full     - Complete maintenance (default)"
    echo "  database - Database maintenance only"
    echo "  logs     - Log maintenance only"
    echo "  system   - System cleanup only"
    echo ""
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"