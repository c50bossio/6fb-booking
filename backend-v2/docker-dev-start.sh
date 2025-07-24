#!/bin/bash
# =============================================================================
# BookedBarber V2 - Development Docker Startup Script
# =============================================================================
# 🎯 Quick development environment with SQLite and hot reload
# 🚀 Simplified startup for rapid development and testing
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Development Environment${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# =============================================================================
# Pre-checks
# =============================================================================
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# =============================================================================
# Stop any existing containers
# =============================================================================
echo -e "\n${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# =============================================================================
# Start development environment
# =============================================================================
echo -e "\n${YELLOW}🚀 Starting development environment...${NC}"

# Build and start services
docker-compose -f docker-compose.dev.yml up -d --build

echo -e "\n${YELLOW}⏳ Waiting for services to start...${NC}"

# Wait for backend
timeout 60 bash -c 'until curl -f http://localhost:8000/health >/dev/null 2>&1; do sleep 3; echo -n "."; done'
echo -e "\n${GREEN}✅ Backend is ready${NC}"

# Wait for frontend
timeout 60 bash -c 'until curl -f http://localhost:3000 >/dev/null 2>&1; do sleep 3; echo -n "."; done'
echo -e "\n${GREEN}✅ Frontend is ready${NC}"

# =============================================================================
# Show development info
# =============================================================================
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}🎉 Development Environment Ready!${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "\n${YELLOW}📊 Service URLs:${NC}"
echo -e "Frontend:         ${GREEN}http://localhost:3000${NC}"
echo -e "Backend API:      ${GREEN}http://localhost:8000${NC}"
echo -e "API Docs:         ${GREEN}http://localhost:8000/docs${NC}"

echo -e "\n${YELLOW}🔐 Test Credentials:${NC}"
echo -e "Email:            ${GREEN}admin@bookedbarber.com${NC}"
echo -e "Password:         ${GREEN}admin123${NC}"

echo -e "\n${YELLOW}📋 Development Commands:${NC}"
echo -e "View logs:        ${BLUE}docker-compose -f docker-compose.dev.yml logs -f${NC}"
echo -e "Stop services:    ${BLUE}docker-compose -f docker-compose.dev.yml down${NC}"
echo -e "Restart:          ${BLUE}./docker-dev-start.sh${NC}"

echo -e "\n${GREEN}🚀 Ready for development!${NC}"
echo -e "${BLUE}==============================================================================${NC}"