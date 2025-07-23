#!/bin/bash

# workflow-menu.sh - Interactive workflow automation menu
# Usage: ./scripts/workflow-menu.sh or simply run: 999

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    BookedBarber V2 Workflow                 ║"
    echo "║                     Automation Menu                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_menu() {
    echo -e "${BOLD}Select an option:${NC}"
    echo
    echo -e "${GREEN}1)${NC} 🚢 Deploy feature to staging"
    echo -e "${GREEN}2)${NC} 🚀 Promote staging to production"
    echo -e "${GREEN}3)${NC} 🧹 Cleanup after successful merge"
    echo -e "${GREEN}4)${NC} 📊 Check workflow status"
    echo -e "${GREEN}5)${NC} 🔧 Create new feature branch"
    echo -e "${GREEN}6)${NC} 💾 Quick commit current changes"
    echo -e "${GREEN}0)${NC} 🚪 Exit"
    echo
}

get_current_branch() {
    git branch --show-current 2>/dev/null || echo "unknown"
}

get_branch_status() {
    local branch="$1"
    if git diff --quiet && git diff --cached --quiet; then
        echo "clean"
    else
        echo "dirty"
    fi
}

show_status() {
    local current_branch=$(get_current_branch)
    local status=$(get_branch_status "$current_branch")
    
    echo -e "${BOLD}Current Status:${NC}"
    echo -e "Branch: ${CYAN}$current_branch${NC}"
    echo -e "Status: $([ "$status" = "clean" ] && echo -e "${GREEN}Clean${NC}" || echo -e "${YELLOW}Uncommitted changes${NC}")"
    
    # Show recent commits
    echo -e "\nRecent commits:"
    git log --oneline -3 2>/dev/null | sed 's/^/  /' || echo "  No commits found"
    echo
}

deploy_to_staging() {
    log_info "Deploying feature to staging..."
    
    if [ ! -f "$SCRIPT_DIR/deploy-feature.sh" ]; then
        log_error "deploy-feature.sh script not found"
        return 1
    fi
    
    chmod +x "$SCRIPT_DIR/deploy-feature.sh"
    "$SCRIPT_DIR/deploy-feature.sh"
}

promote_to_production() {
    log_info "Promoting staging to production..."
    
    if [ ! -f "$SCRIPT_DIR/promote-to-production.sh" ]; then
        log_error "promote-to-production.sh script not found"
        return 1
    fi
    
    chmod +x "$SCRIPT_DIR/promote-to-production.sh"
    "$SCRIPT_DIR/promote-to-production.sh"
}

cleanup_after_merge() {
    log_info "Cleaning up after successful merge..."
    
    # Get current branch
    local current_branch=$(get_current_branch)
    
    if [ "$current_branch" = "staging" ] || [ "$current_branch" = "production" ] || [ "$current_branch" = "main" ]; then
        log_warning "Already on $current_branch branch"
        echo "Updating branch..."
        git pull origin "$current_branch"
        log_success "Branch updated"
        return 0
    fi
    
    # Check if current branch has been merged
    echo "Checking if $current_branch has been merged..."
    
    # Switch to staging and pull latest
    git fetch origin
    
    # Check if the branch exists in merged commits
    if git log origin/staging --oneline | grep -q "$(git log -1 --pretty=format:"%s" "$current_branch")"; then
        log_success "Branch appears to be merged into staging"
        
        read -p "Switch to staging and clean up feature branch? (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout staging
            git pull origin staging
            git branch -d "$current_branch" 2>/dev/null || git branch -D "$current_branch"
            log_success "Switched to staging and cleaned up feature branch"
        fi
    else
        log_warning "Branch does not appear to be merged yet"
        log_info "Check PR status and merge before cleanup"
    fi
}

check_workflow_status() {
    log_info "Checking workflow status..."
    
    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        return 1
    fi
    
    echo -e "${BOLD}Recent Pull Requests:${NC}"
    gh pr list --limit 5 2>/dev/null || echo "No pull requests found"
    
    echo
    echo -e "${BOLD}Recent Workflow Runs:${NC}"
    gh run list --limit 5 2>/dev/null || echo "No workflow runs found"
    
    echo
    echo -e "${BOLD}Repository Status:${NC}"
    gh repo view --json name,description,defaultBranch,isPrivate 2>/dev/null | \
        jq -r '"Name: " + .name, "Description: " + .description, "Default Branch: " + .defaultBranch, "Private: " + (.isPrivate|tostring)' 2>/dev/null || \
        echo "Could not fetch repository information"
}

create_feature_branch() {
    log_info "Creating new feature branch..."
    
    # Ensure we're starting from staging
    git fetch origin
    
    echo "Available base branches:"
    echo "1) staging (recommended)"
    echo "2) main"
    echo "3) production"
    
    read -p "Select base branch (1-3) [1]: " base_choice
    base_choice=${base_choice:-1}
    
    case $base_choice in
        1) base_branch="staging" ;;
        2) base_branch="main" ;;
        3) base_branch="production" ;;
        *) base_branch="staging" ;;
    esac
    
    read -p "Enter feature name (e.g., 'user-authentication'): " feature_name
    
    if [ -z "$feature_name" ]; then
        log_error "Feature name cannot be empty"
        return 1
    fi
    
    # Create branch name with date
    local date_suffix=$(date +%Y%m%d)
    local branch_name="feature/${feature_name}-${date_suffix}"
    
    log_info "Creating branch: $branch_name from $base_branch"
    
    git checkout "$base_branch"
    git pull origin "$base_branch"
    git checkout -b "$branch_name"
    
    log_success "Feature branch created: $branch_name"
    log_info "You can now start working on your feature"
}

quick_commit() {
    log_info "Quick commit for current changes..."
    
    # Check if there are changes
    if git diff --quiet && git diff --cached --quiet; then
        log_warning "No changes to commit"
        return 0
    fi
    
    echo "Files with changes:"
    git status --porcelain
    echo
    
    read -p "Enter commit message: " commit_message
    
    if [ -z "$commit_message" ]; then
        log_error "Commit message cannot be empty"
        return 1
    fi
    
    git add .
    git commit -m "$commit_message"
    
    log_success "Changes committed"
    
    read -p "Push to origin? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local current_branch=$(get_current_branch)
        git push origin "$current_branch"
        log_success "Changes pushed to origin"
    fi
}

main() {
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    
    while true; do
        clear
        print_header
        show_status
        print_menu
        
        read -p "Enter your choice (0-6): " choice
        echo
        
        case $choice in
            1)
                deploy_to_staging
                ;;
            2)
                promote_to_production
                ;;
            3)
                cleanup_after_merge
                ;;
            4)
                check_workflow_status
                ;;
            5)
                create_feature_branch
                ;;
            6)
                quick_commit
                ;;
            0)
                log_info "Goodbye!"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please choose 0-6."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..." 
    done
}

# Run main function
main "$@"