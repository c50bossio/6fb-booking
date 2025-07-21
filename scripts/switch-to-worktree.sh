#!/bin/bash

# switch-to-worktree.sh - Quick navigation helper for worktrees
# Usage: ./scripts/switch-to-worktree.sh [worktree-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Function to show available worktrees
show_available_worktrees() {
    print_header "Available Worktrees:"
    echo
    
    echo "📁 Main Worktree:"
    echo "   main     - /Users/bossio/6fb-booking (develop branch)"
    echo
    
    if [ -d "/Users/bossio/6fb-booking-staging" ]; then
        echo "🏢 Staging Worktree:"
        echo "   staging  - /Users/bossio/6fb-booking-staging"
        echo
    fi
    
    local features_found=false
    local worktree_list=$(git worktree list | grep "6fb-booking-features" || true)
    
    if [ -n "$worktree_list" ]; then
        echo "🚀 Feature Worktrees:"
        echo "$worktree_list" | while read -r worktree_line; do
            local worktree_path=$(echo "$worktree_line" | awk '{print $1}')
            local feature_name=$(basename "$worktree_path")
            echo "   $feature_name - $worktree_path"
        done
        echo
    fi
}

# Function to open worktree in specified applications
open_worktree() {
    local worktree_path=$1
    local worktree_name=$2
    
    print_status "Opening worktree: $worktree_name"
    print_status "Location: $worktree_path"
    echo
    
    # Check if VS Code is available
    if command -v code &> /dev/null; then
        print_status "Opening in VS Code..."
        code "$worktree_path"
        print_success "VS Code opened"
    else
        print_warning "VS Code not found in PATH"
    fi
    
    # Open in Finder (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Opening in Finder..."
        open "$worktree_path"
        print_success "Finder opened"
    fi
    
    # Open terminal at location
    print_status "Navigation command:"
    echo "cd $worktree_path"
    
    # Show available scripts in the worktree
    if [ -f "$worktree_path/start-feature-dev.sh" ]; then
        echo
        print_status "Available development scripts:"
        echo "  ./start-feature-dev.sh    # Start development servers"
        echo "  ./stop-feature-dev.sh     # Stop development servers"
    elif [ -f "$worktree_path/start-staging.sh" ]; then
        echo
        print_status "Available staging scripts:"
        echo "  ./start-staging.sh        # Start staging environment"
        echo "  ./stop-staging.sh         # Stop staging environment"
        echo "  ./reset-staging.sh        # Reset staging data"
        echo "  ./deploy-to-staging.sh    # Deploy to staging"
    fi
    
    # Show git status
    cd "$worktree_path"
    local branch=$(git branch --show-current)
    local status=$(git status --porcelain | wc -l | xargs)
    
    echo
    print_status "Git Status:"
    echo "  Branch: $branch"
    if [ "$status" -gt 0 ]; then
        echo "  Changes: $status uncommitted changes"
    else
        echo "  Changes: Working directory clean"
    fi
}

# Main script logic
if [ -z "$1" ]; then
    print_error "Worktree name is required!"
    echo
    echo "Usage: $0 [worktree-name]"
    echo
    show_available_worktrees
    exit 1
fi

WORKTREE_NAME="$1"

# Handle special cases
case "$WORKTREE_NAME" in
    "main"|"develop")
        WORKTREE_PATH="/Users/bossio/6fb-booking"
        DISPLAY_NAME="Main (develop branch)"
        ;;
    "staging")
        WORKTREE_PATH="/Users/bossio/6fb-booking-staging"
        DISPLAY_NAME="Staging"
        if [ ! -d "$WORKTREE_PATH" ]; then
            print_error "Staging worktree not found!"
            print_status "Run: ./scripts/setup-staging-worktree.sh"
            exit 1
        fi
        ;;
    *)
        # Assume it's a feature name
        WORKTREE_PATH="/Users/bossio/6fb-booking-features/$WORKTREE_NAME"
        DISPLAY_NAME="Feature: $WORKTREE_NAME"
        if [ ! -d "$WORKTREE_PATH" ]; then
            print_error "Feature worktree not found: $WORKTREE_PATH"
            echo
            print_status "Available feature worktrees:"
            if [ -d "/Users/bossio/6fb-booking-features" ]; then
                for feature_dir in /Users/bossio/6fb-booking-features/*/; do
                    if [ -d "$feature_dir" ]; then
                        local feature_name=$(basename "$feature_dir")
                        echo "  - $feature_name"
                    fi
                done
            else
                echo "  (No feature worktrees found)"
            fi
            echo
            print_status "To create a new feature worktree:"
            echo "  ./scripts/create-feature-worktree.sh $WORKTREE_NAME"
            exit 1
        fi
        ;;
esac

# Verify worktree exists and is tracked by git
if ! git worktree list | grep -q "$WORKTREE_PATH"; then
    print_error "Worktree not tracked by git: $WORKTREE_PATH"
    print_status "This may be an orphaned directory."
    echo
    print_status "To fix this issue:"
    echo "  1. Remove the directory: rm -rf '$WORKTREE_PATH'"
    echo "  2. Recreate the worktree using appropriate script"
    exit 1
fi

# Open the worktree
open_worktree "$WORKTREE_PATH" "$DISPLAY_NAME"

echo
print_success "Worktree operations completed!"

# For convenience, also create a cd alias suggestion
echo
print_status "💡 Pro Tip: Add this to your shell profile for quick navigation:"
echo "alias cdmain='cd /Users/bossio/6fb-booking'"
echo "alias cdstaging='cd /Users/bossio/6fb-booking-staging'"
echo "alias cdfeature='cd /Users/bossio/6fb-booking-features'"