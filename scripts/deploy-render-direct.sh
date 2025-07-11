#!/bin/bash

# Direct Render Deployment Script
# This script deploys directly to Render using their API, bypassing GitHub push issues

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

# Check if Render API key is available
check_render_api_key() {
    if [ -z "${RENDER_API_KEY:-}" ]; then
        log_error "RENDER_API_KEY environment variable not set"
        echo ""
        echo "To get your Render API key:"
        echo "1. Go to https://dashboard.render.com/account/api-keys"
        echo "2. Create a new API key"
        echo "3. Export it: export RENDER_API_KEY=your_key_here"
        echo ""
        exit 1
    fi
    log_success "Render API key found"
}

# Create Render services using API
create_render_services() {
    log "Creating Render services via API..."
    
    # Backend service
    log "Creating backend service..."
    BACKEND_RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "type": "web_service",
            "name": "sixfb-backend-v2-staging",
            "runtime": "python",
            "buildCommand": "cd backend-v2 && pip install -r requirements.txt",
            "startCommand": "cd backend-v2 && uvicorn main:app --host 0.0.0.0 --port $PORT",
            "repo": "https://github.com/c50bossio/6fb-booking",
            "branch": "staging",
            "envVars": [
                {"key": "ENVIRONMENT", "value": "staging"},
                {"key": "DEBUG", "value": "true"},
                {"key": "CORS_ORIGINS", "value": "https://sixfb-frontend-v2-staging.onrender.com"}
            ]
        }')
    
    echo "Backend creation response: $BACKEND_RESPONSE"
    
    # Frontend service
    log "Creating frontend service..."
    FRONTEND_RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "type": "web_service",
            "name": "sixfb-frontend-v2-staging",
            "runtime": "node",
            "buildCommand": "cd backend-v2/frontend-v2 && npm ci && npm run build",
            "startCommand": "cd backend-v2/frontend-v2 && npm start",
            "repo": "https://github.com/c50bossio/6fb-booking",
            "branch": "staging",
            "envVars": [
                {"key": "NEXT_PUBLIC_ENVIRONMENT", "value": "staging"},
                {"key": "NEXT_PUBLIC_API_URL", "value": "https://sixfb-backend-v2-staging.onrender.com"}
            ]
        }')
    
    echo "Frontend creation response: $FRONTEND_RESPONSE"
    
    # Database
    log "Creating PostgreSQL database..."
    DB_RESPONSE=$(curl -s -X POST "https://api.render.com/v1/postgres" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "sixfb-db-staging",
            "databaseName": "sixfb_staging",
            "user": "sixfb_staging_user",
            "plan": "free"
        }')
    
    echo "Database creation response: $DB_RESPONSE"
}

# Deploy existing services
deploy_existing_services() {
    log "Triggering deployment of existing services..."
    
    # You'll need to get service IDs from Render dashboard and set them as environment variables
    if [ -n "${RENDER_BACKEND_SERVICE_ID:-}" ]; then
        log "Deploying backend service..."
        curl -s -X POST "https://api.render.com/v1/services/$RENDER_BACKEND_SERVICE_ID/deploys" \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json"
    fi
    
    if [ -n "${RENDER_FRONTEND_SERVICE_ID:-}" ]; then
        log "Deploying frontend service..."
        curl -s -X POST "https://api.render.com/v1/services/$RENDER_FRONTEND_SERVICE_ID/deploys" \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json"
    fi
}

# Check deployment status
check_deployment_status() {
    log "Checking deployment status..."
    
    # Wait a bit for deployment to start
    sleep 30
    
    # Check backend
    BACKEND_URL="https://sixfb-backend-v2-staging.onrender.com/health"
    if curl -s -f "$BACKEND_URL" > /dev/null; then
        log_success "Backend is responding at $BACKEND_URL"
    else
        log_warning "Backend not yet available at $BACKEND_URL"
    fi
    
    # Check frontend
    FRONTEND_URL="https://sixfb-frontend-v2-staging.onrender.com"
    if curl -s -f "$FRONTEND_URL" > /dev/null; then
        log_success "Frontend is responding at $FRONTEND_URL"
    else
        log_warning "Frontend not yet available at $FRONTEND_URL"
    fi
}

# Manual instructions
show_manual_instructions() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  MANUAL RENDER DEPLOYMENT INSTRUCTIONS"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "If the API approach doesn't work, deploy manually:"
    echo ""
    echo "1. Go to: https://dashboard.render.com"
    echo "2. Click 'New +' → 'Web Service'"
    echo "3. Connect your GitHub repository"
    echo "4. Select branch: 'staging'"
    echo ""
    echo "Backend Service:"
    echo "  - Name: sixfb-backend-v2-staging"
    echo "  - Runtime: Python 3"
    echo "  - Build Command: cd backend-v2 && pip install -r requirements.txt"
    echo "  - Start Command: cd backend-v2 && uvicorn main:app --host 0.0.0.0 --port \$PORT"
    echo ""
    echo "Frontend Service:"
    echo "  - Name: sixfb-frontend-v2-staging"
    echo "  - Runtime: Node"
    echo "  - Build Command: cd backend-v2/frontend-v2 && npm ci && npm run build"
    echo "  - Start Command: cd backend-v2/frontend-v2 && npm start"
    echo ""
    echo "Environment Variables (set in Render dashboard):"
    echo "  Backend:"
    echo "    ENVIRONMENT=staging"
    echo "    DEBUG=true"
    echo "    SECRET_KEY=your-staging-secret"
    echo "    STRIPE_SECRET_KEY=sk_test_..."
    echo "    DATABASE_URL=postgresql://..."
    echo ""
    echo "  Frontend:"
    echo "    NEXT_PUBLIC_ENVIRONMENT=staging"
    echo "    NEXT_PUBLIC_API_URL=https://sixfb-backend-v2-staging.onrender.com"
    echo "    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# Main deployment flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║         Direct Render Deployment - BookedBarber V2            ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check API key
    check_render_api_key
    
    # Ask user what they want to do
    echo "Choose deployment method:"
    echo "1. Create new services via API"
    echo "2. Deploy existing services"
    echo "3. Show manual instructions"
    echo "4. Check current deployment status"
    echo ""
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            create_render_services
            ;;
        2)
            deploy_existing_services
            ;;
        3)
            show_manual_instructions
            ;;
        4)
            check_deployment_status
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  DEPLOYMENT SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Expected URLs after deployment:"
    echo "  Frontend: https://sixfb-frontend-v2-staging.onrender.com"
    echo "  Backend:  https://sixfb-backend-v2-staging.onrender.com"
    echo "  API Docs: https://sixfb-backend-v2-staging.onrender.com/docs"
    echo ""
    echo "Next steps:"
    echo "1. Configure environment variables in Render dashboard"
    echo "2. Wait for initial deployment (5-10 minutes)"
    echo "3. Test the staging environment"
    echo "4. Set up custom domain if needed"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    log_success "Deployment script completed!"
}

# Run main function
main "$@"