#!/bin/bash
# =============================================================================
# BookedBarber V2 - Docker Stop Script
# =============================================================================
# 🛑 Graceful shutdown of all Docker services with cleanup
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Docker Service Shutdown${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"

# Stop and remove containers
docker-compose down --remove-orphans

echo -e "${GREEN}✅ All services stopped successfully${NC}"

# Optional cleanup
read -p "Do you want to remove unused Docker resources? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}🧹 Cleaning up unused Docker resources...${NC}"
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup complete${NC}"
fi

echo -e "\n${GREEN}🏁 Shutdown complete!${NC}"
echo -e "${BLUE}==============================================================================${NC}"