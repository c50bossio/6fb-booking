#!/bin/bash

echo "Checking frontend deployment status..."
echo "This may take 3-5 minutes for Render to build and deploy."
echo ""

count=0
max_attempts=20  # 5 minutes max (15 seconds * 20)

while [ $count -lt $max_attempts ]; do
    count=$((count + 1))
    echo -n "Attempt $count/$max_attempts: "

    # Check if the login page has been updated
    if curl -s https://sixfb-frontend-paby.onrender.com/login | grep -q "Sign in to 6FB Platform"; then
        echo "✅ Deployment complete! Login page is ready."
        echo ""
        echo "You can now visit: https://sixfb-frontend-paby.onrender.com/login"
        echo "Login with:"
        echo "  Email: c50bossio@gmail.com"
        echo "  Password: Welcome123!"
        exit 0
    else
        echo "Still deploying..."
        if [ $count -lt $max_attempts ]; then
            sleep 15
        fi
    fi
done

echo ""
echo "⚠️  Deployment is taking longer than expected."
echo "Check the Render dashboard for build status."
