#!/bin/bash

# cleanup-merged-worktrees.sh - Clean up feature worktrees that have been merged
# Usage: ./scripts/cleanup-merged-worktrees.sh [feature-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_question() {
    echo -e "${YELLOW}[?]${NC} $1"
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

# Function to cleanup a specific worktree
cleanup_worktree() {
    local worktree_path=$1
    local branch_name=$2
    local feature_name=$3
    
    print_status "Cleaning up worktree: $feature_name"
    
    # Stop any running development servers
    if [ -f "$worktree_path/feature_backend.pid" ]; then
        print_status "Stopping development servers..."
        kill $(cat "$worktree_path/feature_backend.pid") 2>/dev/null || true
        rm "$worktree_path/feature_backend.pid"
    fi
    
    if [ -f "$worktree_path/feature_frontend.pid" ]; then
        kill $(cat "$worktree_path/feature_frontend.pid") 2>/dev/null || true
        rm "$worktree_path/feature_frontend.pid"
    fi
    
    # Remove the worktree
    print_status "Removing worktree directory..."
    git worktree remove "$worktree_path" --force 2>/dev/null || true
    rm -rf "$worktree_path"
    
    # Ask about deleting the branch
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        print_question "Delete branch '$branch_name'? (y/N)"
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -d "$branch_name" 2>/dev/null || git branch -D "$branch_name"
            print_success "Deleted branch: $branch_name"
            
            # Ask about deleting remote branch
            if git show-ref --verify --quiet "refs/remotes/origin/$branch_name"; then
                print_question "Delete remote branch 'origin/$branch_name'? (y/N)"
                read -n 1 -r  
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git push origin --delete "$branch_name" 2>/dev/null || true
                    print_success "Deleted remote branch: origin/$branch_name"
                fi
            fi
        else
            print_warning "Kept branch: $branch_name"
        fi
    fi
    
    print_success "Cleanup complete for: $feature_name"
}

# Function to scan and cleanup all merged worktrees
cleanup_all_merged() {
    print_status "Scanning for merged feature worktrees..."
    
    local features_dir="/Users/bossio/6fb-booking-features"
    local cleaned_count=0
    
    if [ ! -d "$features_dir" ]; then
        print_warning "Features directory not found: $features_dir"
        return
    fi
    
    # Get list of worktrees
    local worktree_list=$(git worktree list --porcelain | grep -E "^worktree" | grep "6fb-booking-features" | awk '{print $2}' || true)
    
    if [ -z "$worktree_list" ]; then
        print_status "No feature worktrees found"
        return
    fi
    
    echo "$worktree_list" | while read -r worktree_path; do
        if [ -z "$worktree_path" ] || [ ! -d "$worktree_path" ]; then
            continue
        fi
        
        local feature_name=$(basename "$worktree_path")
        
        # Get branch name for this worktree
        local branch_name=""
        local worktree_info=$(git worktree list --porcelain | grep -A3 "^worktree $worktree_path" || true)
        if [ -n "$worktree_info" ]; then
            branch_name=$(echo "$worktree_info" | grep "^branch" | sed 's/^branch refs\/heads\///' || true)
        fi
        
        if [ -z "$branch_name" ]; then
            print_warning "Could not determine branch for worktree: $worktree_path"
            continue
        fi
        
        print_status "Checking feature: $feature_name (branch: $branch_name)"
        
        # Check if branch is merged into develop
        if is_branch_merged "$branch_name"; then
            print_success "Branch '$branch_name' is merged into develop"
            
            # Ask for confirmation
            print_question "Clean up merged worktree '$feature_name'? (y/N)"
            read -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cleanup_worktree "$worktree_path" "$branch_name" "$feature_name"
                cleaned_count=$((cleaned_count + 1))
            else
                print_status "Skipped cleanup for: $feature_name"
            fi
        else
            print_status "Branch '$branch_name' is not yet merged (keeping worktree)"
        fi
        
        echo
    done
    
    if [ $cleaned_count -eq 0 ]; then
        print_status "No worktrees were cleaned up"
    else
        print_success "Cleaned up $cleaned_count worktree(s)"
    fi
}

# Function to cleanup a specific feature by name
cleanup_specific_feature() {
    local feature_name=$1
    local worktree_path="/Users/bossio/6fb-booking-features/$feature_name"
    
    if [ ! -d "$worktree_path" ]; then
        print_error "Feature worktree not found: $worktree_path"
        exit 1
    fi
    
    # Find the branch name
    local branch_name=""
    local worktree_info=$(git worktree list --porcelain | grep -A3 "^worktree $worktree_path" || true)
    if [ -n "$worktree_info" ]; then
        branch_name=$(echo "$worktree_info" | grep "^branch" | sed 's/^branch refs\/heads\///' || true)
    fi
    
    if [ -z "$branch_name" ]; then
        print_error "Could not determine branch for feature: $feature_name"
        exit 1
    fi
    
    print_status "Found feature '$feature_name' with branch '$branch_name'"
    
    # Check if merged
    if is_branch_merged "$branch_name"; then
        print_success "Branch is merged into develop"
    else
        print_warning "Branch is NOT merged into develop"
        print_question "Continue with cleanup anyway? (y/N)"
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Cleanup cancelled"
            exit 0
        fi
    fi
    
    cleanup_worktree "$worktree_path" "$branch_name" "$feature_name"
}

# Function to list all feature worktrees
list_feature_worktrees() {
    print_status "Current feature worktrees:"
    echo
    
    local features_dir="/Users/bossio/6fb-booking-features"
    
    # Get list of worktrees
    local worktree_list=$(git worktree list --porcelain | grep -E "^worktree" | grep "6fb-booking-features" | awk '{print $2}' || true)
    
    if [ -z "$worktree_list" ]; then
        print_status "No feature worktrees found"
        return
    fi
    
    echo "$worktree_list" | while read -r worktree_path; do
        if [ -z "$worktree_path" ] || [ ! -d "$worktree_path" ]; then
            continue
        fi
        
        local feature_name=$(basename "$worktree_path")
        
        # Get branch name and commit info
        local worktree_info=$(git worktree list --porcelain | grep -A3 "^worktree $worktree_path" || true)
        local branch_name=""
        local commit_hash=""
        
        if [ -n "$worktree_info" ]; then
            branch_name=$(echo "$worktree_info" | grep "^branch" | sed 's/^branch refs\/heads\///' || true)
            commit_hash=$(echo "$worktree_info" | grep "^HEAD" | awk '{print $2}' | cut -c1-8 || true)
        fi
        
        # Check merge status
        local merge_status=""
        if [ -n "$branch_name" ] && is_branch_merged "$branch_name"; then
            merge_status="${GREEN}[MERGED]${NC}"
        else
            merge_status="${YELLOW}[UNMERGED]${NC}"
        fi
        
        echo -e "  📁 $feature_name"
        echo -e "     Branch: $branch_name ($commit_hash)"
        echo -e "     Status: $merge_status"
        echo -e "     Path: $worktree_path"
        echo
    done
}

# Main script logic
if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
    list_feature_worktrees
    exit 0
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [feature-name|--list|--help]"
    echo
    echo "Options:"
    echo "  feature-name    Clean up specific feature worktree"
    echo "  --list, -l      List all current feature worktrees"
    echo "  --help, -h      Show this help message"
    echo
    echo "If no arguments provided, will scan for all merged worktrees and offer to clean them up."
    exit 0
elif [ -n "$1" ]; then
    # Cleanup specific feature
    cleanup_specific_feature "$1"
else
    # Scan and cleanup all merged worktrees
    echo "🧹 Feature Worktree Cleanup Tool"
    echo "=================================="
    echo
    print_status "This will scan for merged feature branches and offer to clean them up"
    print_warning "Make sure all your work is committed and pushed before proceeding"
    echo
    print_question "Continue? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_all_merged
    else
        print_status "Cleanup cancelled"
        exit 0
    fi
fi

print_status "Cleanup process completed"