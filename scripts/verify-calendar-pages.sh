#!/bin/bash

# Script to verify calendar demo pages are deployed correctly

echo "🔍 Verifying Calendar Demo Pages Deployment"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if production URL is provided, otherwise use default
PRODUCTION_URL=${1:-"https://sixfb.bookbarber.com"}

echo -e "\n📍 Testing against: $PRODUCTION_URL"

# List of pages to check
PAGES=(
    "/enhanced-calendar-demo"
    "/simple-calendar-demo"
    "/test-calendar"
    "/calendar-demo"
    "/dashboard"  # This should work as a control test
)

echo -e "\n🧪 Testing pages..."
echo "-------------------"

for page in "${PAGES[@]}"; do
    URL="$PRODUCTION_URL$page"

    # Make the request and get the status code
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓${NC} $page - Status: $STATUS"
    elif [ "$STATUS" = "404" ]; then
        echo -e "${RED}✗${NC} $page - Status: $STATUS (Not Found)"
    else
        echo -e "${YELLOW}⚠${NC} $page - Status: $STATUS"
    fi
done

echo -e "\n📂 Local File Check"
echo "-------------------"

# Check if files exist locally
FILES=(
    "frontend/src/app/enhanced-calendar-demo/page.tsx"
    "frontend/src/app/simple-calendar-demo/page.tsx"
    "frontend/src/app/test-calendar/page.tsx"
    "frontend/src/app/calendar-demo/page.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file missing"
    fi
done

echo -e "\n🔧 Deployment Recommendations"
echo "-----------------------------"

echo "1. If pages show 404 but files exist locally:"
echo "   - Clear Railway build cache: railway up --no-cache"
echo "   - Force redeploy: git commit --allow-empty -m 'Force Railway rebuild'"
echo ""
echo "2. Check Railway logs for build errors:"
echo "   - railway logs"
echo ""
echo "3. Verify Next.js is building these pages:"
echo "   - Check build output for the page routes"
echo "   - Ensure no TypeScript/import errors"
echo ""
echo "4. For standalone builds (production), ensure:"
echo "   - Pages are included in .next/standalone"
echo "   - No dynamic imports preventing static generation"

# Check if git is up to date
echo -e "\n📊 Git Status"
echo "-------------"
UNCOMMITTED=$(git status --porcelain | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} You have uncommitted changes. Make sure to commit and push!"
else
    echo -e "${GREEN}✓${NC} Working directory clean"
fi

# Check current branch
BRANCH=$(git branch --show-current)
echo -e "Current branch: ${YELLOW}$BRANCH${NC}"

# Check if pushed
UNPUSHED=$(git log origin/$BRANCH..$BRANCH --oneline | wc -l)
if [ "$UNPUSHED" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} You have $UNPUSHED unpushed commits"
else
    echo -e "${GREEN}✓${NC} All commits pushed"
fi

echo -e "\n✅ Verification complete!"
