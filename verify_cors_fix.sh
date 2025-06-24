#!/bin/bash
# CORS Fix Verification Script for 6FB Booking Platform
# Run this after updating Render environment variables

set -e

BACKEND_URL="https://sixfb-backend.onrender.com"
FRONTEND_URL="https://bookbarber-fz9nh51da-6fb.vercel.app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 CORS Fix Verification for 6FB Booking Platform${NC}"
echo "=================================================="
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists curl; then
    echo -e "${RED}❌ curl is required but not installed${NC}"
    exit 1
fi

# Test 1: Backend Health
echo -e "${YELLOW}Test 1: Backend Health Check${NC}"
if curl -s --max-time 10 "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is online and responding${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    echo "   Make sure your Render service is running"
    exit 1
fi

# Test 2: CORS Headers Present
echo -e "\n${YELLOW}Test 2: CORS Headers Check${NC}"
cors_headers=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$cors_headers" ]; then
    echo -e "${GREEN}✅ CORS headers are present${NC}"
    echo "   $cors_headers"
else
    echo -e "${RED}❌ CORS headers are missing${NC}"
    echo "   Update Render environment variables and redeploy"
fi

# Test 3: Specific Origin Check
echo -e "\n${YELLOW}Test 3: Frontend Origin Allowed${NC}"
if echo "$cors_headers" | grep -q "$FRONTEND_URL"; then
    echo -e "${GREEN}✅ Your frontend domain is allowed${NC}"
elif echo "$cors_headers" | grep -q "\*"; then
    echo -e "${YELLOW}⚠️  Wildcard CORS detected (less secure but working)${NC}"
else
    echo -e "${RED}❌ Your frontend domain is not in CORS allowlist${NC}"
    echo "   Add this to Render ALLOWED_ORIGINS: $FRONTEND_URL"
fi

# Test 4: Preflight Request
echo -e "\n${YELLOW}Test 4: CORS Preflight (OPTIONS)${NC}"
preflight_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type, Authorization" \
    "$BACKEND_URL/api/v1/auth/token")

if [ "$preflight_status" = "200" ] || [ "$preflight_status" = "204" ]; then
    echo -e "${GREEN}✅ CORS preflight working (status: $preflight_status)${NC}"
else
    echo -e "${RED}❌ CORS preflight failed (status: $preflight_status)${NC}"
    echo "   Check FastAPI CORS middleware configuration"
fi

# Test 5: Actual API Request
echo -e "\n${YELLOW}Test 5: Real API Request${NC}"
api_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Origin: $FRONTEND_URL" \
    -H "Content-Type: application/json" \
    -d '{"username":"test@example.com","password":"test"}' \
    "$BACKEND_URL/api/v1/auth/token")

if [ "$api_status" = "422" ]; then
    echo -e "${GREEN}✅ API request working (422 expected for invalid credentials)${NC}"
elif [ "$api_status" = "200" ]; then
    echo -e "${GREEN}✅ API request successful${NC}"
else
    echo -e "${RED}❌ API request failed (status: $api_status)${NC}"
    echo "   This might indicate a CORS or server issue"
fi

# Overall Assessment
echo -e "\n${BLUE}=================================================="
echo -e "📊 OVERALL ASSESSMENT${NC}"

if [ -n "$cors_headers" ] && ([ "$preflight_status" = "200" ] || [ "$preflight_status" = "204" ]) && [ "$api_status" = "422" ]; then
    echo -e "${GREEN}🎉 CORS IS WORKING CORRECTLY!${NC}"
    echo ""
    echo "Your login should now work. Try these steps:"
    echo "1. Go to your frontend: $FRONTEND_URL"
    echo "2. Try logging in with admin@6fb.com / admin123"
    echo "3. Check browser console for any remaining errors"
    echo ""
    echo -e "${GREEN}✅ No further action needed${NC}"
elif [ -n "$cors_headers" ]; then
    echo -e "${YELLOW}⚠️  CORS IS PARTIALLY WORKING${NC}"
    echo ""
    echo "Some tests passed, but there may be issues:"
    echo "- CORS headers are present"
    echo "- Some requests may still fail"
    echo ""
    echo "Try logging in and check browser console for errors"
else
    echo -e "${RED}❌ CORS IS NOT WORKING${NC}"
    echo ""
    echo "Required actions:"
    echo "1. Go to https://dashboard.render.com"
    echo "2. Find your sixfb-backend service"
    echo "3. Add environment variable:"
    echo "   ALLOWED_ORIGINS=$FRONTEND_URL,http://localhost:3000"
    echo "4. Deploy the service"
    echo "5. Wait 2-3 minutes and run this script again"
    echo ""
    echo "Alternative: Use proxy mode by setting:"
    echo "   NEXT_PUBLIC_USE_CORS_PROXY=true"
fi

# Quick fix instructions
echo -e "\n${BLUE}🔧 QUICK FIX COMMANDS${NC}"
echo "If CORS is still broken, run these:"
echo ""
echo "# Test manually:"
echo "curl -H \"Origin: $FRONTEND_URL\" $BACKEND_URL/health"
echo ""
echo "# Enable proxy mode (in Vercel dashboard):"
echo "NEXT_PUBLIC_USE_CORS_PROXY=true"
echo ""
echo "# Test proxy endpoint:"
echo "curl https://your-vercel-app.vercel.app/api/proxy/health"

echo -e "\n${BLUE}📞 Need Help?${NC}"
echo "1. Check COMPLETE_CORS_SOLUTION_GUIDE.md for detailed steps"
echo "2. Open cors_test.html in your browser for interactive testing"
echo "3. Check Render service logs for error messages"
echo "4. Verify environment variables are saved in Render dashboard"
