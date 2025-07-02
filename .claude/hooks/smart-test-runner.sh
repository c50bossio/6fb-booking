#!/bin/bash

# BookedBarber V2 - Smart Test Runner for Claude Code Hooks
# Runs relevant tests based on changed files

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/Users/bossio/6fb-booking"
cd "$PROJECT_ROOT"

# Logging
LOG_FILE="$PROJECT_ROOT/.claude/hooks.log"
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SMART_TEST_RUNNER: $1" | tee -a "$LOG_FILE"
}

# Emergency bypass check
if [[ "${CLAUDE_BYPASS_HOOKS:-}" == "true" ]]; then
    log "⚠️  EMERGENCY BYPASS: Skipping test runner"
    exit 0
fi

echo -e "${BLUE}🧪 Smart Test Runner - Analyzing changes...${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log "❌ Not in a git repository, skipping tests"
    exit 0
fi

# Get list of changed files (staged + unstaged)
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || echo "")
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")
ALL_CHANGED_FILES=$(echo -e "$CHANGED_FILES\n$STAGED_FILES" | sort -u | grep -v '^$' || echo "")

if [[ -z "$ALL_CHANGED_FILES" ]]; then
    log "ℹ️  No changes detected, skipping tests"
    exit 0
fi

echo -e "${YELLOW}Changed files:${NC}"
echo "$ALL_CHANGED_FILES" | sed 's/^/  /'

# Determine which tests to run
RUN_BACKEND_TESTS=false
RUN_FRONTEND_TESTS=false
RUN_INTEGRATION_TESTS=false

# Analyze changed files
while IFS= read -r file; do
    case "$file" in
        backend-v2/*.py)
            RUN_BACKEND_TESTS=true
            ;;
        backend-v2/frontend-v2/*.ts|backend-v2/frontend-v2/*.tsx|backend-v2/frontend-v2/*.js|backend-v2/frontend-v2/*.jsx)
            RUN_FRONTEND_TESTS=true
            ;;
        backend-v2/routers/*)
            RUN_BACKEND_TESTS=true
            RUN_INTEGRATION_TESTS=true
            ;;
        backend-v2/services/*)
            RUN_BACKEND_TESTS=true
            RUN_INTEGRATION_TESTS=true
            ;;
        backend-v2/models/*)
            RUN_BACKEND_TESTS=true
            ;;
        backend-v2/frontend-v2/lib/api/*)
            RUN_FRONTEND_TESTS=true
            RUN_INTEGRATION_TESTS=true
            ;;
    esac
done <<< "$ALL_CHANGED_FILES"

# Run tests based on analysis
TEST_RESULTS=()
FAILED_TESTS=()

if [[ "$RUN_BACKEND_TESTS" == "true" ]]; then
    echo -e "${BLUE}🐍 Running backend tests...${NC}"
    if cd backend-v2 && timeout 300 python -m pytest tests/ -v --tb=short > /tmp/backend_test_results.log 2>&1; then
        echo -e "${GREEN}✅ Backend tests passed${NC}"
        TEST_RESULTS+=("Backend: PASSED")
    else
        echo -e "${RED}❌ Backend tests failed${NC}"
        echo "See /tmp/backend_test_results.log for details"
        TEST_RESULTS+=("Backend: FAILED")
        FAILED_TESTS+=("backend")
    fi
    cd "$PROJECT_ROOT"
fi

if [[ "$RUN_FRONTEND_TESTS" == "true" ]]; then
    echo -e "${BLUE}⚛️  Running frontend tests...${NC}"
    if cd backend-v2/frontend-v2 && timeout 300 npm test -- --watchAll=false --coverage=false > /tmp/frontend_test_results.log 2>&1; then
        echo -e "${GREEN}✅ Frontend tests passed${NC}"
        TEST_RESULTS+=("Frontend: PASSED")
    else
        echo -e "${RED}❌ Frontend tests failed${NC}"
        echo "See /tmp/frontend_test_results.log for details"
        TEST_RESULTS+=("Frontend: FAILED")
        FAILED_TESTS+=("frontend")
    fi
    cd "$PROJECT_ROOT"
fi

if [[ "$RUN_INTEGRATION_TESTS" == "true" ]]; then
    echo -e "${BLUE}🔗 Running integration tests...${NC}"
    if timeout 300 ./scripts/parallel-tests.sh > /tmp/integration_test_results.log 2>&1; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        TEST_RESULTS+=("Integration: PASSED")
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        echo "See /tmp/integration_test_results.log for details"
        TEST_RESULTS+=("Integration: FAILED")
        FAILED_TESTS+=("integration")
    fi
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary:${NC}"
for result in "${TEST_RESULTS[@]}"; do
    if [[ "$result" == *"PASSED"* ]]; then
        echo -e "  ${GREEN}$result${NC}"
    else
        echo -e "  ${RED}$result${NC}"
    fi
done

# Log results
log "Test run completed. Results: ${TEST_RESULTS[*]}"

# If any tests failed, provide guidance
if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
    echo -e "\n${YELLOW}⚠️  Some tests failed. Consider:${NC}"
    echo "  1. Review the test output logs"
    echo "  2. Fix failing tests before committing"
    echo "  3. Run tests manually: ./scripts/parallel-tests.sh"
    echo "  4. Use --no-verify to bypass if urgent"
    
    # Don't block Claude Code workflow, but warn
    log "⚠️  Tests failed but not blocking Claude Code workflow"
    exit 0
fi

echo -e "\n${GREEN}🎉 All tests passed!${NC}"
log "✅ All tests passed successfully"
exit 0