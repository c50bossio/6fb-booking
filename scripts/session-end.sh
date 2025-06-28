#!/bin/bash

# Session End Script - Post-session checklist and cleanup
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
echo -e "${CYAN}║        SESSION END CHECKLIST           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo

# 1. Check for uncommitted changes
echo -e "${BLUE}1. Checking for uncommitted changes...${NC}"
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${GREEN}✓ No uncommitted changes${NC}"
    CLEAN=true
else
    echo -e "${YELLOW}⚠ Uncommitted changes detected:${NC}"
    git status -s
    CLEAN=false
fi
echo

# 2. If changes exist, prompt for commit
if [ "$CLEAN" = false ]; then
    echo -e "${BLUE}2. Handling uncommitted changes...${NC}"
    echo -e "${YELLOW}You have uncommitted changes. What would you like to do?${NC}"
    echo "1) Commit all changes"
    echo "2) Commit as work-in-progress (WIP)"
    echo "3) Review changes first"
    echo "4) Skip commit (not recommended)"
    
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            echo
            read -p "Enter commit type (feat/fix/docs/refactor/test/chore): " type
            read -p "Enter scope (e.g., auth/booking/ui): " scope
            read -p "Enter description: " description
            
            git add .
            git commit -m "$type($scope): $description"
            echo -e "${GREEN}✓ Changes committed${NC}"
            ;;
        2)
            git add .
            git commit -m "chore: wip - session end checkpoint [$(date +%Y%m%d-%H%M)]"
            echo -e "${GREEN}✓ WIP commit created${NC}"
            ;;
        3)
            echo
            echo -e "${BLUE}Showing diff:${NC}"
            git diff
            echo
            echo -e "${YELLOW}After reviewing, run this script again${NC}"
            exit 0
            ;;
        4)
            echo -e "${RED}⚠ Skipping commit - changes remain uncommitted${NC}"
            ;;
    esac
    echo
fi

# 3. Show session summary
echo -e "${BLUE}3. Session Summary...${NC}"
BRANCH=$(git branch --show-current)
echo -e "   Current branch: ${GREEN}$BRANCH${NC}"

# Count commits in this session (last 3 hours)
SESSION_COMMITS=$(git log --since="3 hours ago" --oneline | wc -l)
echo -e "   Commits this session: ${GREEN}$SESSION_COMMITS${NC}"

# Show commits from this session
if [ $SESSION_COMMITS -gt 0 ]; then
    echo
    echo -e "${BLUE}   Commits made this session:${NC}"
    git log --since="3 hours ago" --oneline | sed 's/^/   /'
fi
echo

# 4. Push to remote if needed
echo -e "${BLUE}4. Checking remote status...${NC}"
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")

if [ -n "$REMOTE" ]; then
    if [ "$LOCAL" != "$REMOTE" ]; then
        AHEAD=$(git rev-list @{u}..@ --count)
        if [ $AHEAD -gt 0 ]; then
            echo -e "${YELLOW}⚠ You have $AHEAD unpushed commit(s)${NC}"
            read -p "Push to remote? (y/n): " push_choice
            if [[ $push_choice =~ ^[Yy]$ ]]; then
                git push origin $BRANCH
                echo -e "${GREEN}✓ Pushed to origin/$BRANCH${NC}"
            else
                echo -e "${YELLOW}⚠ Remember to push your changes later${NC}"
            fi
        fi
    else
        echo -e "${GREEN}✓ Already up to date with origin${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No upstream branch set${NC}"
    read -p "Set upstream and push? (y/n): " upstream_choice
    if [[ $upstream_choice =~ ^[Yy]$ ]]; then
        git push -u origin $BRANCH
        echo -e "${GREEN}✓ Upstream set and pushed${NC}"
    fi
fi
echo

# 5. Clean up and recommendations
echo -e "${BLUE}5. Clean up tasks...${NC}"

# Log session end
SESSION_LOG=".session-log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Session ended on branch: $BRANCH (commits: $SESSION_COMMITS)" >> $SESSION_LOG
echo -e "${GREEN}✓ Session logged${NC}"

# Show disk usage
echo -e "   Repository size: $(du -sh . | cut -f1)"
echo

# 6. Next session recommendations
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${BLUE}For next session:${NC}"
echo "• Run ${GREEN}./scripts/session-start.sh${NC} before starting"
echo "• Review recent commits with ${GREEN}git log --oneline -10${NC}"
echo "• Check for updates with ${GREEN}git fetch origin${NC}"

if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo "• Consider merging to main if feature is complete"
fi

echo
echo -e "${GREEN}Session ended successfully!${NC}"
echo

# Final status
echo -e "${BLUE}Final Status:${NC}"
git status -s -b