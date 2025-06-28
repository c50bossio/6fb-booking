#!/bin/bash

# Check monorepo import boundaries

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0

echo "Checking monorepo import boundaries..."

# Check frontend doesn't import from backend
echo -n "Checking frontend imports... "
if grep -r "from ['\"]\.\.\/\.\.\/backend" packages/frontend/src 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}FAIL${NC}"
    echo "Error: Frontend is importing from backend"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}OK${NC}"
fi

# Check backend doesn't import from frontend
echo -n "Checking backend imports... "
if grep -r "from ['\"]\.\.\/\.\.\/frontend" packages/backend/src 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}FAIL${NC}"
    echo "Error: Backend is importing from frontend"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}OK${NC}"
fi

# Check mobile only imports from shared
echo -n "Checking mobile imports... "
if grep -r "from ['\"]\.\.\/\.\.\/\(frontend\|backend\)" packages/mobile/src 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}FAIL${NC}"
    echo "Error: Mobile is importing from frontend or backend"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}OK${NC}"
fi

# Check for workspace protocol usage
echo -n "Checking workspace dependencies... "
WORKSPACE_ERRORS=0
for package in packages/*/package.json; do
    if grep -E "\"@6fb/(frontend|backend|shared|mobile)\": \"[^w]" "$package" 2>/dev/null; then
        echo -e "${RED}FAIL${NC}"
        echo "Error: $package has internal dependency not using workspace protocol"
        WORKSPACE_ERRORS=$((WORKSPACE_ERRORS + 1))
    fi
done
if [ "$WORKSPACE_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
else
    ERRORS=$((ERRORS + WORKSPACE_ERRORS))
fi

# Check for type duplication
echo "Checking for duplicated type definitions..."
DUPLICATED_TYPES=0
for file in $(find packages/frontend packages/backend packages/mobile -name "*.ts" -o -name "*.tsx" 2>/dev/null); do
    # Skip node_modules
    if [[ $file == *node_modules* ]]; then
        continue
    fi

    # Check for duplicated type definitions
    if grep -E "^(export )?(interface|type|enum) (User|Appointment|Payment|Booking|Barber|Client)" "$file" 2>/dev/null; then
        if [[ $file != *packages/shared* ]]; then
            echo "Warning: $file might be duplicating shared types"
            DUPLICATED_TYPES=$((DUPLICATED_TYPES + 1))
        fi
    fi
done

if [ "$DUPLICATED_TYPES" -gt 0 ]; then
    echo "Found $DUPLICATED_TYPES files with potentially duplicated types"
fi

# Summary
echo
if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}All boundary checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Found $ERRORS boundary violations${NC}"
    exit 1
fi
