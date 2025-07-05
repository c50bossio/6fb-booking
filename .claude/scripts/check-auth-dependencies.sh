#!/bin/bash

# Auth Dependencies Check Script
# Prevents authentication dependencies in landing pages
# Used by auth_dependency_validation hook

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="/Users/bossio/6fb-booking/.claude/verification.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[AUTH-CHECK]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check for problematic auth dependencies in landing pages
check_auth_dependencies() {
    local file_path="$1"
    local errors=0
    
    log "Checking auth dependencies in: $file_path"
    
    if [[ ! -f "$file_path" ]]; then
        error "File not found: $file_path"
        return 1
    fi
    
    # Check for direct useAuth hook usage
    if grep -q "useAuth" "$file_path"; then
        error "❌ Direct useAuth hook found in landing page"
        errors=$((errors + 1))
    fi
    
    # Check for AuthCTAs imports without error boundaries
    if grep -q "AuthCTAs\|AuthHeaderCTAs\|AuthHeroCTAs" "$file_path"; then
        if ! grep -q "ErrorBoundary\|try.*catch\|Suspense" "$file_path"; then
            error "❌ Auth-dependent components found without error boundaries"
            errors=$((errors + 1))
        fi
    fi
    
    # Check for conditional rendering based on auth state
    if grep -q "user\s*?\|isAuthenticated\s*?\|!!user\|!user" "$file_path"; then
        warning "⚠️ Conditional auth rendering found - ensure graceful fallbacks exist"
    fi
    
    # Check for authentication middleware dependencies
    if grep -q "requireAuth\|withAuth\|protectedRoute" "$file_path"; then
        error "❌ Authentication middleware found in landing page"
        errors=$((errors + 1))
    fi
    
    # Validate component independence
    local auth_imports=$(grep -c "from.*auth\|import.*Auth" "$file_path" 2>/dev/null || echo 0)
    if [[ $auth_imports -gt 2 ]]; then
        warning "⚠️ High number of auth imports ($auth_imports) - consider reducing dependencies"
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "✅ No problematic auth dependencies found"
        return 0
    else
        error "❌ Found $errors critical auth dependency issues"
        return 1
    fi
}

# Main validation function
validate_landing_page() {
    local errors=0
    
    log "Starting auth dependency validation..."
    
    # Get the file being modified from environment or argument
    local target_file="${CLAUDE_FILE_PATH:-$1}"
    
    if [[ -z "$target_file" ]]; then
        # Check common landing page files
        local landing_pages=(
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/app/page.tsx"
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/app/(public)/page.tsx"
        )
        
        for page in "${landing_pages[@]}"; do
            if [[ -f "$page" ]]; then
                if ! check_auth_dependencies "$page"; then
                    errors=$((errors + 1))
                fi
            fi
        done
    else
        if ! check_auth_dependencies "$target_file"; then
            errors=$((errors + 1))
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "All auth dependency checks passed"
        return 0
    else
        error "Auth dependency validation failed with $errors errors"
        
        # Provide remediation guidance
        echo ""
        echo "🛠️ REMEDIATION GUIDANCE:"
        echo "1. Remove direct useAuth hooks from landing pages"
        echo "2. Wrap auth-dependent components in error boundaries"
        echo "3. Use static fallbacks for auth-aware components"
        echo "4. Ensure landing pages work without backend connectivity"
        echo ""
        
        return 1
    fi
}

# Execute validation
main() {
    log "Auth dependency validation started at $(date)"
    
    if validate_landing_page "$@"; then
        success "Auth dependency validation completed successfully"
        exit 0
    else
        error "Auth dependency validation failed"
        exit 1
    fi
}

# Run main function
main "$@"