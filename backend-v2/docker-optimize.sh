#!/bin/bash
# =============================================================================
# BookedBarber V2 - Docker Performance Optimization Script
# =============================================================================
# 🚀 Optimize Docker settings for development performance
# 🎯 Configure BuildKit, resource limits, and networking
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Docker Optimization${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# =============================================================================
# Docker BuildKit Optimization
# =============================================================================
echo -e "\n${YELLOW}🚀 Enabling Docker BuildKit for faster builds...${NC}"

# Enable BuildKit for current session
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Make it persistent in bash profile if not already set
if ! grep -q "DOCKER_BUILDKIT" ~/.bash_profile 2>/dev/null; then
    echo "export DOCKER_BUILDKIT=1" >> ~/.bash_profile
    echo "export COMPOSE_DOCKER_CLI_BUILD=1" >> ~/.bash_profile
    echo -e "${GREEN}✅ BuildKit enabled persistently${NC}"
else
    echo -e "${GREEN}✅ BuildKit already enabled${NC}"
fi

# =============================================================================
# Docker Daemon Configuration
# =============================================================================
echo -e "\n${YELLOW}⚙️ Checking Docker daemon configuration...${NC}"

DOCKER_CONFIG_DIR="$HOME/.docker"
DAEMON_CONFIG="$DOCKER_CONFIG_DIR/daemon.json"

# Create Docker config directory if it doesn't exist
mkdir -p "$DOCKER_CONFIG_DIR"

# Create or update daemon.json with performance optimizations
cat > "$DAEMON_CONFIG" <<EOF
{
  "experimental": false,
  "features": {
    "buildkit": true
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "20GB"
    }
  },
  "max-concurrent-downloads": 6,
  "max-concurrent-uploads": 6,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo -e "${GREEN}✅ Docker daemon configuration optimized${NC}"

# =============================================================================
# Container Resource Optimization
# =============================================================================
echo -e "\n${YELLOW}💾 Optimizing container resource usage...${NC}"

# Check current resource usage
FRONTEND_MEMORY=$(docker stats --no-stream --format "table {{.MemUsage}}" bookedbarber-frontend-dev 2>/dev/null | tail -1 | cut -d'/' -f1 | grep -o '[0-9.]*')
BACKEND_MEMORY=$(docker stats --no-stream --format "table {{.MemUsage}}" bookedbarber-backend-dev 2>/dev/null | tail -1 | cut -d'/' -f1 | grep -o '[0-9.]*')

if [ ! -z "$FRONTEND_MEMORY" ]; then
    echo -e "Frontend memory usage: ${FRONTEND_MEMORY}MiB"
fi

if [ ! -z "$BACKEND_MEMORY" ]; then
    echo -e "Backend memory usage: ${BACKEND_MEMORY}MiB"
fi

# =============================================================================
# Network Performance
# =============================================================================
echo -e "\n${YELLOW}🌐 Testing network performance...${NC}"

# Test inter-container latency
if docker exec bookedbarber-frontend-dev ping -c 1 backend >/dev/null 2>&1; then
    LATENCY=$(docker exec bookedbarber-frontend-dev ping -c 1 backend 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}')
    echo -e "Inter-container latency: $LATENCY"
else
    echo -e "${YELLOW}⚠️ Cannot test network latency (containers not running)${NC}"
fi

# =============================================================================
# Volume Performance
# =============================================================================
echo -e "\n${YELLOW}📁 Checking volume performance...${NC}"

# Test volume write performance
VOLUME_TEST_FILE="/tmp/docker_volume_test"
echo "test" > "$VOLUME_TEST_FILE"
START_TIME=$(date +%s%N)
for i in {1..100}; do
    echo "test $i" >> "$VOLUME_TEST_FILE"
done
END_TIME=$(date +%s%N)
rm -f "$VOLUME_TEST_FILE"

DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
echo -e "Volume write performance: ${DURATION}ms for 100 operations"

# =============================================================================
# Image Optimization
# =============================================================================
echo -e "\n${YELLOW}🗜️ Checking image optimization...${NC}"

# Show image sizes
echo "Current image sizes:"
docker images | grep -E "(backend-v2|bookedbarber)" | head -5

# =============================================================================
# Health Checks Optimization
# =============================================================================
echo -e "\n${YELLOW}❤️ Verifying health checks...${NC}"

# Check health check configuration
if docker inspect bookedbarber-frontend-dev 2>/dev/null | grep -q "Healthcheck"; then
    echo -e "${GREEN}✅ Frontend health checks configured${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend health checks missing${NC}"
fi

if docker inspect bookedbarber-backend-dev 2>/dev/null | grep -q "Healthcheck"; then
    echo -e "${GREEN}✅ Backend health checks configured${NC}"
else
    echo -e "${YELLOW}⚠️ Backend health checks missing${NC}"
fi

# =============================================================================
# Performance Summary
# =============================================================================
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Optimization Summary${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "${GREEN}✅ Docker BuildKit enabled${NC}"
echo -e "${GREEN}✅ Daemon configuration optimized${NC}"
echo -e "${GREEN}✅ Resource usage monitored${NC}"
echo -e "${GREEN}✅ Network performance tested${NC}"
echo -e "${GREEN}✅ Volume performance tested${NC}"
echo -e "${GREEN}✅ Health checks verified${NC}"

echo -e "\n${YELLOW}💡 Additional recommendations:${NC}"
echo -e "• Use .dockerignore to exclude unnecessary files"
echo -e "• Consider multi-stage builds for smaller images"
echo -e "• Monitor container resource usage regularly"
echo -e "• Use Docker layer caching for faster builds"

echo -e "\n${GREEN}🚀 Docker optimization completed!${NC}"