#!/bin/bash
# cleanup-after-merge.sh - Clean up after feature is merged
# Usage: ./scripts/cleanup-after-merge.sh [feature-branch-name]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 BookedBarber Branch Cleanup${NC}"
echo -e "${BLUE}==============================${NC}\n"

# Get feature branch name from argument or find recent feature branches
if [ -n "$1" ]; then
    FEATURE_BRANCH="$1"
else
    # List recent feature branches
    echo -e "${YELLOW}Recent feature branches:${NC}"
    git branch -a | grep -E "feature/" | sed 's/remotes\/origin\///' | sort -u | tail -10
    echo -e "\n${YELLOW}Enter the feature branch name to clean up:${NC}"
    read -p "Branch name: " FEATURE_BRANCH
fi

# Ensure it's a feature branch
if [[ ! "$FEATURE_BRANCH" =~ ^feature/ ]]; then
    FEATURE_BRANCH="feature/$FEATURE_BRANCH"
fi

echo -e "\n${YELLOW}Cleaning up: ${GREEN}$FEATURE_BRANCH${NC}"

# Step 1: Switch to staging
echo -e "\n${YELLOW}📋 Step 1: Switching to staging branch...${NC}"
git checkout staging

# Step 2: Update staging
echo -e "\n${YELLOW}📥 Step 2: Updating staging with latest changes...${NC}"
git pull origin staging
echo -e "${GREEN}✅ Staging updated!${NC}"

# Step 3: Delete local feature branch
echo -e "\n${YELLOW}🗑️  Step 3: Deleting local feature branch...${NC}"
if git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
    git branch -D "$FEATURE_BRANCH"
    echo -e "${GREEN}✅ Local branch deleted!${NC}"
else
    echo -e "${YELLOW}Local branch doesn't exist or already deleted.${NC}"
fi

# Step 4: Delete remote feature branch
echo -e "\n${YELLOW}🌐 Step 4: Deleting remote feature branch...${NC}"
if git ls-remote --exit-code --heads origin "$FEATURE_BRANCH" >/dev/null 2>&1; then
    echo -e "${YELLOW}Delete remote branch $FEATURE_BRANCH? (yes/no)${NC}"
    read -p "Type 'yes' to delete: " confirm
    if [ "$confirm" = "yes" ]; then
        git push origin --delete "$FEATURE_BRANCH"
        echo -e "${GREEN}✅ Remote branch deleted!${NC}"
    else
        echo -e "${YELLOW}Remote branch kept.${NC}"
    fi
else
    echo -e "${YELLOW}Remote branch doesn't exist or already deleted.${NC}"
fi

# Step 5: Clean up any merged branches
echo -e "\n${YELLOW}🧹 Step 5: Cleaning up other merged branches...${NC}"
git remote prune origin
echo -e "${GREEN}✅ Cleaned up stale remote references!${NC}"

# Show current status
echo -e "\n${GREEN}✨ Cleanup complete!${NC}"
echo -e "\n${BLUE}📋 Current Status:${NC}"
echo -e "Current branch: ${GREEN}$(git branch --show-current)${NC}"
echo -e "Local branches:"
git branch | sed 's/^/  /'
echo -e "\n${BLUE}Ready for next feature! Use:${NC}"
echo -e "${GREEN}git checkout -b feature/new-feature-name-$(date +%Y%m%d)${NC}"