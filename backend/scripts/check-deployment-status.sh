#!/bin/bash
# Simple script to check if Render deployment is using the latest code

echo "=== Render Deployment Status Check ==="
echo "Time: $(date)"
echo ""

echo "1. Checking backend health..."
HEALTH_RESULT=$(curl -s https://sixfb-backend.onrender.com/health)
echo "Health Response: $HEALTH_RESULT"

echo ""
echo "2. Checking root endpoint..."
ROOT_RESULT=$(curl -s https://sixfb-backend.onrender.com/)
echo "Root Response: $ROOT_RESULT"

echo ""
echo "3. Checking docs endpoint..."
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://sixfb-backend.onrender.com/docs)
echo "Docs Status Code: $DOCS_STATUS"

echo ""
echo "4. Recent git commits (for reference):"
git log --oneline -3

echo ""
echo "=== Status Check Complete ==="