#!/bin/bash

# Script to fix Railway deployment issues with calendar demo pages

echo "🚀 Railway Deployment Fix for Calendar Demo Pages"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}Step 1: Verifying local files exist${NC}"
echo "--------------------------------------"

FILES=(
    "frontend/src/app/enhanced-calendar-demo/page.tsx"
    "frontend/src/app/simple-calendar-demo/page.tsx"
    "frontend/src/app/test-calendar/page.tsx"
    "frontend/src/app/calendar-demo/page.tsx"
)

all_exist=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing!"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo -e "\n${RED}Error: Some files are missing. Cannot proceed.${NC}"
    exit 1
fi

echo -e "\n${BLUE}Step 2: Creating deployment marker${NC}"
echo "-----------------------------------"

# Create a deployment marker file to force Railway to rebuild
cat > frontend/src/app/deployment-marker.txt << EOF
Railway Deployment Marker
========================
Created: $(date)
Purpose: Force Railway to rebuild and include calendar demo pages

Calendar Demo Pages:
- /enhanced-calendar-demo
- /simple-calendar-demo
- /test-calendar
- /calendar-demo

This file can be safely deleted after deployment.
EOF

echo -e "${GREEN}✓${NC} Created deployment marker file"

echo -e "\n${BLUE}Step 3: Preparing git commits${NC}"
echo "------------------------------"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠${NC} You have uncommitted changes. Adding all frontend changes..."
    git add frontend/
    git add scripts/verify-calendar-pages.sh
    git add scripts/fix-railway-deployment.sh

    git commit -m "fix: Add calendar demo pages and ensure Railway deployment

- Added simple-calendar-demo page with basic drag-drop
- Added enhanced-calendar-demo page with advanced features
- Added test-calendar page for verification
- Fixed import issues in enhanced calendar demo
- Added deployment marker to force Railway rebuild

These pages demonstrate the calendar functionality without requiring authentication."
else
    echo "No uncommitted changes. Creating empty commit to force rebuild..."
    git commit --allow-empty -m "chore: Force Railway rebuild for calendar demo pages"
fi

echo -e "\n${BLUE}Step 4: Push to trigger Railway deployment${NC}"
echo "------------------------------------------"

echo "Ready to push. This will trigger Railway deployment."
echo -e "\n${YELLOW}Commands to run:${NC}"
echo "1. git push origin main"
echo ""
echo "After pushing, monitor the deployment:"
echo "2. railway logs"
echo ""
echo "Once deployed (usually 3-5 minutes), test the pages:"
echo "3. ./scripts/verify-calendar-pages.sh"

echo -e "\n${BLUE}Additional Railway-specific commands:${NC}"
echo "--------------------------------------"
echo "If pages still show 404 after deployment:"
echo ""
echo "Option 1 - Clear build cache and redeploy:"
echo "  railway up --no-cache"
echo ""
echo "Option 2 - Check deployment logs:"
echo "  railway logs --tail 100"
echo ""
echo "Option 3 - SSH into Railway and check files:"
echo "  railway run ls -la .next/standalone/app"
echo ""
echo "Option 4 - Force rebuild with environment change:"
echo "  railway variables set FORCE_REBUILD=$(date +%s)"
echo "  railway up"

echo -e "\n${GREEN}✅ Fix script complete!${NC}"
echo "Follow the steps above to deploy the calendar demo pages."
