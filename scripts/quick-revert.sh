#!/bin/bash

# Quick revert script - safely reverts uncommitted changes
# Use this when you need to quickly undo recent changes

echo "🔄 Quick Revert - 6FB Booking Platform"
echo "====================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Show current status
echo "Current Git status:"
git status --short

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will discard all uncommitted changes!${NC}"
echo ""
echo "This will:"
echo "  • Discard all modified files"
echo "  • Remove all untracked files"
echo "  • Reset to the last commit"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Creating backup of current changes..."

    # Create a backup branch with current changes
    backup_branch="backup/revert-$(date +%Y%m%d-%H%M%S)"
    git stash push -u -m "Backup before quick revert"
    echo -e "${GREEN}✓${NC} Changes backed up to stash"
    echo "  To recover: git stash pop"

    # Reset all tracked files
    echo ""
    echo "Reverting tracked files..."
    git checkout -- .
    echo -e "${GREEN}✓${NC} Tracked files reverted"

    # Clean untracked files
    echo ""
    echo "Removing untracked files..."
    git clean -fd
    echo -e "${GREEN}✓${NC} Untracked files removed"

    echo ""
    echo -e "${GREEN}✓ Quick revert completed successfully!${NC}"
    echo ""
    echo "Current status:"
    git status --short

    echo ""
    echo "Recovery options:"
    echo "  • Restore backup: git stash pop"
    echo "  • View stash list: git stash list"
    echo "  • View what was stashed: git stash show -p"
else
    echo ""
    echo -e "${YELLOW}ℹ${NC}  Revert cancelled. No changes made."
fi
