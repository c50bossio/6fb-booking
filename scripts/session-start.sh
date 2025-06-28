#!/bin/bash

# Session Start Script - Pre-session checklist and setup
# Part of the commit guidelines framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       SESSION START CHECKLIST          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# 1. Check if in git repository
echo -e "${BLUE}1. Checking git repository...${NC}"
if git rev-parse --git-dir > /dev/null 2>&1; then
    check_status 0 "In git repository"
else
    check_status 1 "Not in a git repository"
    exit 1
fi
echo

# 2. Show current branch
echo -e "${BLUE}2. Current branch status...${NC}"
BRANCH=$(git branch --show-current)
echo -e "   Branch: ${GREEN}$BRANCH${NC}"

# Check if it's main/master
if [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]]; then
    echo -e "   ${YELLOW}⚠ Warning: You're on the main branch${NC}"
    echo -e "   ${YELLOW}  Consider creating a feature branch${NC}"
fi
echo

# 3. Check for uncommitted changes
echo -e "${BLUE}3. Checking for uncommitted changes...${NC}"
if git diff-index --quiet HEAD -- 2>/dev/null; then
    check_status 0 "Working directory clean"
else
    echo -e "${YELLOW}⚠ Uncommitted changes found:${NC}"
    git status -s
    echo -e "${YELLOW}  Consider committing or stashing before starting${NC}"
fi
echo

# 4. Fetch latest changes
echo -e "${BLUE}4. Fetching latest changes...${NC}"
git fetch origin 2>/dev/null && check_status 0 "Fetched latest from origin" || check_status 1 "Failed to fetch"

# Check if behind origin
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
if [ -n "$REMOTE" ]; then
    if [ "$LOCAL" = "$REMOTE" ]; then
        echo -e "   ${GREEN}✓ Branch is up to date${NC}"
    else
        BASE=$(git merge-base @ @{u})
        if [ "$LOCAL" = "$BASE" ]; then
            echo -e "   ${YELLOW}⚠ Branch is behind origin${NC}"
            echo -e "   ${YELLOW}  Run: git pull origin $BRANCH${NC}"
        elif [ "$REMOTE" = "$BASE" ]; then
            echo -e "   ${BLUE}ℹ Branch is ahead of origin${NC}"
        else
            echo -e "   ${YELLOW}⚠ Branch has diverged${NC}"
        fi
    fi
fi
echo

# 5. Show recent commits
echo -e "${BLUE}5. Recent commit history...${NC}"
git log --oneline -5
echo

# 6. Check dependencies status (if applicable)
echo -e "${BLUE}6. Checking project dependencies...${NC}"

# Backend dependencies
if [ -f "backend/requirements.txt" ]; then
    echo -e "   Checking Python dependencies..."
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
        pip list --outdated 2>/dev/null | head -5
        if [ $? -eq 0 ]; then
            echo -e "   ${GREEN}✓ Python environment active${NC}"
        fi
        deactivate 2>/dev/null
    else
        echo -e "   ${YELLOW}⚠ No Python virtual environment found${NC}"
    fi
    cd ..
fi

# Frontend dependencies
if [ -f "frontend/package.json" ]; then
    echo -e "   Checking Node dependencies..."
    if [ -d "frontend/node_modules" ]; then
        echo -e "   ${GREEN}✓ Node modules installed${NC}"
    else
        echo -e "   ${YELLOW}⚠ Node modules not installed${NC}"
        echo -e "   ${YELLOW}  Run: cd frontend && npm install${NC}"
    fi
fi
echo

# 7. Session recommendations
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${BLUE}Session Recommendations:${NC}"
echo -e "• Commit every 30 minutes or after completing tasks"
echo -e "• Use descriptive commit messages: type(scope): description"
echo -e "• Run ${GREEN}./scripts/track-changes.sh${NC} to monitor changes"
echo -e "• End session with ${GREEN}./scripts/session-end.sh${NC}"
echo

# 8. Create session log entry
SESSION_LOG=".session-log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Session started on branch: $BRANCH" >> $SESSION_LOG

echo -e "${GREEN}Ready to start development!${NC}"
echo

# Show quick commands
echo -e "${BLUE}Quick commands:${NC}"
echo "• Track changes:  ./scripts/track-changes.sh"
echo "• Quick commit:   git add . && git commit -m \"type(scope): message\""
echo "• Run tests:      ./scripts/parallel-tests.sh"
echo "• End session:    ./scripts/session-end.sh"