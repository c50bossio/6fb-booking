#!/bin/bash
# Development Issues Diagnostic Script for BookedBarber V2
# Quickly identifies common development environment problems

echo "🔍 BookedBarber V2 - Development Diagnostics"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
ISSUES=0
WARNINGS=0

# Function to report issue
report_issue() {
    echo -e "${RED}❌ ISSUE: $1${NC}"
    ISSUES=$((ISSUES + 1))
}

# Function to report warning
report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# Function to report success
report_success() {
    echo -e "${GREEN}✅ OK: $1${NC}"
}

# Function to report info
report_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Check for multiple server instances
echo -e "${CYAN}1. Checking for multiple server instances...${NC}"
NEXT_COUNT=$(pgrep -f "next dev" | wc -l)
NPM_COUNT=$(pgrep -f "npm run dev" | wc -l)
UVICORN_COUNT=$(pgrep -f "uvicorn" | wc -l)

if [ $NEXT_COUNT -gt 1 ]; then
    report_issue "Multiple Next.js processes detected ($NEXT_COUNT instances)"
    echo "   This causes Internal Server Errors and missing UI components"
    echo "   Fix: ./scripts/kill-ports.sh"
else
    report_success "No duplicate Next.js processes"
fi

if [ $NPM_COUNT -gt 1 ]; then
    report_warning "Multiple npm processes detected ($NPM_COUNT instances)"
fi

if [ $UVICORN_COUNT -gt 1 ]; then
    report_warning "Multiple uvicorn processes detected ($UVICORN_COUNT instances)"
fi
echo ""

# 2. Check port availability
echo -e "${CYAN}2. Checking port availability...${NC}"
for port in 3000 8000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        PID=$(lsof -ti:$port -sTCP:LISTEN)
        PNAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        if [ $port -eq 3000 ]; then
            report_info "Port $port is in use by $PNAME (PID: $PID)"
        else
            report_info "Port $port is in use by $PNAME (PID: $PID)"
        fi
    else
        report_warning "Port $port is not in use - is the service running?"
    fi
done
echo ""

# 3. Check cache corruption
echo -e "${CYAN}3. Checking for cache issues...${NC}"
FRONTEND_DIR="../frontend-v2"
if [ -d "$FRONTEND_DIR/.next" ]; then
    # Check if .next directory is unusually large (>1GB)
    if [ "$(uname)" = "Darwin" ]; then
        SIZE=$(du -sk "$FRONTEND_DIR/.next" | cut -f1)
    else
        SIZE=$(du -sk "$FRONTEND_DIR/.next" | cut -f1)
    fi
    
    if [ $SIZE -gt 1048576 ]; then
        report_warning ".next cache is very large ($(($SIZE/1024))MB) - consider clearing"
        echo "   Fix: rm -rf $FRONTEND_DIR/.next"
    else
        report_success ".next cache size is normal ($(($SIZE/1024))MB)"
    fi
    
    # Check for lock files
    if [ -f "$FRONTEND_DIR/.next/cache/webpack/client-development/index.pack.old" ]; then
        report_warning "Webpack cache lock files detected - may cause build issues"
    fi
else
    report_info "No .next cache found"
fi
echo ""

# 4. Check environment files
echo -e "${CYAN}4. Checking environment configuration...${NC}"
if [ ! -f "../.env" ]; then
    report_issue "Backend .env file missing"
    echo "   Fix: cp ../.env.template ../.env"
else
    report_success "Backend .env file exists"
    
    # Check for common missing variables
    if ! grep -q "DATABASE_URL" ../.env; then
        report_warning "DATABASE_URL not found in .env"
    fi
    if ! grep -q "SECRET_KEY" ../.env; then
        report_warning "SECRET_KEY not found in .env"
    fi
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    report_issue "Frontend .env.local file missing"
    echo "   Fix: cp $FRONTEND_DIR/.env.local.example $FRONTEND_DIR/.env.local"
else
    report_success "Frontend .env.local file exists"
fi
echo ""

# 5. Check dependencies
echo -e "${CYAN}5. Checking dependencies...${NC}"
if [ ! -d "../venv" ]; then
    report_warning "Python virtual environment not found"
    echo "   Fix: cd .. && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
else
    report_success "Python virtual environment exists"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    report_issue "Node modules not installed"
    echo "   Fix: cd $FRONTEND_DIR && npm install"
else
    report_success "Node modules installed"
    
    # Check for outdated lock file
    if [ -f "$FRONTEND_DIR/package-lock.json" ]; then
        if [ "$FRONTEND_DIR/package-lock.json" -ot "$FRONTEND_DIR/package.json" ]; then
            report_warning "package-lock.json is older than package.json - may need update"
            echo "   Fix: cd $FRONTEND_DIR && npm install"
        fi
    fi
fi
echo ""

# 6. Check system resources
echo -e "${CYAN}6. Checking system resources...${NC}"
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    MEM_PRESSURE=$(memory_pressure | grep "System-wide memory free percentage" | awk '{print $5}' | sed 's/%//')
    if [ ! -z "$MEM_PRESSURE" ] && [ $MEM_PRESSURE -lt 10 ]; then
        report_warning "Low system memory (${MEM_PRESSURE}% free)"
    else
        report_success "Adequate system memory"
    fi
else
    # Linux
    MEM_FREE=$(free | grep Mem | awk '{print ($4/$2)*100}' | cut -d. -f1)
    if [ $MEM_FREE -lt 10 ]; then
        report_warning "Low system memory (${MEM_FREE}% free)"
    else
        report_success "Adequate system memory"
    fi
fi
echo ""

# 7. Common error patterns
echo -e "${CYAN}7. Checking for common error patterns...${NC}"
LOG_FILES=("../logs/*.log" "$FRONTEND_DIR/.next/trace")

for pattern in "EADDRINUSE" "ENOSPC" "EMFILE" "Cannot find module"; do
    FOUND=0
    for log_pattern in "${LOG_FILES[@]}"; do
        if ls $log_pattern 1> /dev/null 2>&1; then
            if grep -q "$pattern" $log_pattern 2>/dev/null; then
                FOUND=1
                break
            fi
        fi
    done
    
    if [ $FOUND -eq 1 ]; then
        case $pattern in
            "EADDRINUSE")
                report_issue "Port already in use errors found in logs"
                echo "   Fix: ./scripts/kill-ports.sh"
                ;;
            "ENOSPC")
                report_issue "No space left on device errors found"
                echo "   Check disk space: df -h"
                ;;
            "EMFILE")
                report_issue "Too many open files errors found"
                echo "   Fix: ulimit -n 10240"
                ;;
            "Cannot find module")
                report_issue "Missing module errors found"
                echo "   Fix: Remove node_modules and reinstall"
                ;;
        esac
    fi
done

if [ $ISSUES -eq 0 ]; then
    report_success "No common error patterns detected"
fi
echo ""

# Summary
echo -e "${CYAN}=== DIAGNOSTIC SUMMARY ===${NC}"
echo ""
if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ No issues detected! Your development environment looks healthy.${NC}"
else
    if [ $ISSUES -gt 0 ]; then
        echo -e "${RED}Found $ISSUES issue(s) that need attention${NC}"
    fi
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Found $WARNINGS warning(s) to consider${NC}"
    fi
    echo ""
    echo "Recommended actions:"
    echo "1. Run ./scripts/kill-ports.sh to clean up processes"
    echo "2. Run ./scripts/start-dev-clean.sh for a fresh start"
    echo "3. Check the specific fixes mentioned above"
fi
echo ""

# Quick fix option
if [ $ISSUES -gt 0 ]; then
    read -p "Run automatic cleanup now? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Running cleanup..."
        ./kill-ports.sh
        echo ""
        read -p "Start development servers? (y/N) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./start-dev-clean.sh
        fi
    fi
fi