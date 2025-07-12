#!/bin/bash

# 🚀 Deploy to Staging Script
# Quick deployment from localhost to staging environment
# Usage: ./deploy-to-staging.sh "Your commit message"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default commit message if none provided
COMMIT_MSG="${1:-feat: update from local development}"

echo -e "${BLUE}🚀 6FB Booking V2 - Deploy to Staging${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if we're in the right directory
if [ ! -f "backend-v2/main.py" ] || [ ! -f "backend-v2/frontend-v2/package.json" ]; then
    echo -e "${RED}❌ Error: Must run from 6fb-booking root directory${NC}"
    exit 1
fi

# Check if we're on the deployment-clean branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "deployment-clean" ]; then
    echo -e "${YELLOW}⚠️  Current branch: $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}⚠️  Switching to deployment-clean branch...${NC}"
    git checkout deployment-clean
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}📝 Found uncommitted changes. Adding them...${NC}"
    git status --short
    echo ""
    
    # Stage all changes
    git add .
    
    # Show what we're about to commit
    echo -e "${BLUE}📋 Changes to be committed:${NC}"
    git diff --cached --stat
    echo ""
    
    # Commit changes
    echo -e "${BLUE}💾 Committing changes...${NC}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ Changes committed successfully${NC}"
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
fi

# Push to origin
echo -e "${BLUE}🔄 Pushing to GitHub (deployment-clean branch)...${NC}"
git push origin deployment-clean

echo -e "${GREEN}✅ Code pushed successfully!${NC}"
echo ""

# Monitor deployment
echo -e "${BLUE}🔍 Monitoring staging deployment...${NC}"
echo -e "${BLUE}Backend:  https://sixfb-backend-v2-staging.onrender.com${NC}"
echo -e "${BLUE}Frontend: https://sixfb-frontend-v2-staging.onrender.com${NC}"
echo ""

# Check if staging backend is responding
echo -e "${YELLOW}⏳ Waiting for backend to respond...${NC}"
for i in {1..30}; do
    if curl -s --max-time 10 https://sixfb-backend-v2-staging.onrender.com/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is responding!${NC}"
        break
    else
        echo -n "."
        sleep 10
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend taking longer than expected. Check Render dashboard.${NC}"
    fi
done

# Check if frontend is responding
echo -e "${YELLOW}⏳ Checking frontend...${NC}"
if curl -s --max-time 10 -o /dev/null -w "%{http_code}" https://sixfb-frontend-v2-staging.onrender.com | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend is responding!${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be deploying. Check Render dashboard.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment initiated successfully!${NC}"
echo -e "${BLUE}📊 View deployment status: https://dashboard.render.com${NC}"
echo -e "${BLUE}🔗 Test your staging app: https://sixfb-frontend-v2-staging.onrender.com${NC}"
echo -e "${BLUE}📚 API docs: https://sixfb-backend-v2-staging.onrender.com/docs${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Deployment typically takes 3-5 minutes to complete${NC}"
echo -e "${YELLOW}💡 Use 'git commit -m \"message [skip render]\"' to skip auto-deploy${NC}"