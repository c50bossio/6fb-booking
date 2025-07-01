#!/bin/bash

# 6FB Booking Platform - Deployment Readiness Check
# This script verifies the current deployment readiness status

echo "🚀 6FB Booking Platform - Deployment Readiness Check"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check counters
passed=0
failed=0

check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC} - $2"
        ((passed++))
    else
        echo -e "${RED}❌ FAIL${NC} - $2"
        ((failed++))
    fi
}

echo -e "${BLUE}📋 Phase 8 Completion Status${NC}"
echo "----------------------------"

# Backend checks
echo ""
echo -e "${BLUE}🔧 Backend Verification${NC}"

# Check if Python dependencies are available
if python3 -c "import fastapi, uvicorn, sqlalchemy, pydantic" 2>/dev/null; then
    check_status 0 "Core Python dependencies available"
else
    check_status 1 "Core Python dependencies missing"
fi

# Check if requirements.txt exists
if [ -f "requirements.txt" ]; then
    check_status 0 "requirements.txt exists"
    dep_count=$(wc -l < requirements.txt)
    echo -e "   ${YELLOW}ℹ️${NC} Dependencies: $dep_count packages"
else
    check_status 1 "requirements.txt missing"
fi

# Check if main.py exists
if [ -f "main.py" ]; then
    check_status 0 "main.py entry point exists"
else
    check_status 1 "main.py entry point missing"
fi

# Check if Alembic migrations exist
if [ -d "alembic/versions" ] && [ "$(ls -A alembic/versions)" ]; then
    check_status 0 "Database migrations available"
    migration_count=$(ls alembic/versions/*.py 2>/dev/null | wc -l)
    echo -e "   ${YELLOW}ℹ️${NC} Migrations: $migration_count files"
else
    check_status 1 "Database migrations missing"
fi

# Check Docker configuration
if [ -f "Dockerfile" ]; then
    check_status 0 "Backend Dockerfile exists"
else
    check_status 1 "Backend Dockerfile missing"
fi

# Frontend checks
echo ""
echo -e "${BLUE}⚛️  Frontend Verification${NC}"
cd frontend-v2 2>/dev/null || { echo -e "${RED}❌ Frontend directory not found${NC}"; exit 1; }

# Check if package.json exists
if [ -f "package.json" ]; then
    check_status 0 "package.json exists"
    
    # Check if build script exists
    if grep -q '"build"' package.json; then
        check_status 0 "Build script configured"
    else
        check_status 1 "Build script missing"
    fi
    
    # Check if start script exists
    if grep -q '"start"' package.json; then
        check_status 0 "Start script configured"
    else
        check_status 1 "Start script missing"
    fi
else
    check_status 1 "package.json missing"
fi

# Check if Next.js config exists
if [ -f "next.config.js" ]; then
    check_status 0 "Next.js configuration exists"
    
    # Check if standalone mode is enabled
    if grep -q "output.*standalone" next.config.js; then
        check_status 0 "Standalone mode enabled for deployment"
    else
        check_status 1 "Standalone mode not configured"
    fi
else
    check_status 1 "Next.js configuration missing"
fi

# Check if TypeScript is configured
if [ -f "tsconfig.json" ]; then
    check_status 0 "TypeScript configuration exists"
else
    check_status 1 "TypeScript configuration missing"
fi

# Check Docker configuration
if [ -f "Dockerfile" ]; then
    check_status 0 "Frontend Dockerfile exists"
else
    check_status 1 "Frontend Dockerfile missing"
fi

# Check environment templates
if [ -f ".env.example" ]; then
    check_status 0 "Environment template exists"
else
    check_status 1 "Environment template missing"
fi

cd .. # Return to backend-v2 directory

# Testing infrastructure
echo ""
echo -e "${BLUE}🧪 Testing Infrastructure${NC}"

# Backend tests
if [ -d "tests" ]; then
    test_count=$(find tests -name "*.py" | wc -l)
    if [ $test_count -gt 0 ]; then
        check_status 0 "Backend test suite exists ($test_count test files)"
    else
        check_status 1 "Backend tests directory empty"
    fi
else
    check_status 1 "Backend tests directory missing"
fi

# Frontend tests
if [ -d "frontend-v2/__tests__" ] || [ -d "frontend-v2/tests" ] || find frontend-v2 -name "*.test.*" -o -name "*.spec.*" | grep -q .; then
    frontend_test_count=$(find frontend-v2 -name "*.test.*" -o -name "*.spec.*" | wc -l)
    check_status 0 "Frontend test suite exists ($frontend_test_count test files)"
else
    check_status 1 "Frontend test suite missing"
fi

# Configuration files
echo ""
echo -e "${BLUE}⚙️  Configuration Files${NC}"

# Railway deployment config
if [ -f "../railway.toml" ]; then
    check_status 0 "Railway deployment configuration"
else
    check_status 1 "Railway deployment configuration missing"
fi

# Environment examples
if [ -f ".env.example" ]; then
    check_status 0 "Backend environment template"
else
    check_status 1 "Backend environment template missing"
fi

if [ -f "frontend-v2/.env.example" ]; then
    check_status 0 "Frontend environment template"
else
    check_status 1 "Frontend environment template missing"
fi

# Documentation
echo ""
echo -e "${BLUE}📚 Documentation${NC}"

if [ -f "DEPLOYMENT.md" ]; then
    check_status 0 "Deployment documentation exists"
    doc_size=$(wc -l < DEPLOYMENT.md)
    echo -e "   ${YELLOW}ℹ️${NC} Documentation: $doc_size lines"
else
    check_status 1 "Deployment documentation missing"
fi

# Performance optimizations
echo ""
echo -e "${BLUE}⚡ Performance Optimizations${NC}"

# Check Next.js config for optimizations
if grep -q "experimental" frontend-v2/next.config.js 2>/dev/null; then
    check_status 0 "Frontend build optimizations configured"
else
    check_status 1 "Frontend build optimizations missing"
fi

# Check if bundle analyzer is configured
if grep -q "bundle-analyzer" frontend-v2/package.json 2>/dev/null; then
    check_status 0 "Bundle analyzer available"
else
    check_status 1 "Bundle analyzer not configured"
fi

# Security checks
echo ""
echo -e "${BLUE}🔒 Security Configuration${NC}"

# Check if rate limiting is configured
if grep -q "slowapi\|rate" requirements.txt 2>/dev/null; then
    check_status 0 "Rate limiting configured"
else
    check_status 1 "Rate limiting not configured"
fi

# Check if CORS is configured
if grep -q "CORSMiddleware" main.py 2>/dev/null; then
    check_status 0 "CORS middleware configured"
else
    check_status 1 "CORS middleware missing"
fi

# Summary
echo ""
echo "=================================================="
echo -e "${BLUE}📊 Deployment Readiness Summary${NC}"
echo "=================================================="

total=$((passed + failed))
percentage=$((passed * 100 / total))

echo -e "Total Checks: $total"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo -e "Success Rate: ${percentage}%"

echo ""
if [ $percentage -ge 90 ]; then
    echo -e "${GREEN}🎉 DEPLOYMENT READY!${NC}"
    echo -e "   Your application is ready for production deployment."
    echo -e "   See DEPLOYMENT.md for complete instructions."
elif [ $percentage -ge 80 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY${NC}"
    echo -e "   Address the failed checks before deployment."
    echo -e "   See DEPLOYMENT.md for troubleshooting."
else
    echo -e "${RED}🚫 NOT READY${NC}"
    echo -e "   Several critical issues need to be resolved."
    echo -e "   Review failed checks and fix before deployment."
fi

echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Review any failed checks above"
echo "2. Read DEPLOYMENT.md for complete instructions"
echo "3. Set up environment variables for your target platform"
echo "4. Run tests: pytest (backend) && npm test (frontend)"
echo "5. Deploy using your preferred method (Railway/Docker/Manual)"

echo ""
echo -e "${YELLOW}💡 Quick Start Commands:${NC}"
echo "Backend: uvicorn main:app --host 0.0.0.0 --port 8000"
echo "Frontend: cd frontend-v2 && npm run build && npm start"
echo "Docker: docker-compose up -d"

exit $failed