#!/bin/bash

# GitHub Secrets Setup Script for BookedBarber V2 Deployment
# This script helps configure the required GitHub secrets for automated deployment

set -e

echo "🔐 GitHub Secrets Setup for BookedBarber V2"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${BLUE}📁 Repository: $REPO${NC}"
echo ""

echo "🚀 Setting up GitHub Secrets for automated deployment..."
echo ""

# Function to set secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_optional=$3
    
    echo -e "${BLUE}Setting: $secret_name${NC}"
    echo "Description: $secret_description"
    
    if [ "$is_optional" = "optional" ]; then
        echo -e "${YELLOW}(Optional - press Enter to skip)${NC}"
    fi
    
    echo -n "Enter value: "
    read -s secret_value
    echo ""
    
    if [ -z "$secret_value" ] && [ "$is_optional" = "optional" ]; then
        echo -e "${YELLOW}⏭️  Skipped${NC}"
    elif [ -n "$secret_value" ]; then
        if gh secret set "$secret_name" --body "$secret_value" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Set successfully${NC}"
        else
            echo -e "${RED}❌ Failed to set secret${NC}"
        fi
    else
        echo -e "${RED}❌ Required secret cannot be empty${NC}"
        return 1
    fi
    echo ""
}

# Required Render Deploy Hooks
echo -e "${YELLOW}📋 RENDER DEPLOY HOOKS (Required)${NC}"
echo "Get these from your Render service settings → Deploy Hooks"
echo ""

set_secret "RENDER_STAGING_BACKEND_DEPLOY_HOOK" "Render staging backend deploy webhook URL" "required"
set_secret "RENDER_STAGING_FRONTEND_DEPLOY_HOOK" "Render staging frontend deploy webhook URL" "required"
set_secret "RENDER_PRODUCTION_BACKEND_DEPLOY_HOOK" "Render production backend deploy webhook URL" "required"
set_secret "RENDER_PRODUCTION_FRONTEND_DEPLOY_HOOK" "Render production frontend deploy webhook URL" "required"

# Render API Configuration
echo -e "${YELLOW}📋 RENDER API CONFIGURATION (Required)${NC}"
echo "Get API key from Render Account Settings → API Keys"
echo ""

set_secret "RENDER_API_KEY" "Render API key for migration hooks and service management" "required"
set_secret "RENDER_STAGING_MIGRATION_HOOK" "Staging database migration webhook URL" "required"
set_secret "RENDER_PRODUCTION_MIGRATION_HOOK" "Production database migration webhook URL" "required"

# Health Check URLs
echo -e "${YELLOW}📋 HEALTH CHECK URLS (Required)${NC}"
echo "Set these to your staging and production URLs"
echo ""

echo "Enter staging backend URL (e.g., https://staging-api.bookedbarber.com):"
set_secret "STAGING_BACKEND_URL" "Staging backend health check URL" "required"

echo "Enter staging frontend URL (e.g., https://staging.bookedbarber.com):"
set_secret "STAGING_FRONTEND_URL" "Staging frontend health check URL" "required"

# Optional Notifications
echo -e "${YELLOW}📋 OPTIONAL NOTIFICATIONS${NC}"
echo ""

set_secret "SLACK_WEBHOOK" "Slack webhook URL for deployment notifications" "optional"

echo ""
echo -e "${GREEN}🎉 GitHub Secrets setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Set up your Render services using RENDER_STAGING_SETUP_GUIDE.md"
echo "2. Push to staging branch to test deployment"
echo "3. Monitor GitHub Actions workflow"
echo "4. Verify staging.bookedbarber.com is accessible"
echo ""
echo -e "${BLUE}🔍 To verify secrets were set:${NC}"
echo "gh secret list"
echo ""
echo -e "${BLUE}📊 To monitor deployments:${NC}"
echo "- GitHub Actions: https://github.com/$REPO/actions"
echo "- Render Dashboard: https://dashboard.render.com"
echo ""
echo -e "${GREEN}✅ Setup script completed successfully!${NC}"