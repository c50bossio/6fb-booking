#!/bin/bash
# Optimized Development Server Startup Script
# Prevents port conflicts and ensures clean startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if we're in the correct directory
if [[ ! -f "main.py" ]]; then
    print_error "Please run this script from the backend-v2 directory"
    exit 1
fi

print_header "BookedBarber V2 Development Server Startup"

# Step 1: Clean up any existing processes
print_status "Cleaning up existing processes..."

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_warning "Killing processes on port $port: $pids"
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

# Kill processes on common ports
kill_port 8000  # Backend
kill_port 3000  # Frontend
kill_port 3001  # Staging frontend

# Kill any remaining uvicorn or npm processes
pkill -f "uvicorn.*main:app" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

print_status "Process cleanup complete"

# Step 2: Check dependencies
print_status "Checking Python dependencies..."
if ! python -c "import uvicorn" 2>/dev/null; then
    print_error "Python dependencies not installed. Run: pip install -r requirements.txt"
    exit 1
fi

# Step 3: Check database
print_status "Checking database..."
if [[ ! -f "6fb_booking.db" ]]; then
    print_warning "Database not found. Creating and running migrations..."
    alembic upgrade head
fi

# Step 4: Validate environment
print_status "Validating environment configuration..."
if [[ ! -f ".env" ]]; then
    print_error ".env file not found. Copy .env.template to .env and configure"
    exit 1
fi

# Step 5: Clear any build caches
print_status "Clearing build caches..."
if [[ -d "frontend-v2/.next" ]]; then
    rm -rf frontend-v2/.next
    print_status "Cleared Next.js cache"
fi

if [[ -d "frontend-v2/node_modules/.cache" ]]; then
    rm -rf frontend-v2/node_modules/.cache
    print_status "Cleared Node.js cache"
fi

# Step 6: Check frontend dependencies
if [[ -d "frontend-v2" ]]; then
    print_status "Checking frontend dependencies..."
    cd frontend-v2
    
    if [[ ! -d "node_modules" ]]; then
        print_warning "Frontend dependencies not installed. Running npm install..."
        npm install
    fi
    
    # Check if all required packages are installed
    if ! npm ls next react react-dom &>/dev/null; then
        print_warning "Some frontend dependencies are missing. Running npm install..."
        npm install
    fi
    
    cd ..
fi

# Step 7: Start backend server
print_header "Starting Backend Server"
print_status "Starting backend on http://localhost:8000"

# Function to start backend
start_backend() {
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            print_status "Backend server is ready!"
            break
        fi
        
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            print_error "Backend server failed to start"
            exit 1
        fi
        
        sleep 1
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Backend server failed to start within 30 seconds"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
}

start_backend

# Step 8: Start frontend server (if directory exists)
if [[ -d "frontend-v2" ]]; then
    print_header "Starting Frontend Server"
    print_status "Starting frontend on http://localhost:3000"
    
    cd frontend-v2
    
    # Function to start frontend
    start_frontend() {
        npm run dev &
        FRONTEND_PID=$!
        
        # Wait for frontend to start
        local max_attempts=60
        local attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -s http://localhost:3000 >/dev/null 2>&1; then
                print_status "Frontend server is ready!"
                break
            fi
            
            if ! kill -0 $FRONTEND_PID 2>/dev/null; then
                print_error "Frontend server failed to start"
                exit 1
            fi
            
            sleep 1
            ((attempt++))
        done
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Frontend server failed to start within 60 seconds"
            kill $FRONTEND_PID 2>/dev/null || true
            exit 1
        fi
    }
    
    start_frontend
    cd ..
fi

# Step 9: Success message and cleanup handler
print_header "Development Servers Started Successfully"
print_status "Backend:  http://localhost:8000"
print_status "API Docs: http://localhost:8000/docs"
if [[ -d "frontend-v2" ]]; then
    print_status "Frontend: http://localhost:3000"
fi

print_status "Press Ctrl+C to stop all servers"

# Function to handle cleanup on exit
cleanup() {
    print_status "Shutting down servers..."
    
    if [[ -n "$BACKEND_PID" ]]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [[ -n "$FRONTEND_PID" ]]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Additional cleanup
    kill_port 8000
    kill_port 3000
    
    print_status "All servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes to finish
wait