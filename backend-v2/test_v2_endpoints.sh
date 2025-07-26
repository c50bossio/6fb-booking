#!/bin/bash

# Test script for V2 authentication endpoints on Render staging
echo "🔍 Testing V2 Authentication Endpoints on Render Staging"
echo "======================================================="

BASE_URL="https://sixfb-backend-v2.onrender.com"

echo ""
echo "1. Testing V2 Auth Login endpoint..."
echo "Endpoint: $BASE_URL/api/v2/auth/login"
response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v2/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}' \
  --max-time 10)
  
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "404" ]; then
    echo "❌ V2 login endpoint not found (404)"
elif [ "$http_code" = "422" ] || [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
    echo "✅ V2 login endpoint found (HTTP $http_code) - endpoint exists"
    echo "Response: $response_body"
else
    echo "⚠️  Unexpected response: HTTP $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "2. Testing V2 Auth Me endpoint..."
echo "Endpoint: $BASE_URL/api/v2/auth/me"
response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/api/v2/auth/me" \
  -H "Content-Type: application/json" \
  --max-time 10)
  
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "404" ]; then
    echo "❌ V2 auth/me endpoint not found (404)"
elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo "✅ V2 auth/me endpoint found (HTTP $http_code) - requires authentication"
    echo "Response: $response_body"
else
    echo "⚠️  Unexpected response: HTTP $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "3. Testing V1 endpoints for comparison..."
echo "Endpoint: $BASE_URL/api/v1/auth/login"
response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}' \
  --max-time 10)
  
http_code=${response: -3}
response_body=${response%???}

if [ "$http_code" = "422" ] || [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
    echo "✅ V1 login endpoint working (HTTP $http_code)"
else
    echo "⚠️  V1 endpoint response: HTTP $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "======================================================="
echo "Summary:"
echo "- If V2 endpoints return 404: Deployment not updated yet"
echo "- If V2 endpoints return 401/422: Deployment successful"
echo "- Wait 5-10 minutes after push for Render to redeploy"
echo "======================================================="