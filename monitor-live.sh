#!/bin/bash

echo "🚀 Monitoring 6FB Booking Platform Deployment"
echo "=============================================="
echo "Started at: $(date)"
echo ""

while true; do
    echo "⏰ $(date '+%H:%M:%S') - Checking deployment status..."

    # Check if new API endpoint is available
    if curl -s https://sixfb-backend.onrender.com/api/v1/health | grep -q "healthy"; then
        echo "✅ SUCCESS! New deployment is live!"
        echo "🎉 API v1 endpoints are now available"
        curl -s https://sixfb-backend.onrender.com/api/v1/health | jq .
        break
    else
        echo "⏳ Still deploying... (new endpoints not ready)"
        # Check if old endpoint still works
        if curl -s https://sixfb-backend.onrender.com/health | grep -q "healthy"; then
            echo "   Old health endpoint still responding"
        else
            echo "   ⚠️  Service may be restarting"
        fi
    fi

    echo ""
    sleep 30  # Check every 30 seconds
done

echo ""
echo "🏁 Deployment monitoring complete!"
echo "✅ Your 6FB Booking Platform is live with the new API routing!"
