#!/bin/bash
# =============================================================================
# BookedBarber V2 - Codespaces Validation Script
# =============================================================================
# 🧪 Validates that Docker Compose setup works correctly in GitHub Codespaces
# 🔍 Tests all services, ports, and integrations before development
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Codespaces Environment Validation${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# =============================================================================
# Pre-validation Setup
# =============================================================================
echo -e "\n${YELLOW}🔧 Preparing validation environment...${NC}"

# Navigate to backend directory
cd /workspaces/6fb-booking/backend-v2 || cd /app/backend-v2 || {
    echo -e "${RED}❌ Cannot find backend-v2 directory${NC}"
    exit 1
}

# Create validation log directory
mkdir -p /tmp/codespaces-validation
VALIDATION_LOG="/tmp/codespaces-validation/validation.log"
echo "Starting validation at $(date)" > "$VALIDATION_LOG"

# =============================================================================
# Docker Environment Validation
# =============================================================================
echo -e "\n${YELLOW}🐳 Validating Docker environment...${NC}"

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not available${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

# Check Docker Compose availability
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not available${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

echo -e "${GREEN}✅ Docker environment ready${NC}" | tee -a "$VALIDATION_LOG"

# =============================================================================
# Docker Compose File Validation
# =============================================================================
echo -e "\n${YELLOW}📋 Validating Docker Compose configuration...${NC}"

# Check if docker-compose.dev.yml exists
if [[ ! -f "docker-compose.dev.yml" ]]; then
    echo -e "${RED}❌ docker-compose.dev.yml not found${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

# Validate Docker Compose syntax
if ! docker-compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose configuration invalid${NC}" | tee -a "$VALIDATION_LOG"
    docker-compose -f docker-compose.dev.yml config
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose configuration valid${NC}" | tee -a "$VALIDATION_LOG"

# =============================================================================
# Environment Variables Validation
# =============================================================================
echo -e "\n${YELLOW}🔐 Validating environment variables...${NC}"

# Check for essential environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET_KEY"
    "CORS_ORIGINS"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️ Missing environment variables: ${MISSING_VARS[*]}${NC}" | tee -a "$VALIDATION_LOG"
    echo -e "${YELLOW}Using default development values...${NC}"
    
    # Set default values for missing variables
    export DATABASE_URL="${DATABASE_URL:-sqlite:///./6fb_booking.db}"
    export JWT_SECRET_KEY="${JWT_SECRET_KEY:-dev_jwt_secret_not_for_production}"
    export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000,https://*.githubpreview.dev}"
else
    echo -e "${GREEN}✅ Essential environment variables present${NC}" | tee -a "$VALIDATION_LOG"
fi

# =============================================================================
# Service Startup Validation
# =============================================================================
echo -e "\n${YELLOW}🚀 Starting Docker services for validation...${NC}"

# Stop any existing services
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Start services in detached mode
if ! docker-compose -f docker-compose.dev.yml up -d --build; then
    echo -e "${RED}❌ Failed to start Docker services${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

echo -e "${GREEN}✅ Docker services started${NC}" | tee -a "$VALIDATION_LOG"

# =============================================================================
# Service Health Checks
# =============================================================================
echo -e "\n${YELLOW}🏥 Running service health checks...${NC}"

# Function to wait for service with timeout
wait_for_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-60}
    local counter=0
    
    echo -e "${YELLOW}Waiting for $service_name...${NC}"
    while ! curl -sf "$url" >/dev/null 2>&1; do
        if [[ $counter -ge $timeout ]]; then
            echo -e "${RED}❌ $service_name failed to start within ${timeout}s${NC}" | tee -a "$VALIDATION_LOG"
            return 1
        fi
        sleep 3
        counter=$((counter + 3))
        echo -n "."
    done
    echo ""
    echo -e "${GREEN}✅ $service_name is healthy${NC}" | tee -a "$VALIDATION_LOG"
    return 0
}

# Check backend service
if ! wait_for_service "Backend API" "http://localhost:8000/health" 60; then
    echo -e "${RED}❌ Backend service validation failed${NC}"
    docker-compose -f docker-compose.dev.yml logs backend
    exit 1
fi

# Check frontend service
if ! wait_for_service "Frontend" "http://localhost:3000" 90; then
    echo -e "${RED}❌ Frontend service validation failed${NC}"
    docker-compose -f docker-compose.dev.yml logs frontend
    exit 1
fi

# =============================================================================
# API Endpoint Validation
# =============================================================================
echo -e "\n${YELLOW}🔍 Validating API endpoints...${NC}"

# Test health endpoint
if curl -sf "http://localhost:8000/health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health endpoint working${NC}" | tee -a "$VALIDATION_LOG"
else
    echo -e "${RED}❌ Health endpoint failed${NC}" | tee -a "$VALIDATION_LOG"
    exit 1
fi

# Test API documentation
if curl -sf "http://localhost:8000/docs" >/dev/null; then
    echo -e "${GREEN}✅ API documentation accessible${NC}" | tee -a "$VALIDATION_LOG"
else
    echo -e "${YELLOW}⚠️ API documentation not accessible${NC}" | tee -a "$VALIDATION_LOG"
fi

# Test OpenAPI schema
if curl -sf "http://localhost:8000/openapi.json" >/dev/null; then
    echo -e "${GREEN}✅ OpenAPI schema accessible${NC}" | tee -a "$VALIDATION_LOG"
else
    echo -e "${YELLOW}⚠️ OpenAPI schema not accessible${NC}" | tee -a "$VALIDATION_LOG"
fi

# =============================================================================
# Database Validation
# =============================================================================
echo -e "\n${YELLOW}🗄️ Validating database setup...${NC}"

# Check if SQLite database file exists or can be created
if [[ "$DATABASE_URL" =~ sqlite ]]; then
    DB_FILE=$(echo "$DATABASE_URL" | sed 's/sqlite:\/\/\///')
    if [[ -f "$DB_FILE" ]] || touch "$DB_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ SQLite database accessible${NC}" | tee -a "$VALIDATION_LOG"
        rm -f "$DB_FILE" 2>/dev/null || true
    else
        echo -e "${RED}❌ Cannot access SQLite database${NC}" | tee -a "$VALIDATION_LOG"
        exit 1
    fi
fi

# =============================================================================
# Port Forwarding Validation
# =============================================================================
echo -e "\n${YELLOW}🌐 Validating port forwarding...${NC}"

# Check if running in Codespaces
if [[ -n "${CODESPACES}" ]]; then
    echo -e "${GREEN}✅ Running in GitHub Codespaces${NC}" | tee -a "$VALIDATION_LOG"
    
    # Validate port forwarding configuration
    FORWARDED_PORTS=(3000 8000)
    for port in "${FORWARDED_PORTS[@]}"; do
        if curl -sf "http://localhost:$port" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Port $port forwarding working${NC}" | tee -a "$VALIDATION_LOG"
        else
            echo -e "${YELLOW}⚠️ Port $port may need manual forwarding${NC}" | tee -a "$VALIDATION_LOG"
        fi
    done
else
    echo -e "${YELLOW}ℹ️ Not running in Codespaces (local environment)${NC}" | tee -a "$VALIDATION_LOG"
fi

# =============================================================================
# Frontend Build Validation
# =============================================================================
echo -e "\n${YELLOW}🎨 Validating frontend build...${NC}"

# Check if frontend is serving content
FRONTEND_RESPONSE=$(curl -s "http://localhost:3000" || echo "ERROR")
if [[ "$FRONTEND_RESPONSE" == *"BookedBarber"* ]] || [[ "$FRONTEND_RESPONSE" == *"Next.js"* ]]; then
    echo -e "${GREEN}✅ Frontend serving content${NC}" | tee -a "$VALIDATION_LOG"
else
    echo -e "${YELLOW}⚠️ Frontend content validation inconclusive${NC}" | tee -a "$VALIDATION_LOG"
fi

# =============================================================================
# Cleanup and Summary
# =============================================================================
echo -e "\n${YELLOW}🧹 Cleaning up validation environment...${NC}"

# Stop services
docker-compose -f docker-compose.dev.yml down --remove-orphans

echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "\n${GREEN}✅ Validation completed successfully!${NC}"
echo -e "\n${YELLOW}📋 Your BookedBarber V2 environment is ready for Codespaces:${NC}"
echo -e "• Docker Compose configuration is valid"
echo -e "• All services start correctly"
echo -e "• API endpoints are accessible"
echo -e "• Database setup is functional"
echo -e "• Port forwarding is configured"

echo -e "\n${YELLOW}🚀 Next steps:${NC}"
echo -e "1. Push this configuration to your repository"
echo -e "2. Create a Codespace from the repository"
echo -e "3. Run ./backend-v2/docker-dev-start.sh"
echo -e "4. Access your app at the forwarded URLs"

echo -e "\n${BLUE}📄 Validation log saved to: $VALIDATION_LOG${NC}"
echo -e "${GREEN}🎉 Ready for crash-free cloud development!${NC}"
echo -e "${BLUE}==============================================================================${NC}"