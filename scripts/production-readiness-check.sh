#!/bin/bash

# Production Readiness Check for 6FB Booking Platform
# This script validates that all systems are ready for production deployment

echo "🏁 6FB Booking Platform - Production Readiness Check"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall readiness
READY_FOR_PRODUCTION=true
WARNINGS=0
ERRORS=0

# Function to check and report status
check_status() {
    local status=$1
    local message=$2
    local severity=$3  # "error" or "warning"
    
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $message"
    else
        if [ "$severity" = "error" ]; then
            echo -e "${RED}✗${NC} $message"
            READY_FOR_PRODUCTION=false
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC} $message"
            ((WARNINGS++))
        fi
    fi
}

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local file_path=$2
    local severity=${3:-"error"}
    
    if grep -q "^${var_name}=" "$file_path" 2>/dev/null && ! grep -q "^${var_name}=$" "$file_path" 2>/dev/null; then
        check_status 0 "$var_name is configured"
    else
        check_status 1 "$var_name is missing or empty in $file_path" "$severity"
    fi
}

echo "1. Environment Configuration"
echo "----------------------------"

# Check backend environment
if [ -f "backend/.env" ]; then
    check_status 0 "Backend .env file exists"
    
    # Critical environment variables
    check_env_var "DATABASE_URL" "backend/.env"
    check_env_var "JWT_SECRET" "backend/.env"
    check_env_var "JWT_ALGORITHM" "backend/.env"
    check_env_var "STRIPE_SECRET_KEY" "backend/.env"
    check_env_var "STRIPE_WEBHOOK_SECRET" "backend/.env"
    check_env_var "SENDGRID_API_KEY" "backend/.env"
    check_env_var "TWILIO_ACCOUNT_SID" "backend/.env"
    check_env_var "TWILIO_AUTH_TOKEN" "backend/.env"
    check_env_var "GOOGLE_CLIENT_ID" "backend/.env"
    check_env_var "GOOGLE_CLIENT_SECRET" "backend/.env"
    check_env_var "FRONTEND_URL" "backend/.env"
    check_env_var "BACKEND_URL" "backend/.env"
    check_env_var "ENCRYPTION_KEY" "backend/.env"
    
    # Check for production values
    if grep -q "sqlite:///" "backend/.env" 2>/dev/null; then
        check_status 1 "Database is SQLite (should be PostgreSQL for production)" "error"
    else
        check_status 0 "Database is not SQLite"
    fi
    
    if grep -q "sk_test_" "backend/.env" 2>/dev/null; then
        check_status 1 "Stripe is using test keys" "warning"
    else
        check_status 0 "Stripe is using live keys"
    fi
else
    check_status 1 "Backend .env file missing" "error"
fi

# Check frontend environment
if [ -f "frontend/.env.local" ]; then
    check_status 0 "Frontend .env.local file exists"
else
    check_status 1 "Frontend .env.local file missing" "warning"
fi

echo ""
echo "2. Code Quality & Testing"
echo "-------------------------"

# Run backend tests
echo "Running backend tests..."
cd backend
if python -m pytest tests/unit/ -q --tb=no > /dev/null 2>&1; then
    check_status 0 "Backend unit tests pass"
else
    check_status 1 "Backend unit tests fail" "error"
fi
cd ..

# Check for TypeScript errors
echo "Checking TypeScript..."
cd frontend
if npx tsc --noEmit > /dev/null 2>&1; then
    check_status 0 "No TypeScript errors"
else
    check_status 1 "TypeScript errors found" "error"
fi
cd ..

# Check for ESLint errors
cd frontend
if npm run lint > /dev/null 2>&1; then
    check_status 0 "No ESLint errors"
else
    check_status 1 "ESLint errors found" "warning"
fi
cd ..

echo ""
echo "3. Security Configuration"
echo "-------------------------"

# Check CORS settings
if grep -q "allow_origins.*\*" "backend/main.py" 2>/dev/null; then
    check_status 1 "CORS allows all origins (should be restricted)" "error"
else
    check_status 0 "CORS origins are restricted"
fi

# Check for exposed secrets
if git grep -i "api_key\|secret\|password" --name-only | grep -v -E "(\.env\.template|\.md|test_|mock_)" > /dev/null 2>&1; then
    check_status 1 "Possible exposed secrets in code" "error"
    echo "  Run: git grep -i 'api_key\|secret\|password' to review"
else
    check_status 0 "No exposed secrets found"
fi

# Check SSL/HTTPS configuration
if grep -q "SECURE_SSL_REDIRECT.*True" "backend/.env" 2>/dev/null || [ -f "backend/middleware/security.py" ]; then
    check_status 0 "SSL redirect configured"
else
    check_status 1 "SSL redirect not configured" "warning"
fi

echo ""
echo "4. Database & Migrations"
echo "------------------------"

# Check for pending migrations
cd backend
if alembic current > /dev/null 2>&1; then
    check_status 0 "Database migrations are accessible"
    
    # Check if migrations are up to date
    if alembic check > /dev/null 2>&1; then
        check_status 0 "Database schema is up to date"
    else
        check_status 1 "Pending database migrations" "error"
    fi
else
    check_status 1 "Cannot check database migrations" "error"
fi
cd ..

echo ""
echo "5. External Services"
echo "--------------------"

# Check API endpoints
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    check_status 0 "Backend API is running"
else
    check_status 1 "Backend API is not accessible" "warning"
fi

if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    check_status 0 "Frontend is running"
else
    check_status 1 "Frontend is not accessible" "warning"
fi

echo ""
echo "6. Performance & Optimization"
echo "-----------------------------"

# Check for production build
if [ -d "frontend/.next" ]; then
    check_status 0 "Frontend has been built"
else
    check_status 1 "Frontend needs to be built" "warning"
fi

# Check for database indexes
if [ -f "backend/models/appointment.py" ] && grep -q "__table_args__.*Index" backend/models/*.py > /dev/null 2>&1; then
    check_status 0 "Database indexes are defined"
else
    check_status 1 "Database indexes may be missing" "warning"
fi

echo ""
echo "7. Monitoring & Logging"
echo "-----------------------"

# Check for error tracking
if grep -q "sentry" "backend/requirements.txt" 2>/dev/null || grep -q "SENTRY_DSN" "backend/.env" 2>/dev/null; then
    check_status 0 "Error tracking configured"
else
    check_status 1 "Error tracking not configured" "warning"
fi

# Check for logging configuration
if [ -f "backend/utils/logging.py" ]; then
    check_status 0 "Logging configuration exists"
else
    check_status 1 "Logging configuration missing" "warning"
fi

echo ""
echo "8. Documentation & Deployment"
echo "-----------------------------"

# Check for deployment documentation
if [ -f "README.md" ]; then
    check_status 0 "README.md exists"
else
    check_status 1 "README.md missing" "warning"
fi

if [ -f "CLAUDE.md" ]; then
    check_status 0 "CLAUDE.md exists"
else
    check_status 1 "CLAUDE.md missing" "warning"
fi

# Check for deployment scripts
if [ -f "render.yaml" ] || [ -f "Dockerfile" ] || [ -f "railway.json" ]; then
    check_status 0 "Deployment configuration exists"
else
    check_status 1 "Deployment configuration missing" "error"
fi

echo ""
echo "=================================================="
echo "Production Readiness Summary"
echo "=================================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! System is ready for production.${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ System has $WARNINGS warnings but no critical errors.${NC}"
    echo "Review warnings above and decide if they need to be addressed."
else
    echo -e "${RED}❌ System has $ERRORS critical errors that must be fixed.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Also found $WARNINGS warnings to review.${NC}"
    fi
fi

echo ""
echo "Next Steps:"
if [ "$READY_FOR_PRODUCTION" = true ]; then
    echo "1. Review and address any warnings"
    echo "2. Run comprehensive tests: ./scripts/parallel-tests.sh"
    echo "3. Create production build: cd frontend && npm run build"
    echo "4. Deploy to staging environment first"
    echo "5. Perform final production deployment"
else
    echo "1. Fix all critical errors marked with ✗"
    echo "2. Re-run this script to verify fixes"
    echo "3. Address warnings if necessary"
    echo "4. Run comprehensive tests before deployment"
fi

echo ""
echo "Deployment Commands:"
echo "  Render: git push origin main"
echo "  Docker: docker-compose up -d"
echo "  Railway: railway up"

# Exit with error code if not ready
if [ "$READY_FOR_PRODUCTION" = false ]; then
    exit 1
else
    exit 0
fi