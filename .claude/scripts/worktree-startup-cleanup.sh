#!/bin/bash

# Worktree-Aware Startup Cleanup Script
# This script ensures clean startup for each worktree environment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Source worktree context detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/worktree-context-detection.sh" > /dev/null 2>&1

# Function to cleanup worktree-specific processes
cleanup_worktree_processes() {
    echo -e "${BLUE}[CLEANUP]${NC} Cleaning up processes for $WORKTREE_TYPE worktree"
    
    case $WORKTREE_TYPE in
        "feature")
            cleanup_port_range 8002 8022 "backend" 
            cleanup_port_range 3002 3022 "frontend"
            ;;
        "staging")
            cleanup_port_range 8001 8001 "staging-backend"
            cleanup_port_range 3001 3001 "staging-frontend"
            ;;
        "main")
            cleanup_port_range 8000 8000 "main-backend"
            cleanup_port_range 3000 3000 "main-frontend"
            ;;
    esac
}

# Function to cleanup processes on specific port range
cleanup_port_range() {
    local start_port=$1
    local end_port=$2
    local service_name=$3
    
    for port in $(seq $start_port $end_port); do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}[CLEANUP]${NC} Killing $service_name processes on port $port (PIDs: $pids)"
            
            for pid in $pids; do
                # Get process info before killing
                local proc_info=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
                
                # Kill gracefully first, then forcefully if needed
                kill $pid 2>/dev/null || true
                sleep 1
                
                if kill -0 $pid 2>/dev/null; then
                    echo -e "${RED}[CLEANUP]${NC} Force killing stubborn process $pid ($proc_info)"
                    kill -9 $pid 2>/dev/null || true
                fi
            done
            
            # Verify port is free
            sleep 1
            if lsof -ti:$port > /dev/null 2>&1; then
                echo -e "${RED}[CLEANUP]${NC} Warning: Port $port still in use after cleanup"
            else
                echo -e "${GREEN}[CLEANUP]${NC} Port $port cleaned successfully"
            fi
        fi
    done
}

# Function to cleanup worktree-specific files
cleanup_worktree_files() {
    echo -e "${BLUE}[CLEANUP]${NC} Cleaning up temporary files for $WORKTREE_TYPE worktree"
    
    # Clean up PID files
    local pid_files=("backend.pid" "frontend.pid" "*.pid")
    for pattern in "${pid_files[@]}"; do
        find . -maxdepth 2 -name "$pattern" -type f -delete 2>/dev/null || true
    done
    
    # Clean up log files older than 24 hours
    find .claude/logs/ -name "*.log" -mtime +1 -delete 2>/dev/null || true
    
    # Clean up test result directories older than 7 days
    find . -name "test-results-*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    # Clean up build artifacts
    case $WORKTREE_TYPE in
        "feature"|"staging"|"main")
            if [ -d "backend-v2/frontend-v2/.next" ]; then
                echo -e "${YELLOW}[CLEANUP]${NC} Removing stale .next build cache"
                rm -rf backend-v2/frontend-v2/.next/cache 2>/dev/null || true
            fi
            ;;
    esac
}

# Function to validate worktree environment after cleanup
validate_post_cleanup() {
    echo -e "${BLUE}[CLEANUP]${NC} Validating environment after cleanup"
    
    # Check if required directories exist
    if [ ! -d "backend-v2" ] || [ ! -d "backend-v2/frontend-v2" ]; then
        echo -e "${RED}[CLEANUP]${NC} Error: Required directories missing"
        return 1
    fi
    
    # Check if environment file exists
    if [ ! -f "backend-v2/$ENV_FILE" ]; then
        echo -e "${YELLOW}[CLEANUP]${NC} Warning: Environment file missing: backend-v2/$ENV_FILE"
        
        # Try to create from template for feature worktrees
        if [ "$WORKTREE_TYPE" = "feature" ] && [ -f "backend-v2/.env.feature.template" ]; then
            echo -e "${BLUE}[CLEANUP]${NC} Creating environment from template"
            cp "backend-v2/.env.feature.template" "backend-v2/$ENV_FILE"
            sed -i '' "s/{FEATURE_NAME}/$(echo $WORKTREE_NAME | sed 's/feature-//')/g" "backend-v2/$ENV_FILE"
        fi
    fi
    
    # Check database file for SQLite worktrees
    if [ ! -f "backend-v2/$DATABASE_FILE" ]; then
        echo -e "${YELLOW}[CLEANUP]${NC} Warning: Database file missing: backend-v2/$DATABASE_FILE"
        
        case $WORKTREE_TYPE in
            "staging")
                echo -e "${BLUE}[CLEANUP]${NC} Run './scripts/init-staging-database.sh' to create staging database"
                ;;
            "feature")
                echo -e "${BLUE}[CLEANUP]${NC} Feature database will be created automatically on first run"
                ;;
        esac
    fi
    
    echo -e "${GREEN}[CLEANUP]${NC} Post-cleanup validation completed"
    return 0
}

# Function to set up worktree-specific environment
setup_worktree_environment() {
    echo -e "${BLUE}[CLEANUP]${NC} Setting up environment for $WORKTREE_TYPE worktree"
    
    # Create logs directory if it doesn't exist
    mkdir -p .claude/logs
    
    # Create worktree-specific log file
    local log_file=".claude/logs/worktree-$WORKTREE_TYPE-$(date +%Y%m%d).log"
    touch "$log_file"
    
    # Export environment variables for the session
    export WORKTREE_ACTIVE="true"
    export WORKTREE_LOG_FILE="$log_file"
    
    # Create convenience aliases file
    cat > .claude/worktree-aliases-temp.sh << EOF
# Worktree-specific aliases for $WORKTREE_TYPE ($WORKTREE_NAME)
alias wt-type='echo "$WORKTREE_TYPE"'
alias wt-name='echo "$WORKTREE_NAME"'
alias wt-ports='echo "Backend: $BACKEND_PORT_BASE, Frontend: $FRONTEND_PORT_BASE"'
alias wt-env='echo "Env file: $ENV_FILE, Database: $DATABASE_FILE"'
alias wt-status='./scripts/worktree-status.sh'
alias wt-switch='./scripts/switch-to-worktree.sh'
EOF
    
    echo -e "${GREEN}[CLEANUP]${NC} Worktree environment setup completed"
}

# Main cleanup function
main() {
    echo -e "${BLUE}[CLEANUP]${NC} Worktree-aware startup cleanup initiated"
    
    if [ "$WORKTREE_CONTEXT_DETECTED" != "true" ]; then
        echo -e "${YELLOW}[CLEANUP]${NC} Not in worktree context - using standard cleanup"
        exec "$SCRIPT_DIR/cleanup-all-servers.sh" "$@"
        return $?
    fi
    
    echo -e "${GREEN}[CLEANUP]${NC} Detected $WORKTREE_TYPE worktree: $WORKTREE_NAME"
    
    # Run cleanup steps
    cleanup_worktree_processes
    cleanup_worktree_files
    setup_worktree_environment
    
    # Validate environment
    if validate_post_cleanup; then
        echo -e "${GREEN}[CLEANUP]${NC} Worktree cleanup completed successfully"
        echo -e "${BLUE}[CLEANUP]${NC} Ready for development in $WORKTREE_TYPE worktree"
        return 0
    else
        echo -e "${RED}[CLEANUP]${NC} Cleanup validation failed"
        return 1
    fi
}

# Handle direct execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi