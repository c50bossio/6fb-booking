#!/bin/bash

# =============================================================================
# BookedBarber V2 - Environment File Credential Updater
# =============================================================================
# This script takes credentials from various sources and updates your 
# staging environment files automatically.
#
# Usage: 
#   ./scripts/update-env-with-credentials.sh
#   ./scripts/update-env-with-credentials.sh --interactive
#   ./scripts/update-env-with-credentials.sh --from-file credentials.txt
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Files
BACKEND_ENV="backend-v2/.env.staging.populated"
FRONTEND_ENV="backend-v2/frontend-v2/.env.staging.populated"

echo -e "${BLUE}🔧 BookedBarber V2 - Environment Credential Updater${NC}"
echo "==================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "$BACKEND_ENV" ] || [ ! -f "$FRONTEND_ENV" ]; then
    echo -e "${RED}❌ Error: Environment files not found. Run from 6fb-booking root directory.${NC}"
    exit 1
fi

# Function to safely update env file
update_env_var() {
    local file="$1"
    local var_name="$2" 
    local var_value="$3"
    
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "${file}.backup.$(date +%s)"
        
        # Update the variable (handle both placeholder and existing value patterns)
        if grep -q "^${var_name}=" "$file"; then
            # Variable exists, update it
            sed -i.tmp "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
            rm -f "${file}.tmp"
            echo -e "✅ Updated ${var_name} in $(basename "$file")"
        else
            # Variable doesn't exist, add it
            echo "${var_name}=${var_value}" >> "$file"
            echo -e "✅ Added ${var_name} to $(basename "$file")"
        fi
    else
        echo -e "${RED}❌ File not found: $file${NC}"
    fi
}

# Function to get Stripe credentials from CLI
get_stripe_credentials() {
    echo -e "${YELLOW}🔄 Fetching Stripe credentials...${NC}"
    
    if command -v stripe &> /dev/null; then
        # Get publishable key
        STRIPE_PK=$(stripe config --list | grep "publishable_key" | cut -d'=' -f2 | tr -d ' ' || echo "")
        if [ -n "$STRIPE_PK" ]; then
            update_env_var "$BACKEND_ENV" "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PK"
            update_env_var "$FRONTEND_ENV" "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PK"
        fi
        
        # Get secret key
        STRIPE_SK=$(stripe config --list | grep "secret_key" | cut -d'=' -f2 | tr -d ' ' || echo "")
        if [ -n "$STRIPE_SK" ]; then
            update_env_var "$BACKEND_ENV" "STRIPE_SECRET_KEY" "$STRIPE_SK"
        fi
        
        echo -e "✅ Stripe credentials updated from CLI"
    else
        echo -e "${YELLOW}⚠️  Stripe CLI not found. Skipping Stripe auto-update.${NC}"
    fi
}

# Function to get Twilio credentials from CLI
get_twilio_credentials() {
    echo -e "${YELLOW}🔄 Fetching Twilio credentials...${NC}"
    
    if command -v twilio &> /dev/null; then
        # Get account SID
        TWILIO_SID=$(twilio api:accounts:v1:accounts:list --properties=sid --no-header 2>/dev/null | head -1 | tr -d ' ' || echo "")
        if [ -n "$TWILIO_SID" ]; then
            update_env_var "$BACKEND_ENV" "TWILIO_ACCOUNT_SID" "$TWILIO_SID"
            echo -e "✅ Twilio Account SID updated"
        fi
        
        echo -e "${YELLOW}📋 Note: Twilio Auth Token must be copied manually from console.twilio.com${NC}"
    else
        echo -e "${YELLOW}⚠️  Twilio CLI not found. Skipping Twilio auto-update.${NC}"
    fi
}

# Interactive mode function
interactive_update() {
    echo -e "${BLUE}🎯 Interactive Credential Update${NC}"
    echo ""
    
    # Stripe Webhook Secret
    echo -e "${YELLOW}Stripe Webhook Secret:${NC}"
    read -p "Enter webhook secret (whsec_...): " WEBHOOK_SECRET
    if [ -n "$WEBHOOK_SECRET" ]; then
        update_env_var "$BACKEND_ENV" "STRIPE_WEBHOOK_SECRET" "$WEBHOOK_SECRET"
    fi
    
    # Google OAuth
    echo -e "${YELLOW}Google OAuth Credentials:${NC}"
    read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
    read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
    if [ -n "$GOOGLE_CLIENT_ID" ]; then
        update_env_var "$BACKEND_ENV" "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
        update_env_var "$FRONTEND_ENV" "NEXT_PUBLIC_GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
    fi
    if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
        update_env_var "$BACKEND_ENV" "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
    fi
    
    # SendGrid
    echo -e "${YELLOW}SendGrid API Key:${NC}"
    read -p "Enter SendGrid API key (SG....): " SENDGRID_KEY
    if [ -n "$SENDGRID_KEY" ]; then
        update_env_var "$BACKEND_ENV" "SENDGRID_API_KEY" "$SENDGRID_KEY"
    fi
    
    # Twilio Auth Token
    echo -e "${YELLOW}Twilio Auth Token:${NC}"
    read -p "Enter Twilio Auth Token: " TWILIO_TOKEN
    if [ -n "$TWILIO_TOKEN" ]; then
        update_env_var "$BACKEND_ENV" "TWILIO_AUTH_TOKEN" "$TWILIO_TOKEN"
    fi
    
    # Facebook
    echo -e "${YELLOW}Facebook OAuth Credentials:${NC}"
    read -p "Enter Facebook App ID: " FB_APP_ID
    read -p "Enter Facebook App Secret: " FB_APP_SECRET
    if [ -n "$FB_APP_ID" ]; then
        update_env_var "$BACKEND_ENV" "FACEBOOK_APP_ID" "$FB_APP_ID"
        update_env_var "$FRONTEND_ENV" "NEXT_PUBLIC_FACEBOOK_APP_ID" "$FB_APP_ID"
    fi
    if [ -n "$FB_APP_SECRET" ]; then
        update_env_var "$BACKEND_ENV" "FACEBOOK_APP_SECRET" "$FB_APP_SECRET"
    fi
}

# Main script logic
case "${1:-auto}" in
    "--interactive" | "-i")
        echo -e "${BLUE}🎯 Running in interactive mode...${NC}"
        get_stripe_credentials
        get_twilio_credentials  
        interactive_update
        ;;
    "--from-file" | "-f")
        if [ -n "$2" ] && [ -f "$2" ]; then
            echo -e "${BLUE}📁 Loading credentials from file: $2${NC}"
            source "$2"
            # Update variables that were loaded
            [ -n "$STRIPE_WEBHOOK_SECRET" ] && update_env_var "$BACKEND_ENV" "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
            [ -n "$GOOGLE_CLIENT_ID" ] && update_env_var "$BACKEND_ENV" "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
            # Add more as needed...
        else
            echo -e "${RED}❌ File not found: $2${NC}"
            exit 1
        fi
        ;;
    "auto" | "--auto" | "-a")
        echo -e "${BLUE}🔄 Running in automatic mode...${NC}"
        get_stripe_credentials
        get_twilio_credentials
        echo ""
        echo -e "${YELLOW}📋 Automatic updates complete. Manual steps still required for:${NC}"
        echo "   - Stripe webhook secret (from webhook creation)"
        echo "   - Google OAuth (from Cloud Console)"
        echo "   - SendGrid API key (from SendGrid dashboard)"
        echo "   - Twilio Auth Token (from Twilio console)"
        echo "   - Facebook credentials (from Facebook developers)"
        echo ""
        echo -e "${BLUE}💡 Tip: Run with --interactive to enter these manually${NC}"
        ;;
    "--help" | "-h")
        echo "Usage:"
        echo "  $0                    # Auto-update from CLIs"
        echo "  $0 --interactive      # Interactive credential entry"
        echo "  $0 --from-file FILE   # Load from credential file"
        echo "  $0 --help            # Show this help"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Environment update complete!${NC}"
echo ""
echo -e "${BLUE}📁 Files updated:${NC}"
echo "   - $BACKEND_ENV"
echo "   - $FRONTEND_ENV"
echo ""
echo -e "${BLUE}🔐 Backup files created with timestamp suffix${NC}"
echo ""
echo -e "${YELLOW}🚀 Next step: Test your staging environment${NC}"
echo "   cd backend-v2 && uvicorn main:app --reload --port 8001 --env-file .env.staging"
echo ""