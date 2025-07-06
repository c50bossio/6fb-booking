#!/bin/bash
# Stable Development Environment Startup Script
# Ensures a clean, stable start every time

echo "🚀 BookedBarber Stable Dev Environment Startup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Run deep clean
echo -e "${BLUE}Step 1: Running deep clean...${NC}"
./scripts/deep-clean-dev.sh
echo ""

# Step 2: Check dependencies
echo -e "${BLUE}Step 2: Checking dependencies...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python installed: $PYTHON_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Python 3 not found. Please install Python 3.9+${NC}"
    exit 1
fi

# Check PM2
if command_exists pm2; then
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Installing...${NC}"
    npm install -g pm2
fi

# Check Redis
if command_exists redis-cli; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis not running. Starting...${NC}"
        redis-server --daemonize yes
    fi
else
    echo -e "${YELLOW}⚠️  Redis not found. Please install Redis${NC}"
    exit 1
fi

echo ""

# Step 3: Install/Update dependencies
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"

# Backend dependencies
cd backend-v2
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
fi

# Frontend dependencies
cd frontend-v2
if [ -f "package.json" ]; then
    echo "Installing Node dependencies..."
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✅ Node dependencies installed${NC}"
fi

cd ../..
echo ""

# Step 4: Create logs directory
echo -e "${BLUE}Step 4: Setting up logging...${NC}"
mkdir -p logs
echo -e "${GREEN}✅ Logs directory ready${NC}"
echo ""

# Step 5: Start services with PM2
echo -e "${BLUE}Step 5: Starting services with PM2...${NC}"

# Kill any existing PM2 instances
pm2 kill > /dev/null 2>&1

# Start all services
pm2 start ecosystem.config.js

# Wait for services to start
echo "Waiting for services to start..."
sleep 5

# Show status
pm2 status

echo ""
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status     - Check service status"
echo "  pm2 logs       - View all logs"
echo "  pm2 monit      - Real-time monitoring"
echo "  npm run health - Run health check"
echo ""
echo "Access points:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}💡 Tip: Keep this terminal open to see logs${NC}"
echo ""

# Follow logs
pm2 logs