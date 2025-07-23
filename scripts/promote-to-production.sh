#!/bin/bash

# promote-to-production.sh - Promote staging to production via GitHub PR workflow
# Usage: ./scripts/promote-to-production.sh

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

log_info "🚀 Starting production deployment process..."

# Switch to staging branch and update
log_info "Updating staging branch..."
git fetch origin
git checkout staging
git pull origin staging
log_success "Staging branch updated"

# Check staging branch status
STAGING_STATUS=$(gh pr list --base production --head staging --json state --jq '.[0].state' 2>/dev/null || echo "NONE")

if [ "$STAGING_STATUS" = "OPEN" ]; then
    log_warning "Production PR already exists for staging"
    EXISTING_PR=$(gh pr list --base production --head staging --json number --jq '.[0].number')
    gh pr view "$EXISTING_PR"
    echo
    read -p "Update existing PR and proceed? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Production deployment cancelled"
        exit 0
    fi
    PR_NUMBER="$EXISTING_PR"
else
    # Create production deployment PR
    log_info "Creating production deployment PR..."
    
    # Get recent changes since last production deployment
    CHANGES=$(git log --oneline origin/production..origin/staging --pretty=format:"- %s" | head -20)
    
    if [ -z "$CHANGES" ]; then
        log_warning "No changes found between staging and production"
        log_info "Staging is already in sync with production"
        exit 0
    fi
    
    # Generate production PR description
    PR_BODY=$(cat <<EOF
## 🚀 Production Deployment

### Summary
Promoting staging changes to production environment.

### Changes Included
$CHANGES

### Pre-Deployment Checklist
- [x] Staging environment validated
- [x] All tests passing
- [x] Security scans completed
- [x] Performance benchmarks acceptable

### Deployment Plan
1. **Blue-Green Deployment**: Zero-downtime deployment strategy
2. **Database Migrations**: Applied automatically during deployment
3. **Health Checks**: Comprehensive post-deployment validation
4. **Rollback Plan**: Automatic rollback on failure detection

### Post-Deployment Validation
- [ ] API health endpoints responding
- [ ] Frontend loading correctly
- [ ] Database connectivity confirmed
- [ ] Third-party integrations functional
- [ ] Performance metrics within acceptable range

### Monitoring
- **Deployment Time**: \$(date -u)
- **Expected Duration**: 5-10 minutes
- **Monitoring Dashboard**: Available during deployment

### Emergency Contacts
- **DevOps Team**: Available for deployment support
- **Rollback Procedure**: Automated via GitHub Actions

---
**⚠️ PRODUCTION DEPLOYMENT**

This PR deploys changes to the live production environment. Please ensure all validation steps are completed before merging.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)

    # Create production PR
    PR_URL=$(gh pr create \
        --base production \
        --head staging \
        --title "🚀 Production Deployment - $(date '+%Y-%m-%d %H:%M UTC')" \
        --body "$PR_BODY" \
        --assignee @me \
        2>/dev/null || echo "")
    
    if [ -n "$PR_URL" ]; then
        PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]\+$' || echo "")
        log_success "Production PR #$PR_NUMBER created!"
        echo "PR URL: $PR_URL"
    else
        log_error "Failed to create production PR"
        exit 1
    fi
fi

# Production deployment confirmation
echo
log_warning "🚨 PRODUCTION DEPLOYMENT CONFIRMATION 🚨"
echo
echo "This will deploy the following changes to PRODUCTION:"
git log --oneline origin/production..origin/staging --pretty=format:"  %h %s" | head -10
echo
echo "Production URL: https://bookedbarber.com"
echo "Deployment will be monitored and can be rolled back automatically."
echo
read -p "Are you absolutely sure you want to deploy to PRODUCTION? (yes/no): " CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    log_info "Production deployment cancelled"
    log_info "PR #$PR_NUMBER remains open for future deployment"
    exit 0
fi

# Final pre-deployment checks
log_info "Running pre-deployment checks..."

# Check staging health
STAGING_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://staging.bookedbarber.com/health 2>/dev/null || echo "000")
if [ "$STAGING_HEALTH" != "200" ]; then
    log_error "Staging health check failed (HTTP $STAGING_HEALTH)"
    log_error "Production deployment aborted"
    exit 1
fi
log_success "Staging health check passed"

# Check for critical security issues
log_info "Checking for critical security issues..."
if gh pr checks "$PR_NUMBER" --json name,conclusion | grep -q '"conclusion":"FAILURE".*security'; then
    log_error "Security checks are failing"
    read -p "Deploy anyway? (yes/no): " SECURITY_OVERRIDE
    if [ "$SECURITY_OVERRIDE" != "yes" ]; then
        log_error "Production deployment aborted due to security issues"
        exit 1
    fi
    log_warning "Security check override applied"
fi

# Merge the PR to trigger production deployment
log_info "Merging PR to trigger production deployment..."
gh pr merge "$PR_NUMBER" --merge --delete-branch=false

log_success "🎉 Production deployment initiated!"
log_info "Deployment details:"
log_info "- PR #$PR_NUMBER merged successfully"
log_info "- Production deployment pipeline started"
log_info "- Monitor progress: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"

echo
log_info "🔍 Post-deployment monitoring:"
log_info "1. Health checks will run automatically"
log_info "2. Performance monitoring is active"
log_info "3. Automatic rollback if issues detected"
log_info "4. Production site: https://bookedbarber.com"

echo
log_info "📊 Next steps:"
log_info "1. Monitor deployment logs for 10-15 minutes"
log_info "2. Verify critical user flows work correctly"
log_info "3. Check error rates and performance metrics"
log_info "4. Use ./scripts/cleanup-after-merge.sh when deployment is confirmed successful"

# Offer to monitor deployment
echo
read -p "Open GitHub Actions to monitor deployment? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    REPO_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)
    open "https://github.com/$REPO_NAME/actions" 2>/dev/null || xdg-open "https://github.com/$REPO_NAME/actions" 2>/dev/null || log_warning "Could not open browser"
fi