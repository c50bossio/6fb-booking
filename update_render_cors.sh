#!/bin/bash

# Update CORS origins on Render production deployment
# This script helps update the ALLOWED_ORIGINS environment variable

echo "CORS Update Guide for Render Deployment"
echo "======================================="
echo ""
echo "Current CORS origins should include:"
echo "- http://localhost:3000"
echo "- http://localhost:3001"
echo "- https://bookbarber-agndzzr3p-6fb.vercel.app"
echo "- https://bookbarber-nsr1tr6we-6fb.vercel.app"
echo "- https://bookbarber-nsenrjbs0-6fb.vercel.app"
echo "- https://bookbarber-6fb.vercel.app"
echo "- https://bookbarber.com"
echo ""
echo "TO UPDATE ON RENDER:"
echo "1. Go to https://dashboard.render.com"
echo "2. Navigate to your sixfb-backend service"
echo "3. Go to Environment tab"
echo "4. Update ALLOWED_ORIGINS variable to:"
echo ""
echo "ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://bookbarber-agndzzr3p-6fb.vercel.app,https://bookbarber-nsr1tr6we-6fb.vercel.app,https://bookbarber-nsenrjbs0-6fb.vercel.app,https://bookbarber-6fb.vercel.app,https://bookbarber.com"
echo ""
echo "5. Click 'Save Changes'"
echo "6. Wait for automatic redeploy"
echo ""
echo "The service will automatically restart with the new CORS configuration."
