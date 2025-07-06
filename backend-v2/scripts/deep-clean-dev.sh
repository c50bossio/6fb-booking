#!/bin/bash
# Deep Clean Development Environment Script
# This script performs a thorough cleanup of your development environment

echo "🧹 BookedBarber Deep Clean - Development Environment"
echo "==================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $1 in
        "success") echo -e "${GREEN}✅ $2${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "error") echo -e "${RED}❌ $2${NC}" ;;
        "info") echo -e "ℹ️  $2" ;;
    esac
}

# Step 1: Kill all Node.js processes
print_status "info" "Step 1: Killing all Node.js processes..."
pkill -f "node" 2>/dev/null && print_status "success" "Killed Node.js processes" || print_status "warning" "No Node.js processes found"
pkill -f "npm" 2>/dev/null && print_status "success" "Killed npm processes" || print_status "warning" "No npm processes found"
pkill -f "next" 2>/dev/null && print_status "success" "Killed Next.js processes" || print_status "warning" "No Next.js processes found"

# Step 2: Kill Python/Backend processes
print_status "info" "Step 2: Killing backend processes..."
pkill -f "uvicorn" 2>/dev/null && print_status "success" "Killed Uvicorn processes" || print_status "warning" "No Uvicorn processes found"
pkill -f "python.*main:app" 2>/dev/null && print_status "success" "Killed FastAPI processes" || print_status "warning" "No FastAPI processes found"

# Step 3: Clear ports
print_status "info" "Step 3: Clearing ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && print_status "success" "Cleared port 3000" || print_status "warning" "Port 3000 was already free"
lsof -ti:8000 | xargs kill -9 2>/dev/null && print_status "success" "Cleared port 8000" || print_status "warning" "Port 8000 was already free"

# Step 4: Clear Next.js cache
print_status "info" "Step 4: Clearing Next.js cache..."
if [ -d "frontend-v2/.next" ]; then
    rm -rf frontend-v2/.next
    print_status "success" "Cleared .next cache"
else
    print_status "warning" "No .next cache found"
fi

# Step 5: Clear Node modules cache
print_status "info" "Step 5: Clearing Node modules cache..."
if [ -d "frontend-v2/node_modules/.cache" ]; then
    rm -rf frontend-v2/node_modules/.cache
    print_status "success" "Cleared node_modules cache"
else
    print_status "warning" "No node_modules cache found"
fi

# Step 6: Clear TypeScript build info
print_status "info" "Step 6: Clearing TypeScript build cache..."
find . -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null && print_status "success" "Cleared TypeScript cache" || print_status "warning" "No TypeScript cache found"

# Step 7: Clear Python cache
print_status "info" "Step 7: Clearing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null && print_status "success" "Cleared Python cache" || print_status "warning" "No Python cache found"
find . -name "*.pyc" -delete 2>/dev/null && print_status "success" "Cleared .pyc files" || print_status "warning" "No .pyc files found"

# Step 8: Check Redis
print_status "info" "Step 8: Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    print_status "success" "Redis is running"
    redis-cli FLUSHDB > /dev/null 2>&1 && print_status "success" "Cleared Redis cache"
else
    print_status "error" "Redis is not running - starting it..."
    redis-server --daemonize yes > /dev/null 2>&1 && print_status "success" "Started Redis" || print_status "error" "Failed to start Redis"
fi

# Step 9: Check system resources
print_status "info" "Step 9: System resource check..."
echo ""
echo "Memory Usage:"
if command -v free > /dev/null 2>&1; then
    free -h | grep -E "^Mem|^Swap"
else
    vm_stat | grep -E "Pages (free|active|inactive|speculative|wired)"
fi
echo ""

# Step 10: Show port status
print_status "info" "Step 10: Port availability check..."
echo ""
for port in 3000 3001 8000 8001 6379; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_status "error" "Port $port is in use"
    else
        print_status "success" "Port $port is available"
    fi
done

echo ""
echo "🎉 Deep clean complete!"
echo ""
echo "Next steps:"
echo "1. cd frontend-v2 && npm install (if needed)"
echo "2. Start backend: cd backend-v2 && uvicorn main:app --reload"
echo "3. Start frontend: cd frontend-v2 && npm run dev"
echo ""
echo "💡 Tip: Use 'npm run dev:clean' for a fresh start every time"