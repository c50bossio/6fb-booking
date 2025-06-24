#!/bin/bash

# Restore from a project snapshot
# Usage: ./restore-snapshot.sh [snapshot-name]

echo "🔄 Restore from Snapshot - 6FB Booking Platform"
echo "============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SNAPSHOT_DIR=".snapshots"

# Check if snapshots directory exists
if [ ! -d "$SNAPSHOT_DIR" ]; then
    echo -e "${RED}✗ No snapshots found${NC}"
    echo "  Create a snapshot first with: ./scripts/create-snapshot.sh"
    exit 1
fi

# If no snapshot name provided, list available snapshots
if [ -z "$1" ]; then
    echo "Available snapshots:"
    echo ""

    if [ -f "$SNAPSHOT_DIR/index.txt" ]; then
        cat "$SNAPSHOT_DIR/index.txt" | nl
    else
        ls -1 "$SNAPSHOT_DIR" | grep -E "^snapshot-" | nl
    fi

    echo ""
    echo "Usage: $0 <snapshot-name>"
    echo "Example: $0 snapshot-main-20240101-120000"
    exit 0
fi

SNAPSHOT_NAME="$1"
SNAPSHOT_PATH="$SNAPSHOT_DIR/$SNAPSHOT_NAME"

# Check if snapshot exists
if [ ! -d "$SNAPSHOT_PATH" ]; then
    echo -e "${RED}✗ Snapshot not found: $SNAPSHOT_NAME${NC}"
    echo "  Run without arguments to see available snapshots"
    exit 1
fi

# Show snapshot information
echo "Snapshot information:"
if [ -f "$SNAPSHOT_PATH/metadata.json" ]; then
    echo -e "${BLUE}$(cat "$SNAPSHOT_PATH/metadata.json" | python -m json.tool 2>/dev/null || cat "$SNAPSHOT_PATH/metadata.json")${NC}"
else
    echo "  Branch: $(cat "$SNAPSHOT_PATH/branch.txt" 2>/dev/null || echo "unknown")"
    echo "  Commit: $(cat "$SNAPSHOT_PATH/git-commit.txt" 2>/dev/null || echo "unknown")"
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will modify your working directory!${NC}"
echo ""
echo "This will:"
echo "  • Stash any current changes"
echo "  • Checkout the snapshot's commit"
echo "  • Apply any uncommitted changes from the snapshot"
echo ""

# Check current state
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}You have uncommitted changes that will be stashed.${NC}"
    git status --short
    echo ""
fi

read -p "Continue with restore? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""

    # 1. Stash current changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "Stashing current changes..."
        stash_msg="Pre-restore backup $(date +%Y%m%d-%H%M%S)"
        git stash push -u -m "$stash_msg"
        echo -e "${GREEN}✓${NC} Current changes stashed"
    fi

    # 2. Read snapshot commit
    if [ -f "$SNAPSHOT_PATH/git-commit.txt" ]; then
        target_commit=$(cat "$SNAPSHOT_PATH/git-commit.txt")
        echo ""
        echo "Checking out commit: $target_commit"

        # Try to checkout the commit
        if git checkout "$target_commit" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Checked out snapshot commit"
        else
            echo -e "${RED}✗ Failed to checkout commit${NC}"
            echo "  The commit may no longer exist in your repository"
            exit 1
        fi
    fi

    # 3. Apply uncommitted changes if any
    if [ -f "$SNAPSHOT_PATH/git-diff.patch" ] && [ -s "$SNAPSHOT_PATH/git-diff.patch" ]; then
        echo ""
        echo "Applying uncommitted changes from snapshot..."
        if git apply "$SNAPSHOT_PATH/git-diff.patch" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Applied uncommitted changes"
        else
            echo -e "${YELLOW}⚠${NC}  Some changes could not be applied (conflicts)"
        fi
    fi

    # 4. Restore branch name if on same commit
    if [ -f "$SNAPSHOT_PATH/branch.txt" ]; then
        snapshot_branch=$(cat "$SNAPSHOT_PATH/branch.txt")
        echo ""
        read -p "Checkout branch '$snapshot_branch'? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout -B "$snapshot_branch"
            echo -e "${GREEN}✓${NC} Switched to branch: $snapshot_branch"
        fi
    fi

    echo ""
    echo "================================================"
    echo -e "${GREEN}✓ Restore completed!${NC}"
    echo ""
    echo "Current state:"
    echo "  Branch: $(git branch --show-current)"
    echo "  Commit: $(git rev-parse --short HEAD)"
    echo ""
    echo "Your previous changes are saved in stash."
    echo "To view stashes: git stash list"
    echo "To recover them: git stash pop"

else
    echo ""
    echo "Restore cancelled. No changes made."
fi
