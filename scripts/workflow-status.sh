#!/bin/bash
# workflow-status.sh - Check current workflow status and show next steps
# Usage: ./scripts/workflow-status.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 BookedBarber Workflow Status${NC}"
echo -e "${BLUE}===============================${NC}\n"

# Current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current Branch:${NC} ${GREEN}$CURRENT_BRANCH${NC}"

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}⚠️  Uncommitted changes detected!${NC}"
    git status -s | head -5
    echo -e "${YELLOW}Run: git add . && git commit -m 'your message'${NC}"
else
    echo -e "${GREEN}✅ Working directory clean${NC}"
fi

# Check if current branch exists on remote
if git ls-remote --exit-code --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Branch exists on GitHub${NC}"
    
    # Check for existing PRs
    STAGING_PR=$(gh pr list --head "$CURRENT_BRANCH" --base staging --json number,url -q '.[0]')
    PROD_PR=$(gh pr list --head staging --base production --json number,url -q '.[0]')
    
    if [ -n "$STAGING_PR" ]; then
        PR_URL=$(echo "$STAGING_PR" | jq -r '.url')
        echo -e "${GREEN}✅ PR to staging exists:${NC} $PR_URL"
    fi
    
    if [ -n "$PROD_PR" ]; then
        PR_URL=$(echo "$PROD_PR" | jq -r '.url')
        echo -e "${GREEN}✅ PR to production exists:${NC} $PR_URL"
    fi
else
    echo -e "${YELLOW}⚠️  Branch not pushed to GitHub yet${NC}"
fi

# Show appropriate next steps based on branch
echo -e "\n${BLUE}📋 Suggested Next Steps:${NC}"

if [[ "$CURRENT_BRANCH" =~ ^feature/ ]]; then
    echo -e "You're on a feature branch. Next steps:"
    echo -e "1. ${YELLOW}Finish your feature development${NC}"
    echo -e "2. ${YELLOW}Run:${NC} ${GREEN}./scripts/deploy-feature.sh${NC}"
    echo -e "   This will commit, push, and create PR to staging"
elif [ "$CURRENT_BRANCH" = "staging" ]; then
    echo -e "You're on staging branch. Options:"
    echo -e "1. ${YELLOW}Create new feature:${NC} ${GREEN}git checkout -b feature/name-$(date +%Y%m%d)${NC}"
    echo -e "2. ${YELLOW}Deploy to production:${NC} ${GREEN}./scripts/promote-to-production.sh${NC}"
elif [ "$CURRENT_BRANCH" = "production" ]; then
    echo -e "${RED}⚠️  You're on production branch!${NC}"
    echo -e "You should switch to staging: ${GREEN}git checkout staging${NC}"
else
    echo -e "${YELLOW}You're on a non-standard branch.${NC}"
    echo -e "Consider switching to staging: ${GREEN}git checkout staging${NC}"
fi

# Show recent activity
echo -e "\n${BLUE}📅 Recent Commits:${NC}"
git log --oneline -5

echo -e "\n${BLUE}🔗 Quick Commands:${NC}"
echo -e "Deploy feature:     ${GREEN}./scripts/deploy-feature.sh${NC}"
echo -e "Deploy to prod:     ${GREEN}./scripts/promote-to-production.sh${NC}"
echo -e "Cleanup branch:     ${GREEN}./scripts/cleanup-after-merge.sh${NC}"
echo -e "Check this status:  ${GREEN}./scripts/workflow-status.sh${NC}"