#!/bin/bash
# Comprehensive Development Startup Script for BookedBarber V2
# Handles all common issues and provides a clean, reliable startup

echo "🚀 BookedBarber V2 - Clean Development Startup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
FRONTEND_DIR="$BACKEND_DIR/frontend-v2"
ROOT_DIR="$( cd "$BACKEND_DIR/.." && pwd )"

# Error handling
set -e
trap 'echo -e "${RED}❌ An error occurred. Exiting...${NC}"; exit 1' ERR

# Function to print status
print_status() {
    case $1 in
        "success") echo -e "${GREEN}✅ $2${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "error") echo -e "${RED}❌ $2${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $2${NC}" ;;
        "action") echo -e "${CYAN}➤  $2${NC}" ;;
    esac
}

# Function to check command existence
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for port
wait_for_port() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=0
    
    print_action "Waiting for $service on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_status "success" "$service is ready on port $port"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    print_status "error" "$service failed to start on port $port"
    return 1
}

# Step 1: Pre-flight checks
print_status "info" "Step 1: Running pre-flight checks..."

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node -v)
    print_status "success" "Node.js installed: $NODE_VERSION"
    
    # Check version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ $NODE_MAJOR -lt 18 ]; then
        print_status "warning" "Node.js 18+ recommended (you have $NODE_VERSION)"
    fi
else
    print_status "error" "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Python
if check_command python3; then
    PYTHON_VERSION=$(python3 --version)
    print_status "success" "Python installed: $PYTHON_VERSION"
else
    print_status "error" "Python 3 not found. Please install Python 3.9+"
    exit 1
fi

# Check npm
if check_command npm; then
    NPM_VERSION=$(npm -v)
    print_status "success" "npm installed: v$NPM_VERSION"
else
    print_status "error" "npm not found"
    exit 1
fi

echo ""

# Step 2: Clean existing processes
print_status "info" "Step 2: Cleaning existing processes..."

# Kill ports
print_status "action" "Killing processes on development ports..."
"$SCRIPT_DIR/kill-ports.sh" > /dev/null 2>&1 || true

# Additional cleanup
pkill -f "pm2" 2>/dev/null || true
print_status "success" "Processes cleaned"

echo ""

# Step 3: Clear caches
print_status "info" "Step 3: Clearing caches..."

# Next.js cache
if [ -d "$FRONTEND_DIR/.next" ]; then
    rm -rf "$FRONTEND_DIR/.next"
    print_status "success" "Cleared Next.js cache"
fi

# Node modules cache
if [ -d "$FRONTEND_DIR/node_modules/.cache" ]; then
    rm -rf "$FRONTEND_DIR/node_modules/.cache"
    print_status "success" "Cleared node_modules cache"
fi

# Python cache
find "$BACKEND_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR" -name "*.pyc" -delete 2>/dev/null || true
print_status "success" "Cleared Python cache"

echo ""

# Step 4: Check dependencies
print_status "info" "Step 4: Checking dependencies..."

# Backend dependencies
cd "$BACKEND_DIR"
if [ -f "requirements.txt" ]; then
    print_status "action" "Checking Python dependencies..."
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "action" "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check if dependencies are installed
    if ! pip show fastapi >/dev/null 2>&1; then
        print_status "action" "Installing Python dependencies..."
        pip install -r requirements.txt
    else
        print_status "success" "Python dependencies up to date"
    fi
fi

# Frontend dependencies
cd "$FRONTEND_DIR"
if [ -f "package.json" ]; then
    print_status "action" "Checking Node dependencies..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        print_status "action" "Installing Node dependencies..."
        npm install
    else
        print_status "success" "Node dependencies up to date"
    fi
fi

echo ""

# Step 5: Environment setup
print_status "info" "Step 5: Setting up environment..."

# Backend .env
cd "$BACKEND_DIR"
if [ ! -f ".env" ]; then
    if [ -f ".env.template" ]; then
        cp .env.template .env
        print_status "warning" "Created .env from template - please configure!"
    else
        print_status "error" "No .env file found in backend-v2/"
        exit 1
    fi
else
    print_status "success" "Backend .env exists"
fi

# Frontend .env.local
cd "$FRONTEND_DIR"
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        print_status "warning" "Created .env.local from example - please configure!"
    else
        print_status "error" "No .env.local file found in frontend-v2/"
        exit 1
    fi
else
    print_status "success" "Frontend .env.local exists"
fi

echo ""

# Step 6: Database setup
print_status "info" "Step 6: Checking database..."

cd "$BACKEND_DIR"
source venv/bin/activate

# Check if database migrations are needed
print_status "action" "Checking database migrations..."
if check_command alembic; then
    alembic upgrade head 2>/dev/null && print_status "success" "Database migrations applied" || print_status "warning" "Database migration failed - may need manual setup"
else
    print_status "warning" "Alembic not found - skipping migrations"
fi

echo ""

# Step 7: Start services
print_status "info" "Step 7: Starting services..."

# Use tmux if available, otherwise use background processes
if check_command tmux && [ -z "$TMUX" ]; then
    print_status "action" "Starting services with tmux..."
    
    # Kill existing session if it exists
    tmux kill-session -t bookedbarber 2>/dev/null || true
    
    # Create new session
    tmux new-session -d -s bookedbarber -n backend
    
    # Start backend
    tmux send-keys -t bookedbarber:backend "cd $BACKEND_DIR && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000" C-m
    
    # Start frontend
    tmux new-window -t bookedbarber -n frontend
    tmux send-keys -t bookedbarber:frontend "cd $FRONTEND_DIR && npm run dev" C-m
    
    # Create logs window
    tmux new-window -t bookedbarber -n logs
    tmux send-keys -t bookedbarber:logs "cd $ROOT_DIR && tail -f backend-v2/logs/*.log 2>/dev/null || echo 'Waiting for logs...'" C-m
    
    print_status "success" "Services started in tmux session 'bookedbarber'"
    
    # Wait for services
    wait_for_port 8000 "Backend API"
    wait_for_port 3000 "Frontend"
    
    echo ""
    print_status "success" "All services are running!"
    echo ""
    echo "Access points:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  API Docs:    http://localhost:8000/docs"
    echo ""
    echo "tmux commands:"
    echo "  tmux attach -t bookedbarber  - Attach to session"
    echo "  Ctrl+b, n                    - Next window"
    echo "  Ctrl+b, p                    - Previous window"
    echo "  Ctrl+b, d                    - Detach from session"
    echo ""
    
    # Ask if user wants to attach
    read -p "Attach to tmux session now? (Y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        tmux attach -t bookedbarber
    fi
    
else
    print_status "action" "Starting services in background..."
    
    # Start backend
    cd "$BACKEND_DIR"
    source venv/bin/activate
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 > "$ROOT_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    print_status "success" "Backend started (PID: $BACKEND_PID)"
    
    # Start frontend
    cd "$FRONTEND_DIR"
    npm run dev > "$ROOT_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    print_status "success" "Frontend started (PID: $FRONTEND_PID)"
    
    # Save PIDs
    echo $BACKEND_PID > "$ROOT_DIR/.backend.pid"
    echo $FRONTEND_PID > "$ROOT_DIR/.frontend.pid"
    
    # Wait for services
    wait_for_port 8000 "Backend API"
    wait_for_port 3000 "Frontend"
    
    echo ""
    print_status "success" "All services are running!"
    echo ""
    echo "Access points:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  API Docs:    http://localhost:8000/docs"
    echo ""
    echo "Logs:"
    echo "  Backend:  tail -f $ROOT_DIR/backend.log"
    echo "  Frontend: tail -f $ROOT_DIR/frontend.log"
    echo ""
    echo "To stop services:"
    echo "  kill $BACKEND_PID $FRONTEND_PID"
    echo "  or use: ./scripts/kill-ports.sh"
    echo ""
    
    # Follow logs
    print_status "info" "Following logs (Ctrl+C to exit)..."
    tail -f "$ROOT_DIR/backend.log" "$ROOT_DIR/frontend.log"
fi