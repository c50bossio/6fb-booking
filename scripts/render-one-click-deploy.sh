#!/bin/bash

# One-Click Render Deployment Script
# Deploys both backend and frontend services to Render with minimal configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║     6FB Booking Platform Deployment       ║"
    echo "║         One-Click Render Deploy           ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to print colored output
print_status() {
    echo -e "${BLUE}►${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Progress indicator
show_progress() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    command -v git &> /dev/null || missing_tools+=("git")
    command -v curl &> /dev/null || missing_tools+=("curl")
    command -v node &> /dev/null || missing_tools+=("node")
    command -v npm &> /dev/null || missing_tools+=("npm")
    command -v python3 &> /dev/null || missing_tools+=("python3")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install them before continuing."
        exit 1
    fi
    
    # Check for Render API key
    if [ -z "$RENDER_API_KEY" ]; then
        print_warning "RENDER_API_KEY not set"
        echo ""
        echo "To get your API key:"
        echo "1. Go to https://dashboard.render.com/account/settings"
        echo "2. Click 'API Keys' in the sidebar"
        echo "3. Create a new API key"
        echo ""
        read -p "Enter your Render API key: " RENDER_API_KEY
        export RENDER_API_KEY
    fi
    
    # Validate API key
    if ! curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners > /dev/null 2>&1; then
        print_error "Invalid Render API key"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Get repository URL
get_repo_url() {
    REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
    
    if [ -z "$REPO_URL" ]; then
        print_warning "Could not detect repository URL"
        read -p "Enter your GitHub repository URL: " REPO_URL
    fi
    
    # Convert SSH to HTTPS
    if [[ "$REPO_URL" == git@github.com:* ]]; then
        REPO_URL=$(echo "$REPO_URL" | sed 's/git@github.com:/https:\/\/github.com\//')
    fi
    
    # Remove .git suffix
    REPO_URL=${REPO_URL%.git}
    
    print_success "Repository: $REPO_URL"
}

# Get owner ID
get_owner_id() {
    print_status "Getting Render account details..."
    
    OWNER_RESPONSE=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners)
    
    if command -v jq &> /dev/null; then
        OWNER_ID=$(echo "$OWNER_RESPONSE" | jq -r '.[0].owner.id')
        OWNER_NAME=$(echo "$OWNER_RESPONSE" | jq -r '.[0].owner.name')
    else
        OWNER_ID=$(echo "$OWNER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi
    
    if [ -z "$OWNER_ID" ] || [ "$OWNER_ID" = "null" ]; then
        print_error "Failed to get owner ID"
        exit 1
    fi
    
    print_success "Account: ${OWNER_NAME:-$OWNER_ID}"
}

# Deploy service
deploy_service() {
    local service_name=$1
    local service_type=$2
    local build_command=$3
    local start_command=$4
    local env_vars=$5
    local health_check_path=$6
    
    print_status "Deploying $service_name..."
    
    # Check if service exists
    SERVICE_CHECK=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services?name=$service_name")
    
    if [ "$SERVICE_CHECK" != "[]" ]; then
        print_warning "Service $service_name already exists"
        if command -v jq &> /dev/null; then
            SERVICE_ID=$(echo "$SERVICE_CHECK" | jq -r '.[0].id')
        else
            SERVICE_ID=$(echo "$SERVICE_CHECK" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        fi
    else
        # Create service
        SERVICE_PAYLOAD=$(cat <<EOF
{
  "type": "$service_type",
  "name": "$service_name",
  "ownerId": "$OWNER_ID",
  "repo": "$REPO_URL",
  "autoDeploy": "yes",
  "branch": "main",
  "buildCommand": "$build_command",
  "startCommand": "$start_command",
  "healthCheckPath": "$health_check_path",
  "serviceDetails": {
    "region": "oregon",
    "plan": "free",
    "buildCommand": "$build_command",
    "startCommand": "$start_command",
    "healthCheckPath": "$health_check_path"
  }
}
EOF
)
        
        CREATE_RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$SERVICE_PAYLOAD" \
            https://api.render.com/v1/services)
        
        if command -v jq &> /dev/null; then
            SERVICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
        else
            SERVICE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        fi
        
        if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ]; then
            print_error "Failed to create $service_name"
            echo "$CREATE_RESPONSE"
            return 1
        fi
        
        print_success "Created service: $service_name (ID: $SERVICE_ID)"
    fi
    
    # Set environment variables
    if [ -n "$env_vars" ]; then
        print_status "Setting environment variables..."
        curl -s -X PUT \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"envVars\":$env_vars}" \
            "https://api.render.com/v1/services/$SERVICE_ID/env-vars" > /dev/null
    fi
    
    # Store service ID for later use
    if [ "$service_name" = "sixfb-backend" ]; then
        BACKEND_ID=$SERVICE_ID
        BACKEND_URL="https://sixfb-backend.onrender.com"
    else
        FRONTEND_ID=$SERVICE_ID
        FRONTEND_URL="https://sixfb-frontend.onrender.com"
    fi
    
    print_success "Service $service_name configured"
}

# Generate secure keys
generate_keys() {
    print_status "Generating secure keys..."
    
    # Generate JWT secret if not exists
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')
    fi
    
    # Generate database encryption key if not exists
    if [ -z "$DATABASE_ENCRYPTION_KEY" ]; then
        DATABASE_ENCRYPTION_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
    fi
    
    print_success "Security keys generated"
}

# Main deployment flow
main() {
    print_banner
    
    # Step 1: Check prerequisites
    check_prerequisites
    get_repo_url
    get_owner_id
    
    # Step 2: Generate security keys
    generate_keys
    
    # Step 3: Prepare environment variables
    print_status "Preparing environment configuration..."
    
    # Backend environment variables
    BACKEND_ENV_VARS='[
        {"key": "DATABASE_URL", "value": ""},
        {"key": "JWT_SECRET", "value": "'$JWT_SECRET'"},
        {"key": "JWT_ALGORITHM", "value": "HS256"},
        {"key": "ACCESS_TOKEN_EXPIRE_MINUTES", "value": "30"},
        {"key": "DATABASE_ENCRYPTION_KEY", "value": "'$DATABASE_ENCRYPTION_KEY'"},
        {"key": "CORS_ORIGINS", "value": "https://sixfb-frontend.onrender.com,http://localhost:3000"},
        {"key": "ENVIRONMENT", "value": "production"},
        {"key": "PYTHON_VERSION", "value": "3.11"}
    ]'
    
    # Frontend environment variables
    FRONTEND_ENV_VARS='[
        {"key": "NEXT_PUBLIC_API_URL", "value": "https://sixfb-backend.onrender.com"},
        {"key": "NEXT_PUBLIC_APP_URL", "value": "https://sixfb-frontend.onrender.com"}
    ]'
    
    # Step 4: Deploy Backend
    echo ""
    deploy_service \
        "sixfb-backend" \
        "web" \
        "cd backend && pip install -r requirements.txt" \
        "cd backend && uvicorn main:app --host 0.0.0.0 --port \$PORT" \
        "$BACKEND_ENV_VARS" \
        "/health"
    
    # Step 5: Deploy Frontend
    echo ""
    deploy_service \
        "sixfb-frontend" \
        "web" \
        "cd frontend && npm install && npm run build" \
        "cd frontend && npm start" \
        "$FRONTEND_ENV_VARS" \
        "/"
    
    # Step 6: Final Summary
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "📌 Service URLs:"
    echo "   Backend:  $BACKEND_URL"
    echo "   API Docs: $BACKEND_URL/docs"
    echo "   Frontend: $FRONTEND_URL"
    echo ""
    echo "📊 Dashboard Links:"
    echo "   Backend:  https://dashboard.render.com/web/$BACKEND_ID"
    echo "   Frontend: https://dashboard.render.com/web/$FRONTEND_ID"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Set up PostgreSQL database in Render Dashboard"
    echo "2. Update DATABASE_URL in backend environment variables"
    echo "3. Configure custom domains if needed"
    echo "4. Set up monitoring and alerts"
    echo ""
    echo "⚡ Quick Commands:"
    echo "   Check status: ./scripts/render-deployment-checker.sh"
    echo "   View logs:    Visit the dashboard links above"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
}

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "One-Click Render Deployment Script"
    echo ""
    echo "Usage: ./render-one-click-deploy.sh"
    echo ""
    echo "This script will:"
    echo "  1. Check prerequisites (git, node, python3)"
    echo "  2. Create backend and frontend services on Render"
    echo "  3. Configure environment variables"
    echo "  4. Set up auto-deployment from GitHub"
    echo ""
    echo "Requirements:"
    echo "  - Render account and API key"
    echo "  - GitHub repository with 6FB Booking code"
    echo "  - Node.js and Python 3 installed locally"
    echo ""
    exit 0
fi

# Run deployment
main