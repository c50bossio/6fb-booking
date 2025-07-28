#!/bin/bash

# Docker Development Live Sync Script
# Manages Docker containers with live code synchronization for development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check container status
check_containers() {
    local backend_status=$(docker ps --filter "name=bookedbarber-backend" --format "{{.Status}}" 2>/dev/null || echo "not running")
    local frontend_status=$(docker ps --filter "name=bookedbarber-frontend" --format "{{.Status}}" 2>/dev/null || echo "not running")
    
    echo "Backend:  $backend_status"
    echo "Frontend: $frontend_status"
}

# Function to show help
show_help() {
    echo "Docker Development Live Sync Management"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start development containers with live sync"
    echo "  stop        Stop development containers"
    echo "  restart     Restart development containers"
    echo "  status      Show container status"
    echo "  logs        Show container logs"
    echo "  health      Check backend health endpoint"
    echo "  shell       Open shell in backend container"
    echo "  clean       Clean up containers and volumes"
    echo "  rebuild     Rebuild and restart containers"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start dev environment"
    echo "  $0 logs backend          # Show backend logs"
    echo "  $0 shell                 # Open backend shell"
    echo "  $0 health                # Test backend health"
}

# Function to start containers
start_containers() {
    print_header "Starting Docker Development Environment"
    
    check_docker
    
    print_status "Starting containers with live sync enabled..."
    docker-compose up -d
    
    print_status "Waiting for services to start..."
    sleep 10
    
    print_status "Container status:"
    check_containers
    
    print_status "Testing backend health..."
    if curl -f -s http://localhost:8000/health >/dev/null 2>&1; then
        print_status "✅ Backend is healthy"
    else
        print_warning "⚠️  Backend health check failed (may still be starting)"
    fi
    
    print_status "Development environment ready!"
    echo ""
    echo "🔗 Backend:  http://localhost:8000"
    echo "🔗 API Docs: http://localhost:8000/docs"
    echo "📊 Health:   http://localhost:8000/health"
    echo ""
    echo "📝 To view logs: $0 logs"
    echo "🐚 To open shell: $0 shell"
}

# Function to stop containers
stop_containers() {
    print_header "Stopping Docker Development Environment"
    
    print_status "Stopping containers..."
    docker-compose down
    
    print_status "✅ Development environment stopped"
}

# Function to restart containers
restart_containers() {
    print_header "Restarting Docker Development Environment"
    
    stop_containers
    sleep 2
    start_containers
}

# Function to show container status
show_status() {
    print_header "Container Status"
    
    check_docker
    check_containers
    
    echo ""
    print_status "Detailed container information:"
    docker ps --filter "name=bookedbarber" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    check_docker
    
    if [ -n "$service" ]; then
        print_header "Showing logs for $service"
        docker-compose logs --tail=50 --follow "$service"
    else
        print_header "Showing all container logs"
        echo "Available services: backend, frontend, postgres, redis, nginx"
        echo "Use: $0 logs [service-name] to see specific logs"
        echo ""
        docker-compose logs --tail=20
    fi
}

# Function to check health
check_health() {
    print_header "Health Check"
    
    print_status "Testing backend health endpoint..."
    
    if curl -f -s http://localhost:8000/health; then
        echo ""
        print_status "✅ Backend is healthy"
    else
        echo ""
        print_error "❌ Backend health check failed"
        print_warning "Container status:"
        check_containers
        return 1
    fi
    
    echo ""
    print_status "Testing API documentation..."
    if curl -f -s http://localhost:8000/docs >/dev/null 2>&1; then
        print_status "✅ API docs are accessible"
    else
        print_warning "⚠️  API docs may not be ready"
    fi
}

# Function to open shell in backend container
open_shell() {
    print_header "Opening Shell in Backend Container"
    
    check_docker
    
    if docker ps --filter "name=bookedbarber-backend" --format "{{.Names}}" | grep -q bookedbarber-backend; then
        print_status "Opening bash shell in backend container..."
        docker exec -it bookedbarber-backend bash
    else
        print_error "Backend container is not running"
        print_status "Use '$0 start' to start the development environment"
        return 1
    fi
}

# Function to clean up
clean_up() {
    print_header "Cleaning Up Docker Environment"
    
    print_warning "This will remove all containers and anonymous volumes"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping and removing containers..."
        docker-compose down -v
        
        print_status "Removing unused Docker resources..."
        docker system prune -f
        
        print_status "✅ Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to rebuild containers
rebuild_containers() {
    print_header "Rebuilding Docker Containers"
    
    print_status "Stopping containers..."
    docker-compose down
    
    print_status "Rebuilding containers..."
    docker-compose build --no-cache
    
    print_status "Starting rebuilt containers..."
    start_containers
}

# Main script logic
case "${1:-help}" in
    "start")
        start_containers
        ;;
    "stop")
        stop_containers
        ;;
    "restart")
        restart_containers
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "health")
        check_health
        ;;
    "shell")
        open_shell
        ;;
    "clean")
        clean_up
        ;;
    "rebuild")
        rebuild_containers
        ;;
    "help"|*)
        show_help
        ;;
esac