#!/bin/bash

# Error Boundary Verification Script
# Ensures error boundaries exist for auth-dependent components
# Used by error_boundary_verification hook

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
    echo -e "${BLUE}[ERROR-BOUNDARY]${NC} $1" | tee -a "$LOG_FILE"
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

# Check if error boundaries exist for a component
check_error_boundary() {
    local file_path="$1"
    local errors=0
    
    log "Checking error boundaries in: $file_path"
    
    if [[ ! -f "$file_path" ]]; then
        error "File not found: $file_path"
        return 1
    fi
    
    # Check for auth-dependent components
    local has_auth_deps=false
    
    if grep -q "useAuth\|AuthCTAs\|isAuthenticated\|user\?" "$file_path"; then
        has_auth_deps=true
        log "Auth dependencies detected in component"
    fi
    
    if [[ "$has_auth_deps" == "true" ]]; then
        # Check for error boundary patterns
        local has_error_boundary=false
        
        # Check for ErrorBoundary component
        if grep -q "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" "$file_path"; then
            has_error_boundary=true
        fi
        
        # Check for try-catch blocks
        if grep -q "try\s*{.*catch" "$file_path"; then
            has_error_boundary=true
        fi
        
        # Check for Suspense with fallback
        if grep -q "Suspense.*fallback" "$file_path"; then
            has_error_boundary=true
        fi
        
        # Check for conditional rendering with error states
        if grep -q "error\s*?\|isError\|hasError" "$file_path"; then
            has_error_boundary=true
        fi
        
        if [[ "$has_error_boundary" == "false" ]]; then
            error "❌ Auth-dependent component lacks error boundary protection"
            errors=$((errors + 1))
        else
            success "✅ Error boundary protection found"
        fi
    else
        success "✅ No auth dependencies requiring error boundaries"
    fi
    
    return $errors
}

# Check for proper fallback components
check_fallback_components() {
    local file_path="$1"
    local errors=0
    
    # Check if fallback components are properly implemented
    if grep -q "useAuth" "$file_path"; then
        # Look for loading states
        if ! grep -q "isLoading\|loading\|Loading" "$file_path"; then
            warning "⚠️ Auth component missing loading state handling"
        fi
        
        # Look for error states
        if ! grep -q "error\|Error\|fallback\|Fallback" "$file_path"; then
            warning "⚠️ Auth component missing error state handling"
        fi
        
        # Look for static fallbacks
        if ! grep -q "static\|Static\|default.*CTA\|fallback.*CTA" "$file_path"; then
            warning "⚠️ Auth component missing static fallback"
        fi
    fi
    
    return $errors
}

# Verify error boundary implementation quality
verify_error_boundary_quality() {
    local file_path="$1"
    
    log "Verifying error boundary implementation quality..."
    
    # Check for comprehensive error handling
    if grep -q "ErrorBoundary" "$file_path"; then
        # Check if ErrorBoundary has fallback UI
        if ! grep -q "fallback\|FallbackComponent" "$file_path"; then
            warning "⚠️ ErrorBoundary missing fallback UI"
        fi
        
        # Check if ErrorBoundary handles auth-specific errors
        if ! grep -q "auth.*error\|authentication.*error" "$file_path"; then
            warning "⚠️ ErrorBoundary may not handle auth-specific errors"
        fi
    fi
    
    # Check for graceful degradation patterns
    if grep -q "try.*catch" "$file_path"; then
        if ! grep -q "finally\|cleanup" "$file_path"; then
            warning "⚠️ Try-catch block missing cleanup in finally"
        fi
    fi
}

# Main verification function
verify_error_boundaries() {
    local errors=0
    
    log "Starting error boundary verification..."
    
    # Get the file being modified from environment or argument
    local target_file="${CLAUDE_FILE_PATH:-$1}"
    
    if [[ -z "$target_file" ]]; then
        # Check auth-dependent component files
        local auth_components=(
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/components/ui/AuthCTAs.tsx"
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/hooks/useAuth.ts"
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/components/ui/CTASystem.tsx"
        )
        
        for component in "${auth_components[@]}"; do
            if [[ -f "$component" ]]; then
                if ! check_error_boundary "$component"; then
                    errors=$((errors + 1))
                fi
                check_fallback_components "$component"
                verify_error_boundary_quality "$component"
            fi
        done
    else
        if ! check_error_boundary "$target_file"; then
            errors=$((errors + 1))
        fi
        check_fallback_components "$target_file"
        verify_error_boundary_quality "$target_file"
    fi
    
    # Check for global error boundary
    local global_error_boundary="/Users/bossio/6fb-booking/backend-v2/frontend-v2/app/error.tsx"
    if [[ ! -f "$global_error_boundary" ]]; then
        warning "⚠️ Global error boundary not found at app/error.tsx"
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "All error boundary checks passed"
        return 0
    else
        error "Error boundary verification failed with $errors errors"
        
        # Provide remediation guidance
        echo ""
        echo "🛠️ REMEDIATION GUIDANCE:"
        echo "1. Wrap auth-dependent components in ErrorBoundary"
        echo "2. Implement static fallback components"
        echo "3. Add try-catch blocks for async auth operations"
        echo "4. Create app/error.tsx for global error handling"
        echo "5. Test error scenarios with backend offline"
        echo ""
        
        return 1
    fi
}

# Execute verification
main() {
    log "Error boundary verification started at $(date)"
    
    if verify_error_boundaries "$@"; then
        success "Error boundary verification completed successfully"
        exit 0
    else
        error "Error boundary verification failed"
        exit 1
    fi
}

# Run main function
main "$@"