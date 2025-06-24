#!/bin/bash

# Pre-work checklist for 6FB Booking Platform
# This script ensures a safe working environment before starting development

echo "🛡️  6FB Booking Platform - Pre-Work Safety Checklist"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if all checks pass
ALL_CHECKS_PASSED=true

# Function to check and report status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ALL_CHECKS_PASSED=false
    fi
}

# 1. Check Git status
echo "1. Checking Git status..."
git_status=$(git status --porcelain 2>/dev/null)
if [ -z "$git_status" ]; then
    check_status 0 "Git working directory is clean"
else
    check_status 1 "Git working directory has uncommitted changes"
    echo -e "${YELLOW}   Run 'git status' to see changes${NC}"
fi

# 2. Check current branch
echo ""
echo "2. Checking current branch..."
current_branch=$(git branch --show-current 2>/dev/null)
if [ "$current_branch" == "main" ] || [ "$current_branch" == "master" ]; then
    check_status 0 "On main branch: $current_branch"
else
    echo -e "${YELLOW}ℹ${NC}  On branch: $current_branch"
fi

# 3. Check if up to date with remote
echo ""
echo "3. Checking if up to date with remote..."
git fetch origin >/dev/null 2>&1
LOCAL=$(git rev-parse @ 2>/dev/null)
REMOTE=$(git rev-parse @{u} 2>/dev/null)
BASE=$(git merge-base @ @{u} 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ]; then
    check_status 0 "Branch is up to date with remote"
elif [ "$LOCAL" = "$BASE" ]; then
    check_status 1 "Branch is behind remote (need to pull)"
    echo -e "${YELLOW}   Run 'git pull' to update${NC}"
else
    echo -e "${YELLOW}ℹ${NC}  Branch has local commits not pushed to remote"
fi

# 4. Check backend environment
echo ""
echo "4. Checking backend environment..."
if [ -f "backend/.env" ]; then
    check_status 0 "Backend .env file exists"
else
    check_status 1 "Backend .env file missing"
    echo -e "${YELLOW}   Copy from .env.template: cd backend && cp ../.env.template .env${NC}"
fi

# Check if virtual environment exists
if [ -d "backend/venv" ]; then
    check_status 0 "Backend virtual environment exists"
else
    check_status 1 "Backend virtual environment missing"
    echo -e "${YELLOW}   Create with: cd backend && python -m venv venv${NC}"
fi

# 5. Check frontend environment
echo ""
echo "5. Checking frontend environment..."
if [ -d "frontend/node_modules" ]; then
    check_status 0 "Frontend dependencies installed"
else
    check_status 1 "Frontend dependencies not installed"
    echo -e "${YELLOW}   Install with: cd frontend && npm install${NC}"
fi

# 6. Check for running services
echo ""
echo "6. Checking for running services..."
backend_port_used=$(lsof -ti:8000 2>/dev/null)
frontend_port_used=$(lsof -ti:3000 2>/dev/null)

if [ -z "$backend_port_used" ]; then
    check_status 0 "Backend port 8000 is available"
else
    check_status 1 "Backend port 8000 is in use (PID: $backend_port_used)"
    echo -e "${YELLOW}   Kill with: kill -9 $backend_port_used${NC}"
fi

if [ -z "$frontend_port_used" ]; then
    check_status 0 "Frontend port 3000 is available"
else
    check_status 1 "Frontend port 3000 is in use (PID: $frontend_port_used)"
    echo -e "${YELLOW}   Kill with: kill -9 $frontend_port_used${NC}"
fi

# 7. Run basic tests
echo ""
echo "7. Running basic tests..."
echo -e "${YELLOW}ℹ${NC}  Skipping tests for speed. Run manually:"
echo "   Backend: cd backend && pytest"
echo "   Frontend: cd frontend && npm test"

# Summary
echo ""
echo "=================================================="
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All checks passed! Safe to proceed.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create a feature branch: git checkout -b feature/your-feature-name"
    echo "2. Start development servers:"
    echo "   - Backend: cd backend && ./start_server.sh"
    echo "   - Frontend: cd frontend && npm run dev"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix issues before proceeding.${NC}"
    exit 1
fi