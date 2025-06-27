#!/bin/bash

# Barber PIN Authentication Test Script
# This script tests the complete PIN authentication flow using curl

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:8000}"
API_PREFIX="/api/v1"
BARBER_ID=1
TEST_PIN="1234"
WRONG_PIN="9999"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Barber PIN Authentication Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Base URL: $BASE_URL"
echo -e "Barber ID: $BARBER_ID"
echo ""

# Test 1: Check PIN Status
echo -e "${YELLOW}Test 1: Check PIN Status${NC}"
curl -s -X GET "$BASE_URL$API_PREFIX/barber-pin/status/$BARBER_ID" | jq '.' || echo "Failed"
echo ""

# Test 2: Setup PIN
echo -e "${YELLOW}Test 2: Setup PIN${NC}"
SETUP_RESPONSE=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/setup" \
    -H "Content-Type: application/json" \
    -d "{\"barber_id\": $BARBER_ID, \"pin\": \"$TEST_PIN\"}")
echo "$SETUP_RESPONSE" | jq '.' || echo "$SETUP_RESPONSE"
echo ""

# Test 3: Authenticate with correct PIN
echo -e "${YELLOW}Test 3: Authenticate with correct PIN${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/authenticate" \
    -H "Content-Type: application/json" \
    -d "{\"barber_id\": $BARBER_ID, \"pin\": \"$TEST_PIN\", \"device_info\": \"Bash Test Script\"}")
echo "$AUTH_RESPONSE" | jq '.' || echo "$AUTH_RESPONSE"

# Extract session token
SESSION_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.session_token // empty')
if [ -n "$SESSION_TOKEN" ]; then
    echo -e "${GREEN}✓ Authentication successful! Session token obtained.${NC}"
else
    echo -e "${RED}✗ Authentication failed!${NC}"
fi
echo ""

# Test 4: Authenticate with wrong PIN
echo -e "${YELLOW}Test 4: Authenticate with wrong PIN${NC}"
WRONG_AUTH=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/authenticate" \
    -H "Content-Type: application/json" \
    -d "{\"barber_id\": $BARBER_ID, \"pin\": \"$WRONG_PIN\", \"device_info\": \"Bash Test Script\"}")
echo "$WRONG_AUTH" | jq '.' || echo "$WRONG_AUTH"

if [ "$(echo "$WRONG_AUTH" | jq -r '.success')" = "false" ]; then
    echo -e "${GREEN}✓ Correctly rejected wrong PIN${NC}"
else
    echo -e "${RED}✗ Wrong PIN was accepted!${NC}"
fi
echo ""

# Test 5: Test account lockout
echo -e "${YELLOW}Test 5: Test account lockout (5 failed attempts)${NC}"
for i in {1..5}; do
    echo -e "  Attempt $i..."
    LOCKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/authenticate" \
        -H "Content-Type: application/json" \
        -d "{\"barber_id\": $BARBER_ID, \"pin\": \"$WRONG_PIN\", \"device_info\": \"Lockout Test\"}")
    MESSAGE=$(echo "$LOCKOUT_RESPONSE" | jq -r '.message // "No message"')
    echo "  Response: $MESSAGE"

    if [[ "$MESSAGE" == *"locked"* ]]; then
        echo -e "${GREEN}✓ Account locked after $i attempts${NC}"
        break
    fi
done
echo ""

# Test 6: Validate session
if [ -n "$SESSION_TOKEN" ]; then
    echo -e "${YELLOW}Test 6: Validate session${NC}"
    VALIDATE_RESPONSE=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/validate-session" \
        -H "Content-Type: application/json" \
        -d "{\"session_token\": \"$SESSION_TOKEN\"}")
    echo "$VALIDATE_RESPONSE" | jq '.' || echo "$VALIDATE_RESPONSE"

    if [ "$(echo "$VALIDATE_RESPONSE" | jq -r '.valid')" = "true" ]; then
        echo -e "${GREEN}✓ Session is valid${NC}"
    else
        echo -e "${RED}✗ Session validation failed${NC}"
    fi
    echo ""
fi

# Test 7: Get active sessions
echo -e "${YELLOW}Test 7: Get active sessions${NC}"
curl -s -X GET "$BASE_URL$API_PREFIX/barber-pin/sessions/$BARBER_ID" | jq '.' || echo "Failed"
echo ""

# Test 8: Verify POS access
if [ -n "$SESSION_TOKEN" ]; then
    echo -e "${YELLOW}Test 8: Verify POS access${NC}"
    POS_RESPONSE=$(curl -s -X GET "$BASE_URL$API_PREFIX/barber-pin/verify-access" \
        -H "Authorization: Bearer $SESSION_TOKEN")
    echo "$POS_RESPONSE" | jq '.' || echo "$POS_RESPONSE"

    if [ "$(echo "$POS_RESPONSE" | jq -r '.authorized // false')" = "true" ]; then
        echo -e "${GREEN}✓ POS access verified${NC}"
    else
        echo -e "${RED}✗ POS access verification failed${NC}"
    fi
    echo ""
fi

# Test 9: Reset PIN attempts (admin function)
echo -e "${YELLOW}Test 9: Reset PIN attempts (admin)${NC}"
RESET_RESPONSE=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/reset" \
    -H "Content-Type: application/json" \
    -d "{\"barber_id\": $BARBER_ID, \"admin_token\": \"test-admin-token\"}")
echo "$RESET_RESPONSE" | jq '.' || echo "$RESET_RESPONSE"
echo ""

# Test 10: Logout
if [ -n "$SESSION_TOKEN" ]; then
    echo -e "${YELLOW}Test 10: Logout${NC}"
    LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL$API_PREFIX/barber-pin/logout" \
        -H "Content-Type: application/json" \
        -d "{\"session_token\": \"$SESSION_TOKEN\"}")
    echo "$LOGOUT_RESPONSE" | jq '.' || echo "$LOGOUT_RESPONSE"

    if [ "$(echo "$LOGOUT_RESPONSE" | jq -r '.success')" = "true" ]; then
        echo -e "${GREEN}✓ Logged out successfully${NC}"
    else
        echo -e "${RED}✗ Logout failed${NC}"
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"
