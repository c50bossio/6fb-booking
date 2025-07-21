#!/bin/bash

# Worktree-Aware Development Session Launcher for BookedBarber V2
# This script automatically detects worktree context and delegates appropriately

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to detect if we're in a worktree context
detect_worktree_context() {
    local current_path=$(pwd)
    
    # Check for worktree indicators
    if [[ "$current_path" == *"/6fb-booking-features/"* ]] || 
       [[ "$current_path" == *"/6fb-booking-staging"* ]] || 
       [[ "$current_path" == *"/6fb-booking"* ]]; then
        return 0
    fi
    return 1
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}🚀 BookedBarber V2 - Development Session Launcher${NC}"
echo "================================================"
echo ""

# Check if we should use worktree-aware version
if detect_worktree_context; then
    echo -e "${GREEN}ℹ️  Detected worktree environment - using worktree-aware launcher${NC}"
    echo ""
    
    # Check if worktree-aware script exists
    if [ -f "$SCRIPT_DIR/start-dev-session-worktree.sh" ]; then
        exec "$SCRIPT_DIR/start-dev-session-worktree.sh" "$@"
    else
        echo -e "${RED}❌ Error: worktree-aware script not found${NC}"
        echo "Expected: $SCRIPT_DIR/start-dev-session-worktree.sh"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Not in a worktree context - using standard launcher${NC}"
    echo ""
    
    # Legacy behavior for non-worktree usage
    BACKEND_V2_DIR="$ROOT_DIR/backend-v2"
    
    # Check if backend-v2 directory exists
    if [ ! -d "$BACKEND_V2_DIR" ]; then
        echo -e "${RED}❌ Error: backend-v2 directory not found at $BACKEND_V2_DIR${NC}"
        exit 1
    fi
    
    # Check if the comprehensive script exists
    if [ -f "$BACKEND_V2_DIR/scripts/start-dev-clean.sh" ]; then
        echo -e "${GREEN}ℹ️  Using comprehensive startup script...${NC}"
        echo ""
        exec "$BACKEND_V2_DIR/scripts/start-dev-clean.sh" "$@"
    else
        echo -e "${RED}❌ Error: start-dev-clean.sh not found in backend-v2/scripts/${NC}"
        echo ""
        echo "Please ensure you have the latest scripts by running:"
        echo "  git pull"
        echo ""
        echo "Or create the scripts manually from the backend-v2/scripts directory"
        exit 1
    fi
fi