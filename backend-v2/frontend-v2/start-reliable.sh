#!/bin/bash

# BookedBarber V2 - Reliable Frontend Startup Script
# This script handles port conflicts, cache clearing, and environment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRIMARY_PORT=3000
FALLBACK_PORT=3001
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_DIR="$PROJECT_DIR/.next"
ENV_FILE="$PROJECT_DIR/.env.local"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ❌ $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to get process info on port
get_port_process() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN | grep -v "PID" || echo "Unknown process"
}

# Function to kill process on port
kill_port_process() {
    local port=$1
    local pid=$(lsof -ti :$port)
    
    if [ -n "$pid" ]; then
        log "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
        sleep 2
        
        # Verify process is killed
        if check_port $port; then
            log_error "Failed to kill process on port $port"
            return 1
        else
            log_success "Successfully killed process on port $port"
            return 0
        fi
    else
        log_warning "No process found on port $port"
        return 0
    fi
}

# Function to clear cache
clear_cache() {
    if [ -d "$CACHE_DIR" ]; then
        log "Clearing Next.js cache at $CACHE_DIR"
        rm -rf "$CACHE_DIR"
        log_success "Cache cleared successfully"
    else
        log "No cache directory found at $CACHE_DIR"
    fi
}

# Function to setup environment
setup_environment() {
    log "Setting up environment variables"
    
    # Set NODE_ENV if not already set
    if [ -z "$NODE_ENV" ]; then
        export NODE_ENV=development
        log "Set NODE_ENV=development"
    fi
    
    # Check for .env.local file
    if [ -f "$ENV_FILE" ]; then
        log_success "Found environment file: $ENV_FILE"
        # Source the env file to validate it
        set -a
        source "$ENV_FILE" 2>/dev/null || log_warning "Could not source $ENV_FILE"
        set +a
    else
        log_warning "No .env.local file found at $ENV_FILE"
        log "Consider creating one from .env.local.example"
    fi
    
    # Set memory limits for Node.js
    export NODE_OPTIONS="--max-old-space-size=4096"
    log "Set Node.js memory limit to 4GB"
}

# Function to verify dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check if node_modules exists
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        log_warning "node_modules not found. Running npm install..."
        npm install || {
            log_error "Failed to install dependencies"
            exit 1
        }
    fi
    
    # Check if package.json exists
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        log_error "package.json not found in $PROJECT_DIR"
        exit 1
    fi
    
    log_success "Dependencies verified"
}

# Function to start Next.js on a specific port
start_nextjs() {
    local port=$1
    
    log "Starting Next.js on port $port..."
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Start Next.js with specified port
    PORT=$port npm run dev 2>&1 | while IFS= read -r line; do
        # Color-code the output
        if [[ $line == *"error"* ]] || [[ $line == *"Error"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"warning"* ]] || [[ $line == *"Warning"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        elif [[ $line == *"ready"* ]] || [[ $line == *"Ready"* ]]; then
            echo -e "${GREEN}$line${NC}"
        elif [[ $line == *"compiled"* ]] || [[ $line == *"Compiled"* ]]; then
            echo -e "${GREEN}$line${NC}"
        else
            echo "$line"
        fi
    done
}

# Function to handle cleanup on exit
cleanup() {
    log "Cleaning up..."
    # Kill any background processes we might have started
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "🚀 Starting BookedBarber V2 Frontend Reliably"
    log "Project directory: $PROJECT_DIR"
    
    # Step 1: Check dependencies
    check_dependencies
    
    # Step 2: Setup environment
    setup_environment
    
    # Step 3: Clear cache
    clear_cache
    
    # Step 4: Handle port conflicts
    if check_port $PRIMARY_PORT; then
        log_warning "Port $PRIMARY_PORT is in use:"
        get_port_process $PRIMARY_PORT
        
        # Ask user what to do
        read -p "Kill process on port $PRIMARY_PORT? (y/n/f for fallback): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port_process $PRIMARY_PORT
            if check_port $PRIMARY_PORT; then
                log_error "Could not free port $PRIMARY_PORT"
                log "Falling back to port $FALLBACK_PORT"
                
                if check_port $FALLBACK_PORT; then
                    log_error "Fallback port $FALLBACK_PORT is also in use"
                    get_port_process $FALLBACK_PORT
                    exit 1
                fi
                
                start_nextjs $FALLBACK_PORT
            else
                start_nextjs $PRIMARY_PORT
            fi
        elif [[ $REPLY =~ ^[Ff]$ ]]; then
            log "Using fallback port $FALLBACK_PORT"
            
            if check_port $FALLBACK_PORT; then
                log_warning "Fallback port $FALLBACK_PORT is also in use"
                get_port_process $FALLBACK_PORT
                kill_port_process $FALLBACK_PORT
            fi
            
            start_nextjs $FALLBACK_PORT
        else
            log_error "Cannot start - port $PRIMARY_PORT is in use"
            exit 1
        fi
    else
        log_success "Port $PRIMARY_PORT is available"
        start_nextjs $PRIMARY_PORT
    fi
}

# Help function
show_help() {
    cat << EOF
BookedBarber V2 - Reliable Frontend Startup Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help      Show this help message
    -c, --clean     Force clean cache before starting
    -p, --port PORT Use specific port (default: 3000)
    -f, --force     Force kill any processes on target port
    -q, --quiet     Run in quiet mode (less output)

Examples:
    $0                  # Start normally
    $0 --clean          # Clean cache and start
    $0 --port 3001      # Start on port 3001
    $0 --force --clean  # Force clean and kill processes

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -c|--clean)
            log "Force clean mode enabled"
            clear_cache
            ;;
        -p|--port)
            if [[ -n $2 && $2 =~ ^[0-9]+$ ]]; then
                PRIMARY_PORT=$2
                shift
            else
                log_error "Invalid port number: $2"
                exit 1
            fi
            ;;
        -f|--force)
            log "Force mode enabled"
            if check_port $PRIMARY_PORT; then
                kill_port_process $PRIMARY_PORT
            fi
            ;;
        -q|--quiet)
            # Redirect output to suppress some messages
            exec 3>&1 1>/dev/null
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done

# Run main function
main