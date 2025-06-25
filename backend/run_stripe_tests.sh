#!/bin/bash

# Stripe Connect Test Runner
# Runs the Stripe Connect functionality tests

set -e

echo "🧪 Stripe Connect Test Runner"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [[ ! -f "test_barber_onboarding.py" ]]; then
    echo -e "${RED}❌ Error: Must be run from the backend directory${NC}"
    echo "Please cd to the backend directory and run: ./run_stripe_tests.sh"
    exit 1
fi

# Check if Python dependencies are installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! python -c "import httpx, dotenv" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing required dependencies...${NC}"
    pip install httpx python-dotenv
fi

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 Please edit .env and add your Stripe keys, then run this script again.${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env.example file found. Please create a .env file with your Stripe configuration.${NC}"
        exit 1
    fi
fi

# Check if backend server is running
echo -e "${BLUE}🔍 Checking backend server...${NC}"
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend server is not running.${NC}"
    echo "Please start the backend server in another terminal:"
    echo "  cd backend && uvicorn main:app --reload"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Backend server is running${NC}"

# Show menu
echo ""
echo "Select test to run:"
echo "1) Quick Barber Onboarding Test (recommended)"
echo "2) Comprehensive Stripe Connect Test"
echo "3) Both tests"
echo "4) Check environment only"
echo "5) Show help"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${BLUE}🚀 Running Quick Barber Onboarding Test...${NC}"
        python test_barber_onboarding.py
        ;;
    2)
        echo -e "${BLUE}🚀 Running Comprehensive Stripe Connect Test...${NC}"
        python test_stripe_connect.py
        ;;
    3)
        echo -e "${BLUE}🚀 Running Both Tests...${NC}"
        echo ""
        echo "=== QUICK TEST ==="
        python test_barber_onboarding.py
        echo ""
        echo "=== COMPREHENSIVE TEST ==="
        python test_stripe_connect.py
        ;;
    4)
        echo -e "${BLUE}🔍 Checking environment configuration...${NC}"
        python -c "
import os
from dotenv import load_dotenv
load_dotenv()

required_vars = ['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_CLIENT_ID']
missing = []

for var in required_vars:
    if not os.getenv(var):
        missing.append(var)
    else:
        print(f'✅ {var} is set')

if missing:
    print(f'❌ Missing: {missing}')
    print('Please add these to your .env file')
else:
    print('✅ All required environment variables are set')
"
        ;;
    5)
        echo ""
        echo "📚 Stripe Connect Testing Help"
        echo "=============================="
        echo ""
        echo "This script helps you test the Stripe Connect functionality for barber onboarding."
        echo ""
        echo "Prerequisites:"
        echo "1. Backend server running (uvicorn main:app --reload)"
        echo "2. .env file with Stripe keys configured"
        echo "3. Python dependencies (httpx, python-dotenv)"
        echo ""
        echo "Environment variables needed:"
        echo "- STRIPE_SECRET_KEY=sk_test_..."
        echo "- STRIPE_CONNECT_CLIENT_ID=ca_..."
        echo ""
        echo "Test Options:"
        echo "1. Quick Test: Tests the main OAuth URL generation endpoint"
        echo "2. Comprehensive: Tests all Stripe Connect endpoints and functionality"
        echo "3. Both: Runs both test suites"
        echo ""
        echo "For more detailed information, see: STRIPE_CONNECT_TESTING.md"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Please run the script again and select 1-5.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Testing complete!${NC}"
echo ""
echo "Next steps:"
echo "1. If tests passed, use the OAuth URL to connect a test Stripe account"
echo "2. Check the success page at http://localhost:3000/oauth-success.html"
echo "3. Verify the barber's account info was saved in the database"
echo "4. Test payment processing with the connected account"
echo ""
echo "For detailed instructions, see: STRIPE_CONNECT_TESTING.md"
