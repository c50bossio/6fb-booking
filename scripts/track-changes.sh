#!/bin/bash

# Track Changes Script - Shows uncommitted changes in the repository
# Part of the commit guidelines framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Git Change Tracker ===${NC}"
echo

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Show current branch
BRANCH=$(git branch --show-current)
echo -e "${GREEN}Current branch:${NC} $BRANCH"
echo

# Check for uncommitted changes
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${GREEN}✓ No uncommitted changes${NC}"
else
    echo -e "${YELLOW}⚠ Uncommitted changes detected:${NC}"
    echo
    
    # Show summary of changes
    echo -e "${BLUE}Summary:${NC}"
    git diff --stat
    echo
    
    # Show modified files
    echo -e "${BLUE}Modified files:${NC}"
    git diff --name-status | while read status file; do
        case $status in
            M) echo -e "  ${YELLOW}M${NC} $file" ;;
            A) echo -e "  ${GREEN}A${NC} $file" ;;
            D) echo -e "  ${RED}D${NC} $file" ;;
            R*) echo -e "  ${BLUE}R${NC} $file" ;;
            *) echo -e "  $status $file" ;;
        esac
    done
    echo
    
    # Show untracked files if any
    if [ -n "$(git ls-files --others --exclude-standard)" ]; then
        echo -e "${BLUE}Untracked files:${NC}"
        git ls-files --others --exclude-standard | while read file; do
            echo -e "  ${RED}?${NC} $file"
        done
        echo
    fi
    
    # Show time since last commit
    LAST_COMMIT_TIME=$(git log -1 --format=%cr)
    echo -e "${BLUE}Last commit:${NC} $LAST_COMMIT_TIME"
    echo
    
    # Suggest next action
    echo -e "${YELLOW}Suggested actions:${NC}"
    echo "  1. Review changes: git diff"
    echo "  2. Stage changes: git add ."
    echo "  3. Commit changes: git commit -m \"type(scope): description\""
fi

# Show recent commits
echo
echo -e "${BLUE}Recent commits:${NC}"
git log --oneline -5

# Check if it's been more than 30 minutes since last commit
if [ -n "$(git log -1 --format=%ct)" ]; then
    LAST_COMMIT_TIMESTAMP=$(git log -1 --format=%ct)
    CURRENT_TIMESTAMP=$(date +%s)
    TIME_DIFF=$((CURRENT_TIMESTAMP - LAST_COMMIT_TIMESTAMP))
    
    if [ $TIME_DIFF -gt 1800 ]; then
        MINUTES=$((TIME_DIFF / 60))
        echo
        echo -e "${YELLOW}⏰ Note: It's been $MINUTES minutes since your last commit${NC}"
        echo -e "${YELLOW}   Consider committing your current progress${NC}"
    fi
fi