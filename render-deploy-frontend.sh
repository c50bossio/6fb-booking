#!/bin/bash

# Render Frontend Deployment Helper Script
# This script automates the deployment of the 6FB Booking frontend to Render

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="sixfb-frontend"
SERVICE_TYPE="web"
BUILD_COMMAND="cd frontend && npm install && npm run build"
START_COMMAND="cd frontend && npm start"
HEALTH_CHECK_PATH="/"
REGION="oregon" # or "ohio", "frankfurt", "singapore"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
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

# Check for required environment variables
check_requirements() {
    print_status "Checking requirements..."

    if [ -z "$RENDER_API_KEY" ]; then
        print_error "RENDER_API_KEY environment variable is not set"
        echo "Please set it with: export RENDER_API_KEY='your-api-key'"
        echo "Get your API key from: https://dashboard.render.com/account/settings"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Installing it will improve output formatting"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    fi

    print_success "Requirements check passed"
}

# Get owner ID (required for API calls)
get_owner_id() {
    print_status "Getting Render account owner ID..."

    OWNER_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Accept: application/json" \
        "https://api.render.com/v1/owners")

    if command -v jq &> /dev/null; then
        OWNER_ID=$(echo "$OWNER_RESPONSE" | jq -r '.[0].owner.id')
        OWNER_NAME=$(echo "$OWNER_RESPONSE" | jq -r '.[0].owner.name')
    else
        # Fallback parsing without jq
        OWNER_ID=$(echo "$OWNER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi

    if [ -z "$OWNER_ID" ] || [ "$OWNER_ID" = "null" ]; then
        print_error "Failed to get owner ID"
        echo "Response: $OWNER_RESPONSE"
        exit 1
    fi

    print_success "Owner ID: $OWNER_ID (${OWNER_NAME:-Unknown})"
}

# Check if service exists
check_service_exists() {
    print_status "Checking if service '$SERVICE_NAME' exists..."

    SERVICES_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Accept: application/json" \
        "https://api.render.com/v1/services?name=$SERVICE_NAME")

    if command -v jq &> /dev/null; then
        SERVICE_COUNT=$(echo "$SERVICES_RESPONSE" | jq '. | length')
        if [ "$SERVICE_COUNT" -gt 0 ]; then
            SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.[0].id')
            SERVICE_URL=$(echo "$SERVICES_RESPONSE" | jq -r '.[0].serviceDetails.url')
            print_success "Service exists! ID: $SERVICE_ID"
            print_success "URL: $SERVICE_URL"
            return 0
        fi
    else
        # Fallback check without jq
        if echo "$SERVICES_RESPONSE" | grep -q "\"id\""; then
            SERVICE_ID=$(echo "$SERVICES_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            print_success "Service exists! ID: $SERVICE_ID"
            return 0
        fi
    fi

    print_warning "Service does not exist"
    return 1
}

# Create new service
create_service() {
    print_status "Creating new service '$SERVICE_NAME'..."

    # Get repository URL from git
    REPO_URL=$(git config --get remote.origin.url || echo "")
    if [ -z "$REPO_URL" ]; then
        print_error "Could not determine repository URL"
        echo "Please enter your repository URL (e.g., https://github.com/username/repo):"
        read -r REPO_URL
    fi

    # Convert SSH URL to HTTPS if needed
    if [[ "$REPO_URL" == git@github.com:* ]]; then
        REPO_URL=$(echo "$REPO_URL" | sed 's/git@github.com:/https:\/\/github.com\//')
    fi

    # Remove .git suffix if present
    REPO_URL=${REPO_URL%.git}

    print_status "Using repository: $REPO_URL"

    # Create service payload
    SERVICE_PAYLOAD=$(cat <<EOF
{
  "type": "$SERVICE_TYPE",
  "name": "$SERVICE_NAME",
  "ownerId": "$OWNER_ID",
  "repo": "$REPO_URL",
  "autoDeploy": "yes",
  "branch": "main",
  "buildCommand": "$BUILD_COMMAND",
  "startCommand": "$START_COMMAND",
  "healthCheckPath": "$HEALTH_CHECK_PATH",
  "envVars": [],
  "serviceDetails": {
    "region": "$REGION",
    "plan": "free",
    "buildCommand": "$BUILD_COMMAND",
    "startCommand": "$START_COMMAND",
    "healthCheckPath": "$HEALTH_CHECK_PATH",
    "numInstances": 1
  }
}
EOF
)

    print_status "Creating service with Render API..."
    CREATE_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Accept: application/json" \
        -H "Content-Type: application/json" \
        -d "$SERVICE_PAYLOAD" \
        "https://api.render.com/v1/services")

    # Check if creation was successful
    if echo "$CREATE_RESPONSE" | grep -q "\"id\""; then
        if command -v jq &> /dev/null; then
            SERVICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
            SERVICE_URL=$(echo "$CREATE_RESPONSE" | jq -r '.serviceDetails.url')
        else
            SERVICE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        fi
        print_success "Service created successfully!"
        print_success "Service ID: $SERVICE_ID"
        print_success "Service URL: $SERVICE_URL"
    else
        print_error "Failed to create service"
        echo "Response: $CREATE_RESPONSE"
        exit 1
    fi
}

# Set environment variables
set_env_variables() {
    print_status "Setting environment variables for service '$SERVICE_ID'..."

    # Read environment variables from .env.production
    ENV_FILE="frontend/.env.production"
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "No .env.production file found at $ENV_FILE"
        print_status "Creating from template..."

        # Create basic .env.production
        cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://sixfb-frontend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_SENTRY_DSN=
EOF
        print_success "Created basic .env.production file. Please update with your values."
    fi

    # Parse environment variables
    ENV_VARS_JSON="["
    FIRST=true

    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        if [[ ! "$key" =~ ^[[:space:]]*# ]] && [[ -n "$key" ]]; then
            # Remove leading/trailing whitespace
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs)

            if [ -n "$key" ] && [ -n "$value" ]; then
                if [ "$FIRST" = true ]; then
                    FIRST=false
                else
                    ENV_VARS_JSON+=","
                fi
                ENV_VARS_JSON+="{\"key\":\"$key\",\"value\":\"$value\"}"
            fi
        fi
    done < "$ENV_FILE"

    ENV_VARS_JSON+="]"

    print_status "Updating environment variables via API..."
    UPDATE_RESPONSE=$(curl -s -X PUT \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Accept: application/json" \
        -H "Content-Type: application/json" \
        -d "{\"envVars\":$ENV_VARS_JSON}" \
        "https://api.render.com/v1/services/$SERVICE_ID/env-vars")

    if echo "$UPDATE_RESPONSE" | grep -q "error"; then
        print_error "Failed to update environment variables"
        echo "Response: $UPDATE_RESPONSE"
    else
        print_success "Environment variables updated successfully"
    fi
}

# Trigger deployment
trigger_deployment() {
    print_status "Triggering deployment for service '$SERVICE_ID'..."

    DEPLOY_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Accept: application/json" \
        "https://api.render.com/v1/services/$SERVICE_ID/deploys")

    if command -v jq &> /dev/null; then
        DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.id')
    else
        DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi

    if [ -n "$DEPLOY_ID" ] && [ "$DEPLOY_ID" != "null" ]; then
        print_success "Deployment triggered! Deploy ID: $DEPLOY_ID"
        return 0
    else
        print_error "Failed to trigger deployment"
        echo "Response: $DEPLOY_RESPONSE"
        return 1
    fi
}

# Check deployment status
check_deployment_status() {
    local deploy_id=$1
    print_status "Checking deployment status..."

    while true; do
        STATUS_RESPONSE=$(curl -s -X GET \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Accept: application/json" \
            "https://api.render.com/v1/services/$SERVICE_ID/deploys/$deploy_id")

        if command -v jq &> /dev/null; then
            STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
        else
            STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
        fi

        case "$STATUS" in
            "live")
                print_success "Deployment is live!"
                break
                ;;
            "build_failed"|"deploy_failed"|"canceled")
                print_error "Deployment failed with status: $STATUS"
                exit 1
                ;;
            *)
                print_status "Deployment status: $STATUS"
                sleep 10
                ;;
        esac
    done
}

# Main execution flow
main() {
    print_status "Starting Render Frontend Deployment Helper"
    echo "================================================"

    check_requirements
    get_owner_id

    if check_service_exists; then
        print_status "Service already exists. Would you like to:"
        echo "1) Update environment variables and trigger new deployment"
        echo "2) Just trigger a new deployment"
        echo "3) Exit"
        read -p "Choose an option (1-3): " choice

        case $choice in
            1)
                set_env_variables
                if trigger_deployment; then
                    check_deployment_status "$DEPLOY_ID"
                fi
                ;;
            2)
                if trigger_deployment; then
                    check_deployment_status "$DEPLOY_ID"
                fi
                ;;
            3)
                print_status "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
    else
        print_status "Service does not exist. Would you like to create it? (y/n)"
        read -p "> " create_choice

        if [[ "$create_choice" =~ ^[Yy]$ ]]; then
            create_service
            set_env_variables
            if trigger_deployment; then
                check_deployment_status "$DEPLOY_ID"
            fi
        else
            print_status "Exiting without creating service"
            exit 0
        fi
    fi

    echo ""
    print_success "Deployment helper completed!"
    echo "================================================"
    echo "Frontend URL: https://$SERVICE_NAME.onrender.com"
    echo "Dashboard: https://dashboard.render.com/web/$SERVICE_ID"
    echo ""
}

# Show help if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Render Frontend Deployment Helper"
    echo ""
    echo "Usage: ./render-deploy-frontend.sh"
    echo ""
    echo "Environment variables:"
    echo "  RENDER_API_KEY - Your Render API key (required)"
    echo ""
    echo "This script will:"
    echo "  1. Check if the frontend service exists on Render"
    echo "  2. Create the service if it doesn't exist"
    echo "  3. Set up environment variables from frontend/.env.production"
    echo "  4. Trigger a deployment"
    echo "  5. Monitor deployment status"
    echo ""
    exit 0
fi

# Run main function
main
