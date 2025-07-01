#!/bin/bash
# Quick Start Demo Script for 6FB Booking Platform
# =================================================

echo "🚀 6FB Booking Platform - Quick Start Demo"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python
if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")"

echo -e "${YELLOW}📋 Instructions:${NC}"
echo ""
echo "1. First, make sure both servers are running:"
echo "   ${GREEN}Terminal 1:${NC} cd backend-v2 && uvicorn main:app --reload"
echo "   ${GREEN}Terminal 2:${NC} cd frontend-v2 && npm run dev"
echo ""
echo "2. Then run the setup script:"
echo "   ${GREEN}python3 setup_test_demo.py${NC}"
echo ""
echo "3. The script will:"
echo "   - Create a test user: demo@6fb.com / Demo123!@#"
echo "   - Test the login"
echo "   - Create sample appointments"
echo "   - Open the calendar page in your browser"
echo ""
echo -e "${YELLOW}🎯 Quick Commands:${NC}"
echo ""
echo "Start backend:  ${GREEN}cd backend-v2 && uvicorn main:app --reload${NC}"
echo "Start frontend: ${GREEN}cd frontend-v2 && npm run dev${NC}"
echo "Run demo:       ${GREEN}python3 setup_test_demo.py${NC}"
echo ""
echo -e "${YELLOW}📌 Test Credentials:${NC}"
echo "Email:    demo@6fb.com"
echo "Password: Demo123!@#"
echo ""