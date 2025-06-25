#!/bin/bash

# Test Live 6FB System
echo "🧪 Testing Live 6FB System..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Backend URL
BACKEND_URL="https://sixfb-backend.onrender.com"
FRONTEND_URL="https://web-production-92a6c.up.railway.app"

echo -e "\n1️⃣  Testing Backend Health..."
HEALTH=$(curl -s "$BACKEND_URL/api/v1/health")
if [[ $HEALTH == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

echo -e "\n2️⃣  Creating Test User..."
REGISTER=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@6fb.com",
    "password": "TestPass123@",
    "first_name": "Test",
    "last_name": "User"
  }')

if [[ $REGISTER == *"id"* ]]; then
    echo -e "${GREEN}✅ User registration works${NC}"
    EMAIL=$(echo $REGISTER | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ Registration failed: $REGISTER${NC}"
    EMAIL="testuser1@6fb.com"
fi

echo -e "\n3️⃣  Testing Login..."
LOGIN=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "TestPass123@"
  }')

if [[ $LOGIN == *"access_token"* ]]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    TOKEN=$(echo $LOGIN | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ Login failed: $LOGIN${NC}"
fi

echo -e "\n4️⃣  Testing Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend returned status: $FRONTEND_STATUS${NC}"
fi

echo -e "\n5️⃣  Testing CORS..."
CORS_TEST=$(curl -s -H "Origin: $FRONTEND_URL" -I "$BACKEND_URL/api/v1/health" | grep -i "access-control-allow-origin")
if [[ $CORS_TEST == *"$FRONTEND_URL"* ]]; then
    echo -e "${GREEN}✅ CORS is properly configured${NC}"
else
    echo -e "${RED}❌ CORS needs configuration${NC}"
    echo "   Add to Render environment: ALLOWED_ORIGINS=$FRONTEND_URL"
fi

echo -e "\n📊 Summary:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo "   API Docs: $BACKEND_URL/docs"
echo ""
echo "Next: Add environment variables to Render dashboard"
