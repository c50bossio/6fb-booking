#!/bin/bash

# Frontend Deployment Helper Script
# This script helps deploy the frontend to various platforms

echo "6FB Frontend Deployment Helper"
echo "=============================="
echo ""
echo "Select deployment platform:"
echo "1) Vercel (Recommended)"
echo "2) Render"
echo "3) Netlify"
echo "4) Docker (Local)"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "Deploying to Vercel..."
        cd frontend-v2
        
        # Check if vercel is installed
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        
        echo "Starting Vercel deployment..."
        vercel --prod
        ;;
        
    2)
        echo "Deploying to Render..."
        echo "Make sure your render.yaml is committed and push to trigger deployment:"
        echo ""
        echo "git add -A"
        echo "git commit -m 'Deploy frontend to Render'"
        echo "git push origin main"
        echo ""
        echo "Then check https://dashboard.render.com for deployment status"
        ;;
        
    3)
        echo "Deploying to Netlify..."
        cd frontend-v2
        
        # Check if netlify-cli is installed
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm i -g netlify-cli
        fi
        
        echo "Starting Netlify deployment..."
        netlify deploy --prod
        ;;
        
    4)
        echo "Building and running with Docker..."
        docker-compose up -d frontend
        echo ""
        echo "Frontend is starting at http://localhost:3000"
        echo "Backend is at http://localhost:8000"
        echo ""
        echo "To view logs: docker-compose logs -f frontend"
        echo "To stop: docker-compose down"
        ;;
        
    5)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "Deployment process completed!"