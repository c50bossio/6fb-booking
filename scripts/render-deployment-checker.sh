#!/bin/bash

# Render Deployment Status Checker
# This script checks the deployment status of your Render services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check for API key
if [ -z "$RENDER_API_KEY" ]; then
    print_error "RENDER_API_KEY environment variable is not set"
    echo "Please set it with: export RENDER_API_KEY='your-api-key'"
    exit 1
fi

# Function to check service health
check_service() {
    local service_name=$1
    print_status "Checking service: $service_name"

    # Get service details
    RESPONSE=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services?name=$service_name")

    if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "[]" ]; then
        print_warning "Service '$service_name' not found"
        return
    fi

    # Parse response (with or without jq)
    if command -v jq &> /dev/null; then
        SERVICE_ID=$(echo "$RESPONSE" | jq -r '.[0].id')
        SERVICE_URL=$(echo "$RESPONSE" | jq -r '.[0].serviceDetails.url')
        SERVICE_STATUS=$(echo "$RESPONSE" | jq -r '.[0].state')
        SUSPENDED=$(echo "$RESPONSE" | jq -r '.[0].suspended')
    else
        SERVICE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        SERVICE_STATUS=$(echo "$RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi

    echo "  ID: $SERVICE_ID"
    echo "  URL: $SERVICE_URL"
    echo "  Status: $SERVICE_STATUS"

    # Get latest deployment
    DEPLOY_RESPONSE=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=1")

    if command -v jq &> /dev/null; then
        DEPLOY_STATUS=$(echo "$DEPLOY_RESPONSE" | jq -r '.[0].status')
        DEPLOY_CREATED=$(echo "$DEPLOY_RESPONSE" | jq -r '.[0].createdAt')
        DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.[0].id')
    else
        DEPLOY_STATUS=$(echo "$DEPLOY_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi

    echo "  Latest Deploy: $DEPLOY_STATUS (ID: $DEPLOY_ID)"
    echo "  Created: $DEPLOY_CREATED"

    # Check if service is healthy
    if [ "$SERVICE_STATUS" = "available" ] && [ "$DEPLOY_STATUS" = "live" ]; then
        print_success "Service is healthy and running!"

        # Try to ping the service
        if [ -n "$SERVICE_URL" ]; then
            print_status "Pinging service..."
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL" || echo "000")
            if [ "$HTTP_STATUS" = "200" ]; then
                print_success "Service is responding (HTTP $HTTP_STATUS)"
            else
                print_warning "Service returned HTTP $HTTP_STATUS"
            fi
        fi
    else
        print_warning "Service may have issues"
    fi

    echo ""
}

# Main execution
echo "======================================"
echo "Render Deployment Status Checker"
echo "======================================"
echo ""

# Check both services
check_service "sixfb-backend"
check_service "sixfb-frontend"

# Summary
echo "======================================"
echo "Summary"
echo "======================================"
echo "Backend API: https://sixfb-backend.onrender.com"
echo "Backend Docs: https://sixfb-backend.onrender.com/docs"
echo "Frontend App: https://sixfb-frontend.onrender.com"
echo ""
echo "To view logs:"
echo "  Backend: https://dashboard.render.com/web/srv-YOUR_BACKEND_ID/logs"
echo "  Frontend: https://dashboard.render.com/web/srv-YOUR_FRONTEND_ID/logs"
echo ""
