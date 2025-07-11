#!/bin/bash

# BookedBarber V2 - Render Staging Deployment Script
# This script helps deploy the staging environment to Render

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

# Check if we're on staging branch
check_branch() {
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "staging" ]; then
        log_warning "Not on staging branch (current: $CURRENT_BRANCH)"
        read -p "Switch to staging branch? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout staging || git checkout -b staging
        else
            log_error "Deployment cancelled - must be on staging branch"
            exit 1
        fi
    fi
}

# Check for render.staging.yaml
check_render_config() {
    if [ ! -f "$PROJECT_ROOT/render.staging.yaml" ]; then
        log_error "render.staging.yaml not found!"
        exit 1
    fi
    log_success "Found render.staging.yaml"
}

# Push to staging branch
push_staging() {
    log "Pushing to staging branch..."
    git add .
    git status --porcelain
    
    if [ -n "$(git status --porcelain)" ]; then
        read -p "Commit and push changes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git commit -m "Deploy to staging - $(date +'%Y-%m-%d %H:%M:%S')"
            git push origin staging
            log_success "Changes pushed to staging branch"
        fi
    else
        log "No changes to commit"
        git push origin staging
    fi
}

# Deploy using Render Blueprint
deploy_blueprint() {
    log "Deploying using Render Blueprint..."
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  RENDER STAGING DEPLOYMENT INSTRUCTIONS"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "1. Go to: https://dashboard.render.com/blueprints"
    echo ""
    echo "2. Click 'New Blueprint Instance'"
    echo ""
    echo "3. Connect your GitHub repository if not already connected"
    echo ""
    echo "4. Select branch: 'staging'"
    echo ""
    echo "5. Blueprint file path: 'render.staging.yaml'"
    echo ""
    echo "6. Click 'Create'"
    echo ""
    echo "7. Configure environment variables in Render dashboard:"
    echo "   - STRIPE_SECRET_KEY (test key)"
    echo "   - STRIPE_PUBLISHABLE_KEY (test key)"
    echo "   - SENDGRID_API_KEY"
    echo "   - GOOGLE_CLIENT_ID (staging OAuth)"
    echo "   - GOOGLE_CLIENT_SECRET (staging OAuth)"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    read -p "Press Enter after completing the above steps..."
}

# Manual service creation instructions
manual_deploy() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  MANUAL STAGING SERVICE CREATION"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "If Blueprint deployment doesn't work, create services manually:"
    echo ""
    echo "1. Backend Service:"
    echo "   - Name: sixfb-backend-v2-staging"
    echo "   - Branch: staging"
    echo "   - Build: cd backend-v2 && pip install -r requirements.txt"
    echo "   - Start: cd backend-v2 && uvicorn main:app --host 0.0.0.0 --port \$PORT"
    echo ""
    echo "2. Frontend Service:"
    echo "   - Name: sixfb-frontend-v2-staging"
    echo "   - Branch: staging"
    echo "   - Build: cd backend-v2/frontend-v2 && npm ci && npm run build"
    echo "   - Start: cd backend-v2/frontend-v2 && npm run start"
    echo ""
    echo "3. Database:"
    echo "   - Name: sixfb-db-staging"
    echo "   - Database: sixfb_staging"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# Check deployment status
check_deployment() {
    log "Checking deployment status..."
    
    # Backend check
    BACKEND_URL="https://sixfb-backend-v2-staging.onrender.com/health"
    log "Checking backend at: $BACKEND_URL"
    
    if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -q "200"; then
        log_success "Backend is responding!"
    else
        log_warning "Backend not yet available"
    fi
    
    # Frontend check
    FRONTEND_URL="https://sixfb-frontend-v2-staging.onrender.com"
    log "Checking frontend at: $FRONTEND_URL"
    
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
        log_success "Frontend is responding!"
    else
        log_warning "Frontend not yet available"
    fi
}

# Main deployment flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║        BookedBarber V2 - Staging Deployment to Render         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Step 1: Check prerequisites
    log "Step 1: Checking prerequisites..."
    check_branch
    check_render_config
    log_success "Prerequisites OK"
    
    # Step 2: Push changes
    log "\nStep 2: Pushing to staging branch..."
    push_staging
    
    # Step 3: Deploy
    log "\nStep 3: Deploy to Render..."
    deploy_blueprint
    
    # Step 4: Manual instructions
    log "\nStep 4: Manual deployment option..."
    read -p "Show manual deployment instructions? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        manual_deploy
    fi
    
    # Step 5: Check deployment
    log "\nStep 5: Checking deployment..."
    read -p "Check deployment status? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        check_deployment
    fi
    
    # Summary
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  DEPLOYMENT SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Branch: staging"
    echo "Backend: https://sixfb-backend-v2-staging.onrender.com"
    echo "Frontend: https://sixfb-frontend-v2-staging.onrender.com"
    echo "API Docs: https://sixfb-backend-v2-staging.onrender.com/docs"
    echo ""
    echo "Next steps:"
    echo "1. Configure custom domain (staging.bookedbarber.com)"
    echo "2. Set environment variables in Render dashboard"
    echo "3. Run database migrations if needed"
    echo "4. Test the staging environment"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    log_success "Deployment script completed!"
}

# Run main function
main "$@"