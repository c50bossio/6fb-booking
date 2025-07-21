#!/bin/bash

# Worktree Context Detection Script
# This script detects the current worktree context and sets appropriate environment variables

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to detect current worktree context
detect_worktree_context() {
    local current_path=$(pwd)
    local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Initialize context variables
    export WORKTREE_TYPE=""
    export WORKTREE_NAME=""
    export BACKEND_PORT_BASE=""
    export FRONTEND_PORT_BASE=""
    export ENV_FILE=""
    export DATABASE_FILE=""
    
    # Check if we're in a feature worktree
    if [[ "$current_path" == *"/6fb-booking-features/"* ]]; then
        export WORKTREE_TYPE="feature"
        export WORKTREE_NAME=$(basename "$current_path")
        export BACKEND_PORT_BASE=8002
        export FRONTEND_PORT_BASE=3002
        export ENV_FILE=".env"
        export DATABASE_FILE="feature_$(echo $WORKTREE_NAME | sed 's/feature-//').db"
        echo -e "${BLUE}[WORKTREE]${NC} Detected feature worktree: $WORKTREE_NAME"
        return 0
    fi
    
    # Check if we're in staging worktree
    if [[ "$current_path" == *"/6fb-booking-staging"* ]]; then
        export WORKTREE_TYPE="staging"
        export WORKTREE_NAME="staging"
        export BACKEND_PORT_BASE=8001
        export FRONTEND_PORT_BASE=3001
        export ENV_FILE=".env.staging"
        export DATABASE_FILE="staging_6fb_booking.db"
        echo -e "${YELLOW}[WORKTREE]${NC} Detected staging worktree"
        return 0
    fi
    
    # Check if we're in main project
    if [[ "$current_path" == *"/6fb-booking"* ]] && [[ "$current_path" != *"/6fb-booking-"* ]]; then
        export WORKTREE_TYPE="main"
        export WORKTREE_NAME="main"
        export BACKEND_PORT_BASE=8000
        export FRONTEND_PORT_BASE=3000
        export ENV_FILE=".env"
        export DATABASE_FILE="6fb_booking.db"
        echo -e "${GREEN}[WORKTREE]${NC} Detected main worktree"
        return 0
    fi
    
    # Not in a recognized worktree
    echo -e "${RED}[WORKTREE]${NC} Not in a recognized worktree context"
    return 1
}

# Function to validate worktree environment
validate_worktree_environment() {
    if [ -z "$WORKTREE_TYPE" ]; then
        echo -e "${RED}[ERROR]${NC} Worktree type not detected"
        return 1
    fi
    
    # Check for required directories
    if [ ! -d "backend-v2" ]; then
        echo -e "${RED}[ERROR]${NC} backend-v2 directory not found"
        return 1
    fi
    
    if [ ! -d "backend-v2/frontend-v2" ]; then
        echo -e "${RED}[ERROR]${NC} frontend-v2 directory not found"
        return 1
    fi
    
    # Check environment file
    if [ ! -f "backend-v2/$ENV_FILE" ]; then
        echo -e "${YELLOW}[WARNING]${NC} Environment file not found: backend-v2/$ENV_FILE"
    fi
    
    echo -e "${GREEN}[WORKTREE]${NC} Environment validated for $WORKTREE_TYPE worktree"
    return 0
}

# Function to set worktree-specific aliases
set_worktree_aliases() {
    case $WORKTREE_TYPE in
        "feature")
            echo "alias wt-start='./scripts/start-dev-session-worktree.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-test='./scripts/parallel-tests-worktree.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-health='./scripts/health-check-worktree.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-db='sqlite3 backend-v2/$DATABASE_FILE'" >> ~/.bashrc.worktree.tmp
            ;;
        "staging")
            echo "alias wt-start='./scripts/start-dev-session-worktree.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-test='ENV_FILE=.env.staging ./scripts/parallel-tests-worktree.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-health='./scripts/health-check-worktree.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-db='sqlite3 backend-v2/$DATABASE_FILE'" >> ~/.bashrc.worktree.tmp
            ;;
        "main")
            echo "alias wt-start='./scripts/start-dev-session.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-test='./scripts/parallel-tests.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-health='./scripts/health-check.sh'" >> ~/.bashrc.worktree.tmp
            echo "alias wt-db='sqlite3 backend-v2/$DATABASE_FILE'" >> ~/.bashrc.worktree.tmp
            ;;
    esac
}

# Function to output context information for Claude hooks
output_context_info() {
    cat << EOF
WORKTREE_CONTEXT_DETECTED=true
WORKTREE_TYPE=$WORKTREE_TYPE
WORKTREE_NAME=$WORKTREE_NAME
BACKEND_PORT_BASE=$BACKEND_PORT_BASE
FRONTEND_PORT_BASE=$FRONTEND_PORT_BASE
ENV_FILE=$ENV_FILE
DATABASE_FILE=$DATABASE_FILE
CURRENT_PATH=$(pwd)
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
EOF
}

# Main function
main() {
    if detect_worktree_context && validate_worktree_environment; then
        set_worktree_aliases
        output_context_info
        return 0
    else
        echo "WORKTREE_CONTEXT_DETECTED=false"
        return 1
    fi
}

# Parse command line arguments
case "${1:-detect}" in
    "detect")
        main
        ;;
    "validate")
        detect_worktree_context && validate_worktree_environment
        ;;
    "info")
        detect_worktree_context && output_context_info
        ;;
    "aliases")
        detect_worktree_context && set_worktree_aliases
        ;;
    *)
        echo "Usage: $0 [detect|validate|info|aliases]"
        echo "  detect   - Full detection and validation (default)"
        echo "  validate - Just validate environment"
        echo "  info     - Output context info only"
        echo "  aliases  - Set worktree aliases only"
        exit 1
        ;;
esac