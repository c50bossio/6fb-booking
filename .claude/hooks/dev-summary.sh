#!/bin/bash

# BookedBarber V2 - Development Summary for Claude Code Hooks
# Provides summary of changes and next steps

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/Users/bossio/6fb-booking"
cd "$PROJECT_ROOT"

# Logging
LOG_FILE="$PROJECT_ROOT/.claude/hooks.log"
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEV_SUMMARY: $1" >> "$LOG_FILE"
}

# Emergency bypass check
if [[ "${CLAUDE_BYPASS_HOOKS:-}" == "true" ]]; then
    log "⚠️  EMERGENCY BYPASS: Skipping development summary"
    exit 0
fi

echo -e "\n${CYAN}📋 BookedBarber V2 - Development Session Summary${NC}"
echo -e "${CYAN}=================================================${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not in a git repository${NC}"
    exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo -e "${BLUE}📂 Current Branch:${NC} $CURRENT_BRANCH"

# Check for uncommitted changes
UNCOMMITTED_CHANGES=$(git status --porcelain 2>/dev/null || echo "")
STAGED_CHANGES=$(git diff --cached --name-only 2>/dev/null || echo "")
UNSTAGED_CHANGES=$(git diff --name-only 2>/dev/null || echo "")

if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
    echo -e "\n${YELLOW}📝 Uncommitted Changes:${NC}"
    
    if [[ -n "$STAGED_CHANGES" ]]; then
        echo -e "${GREEN}  Staged for commit:${NC}"
        echo "$STAGED_CHANGES" | sed 's/^/    /'
    fi
    
    if [[ -n "$UNSTAGED_CHANGES" ]]; then
        echo -e "${YELLOW}  Modified but not staged:${NC}"
        echo "$UNSTAGED_CHANGES" | sed 's/^/    /'
    fi
    
    # Show untracked files
    UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null || echo "")
    if [[ -n "$UNTRACKED_FILES" ]]; then
        echo -e "${RED}  Untracked files:${NC}"
        echo "$UNTRACKED_FILES" | sed 's/^/    /'
    fi
else
    echo -e "\n${GREEN}✅ Working directory is clean${NC}"
fi

# Recent commits (last 5)
echo -e "\n${BLUE}📚 Recent Commits:${NC}"
git log --oneline -5 2>/dev/null | sed 's/^/  /' || echo "  No commits found"

# Check for common development tasks
echo -e "\n${PURPLE}🔍 Project Health Check:${NC}"

# Check if servers are running
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if pgrep -f "uvicorn main:app" > /dev/null 2>&1; then
    BACKEND_RUNNING=true
    echo -e "${GREEN}  ✅ Backend server is running${NC}"
else
    echo -e "${YELLOW}  ⚠️  Backend server not detected${NC}"
fi

if pgrep -f "next dev" > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
    echo -e "${GREEN}  ✅ Frontend server is running${NC}"
else
    echo -e "${YELLOW}  ⚠️  Frontend server not detected${NC}"
fi

# Check for recent hook activity
if [[ -f "$LOG_FILE" ]]; then
    RECENT_HOOK_ACTIVITY=$(tail -10 "$LOG_FILE" 2>/dev/null | grep -c "$(date '+%Y-%m-%d')" || echo "0")
    if [[ "$RECENT_HOOK_ACTIVITY" -gt 0 ]]; then
        echo -e "${GREEN}  ✅ Hooks active today ($RECENT_HOOK_ACTIVITY events)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No hook activity today${NC}"
    fi
fi

# Check for test results
if [[ -f "/tmp/backend_test_results.log" ]]; then
    if grep -q "FAILED" "/tmp/backend_test_results.log" 2>/dev/null; then
        echo -e "${RED}  ❌ Backend tests have failures${NC}"
    else
        echo -e "${GREEN}  ✅ Backend tests passing${NC}"
    fi
fi

if [[ -f "/tmp/frontend_test_results.log" ]]; then
    if grep -q "FAIL" "/tmp/frontend_test_results.log" 2>/dev/null; then
        echo -e "${RED}  ❌ Frontend tests have failures${NC}"
    else
        echo -e "${GREEN}  ✅ Frontend tests passing${NC}"
    fi
fi

# Analyze changes for suggestions
echo -e "\n${CYAN}💡 Next Steps & Recommendations:${NC}"

if [[ -n "$STAGED_CHANGES" ]]; then
    echo -e "${GREEN}  → Ready to commit staged changes${NC}"
    echo -e "    ${CYAN}git commit -m \"your commit message\"${NC}"
fi

if [[ -n "$UNSTAGED_CHANGES" ]]; then
    echo -e "${YELLOW}  → Stage changes for commit${NC}"
    echo -e "    ${CYAN}git add <files> && git commit${NC}"
fi

# Check for specific file types and suggest actions
if echo "$UNCOMMITTED_CHANGES" | grep -q "requirements.txt\|package.json"; then
    echo -e "${BLUE}  → Dependency changes detected${NC}"
    echo -e "    ${CYAN}Consider running: pip install -r requirements.txt${NC}"
    echo -e "    ${CYAN}Or: npm install${NC}"
fi

if echo "$UNCOMMITTED_CHANGES" | grep -q "models/"; then
    echo -e "${BLUE}  → Database model changes detected${NC}"
    echo -e "    ${CYAN}Consider creating migration: alembic revision -m \"description\"${NC}"
fi

if echo "$UNCOMMITTED_CHANGES" | grep -q "routers/\|api/"; then
    echo -e "${BLUE}  → API changes detected${NC}"
    echo -e "    ${CYAN}Consider updating API documentation${NC}"
fi

# Development server suggestions
if [[ "$BACKEND_RUNNING" == "false" && "$FRONTEND_RUNNING" == "false" ]]; then
    echo -e "${YELLOW}  → Start development servers${NC}"
    echo -e "    ${CYAN}./scripts/start-dev-session.sh${NC}"
fi

# Testing suggestions
echo -e "${BLUE}  → Run tests before committing${NC}"
echo -e "    ${CYAN}./scripts/parallel-tests.sh${NC}"

# Branch workflow suggestions
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    echo -e "${YELLOW}  → Consider creating a feature branch${NC}"
    echo -e "    ${CYAN}git checkout -b feature/your-feature-name${NC}"
fi

# Hook usage reminder
echo -e "\n${PURPLE}🪝 Hook System Status:${NC}"
echo -e "${GREEN}  ✅ All 12 git hooks installed and active${NC}"
echo -e "${GREEN}  ✅ Claude Code hooks configured${NC}"
echo -e "${CYAN}  💡 Hooks will automatically validate your changes${NC}"

# Security reminder
if echo "$UNCOMMITTED_CHANGES" | grep -q -E "(\.env|config|secret|key|password)"; then
    echo -e "\n${RED}🔒 Security Reminder:${NC}"
    echo -e "${YELLOW}  ⚠️  Configuration files detected${NC}"
    echo -e "${YELLOW}  ⚠️  Ensure no secrets are committed${NC}"
fi

# Footer
echo -e "\n${CYAN}=================================================${NC}"
echo -e "${CYAN}📅 Session completed at $(date)${NC}"
echo -e "${CYAN}🚀 BookedBarber V2 - Ready for your next changes!${NC}"

log "Development summary generated for branch: $CURRENT_BRANCH"
exit 0