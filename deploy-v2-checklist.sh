#!/bin/bash

echo "🚀 BookedBarber V2 Deployment Checklist"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ Error: render.yaml not found. Run from project root.${NC}"
    exit 1
fi

echo "📋 Pre-Deployment Checks:"
echo ""

# 1. Check Git status
echo -n "1. Git Status: "
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ Clean${NC}"
else
    echo -e "${YELLOW}⚠️  Uncommitted changes${NC}"
    echo "   Run: git add . && git commit -m 'Deploy V2 to Render'"
fi

# 2. Check backend requirements
echo -n "2. Backend Requirements: "
if [ -f "backend-v2/requirements.txt" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# 3. Check frontend package.json
echo -n "3. Frontend Package.json: "
if [ -f "backend-v2/frontend-v2/package.json" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# 4. Check Python version
echo -n "4. Python Version: "
if [ -f "backend-v2/runtime.txt" ]; then
    cat backend-v2/runtime.txt
else
    echo -e "${YELLOW}⚠️  No runtime.txt (will use default)${NC}"
fi

# 5. Check Node version
echo -n "5. Node Version: "
if grep -q "NODE_VERSION" render.yaml; then
    echo -e "${GREEN}✅ Specified in render.yaml${NC}"
else
    echo -e "${YELLOW}⚠️  Not specified${NC}"
fi

echo ""
echo "📝 Required Environment Variables on Render:"
echo ""
echo "Backend V2 (sixfb-backend-v2):"
echo "  - STRIPE_SECRET_KEY (from .env)"
echo "  - STRIPE_PUBLISHABLE_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - STRIPE_CONNECT_CLIENT_ID"
echo "  - SENDGRID_API_KEY"
echo "  - SENDGRID_FROM_EMAIL"
echo "  - TWILIO_ACCOUNT_SID"
echo "  - TWILIO_AUTH_TOKEN"
echo "  - TWILIO_PHONE_NUMBER"
echo "  - SENTRY_DSN (optional)"
echo ""
echo "Frontend V2 (sixfb-frontend-v2):"
echo "  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "  - NEXT_PUBLIC_GA_TRACKING_ID (optional)"
echo ""

echo "🚀 Deployment Steps:"
echo "1. Push to GitHub: git push origin feature/marketing-integrations-20250702"
echo "2. Go to https://dashboard.render.com"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect your GitHub repo"
echo "5. Select branch: feature/marketing-integrations-20250702"
echo "6. Render will create all services from render.yaml"
echo "7. Add environment variables in each service's dashboard"
echo "8. Wait for build completion (~10-15 minutes)"
echo ""
echo "✅ Post-Deployment Verification:"
echo "- Backend health: https://sixfb-backend-v2.onrender.com/health"
echo "- Frontend: https://sixfb-frontend-v2.onrender.com"
echo "- API docs: https://sixfb-backend-v2.onrender.com/docs"
echo ""
echo "📊 Database Migration:"
echo "After deployment, run in Render shell:"
echo "cd backend-v2 && alembic upgrade head"