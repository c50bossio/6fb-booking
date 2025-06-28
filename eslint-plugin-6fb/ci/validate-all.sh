#!/bin/bash

# Generic CI Validation Script
# Can be used with any CI system (Jenkins, CircleCI, TeamCity, etc.)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="20"
PACKAGES=("frontend" "backend" "shared" "mobile")
MAX_BUNDLE_SIZE_KB=300
AUDIT_LEVEL="moderate"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed"
        exit 1
    fi
}

# Check prerequisites
log_info "Checking prerequisites..."
check_command node
check_command npm
check_command git

# Check Node.js version
CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$CURRENT_NODE_VERSION" -lt "$NODE_VERSION" ]; then
    log_error "Node.js version $NODE_VERSION or higher is required"
    exit 1
fi

# Initialize results
TOTAL_CHECKS=0
FAILED_CHECKS=0
RESULTS_DIR="ci-results"
mkdir -p "$RESULTS_DIR"

# Function to run a check
run_check() {
    local name=$1
    local command=$2

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log_info "Running: $name"

    if eval "$command" > "$RESULTS_DIR/$name.log" 2>&1; then
        log_success "$name passed"
        return 0
    else
        log_error "$name failed"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo "Check the log at: $RESULTS_DIR/$name.log"
        return 1
    fi
}

# Install dependencies
log_info "Installing dependencies..."
run_check "install-root" "npm ci"

for package in "${PACKAGES[@]}"; do
    run_check "install-$package" "cd packages/$package && npm ci"
done

# Run ESLint checks
log_info "Running ESLint checks..."
for package in "${PACKAGES[@]}"; do
    run_check "eslint-$package" "cd packages/$package && npm run lint:ci"
done

# Run TypeScript checks
log_info "Running TypeScript checks..."
for package in "${PACKAGES[@]}"; do
    run_check "typecheck-$package" "cd packages/$package && npm run type-check"
done

# Run Prettier check
log_info "Running Prettier check..."
run_check "prettier" "npm run format:check"

# Build custom ESLint plugin
log_info "Building custom ESLint plugin..."
run_check "build-plugin" "npm run build"

# Test custom rules
log_info "Testing custom ESLint rules..."
run_check "test-rules" "npm test"

# Validate rule configurations
log_info "Validating rule configurations..."
run_check "validate-rules" "npm run validate:rules"

# Check for circular dependencies
log_info "Checking for circular dependencies..."
run_check "circular-deps" "npx madge --circular --extensions ts,tsx,js,jsx packages/*/src"

# Check import boundaries
log_info "Checking import boundaries..."
cat > "$RESULTS_DIR/check-boundaries.sh" << 'EOF'
#!/bin/bash
set -e

# Check frontend doesn't import from backend
if grep -r "from ['\"]\.\.\/\.\.\/backend" packages/frontend/src 2>/dev/null; then
    echo "Error: Frontend is importing from backend"
    exit 1
fi

# Check backend doesn't import from frontend
if grep -r "from ['\"]\.\.\/\.\.\/frontend" packages/backend/src 2>/dev/null; then
    echo "Error: Backend is importing from frontend"
    exit 1
fi

# Check mobile only imports from shared
if grep -r "from ['\"]\.\.\/\.\.\/\(frontend\|backend\)" packages/mobile/src 2>/dev/null; then
    echo "Error: Mobile is importing from frontend or backend"
    exit 1
fi

echo "Import boundaries check passed"
EOF
chmod +x "$RESULTS_DIR/check-boundaries.sh"
run_check "import-boundaries" "$RESULTS_DIR/check-boundaries.sh"

# Build packages
log_info "Building packages..."
for package in "${PACKAGES[@]}"; do
    run_check "build-$package" "cd packages/$package && npm run build"
done

# Check bundle sizes (frontend only)
log_info "Checking bundle sizes..."
if [ -d "packages/frontend/.next" ]; then
    MAIN_BUNDLE=$(find packages/frontend/.next/static/chunks -name "main-*.js" 2>/dev/null | head -1)
    if [ -f "$MAIN_BUNDLE" ]; then
        SIZE_KB=$(du -k "$MAIN_BUNDLE" | cut -f1)
        if [ "$SIZE_KB" -gt "$MAX_BUNDLE_SIZE_KB" ]; then
            log_warning "Main bundle size ($SIZE_KB KB) exceeds limit ($MAX_BUNDLE_SIZE_KB KB)"
        else
            log_success "Main bundle size ($SIZE_KB KB) is within limit"
        fi
    fi
fi

# Run security audit
log_info "Running security audit..."
run_check "security-audit" "npm audit --audit-level=$AUDIT_LEVEL" || log_warning "Security audit has findings"

# Run tests
log_info "Running tests..."
for package in "${PACKAGES[@]}"; do
    if [ -f "packages/$package/package.json" ] && grep -q '"test"' "packages/$package/package.json"; then
        run_check "test-$package" "cd packages/$package && npm test"
    fi
done

# Check for unused dependencies
log_info "Checking for unused dependencies..."
for package in "${PACKAGES[@]}"; do
    run_check "depcheck-$package" "cd packages/$package && npx depcheck" || log_warning "Unused dependencies found in $package"
done

# Generate reports
log_info "Generating reports..."

# Summary report
cat > "$RESULTS_DIR/summary.txt" << EOF
CI Validation Summary
====================
Date: $(date)
Total Checks: $TOTAL_CHECKS
Failed Checks: $FAILED_CHECKS
Success Rate: $(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS ))%

Packages Validated: ${PACKAGES[*]}
Node Version: $(node -v)
NPM Version: $(npm -v)
EOF

# JSON report for parsing
cat > "$RESULTS_DIR/summary.json" << EOF
{
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalChecks": $TOTAL_CHECKS,
  "failedChecks": $FAILED_CHECKS,
  "successRate": $(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS )),
  "packages": ["${PACKAGES[*]}"],
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF

# Final result
echo
echo "======================================"
if [ "$FAILED_CHECKS" -eq 0 ]; then
    log_success "All checks passed! ($TOTAL_CHECKS/$TOTAL_CHECKS)"
    echo "======================================"
    exit 0
else
    log_error "$FAILED_CHECKS checks failed out of $TOTAL_CHECKS"
    echo "======================================"
    echo "Check the logs in: $RESULTS_DIR/"
    exit 1
fi
