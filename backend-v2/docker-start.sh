#!/bin/bash
# =============================================================================
# BookedBarber V2 - Docker Startup Script
# =============================================================================
# 🎯 Production-ready Docker Compose deployment with health checks
# 🚀 Automated startup with service verification and logging
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.docker"
LOG_DIR="./logs"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Docker Production Deployment${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# =============================================================================
# Pre-deployment Checks
# =============================================================================
echo -e "\n${YELLOW}📋 Running pre-deployment checks...${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose and try again.${NC}"
    exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"
mkdir -p "$LOG_DIR/nginx"
mkdir -p "./uploads"

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# =============================================================================
# Environment Setup
# =============================================================================
echo -e "\n${YELLOW}🔧 Setting up environment...${NC}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file $ENV_FILE not found.${NC}"
    echo -e "${YELLOW}📋 Please create $ENV_FILE with required configuration.${NC}"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo -e "${GREEN}✅ Environment configured${NC}"

# =============================================================================
# Stop Existing Containers
# =============================================================================
echo -e "\n${YELLOW}🛑 Stopping existing containers...${NC}"

docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

echo -e "${GREEN}✅ Existing containers stopped${NC}"

# =============================================================================
# Build and Start Services
# =============================================================================
echo -e "\n${YELLOW}🚀 Building and starting services...${NC}"

# Build images
echo -e "${BLUE}📦 Building Docker images...${NC}"
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Start services with dependency order
echo -e "${BLUE}🏁 Starting services in dependency order...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d postgres redis

# Wait for database to be ready
echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U bookedbarber; do sleep 2; done'

# Start backend service
echo -e "${BLUE}🚀 Starting backend service...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d backend

# Wait for backend to be ready
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
timeout 120 bash -c 'until curl -f http://localhost:8000/health >/dev/null 2>&1; do sleep 5; done'

# Start frontend service
echo -e "${BLUE}🎨 Starting frontend service...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d frontend

# Wait for frontend to be ready  
echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
timeout 120 bash -c 'until curl -f http://localhost:3000 >/dev/null 2>&1; do sleep 5; done'

# Start nginx (if configured)
if grep -q "nginx:" "$COMPOSE_FILE"; then
    echo -e "${BLUE}🌐 Starting Nginx reverse proxy...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d nginx
fi

echo -e "${GREEN}✅ All services started successfully${NC}"

# =============================================================================
# Service Health Checks
# =============================================================================
echo -e "\n${YELLOW}🔍 Running service health checks...${NC}"

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U bookedbarber >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL: Healthy${NC}"
else
    echo -e "${RED}❌ PostgreSQL: Unhealthy${NC}"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis: Healthy${NC}"
else
    echo -e "${RED}❌ Redis: Unhealthy${NC}"
fi

# Check Backend API
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API: Healthy${NC}"
else
    echo -e "${RED}❌ Backend API: Unhealthy${NC}"
fi

# Check Frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend: Healthy${NC}"
else
    echo -e "${RED}❌ Frontend: Unhealthy${NC}"
fi

# =============================================================================
# Display Service Information
# =============================================================================
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}🎉 BookedBarber V2 Docker Deployment Complete!${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "\n${YELLOW}📊 Service URLs:${NC}"
echo -e "Frontend:         ${GREEN}http://localhost:3000${NC}"
echo -e "Backend API:      ${GREEN}http://localhost:8000${NC}"
echo -e "API Documentation: ${GREEN}http://localhost:8000/docs${NC}"
echo -e "Database:         ${GREEN}postgresql://localhost:5432${NC}"
echo -e "Redis:            ${GREEN}redis://localhost:6379${NC}"

if grep -q "nginx:" "$COMPOSE_FILE"; then
    echo -e "Load Balancer:    ${GREEN}http://localhost:80${NC}"
fi

echo -e "\n${YELLOW}📋 Management Commands:${NC}"
echo -e "View logs:        ${BLUE}docker-compose logs -f${NC}"
echo -e "Stop services:    ${BLUE}./docker-stop.sh${NC}"
echo -e "Restart services: ${BLUE}./docker-restart.sh${NC}"

echo -e "\n${YELLOW}🔐 Test Login Credentials:${NC}"
echo -e "Email:            ${GREEN}admin@bookedbarber.com${NC}"
echo -e "Password:         ${GREEN}admin123${NC}"

echo -e "\n${GREEN}🚀 System is ready for testing!${NC}"
echo -e "${BLUE}==============================================================================${NC}"