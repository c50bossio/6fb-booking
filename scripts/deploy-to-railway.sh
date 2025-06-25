#!/bin/bash

# Railway Deployment Script for 6FB Booking Platform
# This script automates the deployment process to Railway

set -e

echo "🚀 Railway Deployment for 6FB Booking Platform"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check login status
echo "🔐 Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "❌ Please login to Railway first:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI is ready!"

# Ask for deployment type
echo ""
echo "What would you like to deploy?"
echo "1) Backend API only"
echo "2) Frontend only"
echo "3) Both Backend and Frontend"
read -p "Enter choice (1, 2, or 3): " deploy_choice

# Function to deploy backend
deploy_backend() {
    echo ""
    echo "🔧 Deploying Backend API..."

    # Navigate to project root for backend deployment
    cd "$(dirname "$0")/.."

    # Check if backend railway.toml exists
    if [ ! -f "railway.toml" ]; then
        echo "❌ Backend railway.toml not found!"
        exit 1
    fi

    # Deploy backend
    echo "🚀 Starting backend deployment..."
    railway up --detach

    if [ $? -eq 0 ]; then
        echo "✅ Backend deployed successfully!"

        # Get backend URL
        backend_url=$(railway domain 2>/dev/null || echo "URL not available yet")
        if [ "$backend_url" != "URL not available yet" ]; then
            echo "🔗 Backend URL: https://$backend_url"
            echo "📊 Health check: https://$backend_url/api/v1/health"
            echo "📖 API docs: https://$backend_url/docs"
        fi
    else
        echo "❌ Backend deployment failed!"
        echo "💡 Check logs with: railway logs"
        return 1
    fi
}

# Function to deploy frontend
deploy_frontend() {
    echo ""
    echo "🎨 Deploying Frontend..."

    # Navigate to frontend directory
    cd "$(dirname "$0")/../frontend"

    # Check if frontend railway.toml exists
    if [ ! -f "railway.toml" ]; then
        echo "❌ Frontend railway.toml not found!"
        exit 1
    fi

    # Deploy frontend
    echo "🚀 Starting frontend deployment..."
    railway up --detach

    if [ $? -eq 0 ]; then
        echo "✅ Frontend deployed successfully!"

        # Get frontend URL
        frontend_url=$(railway domain 2>/dev/null || echo "URL not available yet")
        if [ "$frontend_url" != "URL not available yet" ]; then
            echo "🔗 Frontend URL: https://$frontend_url"
        fi
    else
        echo "❌ Frontend deployment failed!"
        echo "💡 Check logs with: railway logs"
        return 1
    fi
}

# Execute deployment based on choice
case $deploy_choice in
    1)
        deploy_backend
        ;;
    2)
        deploy_frontend
        ;;
    3)
        echo "🔄 Deploying both services..."

        # Deploy backend first
        deploy_backend
        backend_success=$?

        # Deploy frontend
        deploy_frontend
        frontend_success=$?

        # Summary
        echo ""
        echo "📋 Deployment Summary:"
        if [ $backend_success -eq 0 ]; then
            echo "✅ Backend: Success"
        else
            echo "❌ Backend: Failed"
        fi

        if [ $frontend_success -eq 0 ]; then
            echo "✅ Frontend: Success"
        else
            echo "❌ Frontend: Failed"
        fi
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process complete!"
echo ""
echo "📋 Useful commands:"
echo "- Check status: railway status"
echo "- View logs: railway logs"
echo "- Open app: railway open"
echo "- List variables: railway variables"
echo ""
echo "🆘 If you encounter issues:"
echo "1. Check deployment logs: railway logs"
echo "2. Verify environment variables: railway variables"
echo "3. Check service health: railway ps"
echo ""
echo "📚 Railway documentation: https://docs.railway.app"
