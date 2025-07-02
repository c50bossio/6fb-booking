#!/bin/bash

# BookedBarber V2 - Git Hooks Installation Script
# Installs development workflow hooks into .git/hooks/
#
# Usage: ./hooks/install-hooks.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${BLUE}[HOOK-INSTALL]${NC} $1"
}

error() {
    echo -e "${RED}[HOOK-INSTALL ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[HOOK-INSTALL SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[HOOK-INSTALL WARNING]${NC} $1"
}

# Check if we're in a git repository
if [[ ! -d .git ]]; then
    error "Not in a git repository root!"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if hooks directory exists
if [[ ! -d hooks ]]; then
    error "Hooks directory not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

log "Installing BookedBarber V2 development workflow hooks..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

HOOKS_TO_INSTALL=(
    "commit-msg"
    "pre-push"
    "pre-commit-v2-only"
    "pre-commit-security"
    "pre-commit-api-docs"
    "pre-commit-migrations"
    "pre-commit-performance"
    "pre-commit-integration"
    "pre-commit-secrets"
    "pre-commit-compliance"
    "pre-release"
    "post-deploy"
)

INSTALLED_COUNT=0
SKIPPED_COUNT=0

# Install each hook
for hook in "${HOOKS_TO_INSTALL[@]}"; do
    SOURCE_HOOK="hooks/$hook"
    TARGET_HOOK=".git/hooks/$hook"
    
    if [[ ! -f "$SOURCE_HOOK" ]]; then
        error "Source hook not found: $SOURCE_HOOK"
        continue
    fi
    
    # Check if hook already exists
    if [[ -f "$TARGET_HOOK" ]]; then
        warning "Hook already exists: $TARGET_HOOK"
        echo -n "Overwrite? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Skipping $hook"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
            continue
        fi
    fi
    
    # Copy and make executable
    cp "$SOURCE_HOOK" "$TARGET_HOOK"
    chmod +x "$TARGET_HOOK"
    
    success "Installed: $hook"
    INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
done

# Special handling for pre-commit hooks (multiple hooks)
if [[ -f ".git/hooks/pre-commit" ]]; then
    warning "Existing pre-commit hook found"
    echo "Backing up to pre-commit.backup"
    cp .git/hooks/pre-commit .git/hooks/pre-commit.backup
fi

# Create combined pre-commit hook
log "Creating combined pre-commit hook..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# BookedBarber V2 - Combined Pre-Commit Hook
# Runs all pre-commit checks in sequence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[PRE-COMMIT]${NC} $1"
}

error() {
    echo -e "${RED}[PRE-COMMIT ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[PRE-COMMIT SUCCESS]${NC} $1"
}

log "Running BookedBarber V2 pre-commit checks..."

# Run V2-only architecture check
if [[ -f .git/hooks/pre-commit-v2-only ]]; then
    log "Running V2-only architecture check..."
    if ! .git/hooks/pre-commit-v2-only; then
        error "V2-only architecture check failed!"
        exit 1
    fi
fi

# Run security check
if [[ -f .git/hooks/pre-commit-security ]]; then
    log "Running dependency security check..."
    if ! .git/hooks/pre-commit-security; then
        error "Security check failed!"
        exit 1
    fi
fi

# Run API documentation check
if [[ -f .git/hooks/pre-commit-api-docs ]]; then
    log "Running API documentation check..."
    if ! .git/hooks/pre-commit-api-docs; then
        error "API documentation check failed!"
        exit 1
    fi
fi

# Run database migration check
if [[ -f .git/hooks/pre-commit-migrations ]]; then
    log "Running database migration check..."
    if ! .git/hooks/pre-commit-migrations; then
        error "Database migration check failed!"
        exit 1
    fi
fi

# Run performance regression check
if [[ -f .git/hooks/pre-commit-performance ]]; then
    log "Running performance regression check..."
    if ! .git/hooks/pre-commit-performance; then
        error "Performance regression check failed!"
        exit 1
    fi
fi

# Run integration health check
if [[ -f .git/hooks/pre-commit-integration ]]; then
    log "Running integration health check..."
    if ! .git/hooks/pre-commit-integration; then
        error "Integration health check failed!"
        exit 1
    fi
fi

# Run advanced secrets detection
if [[ -f .git/hooks/pre-commit-secrets ]]; then
    log "Running advanced secrets detection..."
    if ! .git/hooks/pre-commit-secrets; then
        error "Secrets detection failed!"
        exit 1
    fi
fi

# Run GDPR/PCI compliance check
if [[ -f .git/hooks/pre-commit-compliance ]]; then
    log "Running GDPR/PCI compliance check..."
    if ! .git/hooks/pre-commit-compliance; then
        error "Compliance check failed!"
        exit 1
    fi
fi

success "All pre-commit checks passed!"
exit 0
EOF

chmod +x .git/hooks/pre-commit
INSTALLED_COUNT=$((INSTALLED_COUNT + 1))

echo
success "Hook installation completed!"
echo
echo -e "${YELLOW}Installation Summary:${NC}"
echo "  ✅ Installed: $INSTALLED_COUNT hooks"
echo "  ⏭️  Skipped: $SKIPPED_COUNT hooks"
echo
echo -e "${YELLOW}Installed Hooks:${NC}"
echo
echo -e "${BLUE}Phase 1 & 2 Hooks:${NC}"
echo "  📝 commit-msg           - Validates commit message format"
echo "  🛡️  pre-push            - Protects main branches from direct pushes"
echo "  🏗️  pre-commit-v2-only  - Blocks modifications to V1 directories"
echo "  🔒 pre-commit-security  - Scans dependencies for vulnerabilities"
echo "  📚 pre-commit-api-docs  - Ensures API endpoints are documented"
echo "  🗄️  pre-commit-migrations - Validates database migration consistency"
echo "  ⚡ pre-commit-performance - Monitors performance regressions"
echo "  🔌 pre-commit-integration - Validates third-party service health"
echo
echo -e "${PURPLE}Phase 3 Security & Compliance Hooks:${NC}"
echo "  🔍 pre-commit-secrets   - Advanced secrets detection & PII scanning"
echo "  🛡️  pre-commit-compliance - GDPR/PCI compliance validation"
echo "  🚀 pre-release          - Comprehensive release preparation"
echo "  ✅ post-deploy          - Deployment verification & health checks"
echo
echo -e "${GREEN}Combined Hooks:${NC}"
echo "  🔄 pre-commit          - Combined pre-commit runner"
echo
echo -e "${YELLOW}Hook Behavior:${NC}"
echo "  • Hooks run automatically on git operations"
echo "  • Use --no-verify to bypass (not recommended)"
echo "  • Hooks can be temporarily disabled by renaming .git/hooks/<hook>"
echo
echo -e "${YELLOW}Testing Hooks:${NC}"
echo "  • Test commit-msg: git commit --allow-empty -m 'test: invalid format'"
echo "  • Test pre-commit: touch backend-v2/test.py && git add backend-v2/test.py && git commit -m 'test'"
echo "  • Test pre-push: git push origin main (should fail)"
echo "  • Test secrets detection: echo 'sk_test_123...' > test.py && git add test.py"
echo "  • Test release prep: ./hooks/pre-release v2.1.0"
echo "  • Test deployment: ./hooks/post-deploy http://localhost:8000"
echo
echo -e "${YELLOW}Phase 3 Usage Examples:${NC}"
echo "  • Secrets scan: ./hooks/pre-commit-secrets"
echo "  • Compliance check: ./hooks/pre-commit-compliance"
echo "  • Release preparation: ./hooks/pre-release v2.1.0"
echo "  • Deployment verification: ./hooks/post-deploy https://api.bookedbarber.com"
echo
echo -e "${YELLOW}Security Dependencies:${NC}"
echo "  • Install Python safety: pip install safety"
echo "  • Install pip-audit: pip install pip-audit"
echo "  • npm audit is included with npm"
echo "  • git-secrets (optional): brew install git-secrets"
echo
echo -e "${GREEN}Development workflow is now protected!${NC}"
echo "Happy coding! 🚀"