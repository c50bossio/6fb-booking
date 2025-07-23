#!/bin/bash

# deploy-feature.sh - Deploy feature to staging via GitHub PR workflow
# Usage: ./scripts/deploy-feature.sh [feature-name]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed. Install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub. Run: gh auth login"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
log_info "Current branch: $CURRENT_BRANCH"

# Determine feature name
if [ $# -eq 1 ]; then
    FEATURE_NAME="$1"
else
    # Extract feature name from branch name
    if [[ $CURRENT_BRANCH == feature/* ]]; then
        FEATURE_NAME="${CURRENT_BRANCH#feature/}"
        # Remove date suffix if present
        FEATURE_NAME=$(echo "$FEATURE_NAME" | sed 's/-[0-9]\{8\}$//')
    else
        log_error "Cannot determine feature name. Either:"
        log_error "1. Run from a feature branch (feature/name-YYYYMMDD)"
        log_error "2. Provide feature name as argument: $0 'Feature Name'"
        exit 1
    fi
fi

log_info "Feature name: $FEATURE_NAME"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    log_warning "You have uncommitted changes"
    echo "Files with changes:"
    git status --porcelain
    echo
    read -p "Do you want to commit these changes first? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        log_success "Changes committed"
    else
        log_info "Proceeding with uncommitted changes..."
    fi
fi

# Push current branch to origin
log_info "Pushing $CURRENT_BRANCH to origin..."
git push origin "$CURRENT_BRANCH"
log_success "Branch pushed successfully"

# Check if PR already exists
EXISTING_PR=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")

if [ -n "$EXISTING_PR" ]; then
    log_info "PR #$EXISTING_PR already exists for this branch"
    gh pr view "$EXISTING_PR"
    echo
    read -p "Do you want to update the existing PR? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_success "PR #$EXISTING_PR updated with latest changes"
        echo "View PR: $(gh pr view "$EXISTING_PR" --json url --jq '.url')"
        exit 0
    else
        log_info "Skipping PR creation"
        exit 0
    fi
fi

# Create pull request
log_info "Creating pull request to staging..."

# Generate comprehensive PR description
PR_BODY=$(cat <<EOF
## Summary
${FEATURE_NAME}

## Changes Made
$(git log --oneline origin/staging..HEAD | sed 's/^/- /')

## Test Plan
- [ ] Feature works as expected locally
- [ ] No breaking changes to existing functionality
- [ ] All tests pass
- [ ] Staging deployment successful

## Deployment Checklist
- [ ] Environment variables updated (if needed)
- [ ] Database migrations included (if needed)
- [ ] Third-party integrations tested (if applicable)
- [ ] Performance impact assessed

## Related Issues
<!-- Link any related GitHub issues here -->

---
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)

# Create the PR
PR_URL=$(gh pr create \
    --base staging \
    --title "$FEATURE_NAME" \
    --body "$PR_BODY" \
    --assignee @me \
    2>/dev/null || echo "")

if [ -n "$PR_URL" ]; then
    log_success "Pull request created successfully!"
    echo "PR URL: $PR_URL"
    
    # Try to get PR number
    PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]\+$' || echo "")
    if [ -n "$PR_NUMBER" ]; then
        log_info "PR #$PR_NUMBER created for staging deployment"
        
        # Check if auto-merge is available
        if gh pr view "$PR_NUMBER" --json mergeable | grep -q '"MERGEABLE"'; then
            echo
            read -p "Enable auto-merge when checks pass? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                gh pr merge "$PR_NUMBER" --auto --merge
                log_success "Auto-merge enabled"
            fi
        fi
    fi
    
    # Open PR in browser
    echo
    read -p "Open PR in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$PR_URL" 2>/dev/null || xdg-open "$PR_URL" 2>/dev/null || log_warning "Could not open browser"
    fi
    
else
    log_error "Failed to create pull request"
    exit 1
fi

log_success "Feature deployment to staging initiated!"
log_info "Next steps:"
log_info "1. Wait for CI/CD checks to complete"
log_info "2. Review and test on staging environment"
log_info "3. Merge PR when ready"
log_info "4. Use ./scripts/promote-to-production.sh when staging is validated"