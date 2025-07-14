#!/bin/bash
# Auto-generated restore script

echo "🔄 Restoring from snapshot..."
echo ""

# Get the directory of this script
SNAPSHOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SNAPSHOT_DIR/../../.." && pwd )"

cd "$PROJECT_ROOT"

# Show current state
echo "Current commit: $(git rev-parse HEAD)"
echo "Target commit: $(cat "$SNAPSHOT_DIR/git-commit.txt")"
echo ""

read -p "This will restore git state. Continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Stash current changes
    git stash push -u -m "Backup before restore from snapshot"

    # Checkout the commit
    git checkout $(cat "$SNAPSHOT_DIR/git-commit.txt")

    # Apply any uncommitted changes that were present
    if [ -s "$SNAPSHOT_DIR/git-diff.patch" ]; then
        git apply "$SNAPSHOT_DIR/git-diff.patch"
    fi

    echo ""
    echo "✓ Restore completed!"
    echo "  Your current changes are stashed. Use 'git stash pop' to recover them."
else
    echo "Restore cancelled."
fi
