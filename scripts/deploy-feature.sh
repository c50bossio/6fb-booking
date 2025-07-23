#!/bin/bash
# deploy-feature.sh - Automated workflow for deploying features to staging and production
# Usage: ./scripts/deploy-feature.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Check if we're on a feature branch
if [[ ! "$CURRENT_BRANCH" =~ ^feature/ ]]; then
    echo -e "${RED}❌ Error: Not on a feature branch!${NC}"
    echo -e "Current branch: $CURRENT_BRANCH"
    echo -e "Feature branches should start with 'feature/'"
    exit 1
fi

echo -e "${BLUE}🚀 BookedBarber Feature Deployment Workflow${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "Current feature branch: ${GREEN}$CURRENT_BRANCH${NC}\n"

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}📋 Step 1: Checking for uncommitted changes...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ You have uncommitted changes!${NC}"
    git status -s
    echo -e "\n${YELLOW}Would you like to:${NC}"
    echo "1) Commit all changes"
    echo "2) Exit and handle manually"
    read -p "Choose (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        read -p "Enter commit message (e.g., 'fix: resolve dashboard issue'): " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed!${NC}"
    else
        echo -e "${YELLOW}Please commit your changes and run this script again.${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Working directory clean!${NC}"
fi

# Step 2: Push to GitHub
echo -e "\n${YELLOW}📤 Step 2: Pushing to GitHub...${NC}"
git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✅ Pushed to GitHub!${NC}"

# Step 3: Create PR to staging
echo -e "\n${YELLOW}🔄 Step 3: Creating PR to staging...${NC}"
echo -e "${BLUE}This will create a pull request to merge:${NC}"
echo -e "  ${GREEN}$CURRENT_BRANCH${NC} → ${GREEN}staging${NC}"
echo -e "\nPress Enter to continue or Ctrl+C to cancel..."
read

# Get the feature name from branch for PR title
FEATURE_NAME=$(echo "$CURRENT_BRANCH" | sed 's/feature\///' | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

# Create the PR
gh pr create --base staging --title "$FEATURE_NAME" \
  --body "## Summary
Auto-generated PR from feature branch: $CURRENT_BRANCH

## Changes
Please add a description of your changes here.

## Test Plan
- [ ] Tested locally
- [ ] Ready for staging deployment

## Deployment
This PR will auto-deploy to staging.bookedbarber.com when merged.

🤖 Generated with deploy-feature.sh" || {
    echo -e "${YELLOW}PR might already exist. Checking...${NC}"
    PR_URL=$(gh pr list --head "$CURRENT_BRANCH" --json url -q '.[0].url')
    if [ -n "$PR_URL" ]; then
        echo -e "${GREEN}✅ PR already exists: $PR_URL${NC}"
    fi
}

# Step 4: Show next steps
echo -e "\n${GREEN}✨ Feature branch deployed!${NC}"
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo -e "1. ${YELLOW}Review and merge the PR${NC} on GitHub"
echo -e "2. ${YELLOW}Test on staging${NC}: https://staging.bookedbarber.com"
echo -e "3. ${YELLOW}When ready for production${NC}, run:"
echo -e "   ${GREEN}./scripts/promote-to-production.sh${NC}"
echo -e "\n${BLUE}🔗 Quick Links:${NC}"
echo -e "GitHub PR: ${GREEN}$(gh pr list --head "$CURRENT_BRANCH" --json url -q '.[0].url')${NC}"
echo -e "Staging: ${GREEN}https://staging.bookedbarber.com${NC}"