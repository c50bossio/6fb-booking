#!/bin/bash
# =============================================================================
# BookedBarber V2 - Master Docker Control Script
# =============================================================================
# 🎛️ Unified control interface for all Docker services
# 🚀 Environment management and service orchestration
# 📊 Integrated monitoring and backup operations
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="bookedbarber-v2"

# Available compose files
COMPOSE_FILES=(
    "docker-compose.dev.yml"
    "docker-compose.yml"
    "docker-compose.production.yml"
    "docker-compose.backup.yml"
    "docker-compose.logging.yml"
    "docker-compose.monitoring.yml"
    "docker-compose.dev-tools.yml"
)

# Available profiles
PROFILES=(
    "dev-tools"
    "monitoring"
    "logging"
    "backup"
    "restore"
)

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

header() {
    echo -e "${CYAN}${BOLD}$1${NC}"
}

# Help function
show_help() {
    cat << EOF
${BOLD}BookedBarber V2 - Docker Control Script${NC}

${BOLD}USAGE:${NC}
    $0 <command> [options]

${BOLD}COMMANDS:${NC}
    ${CYAN}Environment Management:${NC}
        dev             Start development environment (SQLite)
        prod            Start production environment (PostgreSQL)
        staging         Start staging environment
        stop            Stop all services
        restart         Restart all services
        reset           Reset all services and volumes
        
    ${CYAN}Service Management:${NC}
        logs            View service logs
        status          Show service status
        health          Check service health
        scale <service> <count>    Scale service instances
        
    ${CYAN}Development Tools:${NC}
        tools           Start development tools (Redis Commander, pgAdmin, etc.)
        dashboard       Open development dashboard
        
    ${CYAN}Monitoring & Logging:${NC}
        monitoring      Start monitoring stack (Prometheus, Grafana)
        logging         Start logging stack (ELK)
        metrics         Show current metrics
        
    ${CYAN}Backup & Recovery:${NC}
        backup          Run database and volume backups
        restore <volume> [backup_file]    Restore from backup
        list-backups    List available backups
        
    ${CYAN}Maintenance:${NC}
        update          Update all images
        cleanup         Clean up unused resources  
        migrate         Run database migrations
        
    ${CYAN}Information:${NC}
        ps              Show running containers
        images          Show built images
        volumes         Show volumes
        networks        Show networks
        info            Show system information

${BOLD}EXAMPLES:${NC}
    $0 dev              # Start development environment
    $0 tools            # Start development tools
    $0 monitoring       # Start monitoring stack
    $0 backup           # Run full backup
    $0 logs backend     # View backend logs
    $0 scale backend 3  # Scale backend to 3 instances

${BOLD}ENVIRONMENT VARIABLES:${NC}
    ENVIRONMENT         Target environment (development, staging, production)
    COMPOSE_PROFILES    Comma-separated list of profiles to enable
    BACKUP_ENCRYPTION_KEY    Key for backup encryption

EOF
}

# Check Docker availability
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
        exit 1
    fi
}

# Get compose command
get_compose_cmd() {
    local env="${1:-dev}"
    local cmd="docker-compose"
    
    case "${env}" in
        dev|development)
            cmd="${cmd} -f docker-compose.dev.yml"
            ;;
        prod|production)
            cmd="${cmd} -f docker-compose.yml"
            ;;
        staging)
            cmd="${cmd} -f docker-compose.staging.yml"
            ;;
        *)
            cmd="${cmd} -f docker-compose.dev.yml"
            ;;
    esac
    
    echo "${cmd}"
}

# Start environment
start_environment() {
    local env="$1"
    local compose_cmd
    compose_cmd=$(get_compose_cmd "${env}")
    
    header "🚀 Starting ${env} environment..."
    
    log "Stopping any existing services..."
    ${compose_cmd} down --remove-orphans 2>/dev/null || true
    
    log "Building and starting services..."
    ${compose_cmd} up -d --build
    
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    check_service_health "${env}"
    
    success "Environment '${env}' started successfully!"
    show_service_urls "${env}"
}

# Check service health
check_service_health() {
    local env="$1"
    local compose_cmd
    compose_cmd=$(get_compose_cmd "${env}")
    
    log "Checking service health..."
    
    # Check backend health
    for i in {1..30}; do
        if curl -f -s http://localhost:8000/health >/dev/null 2>&1; then
            success "✅ Backend is healthy"
            break
        else
            [[ $i -eq 30 ]] && warning "⚠️  Backend health check timeout"
            sleep 2
        fi
    done
    
    # Check frontend (if running)
    if ${compose_cmd} ps frontend >/dev/null 2>&1; then
        for i in {1..30}; do
            if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
                success "✅ Frontend is healthy"
                break
            else
                [[ $i -eq 30 ]] && warning "⚠️  Frontend health check timeout"
                sleep 2
            fi
        done
    fi
}

# Show service URLs
show_service_urls() {
    local env="$1"
    
    header "📊 Service URLs:"
    echo "  🌐 Frontend:     http://localhost:3000"
    echo "  🔧 Backend API:  http://localhost:8000"
    echo "  📚 API Docs:     http://localhost:8000/docs"
    
    if [[ "${env}" != "dev" ]]; then
        echo "  🗄️  Database:     localhost:5432"
        echo "  📊 Redis:        localhost:6379"
    fi
}

# Start development tools
start_dev_tools() {
    header "🛠️ Starting development tools..."
    
    docker-compose -f docker-compose.dev-tools.yml --profile dev-tools up -d
    
    log "Waiting for tools to start..."
    sleep 15
    
    success "Development tools started!"
    
    header "🔧 Development Tools URLs:"
    echo "  📊 Redis Commander:  http://localhost:8081"
    echo "  🐘 pgAdmin:          http://localhost:8082"
    echo "  📧 MailHog:          http://localhost:8025"
    echo "  ⚡ Adminer:          http://localhost:8083"
    echo "  📖 Swagger UI:       http://localhost:8084"
    echo "  📁 File Browser:     http://localhost:8085"
    echo "  🎛️  Dev Dashboard:    http://localhost:9000"
}

# Start monitoring stack
start_monitoring() {
    header "📊 Starting monitoring stack..."
    
    # Create data directories
    mkdir -p data/{prometheus,grafana,alertmanager}
    
    docker-compose -f docker-compose.monitoring.yml up -d
    
    log "Waiting for monitoring services to start..."
    sleep 30
    
    success "Monitoring stack started!"
    
    header "📈 Monitoring URLs:"
    echo "  📊 Prometheus:       http://localhost:9090"
    echo "  📈 Grafana:          http://localhost:3001"
    echo "  🚨 AlertManager:     http://localhost:9093"
    echo "  📊 cAdvisor:         http://localhost:8080"
}

# Start logging stack  
start_logging() {
    header "📋 Starting logging stack..."
    
    # Create data directory
    mkdir -p data/elasticsearch
    
    docker-compose -f docker-compose.logging.yml up -d
    
    log "Waiting for logging services to start..."
    sleep 60
    
    success "Logging stack started!"
    
    header "🔍 Logging URLs:"
    echo "  🔍 Kibana:           http://localhost:5601"
    echo "  📊 Elasticsearch:    http://localhost:9200"
    echo "  📋 Fluent-bit:       http://localhost:2020"
}

# Run backup
run_backup() {
    header "💾 Running comprehensive backup..."
    
    # Run database backup
    log "Starting database backup..."
    docker-compose -f docker-compose.backup.yml up --build postgres-backup
    
    # Run volume backup
    log "Starting volume backup..."
    ./scripts/backup-volumes.sh
    
    success "Backup completed successfully!"
}

# Main command processing
main() {
    # Check prerequisites
    check_docker
    
    # Change to script directory
    cd "${SCRIPT_DIR}"
    
    # Process commands
    case "${1:-help}" in
        # Environment management
        dev|development)
            start_environment "dev"
            ;;
        prod|production)
            start_environment "prod"
            ;;
        staging)
            start_environment "staging"
            ;;
        stop)
            header "🛑 Stopping all services..."
            for compose_file in "${COMPOSE_FILES[@]}"; do
                [[ -f "${compose_file}" ]] && docker-compose -f "${compose_file}" down --remove-orphans 2>/dev/null || true
            done
            success "All services stopped"
            ;;
        restart)
            $0 stop
            sleep 5
            $0 dev
            ;;
        reset)
            header "🔄 Resetting all services and volumes..."
            warning "This will remove all data!"
            read -p "Are you sure? (yes/no): " -r
            if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                for compose_file in "${COMPOSE_FILES[@]}"; do
                    [[ -f "${compose_file}" ]] && docker-compose -f "${compose_file}" down -v --remove-orphans 2>/dev/null || true
                done
                docker system prune -f
                success "System reset completed"
            fi
            ;;
            
        # Service management
        logs)
            service="${2:-}"
            if [[ -n "${service}" ]]; then
                docker-compose -f docker-compose.dev.yml logs -f "${service}"
            else
                docker-compose -f docker-compose.dev.yml logs -f
            fi
            ;;
        status)
            header "📊 Service Status:"
            docker-compose -f docker-compose.dev.yml ps
            ;;
        health)
            check_service_health "dev"
            ;;
        scale)
            service="${2:-}"
            count="${3:-1}"
            if [[ -n "${service}" ]]; then
                docker-compose -f docker-compose.dev.yml up -d --scale "${service}=${count}"
                success "Scaled ${service} to ${count} instances"
            else
                error "Service name required for scaling"
                exit 1
            fi
            ;;
            
        # Development tools
        tools)
            start_dev_tools
            ;;
        dashboard)
            log "Opening development dashboard..."
            start_dev_tools
            sleep 5
            open http://localhost:9000 2>/dev/null || echo "Open http://localhost:9000 in your browser"
            ;;
            
        # Monitoring and logging
        monitoring)
            start_monitoring
            ;;
        logging)
            start_logging
            ;;
        metrics)
            if curl -s http://localhost:9090/-/healthy >/dev/null 2>&1; then
                open http://localhost:9090 2>/dev/null || echo "Open http://localhost:9090 for Prometheus metrics"
            else
                warning "Monitoring stack not running. Start with: $0 monitoring"
            fi
            ;;
            
        # Backup and recovery
        backup)
            run_backup
            ;;
        restore)
            volume="${2:-}"
            backup_file="${3:-latest}"
            if [[ -n "${volume}" ]]; then
                ./scripts/restore-volumes.sh "${volume}" "${backup_file}"
            else
                ./scripts/restore-volumes.sh --list
            fi
            ;;
        list-backups)
            ./scripts/restore-volumes.sh --list
            ;;
            
        # Maintenance
        update)
            header "🔄 Updating all images..."
            docker-compose -f docker-compose.dev.yml pull
            docker-compose -f docker-compose.yml pull
            success "Images updated"
            ;;
        cleanup)
            header "🧹 Cleaning up unused resources..."
            docker system prune -f
            docker volume prune -f
            success "Cleanup completed"
            ;;
        migrate)
            header "🔄 Running database migrations..."
            docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
            success "Migrations completed"
            ;;
            
        # Information
        ps)
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            ;;
        images)
            docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
            ;;
        volumes)
            docker volume ls --filter name=backend-v2
            ;;
        networks)
            docker network ls --filter name=backend-v2
            ;;
        info)
            header "🐳 Docker System Information:"
            docker system df
            echo
            header "📊 BookedBarber V2 Resources:"
            docker ps --filter name=bookedbarber --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            ;;
            
        # Help
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: ${1}"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"