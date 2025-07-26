#!/bin/bash

# Test script for V1 functionality on Render staging
echo "🧪 Testing V1 Functionality on Render Staging"
echo "=============================================="

BASE_URL="https://sixfb-backend-v2.onrender.com"

echo ""
echo "1. Testing Health Check..."
echo "Endpoint: $BASE_URL/health"
response=$(curl -s -w "%{http_code}" "$BASE_URL/health" --max-time 10)
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "200" ]; then
    echo "✅ Health check passed (HTTP $http_code)"
    echo "Response: $response_body"
else
    echo "❌ Health check failed (HTTP $http_code)"
    echo "Response: $response_body"
fi

echo ""
echo "2. Testing V1 Auth Login (invalid credentials)..."
echo "Endpoint: $BASE_URL/api/v1/auth/login"
response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}' \
  --max-time 10)
  
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "401" ] || [ "$http_code" = "422" ]; then
    echo "✅ V1 login endpoint working (HTTP $http_code) - proper error handling"
    echo "Response: $response_body"
else
    echo "⚠️  Unexpected login response: HTTP $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "3. Testing V1 Auth Register endpoint..."
echo "Endpoint: $BASE_URL/api/v1/auth/register"
response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass","full_name":"Test User"}' \
  --max-time 10)
  
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "422" ] || [ "$http_code" = "400" ] || [ "$http_code" = "409" ]; then
    echo "✅ V1 register endpoint working (HTTP $http_code) - validation working"
    echo "Response: $response_body"
elif [ "$http_code" = "201" ]; then
    echo "✅ V1 register endpoint working (HTTP $http_code) - registration successful"
    echo "Response: $response_body"
else
    echo "⚠️  Unexpected register response: HTTP $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "4. Testing V1 Auth Me endpoint (unauthorized)..."
echo "Endpoint: $BASE_URL/api/v1/auth/me"
response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/api/v1/auth/me" \
  -H "Content-Type: application/json" \
  --max-time 10)
  
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo "✅ V1 auth/me endpoint working (HTTP $http_code) - requires authentication"
    echo "Response: $response_body"
else
    echo "⚠️  Unexpected auth/me response: HTTP $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "5. Testing Frontend accessibility..."
echo "Endpoint: https://sixfb-frontend-v2.onrender.com"
response=$(curl -s -w "%{http_code}" -I "https://sixfb-frontend-v2.onrender.com" --max-time 10)
http_code=${response: -3}

if [ "$http_code" = "200" ]; then
    echo "✅ Frontend accessible (HTTP $http_code)"
else
    echo "⚠️  Frontend response: HTTP $http_code"
fi

echo ""
echo "=============================================="
echo "V1 System Assessment Summary:"
echo "- Health check status"
echo "- Authentication endpoints working"  
echo "- Frontend accessibility"
echo "- Basic API validation functioning"
echo "=============================================="