#!/bin/bash

# Railway Frontend Environment Variables Setup Script
# This script helps configure environment variables for 6FB Booking Platform frontend on Railway

echo "🚀 Railway Frontend Environment Variables Setup"
echo "=============================================="
echo ""

# Color codes for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Environment Variables for Railway Frontend Deployment${NC}"
echo ""

# Production environment variables
echo -e "${GREEN}=== REQUIRED ENVIRONMENT VARIABLES ===${NC}"
echo ""

echo -e "${YELLOW}1. API Configuration:${NC}"
echo "NEXT_PUBLIC_API_URL=https://your-backend-railway-app.railway.app/api/v1"
echo ""

echo -e "${YELLOW}2. Stripe Configuration:${NC}"
echo "# Get from: https://dashboard.stripe.com/apikeys"
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE"
echo ""

echo -e "${YELLOW}3. Google OAuth Configuration:${NC}"
echo "# Get from: https://console.cloud.google.com/"
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"
echo "GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE"
echo ""

echo -e "${YELLOW}4. NextAuth Configuration:${NC}"
echo "NEXTAUTH_URL=https://your-frontend-railway-app.railway.app"
echo "NEXTAUTH_SECRET=your-secure-nextauth-secret-key-change-this-in-production"
echo ""

echo -e "${YELLOW}5. WebSocket Configuration:${NC}"
echo "NEXT_PUBLIC_WS_URL=wss://your-backend-railway-app.railway.app/ws"
echo ""

echo -e "${GREEN}=== OPTIONAL ENVIRONMENT VARIABLES ===${NC}"
echo ""

echo -e "${YELLOW}6. Feature Flags:${NC}"
echo "NEXT_PUBLIC_ENABLE_ANALYTICS=true"
echo "NEXT_PUBLIC_ENABLE_WEBSOCKET=true"
echo "NEXT_PUBLIC_ENABLE_PAYMENTS=true"
echo ""

echo -e "${YELLOW}7. Environment Configuration:${NC}"
echo "NEXT_PUBLIC_ENVIRONMENT=production"
echo "NEXT_PUBLIC_DEMO_MODE=false"
echo ""

echo -e "${YELLOW}8. App Configuration:${NC}"
echo "NEXT_PUBLIC_APP_NAME=6FB Booking Platform"
echo "NEXT_PUBLIC_APP_URL=https://your-frontend-railway-app.railway.app"
echo ""

echo -e "${YELLOW}9. Image Optimization:${NC}"
echo "NEXT_PUBLIC_IMAGE_DOMAINS=your-backend-railway-app.railway.app,stripe.com"
echo ""

echo -e "${YELLOW}10. Cache Configuration:${NC}"
echo "NEXT_PUBLIC_CACHE_TTL=300000"
echo ""

echo -e "${GREEN}=== ANALYTICS & MONITORING (Optional) ===${NC}"
echo ""

echo -e "${YELLOW}11. Analytics Configuration:${NC}"
echo "# NEXT_PUBLIC_GA_TRACKING_ID=UA-XXXXXXXXX-X"
echo "# NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key"
echo "# NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com"
echo ""

echo -e "${YELLOW}12. Google Maps (Optional):${NC}"
echo "# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key"
echo ""

echo -e "${BLUE}📝 HOW TO SET ENVIRONMENT VARIABLES IN RAILWAY:${NC}"
echo ""
echo "1. Go to your Railway project dashboard"
echo "2. Click on your frontend service"
echo "3. Go to the 'Variables' tab"
echo "4. Click 'Add Variable' for each environment variable"
echo "5. Copy and paste the variable name and value"
echo ""

echo -e "${RED}⚠️  IMPORTANT NOTES:${NC}"
echo ""
echo "• Replace 'your-backend-railway-app.railway.app' with your actual backend Railway URL"
echo "• Replace 'your-frontend-railway-app.railway.app' with your actual frontend Railway URL"
echo "• Generate a secure NEXTAUTH_SECRET using: openssl rand -base64 32"
echo "• The Stripe key provided is for testing - use your production key for live deployment"
echo "• Variables starting with NEXT_PUBLIC_ are exposed to the browser"
echo "• Variables without NEXT_PUBLIC_ are server-side only"
echo ""

echo -e "${BLUE}🔧 RAILWAY CLI COMMANDS (Alternative Method):${NC}"
echo ""
echo "If you prefer using Railway CLI, you can set variables using:"
echo ""
echo "railway variables set NEXT_PUBLIC_API_URL=https://your-backend-railway-app.railway.app/api/v1"
echo "railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE"
echo "railway variables set NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"
echo "railway variables set GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE"
echo "railway variables set NEXTAUTH_URL=https://your-frontend-railway-app.railway.app"
echo "railway variables set NEXTAUTH_SECRET=your-secure-nextauth-secret-key"
echo "railway variables set NEXT_PUBLIC_WS_URL=wss://your-backend-railway-app.railway.app/ws"
echo "railway variables set NEXT_PUBLIC_ENABLE_ANALYTICS=true"
echo "railway variables set NEXT_PUBLIC_ENABLE_WEBSOCKET=true"
echo "railway variables set NEXT_PUBLIC_ENABLE_PAYMENTS=true"
echo "railway variables set NEXT_PUBLIC_ENVIRONMENT=production"
echo "railway variables set NEXT_PUBLIC_DEMO_MODE=false"
echo "railway variables set NEXT_PUBLIC_APP_NAME=\"6FB Booking Platform\""
echo "railway variables set NEXT_PUBLIC_APP_URL=https://your-frontend-railway-app.railway.app"
echo "railway variables set NEXT_PUBLIC_IMAGE_DOMAINS=your-backend-railway-app.railway.app,stripe.com"
echo "railway variables set NEXT_PUBLIC_CACHE_TTL=300000"
echo ""

echo -e "${GREEN}✅ VERIFICATION STEPS:${NC}"
echo ""
echo "After setting environment variables:"
echo "1. Redeploy your frontend service"
echo "2. Check the deployment logs for any errors"
echo "3. Visit your frontend URL and test functionality"
echo "4. Verify API connectivity in the browser console"
echo "5. Test authentication and payment flows"
echo ""

echo -e "${BLUE}🔍 TROUBLESHOOTING:${NC}"
echo ""
echo "If you encounter issues:"
echo "• Check Railway deployment logs for specific errors"
echo "• Verify all URLs are correct and accessible"
echo "• Ensure CORS is properly configured on your backend"
echo "• Test environment variables in Railway dashboard"
echo "• Check browser console for frontend errors"
echo ""

echo -e "${GREEN}✨ Setup Complete!${NC}"
echo ""
echo "Your Railway frontend environment variables are now configured."
echo "Remember to update the URLs with your actual Railway deployment URLs."