#!/bin/bash

# Quick Deploy Script for 6FB Booking Platform
# This script helps deploy both backend and frontend quickly

echo "🚀 6FB Booking Platform - Quick Deploy Script"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists git; then
    echo -e "${RED}❌ Git is not installed. Please install Git first.${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites installed${NC}"
echo ""

# Deploy menu
echo "What would you like to deploy?"
echo "1) Backend to Render"
echo "2) Frontend to Vercel"
echo "3) Both (Backend first, then Frontend)"
echo "4) Test locally with Docker"
echo "5) Setup environment variables"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${BLUE}Deploying Backend to Render...${NC}"
        echo ""
        echo "Prerequisites:"
        echo "1. You need a Render account (https://render.com)"
        echo "2. Your code should be pushed to GitHub"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to cancel..."
        
        echo ""
        echo -e "${YELLOW}Manual steps required:${NC}"
        echo "1. Go to https://dashboard.render.com"
        echo "2. Click 'New +' → 'Web Service'"
        echo "3. Connect your GitHub repository"
        echo "4. Set:"
        echo "   - Root Directory: backend-v2"
        echo "   - Build Command: pip install -r requirements.txt"
        echo "   - Start Command: uvicorn main:app --host 0.0.0.0 --port \$PORT"
        echo ""
        echo "5. Add environment variables:"
        echo "   - DATABASE_URL (PostgreSQL URL)"
        echo "   - SECRET_KEY (generate with: openssl rand -hex 32)"
        echo "   - STRIPE_SECRET_KEY"
        echo "   - STRIPE_PUBLISHABLE_KEY"
        echo ""
        echo "Opening Render dashboard..."
        open "https://dashboard.render.com" 2>/dev/null || xdg-open "https://dashboard.render.com" 2>/dev/null || echo "Please open https://dashboard.render.com"
        ;;
        
    2)
        echo -e "${BLUE}Deploying Frontend to Vercel...${NC}"
        cd frontend-v2
        
        if ! command_exists vercel; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        
        echo ""
        echo "Starting Vercel deployment..."
        echo "You'll need to add these environment variables when prompted:"
        echo "- NEXT_PUBLIC_API_URL (your backend URL)"
        echo "- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        echo ""
        vercel --prod
        ;;
        
    3)
        echo -e "${BLUE}Deploying Both Services...${NC}"
        echo ""
        echo -e "${YELLOW}Step 1: Deploy Backend first${NC}"
        echo "Please complete the backend deployment on Render, then return here."
        echo ""
        read -p "Press Enter when backend is deployed..."
        
        echo ""
        read -p "Enter your backend URL (e.g., https://your-app.onrender.com): " BACKEND_URL
        
        echo ""
        echo -e "${YELLOW}Step 2: Deploy Frontend${NC}"
        cd frontend-v2
        
        if ! command_exists vercel; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        
        echo ""
        echo "Starting Vercel deployment..."
        echo "When prompted for NEXT_PUBLIC_API_URL, use: $BACKEND_URL"
        echo ""
        vercel --prod
        ;;
        
    4)
        echo -e "${BLUE}Testing locally with Docker...${NC}"
        
        if ! command_exists docker; then
            echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop first.${NC}"
            exit 1
        fi
        
        echo "Starting services with Docker Compose..."
        docker-compose up --build
        ;;
        
    5)
        echo -e "${BLUE}Setting up environment variables...${NC}"
        echo ""
        
        # Backend .env
        if [ ! -f backend-v2/.env ]; then
            echo "Creating backend-v2/.env..."
            cp backend-v2/.env.example backend-v2/.env
            echo -e "${GREEN}✅ Created backend-v2/.env${NC}"
            echo "Please edit backend-v2/.env with your values"
        else
            echo -e "${YELLOW}backend-v2/.env already exists${NC}"
        fi
        
        # Frontend .env
        if [ ! -f frontend-v2/.env.local ]; then
            echo "Creating frontend-v2/.env.local..."
            cp frontend-v2/.env.example frontend-v2/.env.local
            echo -e "${GREEN}✅ Created frontend-v2/.env.local${NC}"
            echo "Please edit frontend-v2/.env.local with your values"
        else
            echo -e "${YELLOW}frontend-v2/.env.local already exists${NC}"
        fi
        
        echo ""
        echo "Generating a SECRET_KEY for you..."
        SECRET_KEY=$(openssl rand -hex 32)
        echo -e "${GREEN}SECRET_KEY=$SECRET_KEY${NC}"
        echo "(Copy this to your backend .env file)"
        ;;
        
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify your deployment is working"
echo "2. Update CORS settings if needed"
echo "3. Create admin user in production"
echo "4. Test the booking flow"
echo ""
echo "For detailed instructions, see PRODUCTION_ENV_SETUP.md"