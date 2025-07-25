#!/bin/bash
# Docker Recovery Script for BookedBarber V2
# Provides automated recovery for common Docker issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 BookedBarber V2 Docker Recovery${NC}"
echo "=================================="

# Function to create data directories
create_data_dirs() {
    echo "📁 Creating data directories..."
    mkdir -p ./data/postgres ./data/redis
    chmod 755 ./data/postgres ./data/redis
    echo -e "${GREEN}✅ Data directories created${NC}"
}

# Function to clean up old containers
cleanup_containers() {
    echo "🧹 Cleaning up old containers..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Remove dangling containers
    docker container prune -f 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f 2>/dev/null || true
    
    echo -e "${GREEN}✅ Containers cleaned up${NC}"
}

# Function to rebuild containers
rebuild_containers() {
    echo "🔨 Rebuilding containers..."
    
    # Rebuild without cache
    docker-compose build --no-cache --parallel
    
    echo -e "${GREEN}✅ Containers rebuilt${NC}"
}

# Function to start services with health checks
start_services() {
    echo "🚀 Starting services..."
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to become healthy..."
    sleep 30
    
    # Check health
    ./docker-health-check.sh
}

# Function to show logs
show_logs() {
    echo "📋 Recent logs from all services:"
    echo "================================"
    docker-compose logs --tail=20 2>/dev/null || echo "No logs available"
}

# Function to check system resources
check_resources() {
    echo "💾 System Resources:"
    echo "==================="
    echo "Disk space:"
    df -h / 2>/dev/null | tail -1 || echo "Cannot check disk space"
    echo ""
    echo "Memory usage:"
    free -h 2>/dev/null || echo "Cannot check memory"
    echo ""
    echo "Docker system usage:"
    docker system df 2>/dev/null || echo "Cannot check Docker usage"
}

# Main recovery workflow
main() {
    local action=${1:-"full"}
    
    case $action in
        "quick")
            echo "🏃 Quick recovery: Restart containers"
            docker-compose restart
            ./docker-health-check.sh
            ;;
        "clean")
            echo "🧹 Clean recovery: Stop, clean, start"
            cleanup_containers
            create_data_dirs
            start_services
            ;;
        "rebuild")
            echo "🔨 Full rebuild: Clean, rebuild, start"
            cleanup_containers
            create_data_dirs
            rebuild_containers
            start_services
            ;;
        "logs")
            show_logs
            ;;
        "status")
            ./docker-health-check.sh
            check_resources
            ;;
        "full"|*)
            echo "🚀 Full recovery: Complete reset"
            check_resources
            cleanup_containers
            create_data_dirs
            rebuild_containers
            start_services
            show_logs
            ;;
    esac
}

# Help function
show_help() {
    echo "Usage: $0 [action]"
    echo ""
    echo "Actions:"
    echo "  quick    - Quick restart of containers"
    echo "  clean    - Stop, clean, and start containers"
    echo "  rebuild  - Full rebuild of containers"
    echo "  logs     - Show recent logs"
    echo "  status   - Check container status and resources"
    echo "  full     - Complete recovery (default)"
    echo ""
    echo "Examples:"
    echo "  $0 quick      # Quick restart"
    echo "  $0 rebuild    # Full rebuild"
    echo "  $0 status     # Health check"
}

# Parse arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main "$1"