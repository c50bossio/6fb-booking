#!/bin/bash

# Worktree-Aware Development Session Launcher for BookedBarber V2
# This script automatically detects the current worktree and starts appropriate services

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect current worktree context
detect_worktree_context() {
    local current_path=$(pwd)
    local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Check if we're in a feature worktree
    if [[ "$current_path" == *"/6fb-booking-features/"* ]]; then
        WORKTREE_TYPE="feature"
        WORKTREE_NAME=$(basename "$current_path")
        BACKEND_PORT_BASE=8002
        FRONTEND_PORT_BASE=3002
        ENV_FILE=".env"
        return 0
    fi
    
    # Check if we're in staging worktree
    if [[ "$current_path" == *"/6fb-booking-staging"* ]]; then
        WORKTREE_TYPE="staging"
        WORKTREE_NAME="staging"
        BACKEND_PORT_BASE=8001
        FRONTEND_PORT_BASE=3001
        ENV_FILE=".env.staging"
        return 0
    fi
    
    # Check if we're in main project (develop branch)
    if [[ "$current_path" == *"/6fb-booking"* ]] && [[ "$current_path" != *"/6fb-booking-"* ]]; then
        WORKTREE_TYPE="main"
        WORKTREE_NAME="main"
        BACKEND_PORT_BASE=8000
        FRONTEND_PORT_BASE=3000
        ENV_FILE=".env"
        return 0
    fi
    
    return 1
}

# Function to find available ports
find_available_port() {
    local base_port=$1
    local port=$base_port
    
    for i in {0..20}; do
        port=$((base_port + i))
        if ! lsof -i :$port > /dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    
    print_error "No available ports found starting from $base_port"
    return 1
}

# Function to start backend server
start_backend() {
    local backend_dir="$1"
    local port="$2"
    local env_file="$3"
    
    print_status "Starting backend server on port $port..."
    
    cd "$backend_dir"
    
    # Check if environment file exists
    if [ ! -f "$env_file" ]; then
        print_error "Environment file not found: $env_file"
        return 1
    fi
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Virtual environment not found. Creating..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    # Start the server with the specified environment
    export ENV_FILE="$env_file"
    uvicorn main:app --reload --host 0.0.0.0 --port "$port" &
    BACKEND_PID=$!
    
    print_success "Backend started (PID: $BACKEND_PID, Port: $port)"
    echo $BACKEND_PID > backend.pid
}

# Function to start frontend server
start_frontend() {
    local frontend_dir="$1"
    local port="$2"
    local backend_port="$3"
    
    print_status "Starting frontend server on port $port..."
    
    cd "$frontend_dir"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Node modules not found. Installing..."
        npm install
    fi
    
    # Update environment with correct backend URL
    if [ -f ".env.local" ]; then
        sed -i '' "s/localhost:[0-9]*/localhost:$backend_port/g" .env.local
    fi
    
    # Start frontend with custom port
    PORT=$port npm run dev &
    FRONTEND_PID=$!
    
    print_success "Frontend started (PID: $FRONTEND_PID, Port: $port)"
    echo $FRONTEND_PID > frontend.pid
}

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up processes..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Clean up PID files
    rm -f backend.pid frontend.pid
    
    print_success "Cleanup complete"
}

# Set up trap for cleanup
trap cleanup EXIT

# Main function
main() {
    echo -e "${PURPLE}🚀 BookedBarber V2 - Worktree-Aware Development Session${NC}"
    echo "============================================================"
    echo ""
    
    # Detect worktree context
    if ! detect_worktree_context; then
        print_error "Could not detect worktree context. Please run from a valid worktree directory."
        echo ""
        echo "Valid locations:"
        echo "  - Main project: /Users/bossio/6fb-booking"
        echo "  - Staging: /Users/bossio/6fb-booking-staging"
        echo "  - Feature: /Users/bossio/6fb-booking-features/[feature-name]"
        exit 1
    fi
    
    print_success "Detected worktree context:"
    echo "  Type: $WORKTREE_TYPE"
    echo "  Name: $WORKTREE_NAME"
    echo "  Current directory: $(pwd)"
    echo ""
    
    # Find available ports
    BACKEND_PORT=$(find_available_port $BACKEND_PORT_BASE)
    FRONTEND_PORT=$(find_available_port $FRONTEND_PORT_BASE)
    
    if [ -z "$BACKEND_PORT" ] || [ -z "$FRONTEND_PORT" ]; then
        print_error "Could not find available ports"
        exit 1
    fi
    
    print_status "Using ports:"
    echo "  Backend: $BACKEND_PORT"
    echo "  Frontend: $FRONTEND_PORT"
    echo ""
    
    # Determine paths
    CURRENT_DIR=$(pwd)
    BACKEND_DIR="$CURRENT_DIR/backend-v2"
    FRONTEND_DIR="$CURRENT_DIR/backend-v2/frontend-v2"
    
    # Validate directories exist
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    # Start servers
    print_status "Starting development servers for $WORKTREE_TYPE worktree..."
    echo ""
    
    # Start backend
    start_backend "$BACKEND_DIR" "$BACKEND_PORT" "$ENV_FILE"
    sleep 2
    
    # Start frontend
    start_frontend "$FRONTEND_DIR" "$FRONTEND_PORT" "$BACKEND_PORT"
    sleep 3
    
    # Show status
    echo ""
    print_success "Development environment ready!"
    echo ""
    echo "🌐 URLs:"
    echo "  Frontend: http://localhost:$FRONTEND_PORT"
    echo "  Backend:  http://localhost:$BACKEND_PORT"
    echo "  API Docs: http://localhost:$BACKEND_PORT/docs"
    echo ""
    echo "📊 Worktree Info:"
    echo "  Type: $WORKTREE_TYPE"
    echo "  Name: $WORKTREE_NAME"
    echo "  Environment: $ENV_FILE"
    echo ""
    echo "🔧 Development Commands:"
    case $WORKTREE_TYPE in
        "feature")
            echo "  Test backend: cd backend-v2 && pytest"
            echo "  Test frontend: cd backend-v2/frontend-v2 && npm test"
            echo "  Database: feature_$(echo $WORKTREE_NAME | sed 's/feature-//').db"
            ;;
        "staging")
            echo "  Test backend: cd backend-v2 && ENV_FILE=.env.staging pytest"
            echo "  Test frontend: cd backend-v2/frontend-v2 && npm test"
            echo "  Database: staging_6fb_booking.db"
            ;;
        "main")
            echo "  Test all: ./scripts/parallel-tests.sh"
            echo "  Database: 6fb_booking.db"
            ;;
    esac
    echo ""
    echo "Press Ctrl+C to stop all servers and exit..."
    
    # Wait for user interrupt
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"