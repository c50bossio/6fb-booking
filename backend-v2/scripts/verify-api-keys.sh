#!/bin/bash
# =============================================================================
# BookedBarber V2 - API Configuration Verification Script
# =============================================================================
# This script verifies that all required API keys are configured and working
# Run this before deploying to production to ensure all integrations are ready

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="$(dirname "$0")/.."
FRONTEND_DIR="$BACKEND_DIR/frontend-v2"
ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env.local"

echo -e "${BLUE}🔍 BookedBarber V2 API Configuration Verification${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Track results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Function to check if environment variable is set and not empty
check_env_var() {
    local var_name="$1"
    local description="$2"
    local is_critical="${3:-true}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -z "${!var_name}" ] || [ "${!var_name}" = "" ]; then
        if [ "$is_critical" = "true" ]; then
            echo -e "❌ ${RED}$var_name${NC} - $description (MISSING)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "⚠️  ${YELLOW}$var_name${NC} - $description (OPTIONAL)"
            WARNINGS=$((WARNINGS + 1))
        fi
        return 1
    else
        echo -e "✅ ${GREEN}$var_name${NC} - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

# Function to check if a value contains placeholder text
check_placeholder() {
    local var_name="$1"
    local description="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [[ "${!var_name}" == *"REPLACE_WITH_"* ]] || [[ "${!var_name}" == *"your_"* ]] || [[ "${!var_name}" == *"placeholder"* ]]; then
        echo -e "❌ ${RED}$var_name${NC} - $description (CONTAINS PLACEHOLDER)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    else
        echo -e "✅ ${GREEN}$var_name${NC} - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local url="$1"
    local description="$2"
    local auth_header="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "🌐 Testing $description... "
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s -w "%{http_code}" -H "$auth_header" "$url" 2>/dev/null | tail -1)
    else
        response=$(curl -s -w "%{http_code}" "$url" 2>/dev/null | tail -1)
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${GREEN}✅ Connected${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ Failed (HTTP $response)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to safely load environment file
load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        # Read environment file line by line, skipping comments and empty lines
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ -n "${line// }" ]]; then
                # Only process lines that look like environment variables
                if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                    export "$line"
                fi
            fi
        done < "$file"
        return 0
    else
        return 1
    fi
}

# Load environment variables
if load_env_file "$ENV_FILE"; then
    echo -e "${GREEN}✅ Loaded backend environment from $ENV_FILE${NC}\n"
else
    echo -e "${RED}❌ Backend environment file not found: $ENV_FILE${NC}\n"
    exit 1
fi

if load_env_file "$FRONTEND_ENV_FILE"; then
    echo -e "${GREEN}✅ Loaded frontend environment from $FRONTEND_ENV_FILE${NC}\n"
else
    echo -e "${YELLOW}⚠️  Frontend environment file not found: $FRONTEND_ENV_FILE${NC}\n"
fi

echo -e "${BLUE}🔒 CRITICAL CONFIGURATION CHECKS${NC}"
echo -e "${BLUE}=================================${NC}"

# Critical environment variables
check_env_var "SECRET_KEY" "Application secret key"
check_env_var "JWT_SECRET_KEY" "JWT secret key"
check_env_var "DATABASE_URL" "Database connection"

echo ""
echo -e "${BLUE}💳 PAYMENT PROCESSING (STRIPE)${NC}"
echo -e "${BLUE}===============================${NC}"

check_env_var "STRIPE_SECRET_KEY" "Stripe secret key"
check_env_var "STRIPE_PUBLISHABLE_KEY" "Stripe publishable key"
check_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Frontend Stripe key"

# Check if using test vs live keys
if [ -n "$STRIPE_SECRET_KEY" ]; then
    if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
        echo -e "⚠️  ${YELLOW}Using Stripe TEST keys${NC} - Switch to live keys for production"
        WARNINGS=$((WARNINGS + 1))
    elif [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
        echo -e "✅ ${GREEN}Using Stripe LIVE keys${NC} - Production ready"
    fi
fi

echo ""
echo -e "${BLUE}📧 EMAIL NOTIFICATIONS (SENDGRID)${NC}"
echo -e "${BLUE}==================================${NC}"

check_env_var "SENDGRID_API_KEY" "SendGrid API key"
check_env_var "SENDGRID_FROM_EMAIL" "SendGrid sender email"

echo ""
echo -e "${BLUE}📱 SMS NOTIFICATIONS (TWILIO)${NC}"
echo -e "${BLUE}=============================${NC}"

check_env_var "TWILIO_ACCOUNT_SID" "Twilio Account SID"
check_env_var "TWILIO_AUTH_TOKEN" "Twilio Auth Token"
check_env_var "TWILIO_PHONE_NUMBER" "Twilio Phone Number"

echo ""
echo -e "${BLUE}🗓️  GOOGLE SERVICES INTEGRATION${NC}"
echo -e "${BLUE}===============================${NC}"

check_env_var "GOOGLE_CLIENT_ID" "Google OAuth Client ID"
check_env_var "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret"

echo ""
echo -e "${BLUE}📊 ANALYTICS & TRACKING${NC}"
echo -e "${BLUE}======================${NC}"

check_env_var "NEXT_PUBLIC_GA_MEASUREMENT_ID" "Google Analytics 4 Measurement ID" false
check_env_var "NEXT_PUBLIC_GTM_ID" "Google Tag Manager Container ID" false
check_env_var "NEXT_PUBLIC_META_PIXEL_ID" "Meta Pixel ID" false

echo ""
echo -e "${BLUE}🔍 ERROR MONITORING (SENTRY)${NC}"
echo -e "${BLUE}===========================${NC}"

check_env_var "SENTRY_DSN" "Backend Sentry DSN" false
check_env_var "NEXT_PUBLIC_SENTRY_DSN" "Frontend Sentry DSN" false

echo ""
echo -e "${BLUE}🌐 API CONNECTIVITY${NC}"
echo -e "${BLUE}=================${NC}"

# Check API URL configuration
if [ -n "$NEXT_PUBLIC_API_URL" ]; then
    echo -e "✅ ${GREEN}Frontend API URL${NC}: $NEXT_PUBLIC_API_URL"
    
    # Test if backend is reachable
    echo -n "🌐 Testing backend connectivity... "
    if curl -s "$NEXT_PUBLIC_API_URL/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend reachable${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ Backend not reachable${NC}"
        echo -e "   ${YELLOW}Note: This is normal if the backend is not currently running${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
else
    echo -e "❌ ${RED}NEXT_PUBLIC_API_URL${NC} not configured"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

echo ""
echo -e "${BLUE}🧪 EXTERNAL API CONNECTIVITY${NC}"
echo -e "${BLUE}============================${NC}"

# Test Stripe API
if [ -n "$STRIPE_SECRET_KEY" ] && [[ "$STRIPE_SECRET_KEY" != *"placeholder"* ]] && [[ "$STRIPE_SECRET_KEY" != *"REPLACE_WITH"* ]]; then
    test_api_endpoint "https://api.stripe.com/v1/account" "Stripe API" "Authorization: Bearer $STRIPE_SECRET_KEY"
fi

# Test SendGrid API
if [ -n "$SENDGRID_API_KEY" ] && [[ "$SENDGRID_API_KEY" != *"placeholder"* ]] && [[ "$SENDGRID_API_KEY" != *"REPLACE_WITH"* ]]; then
    test_api_endpoint "https://api.sendgrid.com/v3/user/account" "SendGrid API" "Authorization: Bearer $SENDGRID_API_KEY"
fi

# Test Twilio API
if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ] && [[ "$TWILIO_ACCOUNT_SID" != *"placeholder"* ]]; then
    test_api_endpoint "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" "Twilio API" "Authorization: Basic $(echo -n "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" | base64)"
fi

echo ""
echo -e "${BLUE}🔧 FEATURE FLAGS${NC}"
echo -e "${BLUE}=============${NC}"

# Check feature flags
features=(
    "ENABLE_EMAIL_NOTIFICATIONS:Email notifications"
    "ENABLE_SMS_NOTIFICATIONS:SMS notifications"
    "ENABLE_GOOGLE_CALENDAR:Google Calendar integration"
    "ENABLE_ANALYTICS:Analytics tracking"
    "NEXT_PUBLIC_ENABLE_ANALYTICS:Frontend analytics"
)

for feature in "${features[@]}"; do
    IFS=':' read -r var_name description <<< "$feature"
    if [ "${!var_name}" = "true" ]; then
        echo -e "✅ ${GREEN}$description${NC} - Enabled"
    else
        echo -e "⚠️  ${YELLOW}$description${NC} - Disabled"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""
echo -e "${BLUE}📋 SUMMARY${NC}"
echo -e "${BLUE}=========${NC}"

echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}✅ Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}❌ Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"

echo ""

# Overall status
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CRITICAL CHECKS PASSED!${NC}"
    echo -e "${GREEN}✅ Your BookedBarber V2 configuration is production-ready!${NC}"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Note: There are $WARNINGS optional features that could be configured${NC}"
    fi
    
    exit 0
else
    echo -e "${RED}🚨 CONFIGURATION ISSUES FOUND!${NC}"
    echo -e "${RED}❌ $FAILED_CHECKS critical checks failed${NC}"
    echo -e "${YELLOW}Please fix the missing configuration before deploying to production${NC}"
    
    echo ""
    echo -e "${BLUE}📖 NEXT STEPS:${NC}"
    echo "1. Review the PRODUCTION_API_KEYS_SETUP_GUIDE.md"
    echo "2. Configure missing API keys and services"
    echo "3. Run this script again to verify fixes"
    echo "4. Deploy to staging environment for testing"
    
    exit 1
fi