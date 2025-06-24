#!/bin/bash

# Branch recovery script - safely returns to main branch
# Use this when you need to abandon current branch and return to stable main

echo "🌿 Branch Recovery - 6FB Booking Platform"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get current branch
current_branch=$(git branch --show-current)
main_branch="main"

# Check if main branch exists, otherwise use master
if ! git show-ref --verify --quiet refs/heads/main; then
    main_branch="master"
fi

echo "Current branch: ${BLUE}$current_branch${NC}"
echo "Main branch: ${BLUE}$main_branch${NC}"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    git status --short
    echo ""
    echo "Options:"
    echo "1) Stash changes and switch to $main_branch"
    echo "2) Commit changes before switching"
    echo "3) Discard changes and switch (dangerous!)"
    echo "4) Cancel"
    echo ""
    read -p "Choose option (1-4): " -n 1 -r choice
    echo ""

    case $choice in
        1)
            echo "Stashing changes..."
            stash_name="recovery-from-$current_branch-$(date +%Y%m%d-%H%M%S)"
            git stash push -u -m "$stash_name"
            echo -e "${GREEN}✓${NC} Changes stashed as: $stash_name"
            ;;
        2)
            echo "Please commit your changes first:"
            echo "  git add ."
            echo "  git commit -m 'WIP: Recovery checkpoint'"
            exit 0
            ;;
        3)
            echo -e "${RED}⚠️  Discarding all changes...${NC}"
            git checkout -- .
            git clean -fd
            ;;
        *)
            echo "Recovery cancelled."
            exit 0
            ;;
    esac
fi

# Switch to main branch
echo ""
echo "Switching to $main_branch branch..."
git checkout $main_branch

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Successfully switched to $main_branch"

    # Update from remote
    echo ""
    echo "Updating from remote..."
    git pull origin $main_branch

    echo ""
    echo -e "${GREEN}✓ Branch recovery completed!${NC}"
    echo ""
    echo "You are now on the $main_branch branch."

    # Show stash info if we stashed
    if [ "$choice" == "1" ]; then
        echo ""
        echo "Your changes are saved in stash. To recover them:"
        echo "  • View stashes: git stash list"
        echo "  • Apply latest stash: git stash pop"
        echo "  • Apply specific stash: git stash apply stash@{n}"
    fi

    # Suggest next steps
    echo ""
    echo "Next steps:"
    echo "1. Create a new feature branch: git checkout -b feature/new-feature"
    echo "2. Or continue on existing branch: git checkout $current_branch"
else
    echo -e "${RED}✗ Failed to switch branches${NC}"
    exit 1
fi
