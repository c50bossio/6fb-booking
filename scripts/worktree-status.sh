#!/bin/bash

# worktree-status.sh - Show comprehensive status of all worktrees
# Usage: ./scripts/worktree-status.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${CYAN}$1${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_feature() {
    echo -e "${PURPLE}[📁]${NC} $1"
}

# Function to check if a port is in use
is_port_in_use() {
    local port=$1
    lsof -i ":$port" > /dev/null 2>&1
}

# Function to get port info
get_port_info() {
    local port=$1
    if is_port_in_use "$port"; then
        local process=$(lsof -i ":$port" -t | head -1)
        if [ -n "$process" ]; then
            local process_name=$(ps -p "$process" -o comm= 2>/dev/null || echo "unknown")
            echo "${GREEN}$port (${process_name})${NC}"
        else
            echo "${GREEN}$port (active)${NC}"
        fi
    else
        echo "${YELLOW}$port (available)${NC}"
    fi
}

# Function to check if branch is merged into develop
is_branch_merged() {
    local branch=$1
    if git merge-base --is-ancestor "$branch" develop 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to get git status for a worktree
get_worktree_git_status() {
    local worktree_path=$1
    if [ -d "$worktree_path" ]; then
        cd "$worktree_path"
        local status=""
        
        # Check for uncommitted changes
        if [ -n "$(git status --porcelain)" ]; then
            local modified=$(git status --porcelain | wc -l | xargs)
            status="${YELLOW}$modified changes${NC}"
        else
            status="${GREEN}clean${NC}"
        fi
        
        # Check for unpushed commits
        local branch=$(git branch --show-current)
        if [ -n "$branch" ] && git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
            local ahead=$(git rev-list --count "@{upstream}..HEAD" 2>/dev/null || echo "0")
            local behind=$(git rev-list --count "HEAD..@{upstream}" 2>/dev/null || echo "0")
            
            if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
                status="$status, ${YELLOW}↑$ahead ↓$behind${NC}"
            elif [ "$ahead" -gt 0 ]; then
                status="$status, ${YELLOW}↑$ahead${NC}"
            elif [ "$behind" -gt 0 ]; then
                status="$status, ${YELLOW}↓$behind${NC}"
            fi
        elif [ -n "$branch" ]; then
            status="$status, ${YELLOW}not pushed${NC}"
        fi
        
        echo "$status"
        cd - > /dev/null
    else
        echo "${RED}directory missing${NC}"
    fi
}

# Function to check if development servers are running
check_dev_servers() {
    local worktree_path=$1
    local running_servers=""
    
    if [ -f "$worktree_path/feature_backend.pid" ] && [ -f "$worktree_path/feature_frontend.pid" ]; then
        local backend_pid=$(cat "$worktree_path/feature_backend.pid")
        local frontend_pid=$(cat "$worktree_path/feature_frontend.pid")
        
        if ps -p "$backend_pid" > /dev/null 2>&1 && ps -p "$frontend_pid" > /dev/null 2>&1; then
            running_servers="${GREEN}backend+frontend${NC}"
        elif ps -p "$backend_pid" > /dev/null 2>&1; then
            running_servers="${YELLOW}backend only${NC}"
        elif ps -p "$frontend_pid" > /dev/null 2>&1; then
            running_servers="${YELLOW}frontend only${NC}"
        else
            running_servers="${RED}stale PIDs${NC}"
        fi
    elif [ -f "$worktree_path/staging_backend.pid" ] && [ -f "$worktree_path/staging_frontend.pid" ]; then
        local backend_pid=$(cat "$worktree_path/staging_backend.pid")
        local frontend_pid=$(cat "$worktree_path/staging_frontend.pid")
        
        if ps -p "$backend_pid" > /dev/null 2>&1 && ps -p "$frontend_pid" > /dev/null 2>&1; then
            running_servers="${GREEN}staging servers${NC}"
        else
            running_servers="${RED}stale staging PIDs${NC}"
        fi
    else
        running_servers="${YELLOW}not running${NC}"
    fi
    
    echo "$running_servers"
}

# Main header
echo
print_header "🌳 Git Worktree Status Dashboard"
print_header "=================================="
echo

# Show overall git status
print_header "📊 Repository Overview"
echo "Current branch: $(git branch --show-current)"
echo "Repository: $(pwd)"
echo "Last commit: $(git log --oneline -1)"
echo

# Show port usage summary
print_header "🔌 Port Usage"
echo "Development Ports:"
echo "  Frontend:  $(get_port_info 3000)"
echo "  Backend:   $(get_port_info 8000)"
echo "Staging Ports:"
echo "  Frontend:  $(get_port_info 3001)" 
echo "  Backend:   $(get_port_info 8001)"
echo "Feature Ports:"
for port in 3002 3003 3004 8002 8003 8004; do
    if is_port_in_use "$port"; then
        echo "  Port $port: $(get_port_info $port)"
    fi
done
echo

# Show all worktrees
print_header "🌲 All Worktrees"
git worktree list | while read -r worktree_line; do
    local worktree_path=$(echo "$worktree_line" | awk '{print $1}')
    local commit_hash=$(echo "$worktree_line" | awk '{print $2}' | sed 's/^\[\(.*\)\]$/\1/')
    local branch_info=$(echo "$worktree_line" | awk '{$1=$2=""; print $0}' | sed 's/^ *//')
    
    if [[ "$worktree_path" == *"6fb-booking"* ]] && [[ "$worktree_path" != *"6fb-booking-features"* ]] && [[ "$worktree_path" != *"6fb-booking-staging"* ]]; then
        # Main worktree
        local git_status=$(get_worktree_git_status "$worktree_path")
        echo -e "  🏠 ${GREEN}Main${NC} ($worktree_path)"
        echo -e "      Branch: $branch_info"
        echo -e "      Status: $git_status"
    fi
done
echo

# Show staging worktree
print_header "🏢 Staging Worktree"
local staging_path="/Users/bossio/6fb-booking-staging"
if [ -d "$staging_path" ]; then
    local staging_info=$(git worktree list | grep "$staging_path" || echo "")
    if [ -n "$staging_info" ]; then
        local commit_hash=$(echo "$staging_info" | awk '{print $2}' | sed 's/^\[\(.*\)\]$/\1/')
        local branch_info=$(echo "$staging_info" | awk '{$1=$2=""; print $0}' | sed 's/^ *//')
        local git_status=$(get_worktree_git_status "$staging_path")
        local servers_status=$(check_dev_servers "$staging_path")
        
        echo -e "  🏢 ${CYAN}Staging${NC} ($staging_path)"
        echo -e "      Branch: $branch_info"
        echo -e "      Status: $git_status"
        echo -e "      Servers: $servers_status"
        if [ -f "$staging_path/.env.staging" ]; then
            echo -e "      Config: ${GREEN}staging environment configured${NC}"
        else
            echo -e "      Config: ${YELLOW}staging environment not configured${NC}"
        fi
    else
        echo -e "  ${RED}Staging worktree directory exists but not tracked by git${NC}"
    fi
else
    echo -e "  ${YELLOW}No staging worktree found${NC}"
    echo -e "  Run: ./scripts/setup-staging-worktree.sh"
fi
echo

# Show feature worktrees
print_header "🚀 Feature Worktrees"
local features_found=false
local features_dir="/Users/bossio/6fb-booking-features"

# Get list of feature worktrees
local worktree_list=$(git worktree list | grep "6fb-booking-features" || true)

if [ -n "$worktree_list" ]; then
    echo "$worktree_list" | while read -r worktree_line; do
        features_found=true
        local worktree_path=$(echo "$worktree_line" | awk '{print $1}')
        local commit_hash=$(echo "$worktree_line" | awk '{print $2}' | sed 's/^\[\(.*\)\]$/\1/')
        local branch_info=$(echo "$worktree_line" | awk '{$1=$2=""; print $0}' | sed 's/^ *//')
        local feature_name=$(basename "$worktree_path")
        
        # Get branch name
        local branch_name=""
        local worktree_info=$(git worktree list --porcelain | grep -A3 "^worktree $worktree_path" || true)
        if [ -n "$worktree_info" ]; then
            branch_name=$(echo "$worktree_info" | grep "^branch" | sed 's/^branch refs\/heads\///' || true)
        fi
        
        # Check merge status
        local merge_status=""
        if [ -n "$branch_name" ] && is_branch_merged "$branch_name"; then
            merge_status="${GREEN}[MERGED]${NC}"
        else
            merge_status="${YELLOW}[UNMERGED]${NC}"
        fi
        
        local git_status=$(get_worktree_git_status "$worktree_path")
        local servers_status=$(check_dev_servers "$worktree_path")
        
        print_feature "$feature_name ($worktree_path)"
        echo -e "      Branch: $branch_info $merge_status"
        echo -e "      Status: $git_status"
        echo -e "      Servers: $servers_status"
        
        # Check for development scripts
        if [ -f "$worktree_path/start-feature-dev.sh" ]; then
            echo -e "      Scripts: ${GREEN}development scripts available${NC}"
        else
            echo -e "      Scripts: ${YELLOW}no development scripts${NC}"
        fi
    done
else
    echo -e "  ${YELLOW}No feature worktrees found${NC}"
    echo -e "  Run: ./scripts/create-feature-worktree.sh [feature-name]"
fi
echo

# Show directory structure
print_header "📁 Directory Structure"
echo "Worktree directories:"
if [ -d "/Users/bossio/6fb-booking" ]; then
    echo -e "  ✓ ${GREEN}/Users/bossio/6fb-booking${NC} (main)"
else
    echo -e "  ✗ ${RED}/Users/bossio/6fb-booking${NC} (missing)"
fi

if [ -d "/Users/bossio/6fb-booking-staging" ]; then
    echo -e "  ✓ ${GREEN}/Users/bossio/6fb-booking-staging${NC} (staging)"
else
    echo -e "  ✗ ${YELLOW}/Users/bossio/6fb-booking-staging${NC} (not set up)"
fi

if [ -d "/Users/bossio/6fb-booking-features" ]; then
    local feature_count=$(find /Users/bossio/6fb-booking-features -maxdepth 1 -type d | wc -l | xargs)
    feature_count=$((feature_count - 1)) # Subtract the parent directory
    echo -e "  ✓ ${GREEN}/Users/bossio/6fb-booking-features${NC} ($feature_count features)"
else
    echo -e "  ✗ ${YELLOW}/Users/bossio/6fb-booking-features${NC} (directory missing)"
fi
echo

# Show available management commands
print_header "🛠️  Available Commands"
echo "Worktree Management:"
echo "  ./scripts/create-feature-worktree.sh [name]    Create new feature worktree"
echo "  ./scripts/setup-staging-worktree.sh            Set up staging worktree"
echo "  ./scripts/cleanup-merged-worktrees.sh          Clean up merged features"
echo "  ./scripts/worktree-status.sh                   Show this status (current)"
echo
echo "Development Commands:"
echo "  cd /Users/bossio/6fb-booking-features/[name]"
echo "  ./start-feature-dev.sh                         Start feature servers"
echo "  ./stop-feature-dev.sh                          Stop feature servers"
echo
echo "  cd /Users/bossio/6fb-booking-staging"
echo "  ./start-staging.sh                             Start staging environment"
echo "  ./stop-staging.sh                              Stop staging environment"
echo "  ./reset-staging.sh                             Reset staging data"
echo

# Show quick tips
print_header "💡 Quick Tips"
echo "• Main worktree should be on 'develop' branch for integration"
echo "• Staging worktree is for local pre-deployment testing"  
echo "• Feature worktrees enable parallel development"
echo "• Use different ports to avoid conflicts (3000/8000, 3001/8001, 3002+/8002+)"
echo "• Remember to commit and push work before switching worktrees"
echo

print_status "Worktree status check complete!"