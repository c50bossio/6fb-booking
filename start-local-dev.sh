#!/bin/bash

# 🛠️ Start Local Development Environment
# Starts both frontend and backend for 6FB Booking V2
# Usage: ./start-local-dev.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  6FB Booking V2 - Local Development Startup${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check if we're in the right directory
if [ ! -f "backend-v2/main.py" ] || [ ! -f "backend-v2/frontend-v2/package.json" ]; then
    echo -e "${RED}❌ Error: Must run from 6fb-booking root directory${NC}"
    exit 1
fi

# Check if ports are available
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use (needed for $service)${NC}"
        echo -e "${YELLOW}   Kill the process or use a different port${NC}"
        return 1
    fi
    return 0
}

echo -e "${CYAN}🔍 Checking port availability...${NC}"
check_port 8000 "Backend (FastAPI)" || exit 1
check_port 3000 "Frontend (Next.js)" || exit 1
echo -e "${GREEN}✅ Ports 3000 and 8000 are available${NC}"

# Verify environment files exist
echo -e "${CYAN}🔍 Checking environment configuration...${NC}"

if [ ! -f "backend-v2/.env" ]; then
    echo -e "${RED}❌ Missing backend-v2/.env file${NC}"
    echo -e "${YELLOW}💡 Copy backend-v2/.env.template to backend-v2/.env and configure${NC}"
    exit 1
fi

if [ ! -f "backend-v2/frontend-v2/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Missing frontend-v2/.env.local file${NC}"
    echo -e "${YELLOW}💡 Creating basic .env.local for development...${NC}"
    cat > backend-v2/frontend-v2/.env.local << EOF
# Local Development Environment
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51QfOczDWCqEI9fQLWOGPmgLKx6k0wN4KYmh7e5J9bQe3zcEDEQRnfEkWbVt4pqcqT3UrBWj6YOI09IpfF5DfUNzQ00HbKgR6HE
EOF
fi

echo -e "${GREEN}✅ Environment files configured${NC}"

# Check Python virtual environment
echo -e "${CYAN}🐍 Checking Python environment...${NC}"
cd backend-v2

if [ ! -d "venv" ] && [ ! -d ".venv" ] && [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}💡 No virtual environment detected. Creating one...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${GREEN}✅ Virtual environment created and activated${NC}"
elif [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✅ Virtual environment activated (venv)${NC}"
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    echo -e "${GREEN}✅ Virtual environment activated (.venv)${NC}"
else
    echo -e "${GREEN}✅ Using existing virtual environment${NC}"
fi

# Install Python dependencies
echo -e "${CYAN}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt > /dev/null 2>&1
echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Check Node.js and npm
echo -e "${CYAN}📦 Checking Node.js environment...${NC}"
cd frontend-v2

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
echo -e "${GREEN}✅ Node.js $NODE_VERSION detected${NC}"

# Install Node dependencies
echo -e "${CYAN}📦 Installing Node.js dependencies...${NC}"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Node.js dependencies are up to date${NC}"
fi

# Start services in background
echo -e "${BLUE}🚀 Starting development servers...${NC}"
echo ""

# Start backend
echo -e "${CYAN}🔄 Starting FastAPI backend on http://localhost:8000${NC}"
cd ../  # Go back to backend-v2 directory
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid

# Start frontend
echo -e "${CYAN}🔄 Starting Next.js frontend on http://localhost:3000${NC}"
cd frontend-v2
nohup npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../../logs/frontend.pid

# Wait a moment for servers to start
sleep 3

# Check if servers are running
echo -e "${CYAN}🔍 Verifying servers are running...${NC}"

# Check backend
if curl -s --max-time 5 http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running at http://localhost:8000${NC}"
    echo -e "${GREEN}   Health check: http://localhost:8000/health${NC}"
    echo -e "${GREEN}   API docs: http://localhost:8000/docs${NC}"
else
    echo -e "${YELLOW}⚠️  Backend starting up... (may take a few more seconds)${NC}"
fi

# Check frontend
if curl -s --max-time 5 -o /dev/null http://localhost:3000 2>&1; then
    echo -e "${GREEN}✅ Frontend is running at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend starting up... (may take a few more seconds)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Development environment started successfully!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${CYAN}📱 Frontend: http://localhost:3000${NC}"
echo -e "${CYAN}🔧 Backend:  http://localhost:8000${NC}" 
echo -e "${CYAN}📚 API Docs: http://localhost:8000/docs${NC}"
echo -e "${CYAN}❤️  Health:  http://localhost:8000/health${NC}"
echo ""
echo -e "${YELLOW}💡 Logs are saved to:${NC}"
echo -e "${YELLOW}   Backend:  logs/backend.log${NC}"
echo -e "${YELLOW}   Frontend: logs/frontend.log${NC}"
echo ""
echo -e "${YELLOW}🛑 To stop servers: ./stop-local-dev.sh${NC}"
echo -e "${YELLOW}🚀 To deploy to staging: ./deploy-to-staging.sh \"Your message\"${NC}"
echo ""
echo -e "${BLUE}Happy coding! 🚀${NC}"