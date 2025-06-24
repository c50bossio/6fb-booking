#!/bin/bash

# Create a snapshot of the current project state
# Useful for creating restore points before major changes

echo "📸 Creating Project Snapshot - 6FB Booking Platform"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create snapshots directory
SNAPSHOT_DIR=".snapshots"
mkdir -p "$SNAPSHOT_DIR"

# Generate snapshot name
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BRANCH=$(git branch --show-current)
SNAPSHOT_NAME="snapshot-${BRANCH}-${TIMESTAMP}"
SNAPSHOT_PATH="$SNAPSHOT_DIR/$SNAPSHOT_NAME"

echo "Creating snapshot: ${BLUE}$SNAPSHOT_NAME${NC}"
echo ""

# Create snapshot directory
mkdir -p "$SNAPSHOT_PATH"

# 1. Save git information
echo "1. Saving git state..."
git rev-parse HEAD > "$SNAPSHOT_PATH/git-commit.txt"
git status --porcelain > "$SNAPSHOT_PATH/git-status.txt"
git diff > "$SNAPSHOT_PATH/git-diff.patch"
git diff --staged > "$SNAPSHOT_PATH/git-diff-staged.patch"
echo -e "${GREEN}✓${NC} Git state saved"

# 2. Save branch information
echo "2. Saving branch information..."
echo "$BRANCH" > "$SNAPSHOT_PATH/branch.txt"
git log --oneline -10 > "$SNAPSHOT_PATH/recent-commits.txt"
echo -e "${GREEN}✓${NC} Branch information saved"

# 3. Save environment info
echo "3. Saving environment information..."
# Backend dependencies
if [ -f "backend/requirements.txt" ]; then
    cp "backend/requirements.txt" "$SNAPSHOT_PATH/backend-requirements.txt"
fi
# Frontend dependencies
if [ -f "frontend/package.json" ]; then
    cp "frontend/package.json" "$SNAPSHOT_PATH/frontend-package.json"
fi
echo -e "${GREEN}✓${NC} Environment information saved"

# 4. Create metadata file
echo "4. Creating metadata..."
cat > "$SNAPSHOT_PATH/metadata.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$BRANCH",
  "commit": "$(git rev-parse HEAD)",
  "dirty": $([ -z "$(git status --porcelain)" ] && echo "false" || echo "true"),
  "description": "Snapshot created on $TIMESTAMP"
}
EOF
echo -e "${GREEN}✓${NC} Metadata created"

# 5. Create restore script
echo "5. Creating restore script..."
cat > "$SNAPSHOT_PATH/restore.sh" << 'EOF'
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
EOF

chmod +x "$SNAPSHOT_PATH/restore.sh"
echo -e "${GREEN}✓${NC} Restore script created"

# 6. Add to snapshot index
echo "6. Updating snapshot index..."
INDEX_FILE="$SNAPSHOT_DIR/index.txt"
echo "[$TIMESTAMP] $SNAPSHOT_NAME - Branch: $BRANCH, Commit: $(git rev-parse --short HEAD)" >> "$INDEX_FILE"
echo -e "${GREEN}✓${NC} Index updated"

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}✓ Snapshot created successfully!${NC}"
echo ""
echo "Snapshot location: ${BLUE}$SNAPSHOT_PATH${NC}"
echo ""
echo "To restore this snapshot later:"
echo "  ./scripts/restore-snapshot.sh $SNAPSHOT_NAME"
echo ""
echo "To list all snapshots:"
echo "  ls -la $SNAPSHOT_DIR/"
echo ""
echo "To view snapshot index:"
echo "  cat $SNAPSHOT_DIR/index.txt"
