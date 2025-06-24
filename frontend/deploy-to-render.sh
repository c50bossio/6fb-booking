#!/bin/bash

# 6FB Booking Frontend - Render Deployment Script
# This script handles deployment to Render.com as a backup to Vercel

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE=${1:-"static"}  # static or server
RENDER_SERVICE_NAME="sixfb-frontend-${DEPLOYMENT_TYPE}"

echo -e "${BLUE}🚀 Starting Render deployment for 6FB Booking Frontend${NC}"
echo -e "${BLUE}Deployment type: ${DEPLOYMENT_TYPE}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

if [[ ! -f "next.config.js" ]]; then
    print_error "next.config.js not found. Please ensure you're in the correct frontend directory."
    exit 1
fi

print_status "Directory structure verified"

# Check Node.js version
NODE_VERSION=$(node --version | cut -c 2-)
if [[ $(echo "$NODE_VERSION 18.0.0" | tr " " "\n" | sort -V | head -n1) != "18.0.0" ]]; then
    print_warning "Node.js version $NODE_VERSION detected. Render recommends Node.js 18+"
fi

print_status "Node.js version: $NODE_VERSION"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js and npm."
    exit 1
fi

print_status "npm found"

# Environment check
echo -e "\n${BLUE}🔧 Environment Configuration${NC}"

# Check for environment files
if [[ -f ".env.production" ]]; then
    print_status "Production environment file found"
else
    print_warning "No .env.production file found. Using defaults."
fi

# Build preparation
echo -e "\n${BLUE}🏗️ Preparing build...${NC}"

# Clean previous builds
npm run clean 2>/dev/null || true
print_status "Cleaned previous builds"

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
npm ci --production=false
print_status "Dependencies installed"

# Static vs Server deployment
if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then
    echo -e "\n${BLUE}🌐 Building for static deployment...${NC}"
    
    # Use the Render-optimized config
    NEXT_CONFIG_FILE=next.config.render.js npm run build
    
    if [[ -d "out" ]]; then
        print_status "Static build completed successfully"
        echo -e "${GREEN}Static files ready in ./out directory${NC}"
    else
        print_error "Static build failed - no 'out' directory found"
        exit 1
    fi
    
elif [[ "$DEPLOYMENT_TYPE" == "server" ]]; then
    echo -e "\n${BLUE}🖥️ Building for server deployment...${NC}"
    
    # Use regular Next.js build
    npm run build
    
    if [[ -d ".next" ]]; then
        print_status "Server build completed successfully"
    else
        print_error "Server build failed - no '.next' directory found"
        exit 1
    fi
else
    print_error "Invalid deployment type: $DEPLOYMENT_TYPE. Use 'static' or 'server'"
    exit 1
fi

# Validate build
echo -e "\n${BLUE}✅ Validating build...${NC}"

# Check for critical files
if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then
    if [[ ! -f "out/index.html" ]]; then
        print_error "Static build validation failed - no index.html found"
        exit 1
    fi
    print_status "Static build validation passed"
else
    if [[ ! -f ".next/BUILD_ID" ]]; then
        print_error "Server build validation failed - no BUILD_ID found"
        exit 1
    fi
    print_status "Server build validation passed"
fi

# Display deployment info
echo -e "\n${BLUE}📊 Deployment Information${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Service Name: $RENDER_SERVICE_NAME"
echo "Deployment Type: $DEPLOYMENT_TYPE"
echo "Backend URL: https://sixfb-backend.onrender.com/api/v1"
if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then
    echo "Frontend URL: https://${RENDER_SERVICE_NAME}.onrender.com"
    echo "Build Output: ./out directory"
else
    echo "Frontend URL: https://${RENDER_SERVICE_NAME}.onrender.com"
    echo "Build Output: ./.next directory"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Render-specific instructions
echo -e "\n${BLUE}🎯 Render Deployment Instructions${NC}"
echo ""
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' and select:"
if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then
    echo "   - 'Static Site' for static deployment"
else
    echo "   - 'Web Service' for server deployment"
fi
echo "3. Connect your GitHub repository"
echo "4. Configure the service:"
echo ""
echo "   Basic Settings:"
echo "   ├── Name: $RENDER_SERVICE_NAME"
echo "   ├── Region: Oregon (US West)"
echo "   ├── Branch: main (or your production branch)"
echo "   ├── Root Directory: frontend"
echo "   └── Runtime: Node"
echo ""
if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then
    echo "   Build & Deploy:"
    echo "   ├── Build Command: npm ci && npm run build:render"
    echo "   └── Publish Directory: out"
else
    echo "   Build & Deploy:"
    echo "   ├── Build Command: npm ci && npm run build"
    echo "   └── Start Command: npm start"
fi
echo ""

# Environment variables
echo -e "${BLUE}🔐 Required Environment Variables${NC}"
echo ""
echo "Set these environment variables in Render:"
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ NODE_ENV=production                                             │"
echo "│ NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1  │"
echo "│ NEXT_PUBLIC_APP_URL=https://${RENDER_SERVICE_NAME}.onrender.com │"
echo "│ NEXT_PUBLIC_ENVIRONMENT=production                             │"
echo "│ NEXT_TELEMETRY_DISABLED=1                                      │"
echo "│                                                                 │"
echo "│ # Add your Stripe key:                                         │"
echo "│ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...                 │"
echo "│                                                                 │"
echo "│ # Optional features:                                            │"
echo "│ NEXT_PUBLIC_ENABLE_ANALYTICS=true                              │"
echo "│ NEXT_PUBLIC_ENABLE_WEBSOCKET=true                              │"
echo "│ NEXT_PUBLIC_ENABLE_PAYMENTS=true                               │"
if [[ "$DEPLOYMENT_TYPE" == "server" ]]; then
echo "│ PORT=3000                                                       │"
fi
echo "└─────────────────────────────────────────────────────────────────┘"

# Final steps
echo -e "\n${BLUE}🎉 Deployment Ready!${NC}"
echo ""
print_status "Build completed successfully"
print_status "Configuration files prepared"
print_status "Environment variables documented"
echo ""
echo -e "${GREEN}Your 6FB Booking frontend is ready for Render deployment!${NC}"
echo ""
echo "Next steps:"
echo "1. Follow the instructions above to create the Render service"
echo "2. Set the environment variables in Render dashboard"
echo "3. Deploy and test the application"
echo "4. Update your backend CORS settings if needed"
echo ""
echo -e "${YELLOW}💡 Pro tip: Bookmark the deployment URLs for easy access${NC}"

# Save deployment info to file
cat > render-deployment-info.txt << EOF
6FB Booking - Render Deployment Info
Generated: $(date)

Service Name: $RENDER_SERVICE_NAME
Deployment Type: $DEPLOYMENT_TYPE
Frontend URL: https://${RENDER_SERVICE_NAME}.onrender.com
Backend URL: https://sixfb-backend.onrender.com/api/v1

Build Command: $(if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then echo "npm ci && npm run build:render"; else echo "npm ci && npm run build"; fi)
$(if [[ "$DEPLOYMENT_TYPE" == "static" ]]; then echo "Publish Directory: out"; else echo "Start Command: npm start"; fi)

Status: Ready for deployment
EOF

print_status "Deployment info saved to render-deployment-info.txt"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Render deployment preparation complete! 🚀${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"