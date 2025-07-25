#!/bin/bash
# Docker Health Check Script for BookedBarber V2
# Monitors container health and provides recovery options

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🐳 BookedBarber V2 Docker Health Check"
echo "======================================"

# Function to check container health
check_container_health() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null || echo "not_found")
    
    case $health_status in
        "healthy")
            echo -e "${GREEN}✅ $container_name: Healthy${NC}"
            return 0
            ;;
        "unhealthy")
            echo -e "${RED}❌ $container_name: Unhealthy${NC}"
            return 1
            ;;
        "starting")
            echo -e "${YELLOW}🔄 $container_name: Starting...${NC}"
            return 2
            ;;
        "not_found")
            echo -e "${RED}❌ $container_name: Not found or no health check${NC}"
            return 3
            ;;
        *)
            echo -e "${YELLOW}⚠️  $container_name: Unknown status ($health_status)${NC}"
            return 4
            ;;
    esac
}

# Function to get container uptime
get_container_uptime() {
    local container_name=$1
    local start_time=$(docker inspect --format='{{.State.StartedAt}}' $container_name 2>/dev/null || echo "not_found")
    
    if [ "$start_time" != "not_found" ]; then
        local uptime=$(docker inspect --format='{{.State.Status}}' $container_name)
        echo "   Uptime: $(docker inspect --format='{{.State.StartedAt}}' $container_name | cut -d'T' -f1) (Status: $uptime)"
    fi
}

# Function to show resource usage
show_resource_usage() {
    echo ""
    echo "📊 Resource Usage:"
    echo "=================="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" \
        bookedbarber-backend bookedbarber-frontend bookedbarber-postgres bookedbarber-redis 2>/dev/null || echo "No containers running"
}

# Check all containers
echo ""
echo "🔍 Container Health Status:"
echo "=========================="

containers=("bookedbarber-backend" "bookedbarber-frontend" "bookedbarber-postgres" "bookedbarber-redis")
unhealthy_containers=()

for container in "${containers[@]}"; do
    check_container_health $container
    health_code=$?
    get_container_uptime $container
    
    if [ $health_code -eq 1 ] || [ $health_code -eq 3 ]; then
        unhealthy_containers+=($container)
    fi
    echo ""
done

# Show resource usage
show_resource_usage

# Recovery recommendations
if [ ${#unhealthy_containers[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}🚨 Issues Detected${NC}"
    echo "=================="
    echo "Unhealthy containers: ${unhealthy_containers[*]}"
    echo ""
    echo "💡 Recovery Options:"
    echo "1. Restart unhealthy containers: docker-compose restart ${unhealthy_containers[*]}"
    echo "2. View logs: docker-compose logs [container-name]"
    echo "3. Full reset: docker-compose down && docker-compose up -d"
    echo "4. Check disk space: df -h"
    echo "5. Check memory: free -h"
    exit 1
else
    echo -e "${GREEN}🎉 All containers healthy!${NC}"
    exit 0
fi