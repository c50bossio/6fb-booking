#!/bin/bash

# Test CORS configuration for Railway deployment

echo "=== Testing CORS Configuration for Railway ==="
echo ""

BACKEND_URL="https://sixfb-backend.onrender.com"
RAILWAY_ORIGIN="https://web-production-92a6c.up.railway.app"

echo "Backend URL: $BACKEND_URL"
echo "Railway Frontend Origin: $RAILWAY_ORIGIN"
echo ""

# Test 1: Health endpoint OPTIONS request (preflight)
echo "1. Testing preflight request to /api/v1/health:"
echo "   curl -I -X OPTIONS $BACKEND_URL/api/v1/health \\"
echo "     -H \"Origin: $RAILWAY_ORIGIN\" \\"
echo "     -H \"Access-Control-Request-Method: GET\""
echo ""
echo "Response headers:"
curl -I -X OPTIONS "$BACKEND_URL/api/v1/health" \
  -H "Origin: $RAILWAY_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" 2>/dev/null | grep -E "(HTTP|Access-Control-|access-control-)"

echo ""
echo "2. Testing preflight request to /api/v1/auth/token:"
echo "   curl -I -X OPTIONS $BACKEND_URL/api/v1/auth/token \\"
echo "     -H \"Origin: $RAILWAY_ORIGIN\" \\"
echo "     -H \"Access-Control-Request-Method: POST\""
echo ""
echo "Response headers:"
curl -I -X OPTIONS "$BACKEND_URL/api/v1/auth/token" \
  -H "Origin: $RAILWAY_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>/dev/null | grep -E "(HTTP|Access-Control-|access-control-)"

echo ""
echo "3. Testing actual GET request to /health:"
echo "   curl -I -X GET $BACKEND_URL/health \\"
echo "     -H \"Origin: $RAILWAY_ORIGIN\""
echo ""
echo "Response headers:"
curl -I -X GET "$BACKEND_URL/health" \
  -H "Origin: $RAILWAY_ORIGIN" 2>/dev/null | grep -E "(HTTP|Access-Control-|access-control-)"

echo ""
echo "=== Expected Results ==="
echo "✅ HTTP/2 200 or HTTP/2 204 status code"
echo "✅ Access-Control-Allow-Origin: $RAILWAY_ORIGIN"
echo "✅ Access-Control-Allow-Methods: includes GET, POST, OPTIONS"
echo "✅ Access-Control-Allow-Headers: includes Content-Type, Authorization"
echo "✅ Access-Control-Allow-Credentials: true"
echo ""
echo "If you see 'Disallowed CORS origin' or missing headers:"
echo "1. Update ALLOWED_ORIGINS on Render (see backend/RENDER_ENV_UPDATE.md)"
echo "2. Wait for the service to redeploy (usually 2-3 minutes)"
echo "3. Run this test again"
