#!/bin/bash
# Script to update CORS settings on Render

echo "To update CORS settings on Render:"
echo ""
echo "1. Go to your Render backend service dashboard"
echo "2. Navigate to the 'Environment' tab"
echo "3. Add or update this environment variable:"
echo ""
echo "CORS_ALLOWED_ORIGINS=https://sixfb-frontend.onrender.com,http://localhost:3000,http://localhost:3001"
echo ""
echo "4. Save the changes - your service will automatically redeploy"
echo ""
echo "This will allow your frontend at https://sixfb-frontend.onrender.com to communicate with your backend API."