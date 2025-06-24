#!/bin/bash
# CORS Testing Script for 6FB Booking Platform
# Tests CORS configuration between Vercel frontend and Render backend

set -e

BACKEND_URL="https://sixfb-backend.onrender.com"
FRONTEND_URL="https://bookbarber-fz9nh51da-6fb.vercel.app"

echo "🔍 Testing CORS configuration..."
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Method: $method, Endpoint: $endpoint"

    if [ "$method" = "OPTIONS" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nCORS_ORIGIN:%{header_access_control_allow_origin}" \
            -X OPTIONS \
            -H "Origin: $FRONTEND_URL" \
            -H "Access-Control-Request-Method: POST" \
            -H "Access-Control-Request-Headers: Content-Type, Authorization" \
            "$BACKEND_URL$endpoint" 2>/dev/null || echo "CURL_ERROR")
    elif [ -n "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nCORS_ORIGIN:%{header_access_control_allow_origin}" \
            -X "$method" \
            -H "Origin: $FRONTEND_URL" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BACKEND_URL$endpoint" 2>/dev/null || echo "CURL_ERROR")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nCORS_ORIGIN:%{header_access_control_allow_origin}" \
            -H "Origin: $FRONTEND_URL" \
            "$BACKEND_URL$endpoint" 2>/dev/null || echo "CURL_ERROR")
    fi

    if [[ "$response" == *"CURL_ERROR"* ]]; then
        echo -e "${RED}❌ Request failed - network error${NC}"
        return 1
    fi

    # Extract HTTP code and CORS header
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    cors_origin=$(echo "$response" | grep "CORS_ORIGIN:" | cut -d: -f2-)

    echo "HTTP Status: $http_code"
    echo "CORS Origin Header: $cors_origin"

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        if [[ "$cors_origin" == *"$FRONTEND_URL"* ]] || [[ "$cors_origin" == "*" ]]; then
            echo -e "${GREEN}✅ Success - CORS properly configured${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Warning - Request succeeded but CORS header missing/incorrect${NC}"
            return 1
        fi
    elif [ "$http_code" -eq 405 ]; then
        echo -e "${YELLOW}⚠️  Method not allowed (expected for some endpoints)${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed - HTTP $http_code${NC}"
        return 1
    fi
}

# Test counter
passed=0
total=0

# Test 1: Health check
total=$((total + 1))
if test_endpoint "GET" "/health" "" "Health Check"; then
    passed=$((passed + 1))
fi

# Test 2: API Documentation
total=$((total + 1))
if test_endpoint "GET" "/docs" "" "API Documentation"; then
    passed=$((passed + 1))
fi

# Test 3: OPTIONS preflight for auth
total=$((total + 1))
if test_endpoint "OPTIONS" "/api/v1/auth/token" "" "CORS Preflight for Auth"; then
    passed=$((passed + 1))
fi

# Test 4: Auth endpoint (will fail with 422 but should have CORS headers)
total=$((total + 1))
if test_endpoint "POST" "/api/v1/auth/token" '{"username":"test@example.com","password":"test"}' "Login Endpoint"; then
    passed=$((passed + 1))
fi

# Test 5: API root
total=$((total + 1))
if test_endpoint "GET" "/api/v1/" "" "API Root"; then
    passed=$((passed + 1))
fi

# Summary
echo -e "\n================================"
echo -e "📊 Test Results: $passed/$total tests passed"

if [ $passed -eq $total ]; then
    echo -e "${GREEN}🎉 All tests passed! CORS is properly configured.${NC}"
    exit 0
elif [ $passed -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some tests passed. CORS may be partially working.${NC}"
    echo -e "${YELLOW}   Check Render environment variables if login still fails.${NC}"
    exit 1
else
    echo -e "${RED}❌ All tests failed. CORS needs to be configured.${NC}"
    echo -e "${RED}   Update Render environment variables immediately.${NC}"
    exit 1
fi

# Quick diagnostic
echo -e "\n🔧 Quick Diagnostic Commands:"
echo "1. Check backend health directly:"
echo "   curl $BACKEND_URL/health"
echo ""
echo "2. Test login with proper credentials:"
echo "   curl -X POST -H 'Content-Type: application/json' \\"
echo "        -d '{\"username\":\"admin@6fb.com\",\"password\":\"admin123\"}' \\"
echo "        $BACKEND_URL/api/v1/auth/token"
echo ""
echo "3. Check CORS in browser console:"
echo "   fetch('$BACKEND_URL/health').then(r=>r.text()).then(console.log)"
