#!/bin/bash
# Environment Configuration Validator
# Validates both development and staging environment configurations

echo "🔍 Environment Configuration Validator"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_ERRORS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo -e "${RED}❌ Error: Please run this script from the backend-v2 directory${NC}"
    exit 1
fi

echo
echo "🔧 Backend Configuration Validation"
echo "--------------------------------"

# Check backend .env files exist
if [ -f ".env" ]; then
    print_status 0 "Development .env file exists"
else
    print_status 1 "Development .env file missing"
fi

if [ -f ".env.staging" ]; then
    print_status 0 "Staging .env.staging file exists"
else
    print_status 1 "Staging .env.staging file missing"
fi

# Check port configurations
DEV_PORT=$(grep "^PORT=" .env | cut -d'=' -f2 || echo "8000")
STAGING_PORT=$(grep "^PORT=" .env.staging | cut -d'=' -f2)

if [ "$STAGING_PORT" = "8001" ]; then
    print_status 0 "Staging backend port correctly set to 8001"
else
    print_status 1 "Staging backend port not set to 8001 (found: $STAGING_PORT)"
fi

# Check CORS configurations
DEV_CORS=$(grep "^ALLOWED_ORIGINS=" .env | cut -d'=' -f2)
STAGING_CORS=$(grep "^ALLOWED_ORIGINS=" .env.staging | cut -d'=' -f2)

if [[ "$DEV_CORS" == *"3000"* ]] && [[ ! "$DEV_CORS" == *"3001"* ]]; then
    print_status 0 "Development CORS correctly set for port 3000 only"
else
    print_status 1 "Development CORS misconfigured (found: $DEV_CORS)"
fi

if [[ "$STAGING_CORS" == *"3001"* ]] && [[ "$STAGING_CORS" == *"8001"* ]]; then
    print_status 0 "Staging CORS correctly set for ports 3001 and 8001"
else
    print_status 1 "Staging CORS misconfigured (found: $STAGING_CORS)"
fi

# Check database configurations
DEV_DB=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2)
STAGING_DB=$(grep "^DATABASE_URL=" .env.staging | cut -d'=' -f2)

if [[ "$DEV_DB" == *"6fb_booking.db"* ]]; then
    print_status 0 "Development database correctly configured"
else
    print_status 1 "Development database misconfigured (found: $DEV_DB)"
fi

if [[ "$STAGING_DB" == *"staging_6fb_booking.db"* ]]; then
    print_status 0 "Staging database correctly configured"
else
    print_status 1 "Staging database misconfigured (found: $STAGING_DB)"
fi

echo
echo "🖥️  Frontend Configuration Validation"
echo "-----------------------------------"

cd frontend-v2

# Check frontend .env files exist
if [ -f ".env.local" ]; then
    print_status 0 "Development .env.local file exists"
else
    print_status 1 "Development .env.local file missing"
fi

if [ -f ".env.staging" ]; then
    print_status 0 "Staging .env.staging file exists"
else
    print_status 1 "Staging .env.staging file missing"
fi

# Check API URL configurations
if [ -f ".env.local" ]; then
    DEV_API_URL=$(grep "^NEXT_PUBLIC_API_URL=" .env.local | cut -d'=' -f2)
    if [[ "$DEV_API_URL" == *"8000"* ]]; then
        print_status 0 "Development frontend points to backend port 8000"
    else
        print_status 1 "Development frontend API URL misconfigured (found: $DEV_API_URL)"
    fi
fi

if [ -f ".env.staging" ]; then
    STAGING_API_URL=$(grep "^NEXT_PUBLIC_API_URL=" .env.staging | cut -d'=' -f2)
    if [[ "$STAGING_API_URL" == *"8001"* ]]; then
        print_status 0 "Staging frontend points to backend port 8001"
    else
        print_status 1 "Staging frontend API URL misconfigured (found: $STAGING_API_URL)"
    fi
fi

# Check package.json scripts
if grep -q "staging.*3001" package.json; then
    print_status 0 "Staging npm scripts correctly configured"
else
    print_status 1 "Staging npm scripts missing or misconfigured"
fi

cd ..

echo
echo "🚀 Startup Scripts Validation"
echo "----------------------------"

if [ -f "start-development.sh" ] && [ -x "start-development.sh" ]; then
    print_status 0 "Development startup script exists and is executable"
else
    print_status 1 "Development startup script missing or not executable"
fi

if [ -f "start-staging.sh" ] && [ -x "start-staging.sh" ]; then
    print_status 0 "Staging startup script exists and is executable"
else
    print_status 1 "Staging startup script missing or not executable"
fi

echo
echo "📊 Environment Isolation Check"
echo "-----------------------------"

print_info "Development Environment:"
echo "  - Frontend: http://localhost:3000 → Backend: http://localhost:8000"
echo "  - Database: 6fb_booking.db"
echo "  - Redis DB: 0"

print_info "Staging Environment:"
echo "  - Frontend: http://localhost:3001 → Backend: http://localhost:8001"
echo "  - Database: staging_6fb_booking.db"
echo "  - Redis DB: 1"

if [ "$DEV_DB" != "$STAGING_DB" ]; then
    print_status 0 "Environments use separate databases"
else
    print_status 1 "Environments share the same database (risk of conflicts)"
fi

echo
echo "📋 Summary"
echo "========="

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All environment configurations are correct!${NC}"
    echo
    echo "✅ Ready to run parallel environments:"
    echo "   Development: ./start-development.sh"
    echo "   Staging:     ./start-staging.sh"
    echo
    echo "✅ Or start individually:"
    echo "   Frontend Dev:     cd frontend-v2 && npm run dev"
    echo "   Frontend Staging: cd frontend-v2 && npm run staging"
    echo "   Backend Dev:      uvicorn main:app --port 8000 --reload"
    echo "   Backend Staging:  uvicorn main:app --port 8001 --reload --env-file .env.staging"
else
    echo -e "${RED}❗ Found $VALIDATION_ERRORS configuration errors that need to be fixed${NC}"
    exit 1
fi