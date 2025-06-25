#!/bin/bash

# Test Barber Payments Endpoints
echo "🧪 Testing Barber Payments Endpoints..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backend URL
BACKEND_URL="https://sixfb-backend.onrender.com"

# First, get auth token
echo -e "\n1️⃣  Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@6fb.com",
    "password": "TestPass123@"  # pragma: allowlist secret
  }')

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get auth token${NC}"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"

# Test each endpoint
echo -e "\n2️⃣  Testing /payment-splits/barbers..."
BARBERS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/v1/payment-splits/barbers" \
  -H "Authorization: Bearer $TOKEN")

if [[ $BARBERS_RESPONSE == *"["* ]]; then
    echo -e "${GREEN}✅ Barbers endpoint working${NC}"
    echo "Response preview: $(echo $BARBERS_RESPONSE | cut -c1-100)..."
else
    echo -e "${RED}❌ Barbers endpoint failed${NC}"
    echo "Response: $BARBERS_RESPONSE"
fi

echo -e "\n3️⃣  Testing /payment-splits/recent..."
RECENT_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/v1/payment-splits/recent" \
  -H "Authorization: Bearer $TOKEN")

if [[ $RECENT_RESPONSE == *"["* ]]; then
    echo -e "${GREEN}✅ Recent payments endpoint working${NC}"
    echo "Response preview: $(echo $RECENT_RESPONSE | cut -c1-100)..."
else
    echo -e "${RED}❌ Recent payments endpoint failed${NC}"
    echo "Response: $RECENT_RESPONSE"
fi

echo -e "\n4️⃣  Testing /payment-splits/commission-payments..."
COMMISSION_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/v1/payment-splits/commission-payments" \
  -H "Authorization: Bearer $TOKEN")

if [[ $COMMISSION_RESPONSE == *"["* ]]; then
    echo -e "${GREEN}✅ Commission payments endpoint working${NC}"
    echo "Response preview: $(echo $COMMISSION_RESPONSE | cut -c1-100)..."
else
    echo -e "${RED}❌ Commission payments endpoint failed${NC}"
    echo "Response: $COMMISSION_RESPONSE"
fi

echo -e "\n5️⃣  Testing /payment-splits/booth-rent..."
BOOTH_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/v1/payment-splits/booth-rent" \
  -H "Authorization: Bearer $TOKEN")

if [[ $BOOTH_RESPONSE == *"["* ]]; then
    echo -e "${GREEN}✅ Booth rent endpoint working${NC}"
    echo "Response preview: $(echo $BOOTH_RESPONSE | cut -c1-100)..."
else
    echo -e "${RED}❌ Booth rent endpoint failed${NC}"
    echo "Response: $BOOTH_RESPONSE"
fi

echo -e "\n📊 Summary:"
echo "   Backend: $BACKEND_URL"
echo "   Frontend: https://web-production-92a6c.up.railway.app/barber-payments"
echo ""
echo -e "${YELLOW}Visit the barber payments page to see if data loads!${NC}"
