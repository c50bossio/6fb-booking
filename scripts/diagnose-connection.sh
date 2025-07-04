#!/bin/bash

echo "BookedBarber Connection Diagnostic"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is listening
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Port $port ($service): LISTENING${NC}"
        lsof -i :$port | grep LISTEN | head -1
    else
        echo -e "${RED}❌ Port $port ($service): NOT LISTENING${NC}"
    fi
}

# Function to test HTTP connection
test_http() {
    local url=$1
    local description=$2
    
    echo -e "\nTesting: $description"
    if curl -s -o /dev/null -w "Status: %{http_code}\n" --connect-timeout 5 "$url"; then
        echo -e "${GREEN}✅ Connection successful${NC}"
    else
        echo -e "${RED}❌ Connection failed${NC}"
    fi
}

echo "1. Checking if services are running..."
echo "--------------------------------------"
check_port 3000 "Frontend"
check_port 8000 "Backend API"
check_port 5432 "PostgreSQL"

echo -e "\n2. Testing HTTP connections..."
echo "--------------------------------------"
test_http "http://localhost:3000/" "Frontend home page"
test_http "http://localhost:3000/register" "Registration page"
test_http "http://localhost:8000/" "Backend API root"
test_http "http://localhost:8000/api/v1/auth/register" "Registration endpoint (should return 405 for GET)"

echo -e "\n3. Checking processes..."
echo "--------------------------------------"
if pgrep -f "next-server" > /dev/null; then
    echo -e "${GREEN}✅ Next.js server is running${NC}"
else
    echo -e "${RED}❌ Next.js server is NOT running${NC}"
fi

if pgrep -f "uvicorn main:app" > /dev/null; then
    echo -e "${GREEN}✅ FastAPI server is running${NC}"
else
    echo -e "${RED}❌ FastAPI server is NOT running${NC}"
fi

echo -e "\n4. Network interfaces..."
echo "--------------------------------------"
ifconfig lo0 | grep "inet " | head -1

echo -e "\n5. Browser test..."
echo "--------------------------------------"
echo "To test in your browser:"
echo "1. Open Chrome in Incognito mode (Cmd+Shift+N)"
echo "2. Navigate to: http://localhost:3000/register"
echo "3. Check Developer Tools Console (Cmd+Option+I) for errors"

echo -e "\n6. Alternative URLs to try..."
echo "--------------------------------------"
echo "- http://127.0.0.1:3000/register (using IP instead of localhost)"
echo "- http://localhost:3001/register (staging port)"
echo "- http://[::1]:3000/register (IPv6 localhost)"

echo -e "\n7. Common fixes..."
echo "--------------------------------------"
echo "If connection refused:"
echo "1. Clear browser cache and cookies"
echo "2. Disable browser extensions (especially VPNs/proxies)"
echo "3. Check /etc/hosts file: cat /etc/hosts | grep localhost"
echo "4. Restart services: cd backend-v2 && ./scripts/start-dev-session.sh"
echo "5. Try a different browser"

echo -e "\n8. Checking /etc/hosts..."
echo "--------------------------------------"
grep -E "localhost|127.0.0.1" /etc/hosts

echo -e "\nDiagnostic complete!"