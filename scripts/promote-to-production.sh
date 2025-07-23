#!/bin/bash
# promote-to-production.sh - Deploy staging to production after testing
# Usage: ./scripts/promote-to-production.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 BookedBarber Production Deployment${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Step 1: Ensure we're on staging branch
echo -e "${YELLOW}📋 Step 1: Checking branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo -e "${YELLOW}Switching to staging branch...${NC}"
    git checkout staging
fi

# Step 2: Pull latest staging
echo -e "\n${YELLOW}📥 Step 2: Updating staging branch...${NC}"
git pull origin staging
echo -e "${GREEN}✅ Staging branch updated!${NC}"

# Step 3: Confirm deployment
echo -e "\n${RED}⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️${NC}"
echo -e "${YELLOW}This will deploy staging → production (bookedbarber.com)${NC}"
echo -e "\n${BLUE}Pre-deployment checklist:${NC}"
echo -e "[ ] Tested all features on staging.bookedbarber.com"
echo -e "[ ] No critical bugs found"
echo -e "[ ] Performance is acceptable"
echo -e "[ ] Database migrations (if any) are safe"
echo -e "\n${YELLOW}Are you sure you want to deploy to production? (yes/no)${NC}"
read -p "Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Production deployment cancelled.${NC}"
    exit 0
fi

# Step 4: Create PR from staging to production
echo -e "\n${YELLOW}🔄 Step 4: Creating production PR...${NC}"

# Get recent commits for PR description
RECENT_COMMITS=$(git log production..staging --oneline --no-merges | head -5)

gh pr create --base production --title "Release: Deploy staging to production $(date +%Y-%m-%d)" \
  --body "## 🚀 Production Release

### Recent Changes
\`\`\`
$RECENT_COMMITS
\`\`\`

### Deployment Checklist
- [x] Tested on staging environment
- [x] All features working correctly
- [x] No critical issues found
- [x] Ready for production

### Deployment
This PR will auto-deploy to bookedbarber.com when merged.

🤖 Generated with promote-to-production.sh" || {
    echo -e "${YELLOW}PR might already exist. Checking...${NC}"
    PR_URL=$(gh pr list --base production --head staging --json url -q '.[0].url')
    if [ -n "$PR_URL" ]; then
        echo -e "${GREEN}✅ PR already exists: $PR_URL${NC}"
    fi
}

# Step 5: Show next steps
echo -e "\n${GREEN}✨ Production PR created!${NC}"
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo -e "1. ${YELLOW}Review and merge the PR${NC} on GitHub"
echo -e "2. ${YELLOW}Monitor production${NC}: https://bookedbarber.com"
echo -e "3. ${YELLOW}Check for any issues${NC} in the first 30 minutes"
echo -e "\n${BLUE}🔗 Quick Links:${NC}"
echo -e "GitHub PR: ${GREEN}$(gh pr list --base production --head staging --json url -q '.[0].url')${NC}"
echo -e "Production: ${GREEN}https://bookedbarber.com${NC}"
echo -e "Staging: ${GREEN}https://staging.bookedbarber.com${NC}"