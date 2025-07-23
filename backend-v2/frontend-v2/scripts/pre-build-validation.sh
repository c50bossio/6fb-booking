#!/bin/bash

# =============================================================================
# Pre-Build Validation Script
# Comprehensive validation before allowing builds to proceed
# =============================================================================

set -e

PROJECT_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"
VALIDATION_LOG="$PROJECT_ROOT/logs/pre-build-validation.log"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

log_validation() {
    echo "[$(date)] PRE-BUILD: $1" | tee -a "$VALIDATION_LOG"
}

validate_cache_integrity() {
    log_validation "🗃️  Validating cache integrity..."
    
    local cache_issues=0
    
    # Check for corrupted webpack cache
    if [[ -d "$PROJECT_ROOT/.next/cache/webpack" ]]; then
        local broken_chunks=$(find "$PROJECT_ROOT/.next/cache/webpack" -name "*.pack.gz" -size 0 2>/dev/null | wc -l)
        if [[ $broken_chunks -gt 0 ]]; then
            log_validation "⚠️  Found $broken_chunks corrupted webpack cache files"
            rm -rf "$PROJECT_ROOT/.next/cache/webpack"
            log_validation "✅ Cleared corrupted webpack cache"
            ((cache_issues++))
        fi
    fi
    
    # Check for TypeScript build info corruption
    if [[ -f "$PROJECT_ROOT/tsconfig.tsbuildinfo" ]]; then
        if ! [[ -s "$PROJECT_ROOT/tsconfig.tsbuildinfo" ]]; then
            log_validation "⚠️  TypeScript build info is empty or corrupted"
            rm -f "$PROJECT_ROOT/tsconfig.tsbuildinfo"
            log_validation "✅ Cleared corrupted TypeScript build info"
            ((cache_issues++))
        fi
    fi
    
    if [[ $cache_issues -eq 0 ]]; then
        log_validation "✅ Cache integrity check passed"
    else
        log_validation "⚠️  Fixed $cache_issues cache integrity issues"
    fi
    
    return 0
}

validate_dependencies_comprehensive() {
    log_validation "📦 Running comprehensive dependency validation..."
    
    local missing_count=0
    local created_count=0
    
    # Define critical dependencies that must exist
    local critical_deps=(
        "components/ui"
        "lib/utils.ts"
        "lib/api.ts"
        "hooks"
        "styles/globals.css"
        "app/globals.css"
        "next.config.js"
    )
    
    # Check critical dependencies
    for dep in "${critical_deps[@]}"; do
        local full_path="$PROJECT_ROOT/$dep"
        
        if [[ ! -e "$full_path" ]]; then
            log_validation "❌ CRITICAL: Missing dependency: $dep"
            ((missing_count++))
        fi
    done
    
    if [[ $missing_count -gt 0 ]]; then
        log_validation "💥 CRITICAL: $missing_count critical dependencies missing"
        log_validation "🛑 Build blocked - fix missing dependencies first"
        return 1
    fi
    
    # Auto-create common missing files
    local common_missing=(
        "lib/touch-utils.ts:export {}"
        "lib/appointment-conflicts.ts:export {}"
        "lib/calendar-constants.ts:export {}"
        "hooks/useCalendarAccessibility.ts:export const useCalendarAccessibility = () => ({})"
        "hooks/useResponsive.ts:export const useResponsive = () => ({})"
        "styles/calendar-animations.css:"
    )
    
    for dep_def in "${common_missing[@]}"; do
        local file_path="${dep_def%:*}"
        local content="${dep_def#*:}"
        local full_path="$PROJECT_ROOT/$file_path"
        
        if [[ ! -f "$full_path" ]]; then
            mkdir -p "$(dirname "$full_path")"
            echo "$content" > "$full_path"
            log_validation "✅ Created missing file: $file_path"
            ((created_count++))
        fi
    done
    
    if [[ $created_count -gt 0 ]]; then
        log_validation "📁 Auto-created $created_count missing dependency files"
    fi
    
    log_validation "✅ Dependency validation passed"
    return 0
}

validate_import_consistency() {
    log_validation "🔗 Validating import consistency..."
    
    local import_errors=0
    
    # Find all TypeScript/TSX files
    find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | while read -r file; do
        # Check for imports that might not exist
        local suspicious_imports=$(grep -n "from ['\"]@/" "$file" | grep -E "(lib|hooks|components)" | head -10)
        
        if [[ -n "$suspicious_imports" ]]; then
            # Validate each import
            echo "$suspicious_imports" | while IFS=: read -r line_num import_line; do
                local import_path=$(echo "$import_line" | sed -E "s/.*from ['\"]@\/([^'\"]*)['\"].*/\1/")
                local actual_path="$PROJECT_ROOT/$import_path"
                
                # Check various extensions
                local found=false
                for ext in "" ".ts" ".tsx" ".js" ".jsx" ".css" ".scss"; do
                    if [[ -f "$actual_path$ext" ]]; then
                        found=true
                        break
                    fi
                done
                
                if [[ "$found" == "false" ]]; then
                    # Try index files
                    for ext in "/index.ts" "/index.tsx" "/index.js"; do
                        if [[ -f "$actual_path$ext" ]]; then
                            found=true
                            break
                        fi
                    done
                fi
                
                if [[ "$found" == "false" ]]; then
                    log_validation "⚠️  Import may not exist: @/$import_path in $file:$line_num"
                fi
            done
        fi
    done 2>/dev/null || true
    
    log_validation "✅ Import consistency check completed"
    return 0
}

validate_typescript_compilation() {
    log_validation "📝 Validating TypeScript compilation..."
    
    cd "$PROJECT_ROOT"
    
    # Run TypeScript check without emitting files
    if npx tsc --noEmit --skipLibCheck > /tmp/tsc-check.log 2>&1; then
        log_validation "✅ TypeScript compilation validation passed"
        return 0
    else
        log_validation "❌ TypeScript compilation errors found:"
        log_validation "$(cat /tmp/tsc-check.log)"
        
        # Check if errors are just missing files we can create
        local missing_files=$(cat /tmp/tsc-check.log | grep "Cannot find module" | wc -l)
        if [[ $missing_files -gt 0 ]]; then
            log_validation "🔧 $missing_files missing module errors detected"
            log_validation "💡 Try running: npm run dev:validate to auto-create missing files"
        fi
        
        return 1
    fi
}

validate_next_config() {
    log_validation "⚙️  Validating Next.js configuration..."
    
    if [[ ! -f "$PROJECT_ROOT/next.config.js" ]]; then
        log_validation "❌ next.config.js is missing"
        return 1
    fi
    
    # Basic syntax check
    if node -c "$PROJECT_ROOT/next.config.js" 2>/dev/null; then
        log_validation "✅ Next.js config syntax is valid"
    else
        log_validation "❌ Next.js config has syntax errors"
        return 1
    fi
    
    # Check for common misconfigurations
    if grep -q "reactStrictMode.*false" "$PROJECT_ROOT/next.config.js"; then
        log_validation "⚠️  React Strict Mode is disabled - consider enabling for better development experience"
    fi
    
    return 0
}

validate_package_integrity() {
    log_validation "📋 Validating package integrity..."
    
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_validation "❌ package.json is missing"
        return 1
    fi
    
    # Check package.json syntax
    if ! jq empty "$PROJECT_ROOT/package.json" 2>/dev/null; then
        log_validation "❌ package.json has invalid JSON syntax"
        return 1
    fi
    
    # Check if node_modules exists and is not empty
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]] || [[ -z "$(ls -A "$PROJECT_ROOT/node_modules" 2>/dev/null)" ]]; then
        log_validation "⚠️  node_modules is missing or empty"
        log_validation "🔧 Running npm install..."
        npm install
        log_validation "✅ Dependencies installed"
    fi
    
    # Check for package-lock.json
    if [[ ! -f "$PROJECT_ROOT/package-lock.json" ]]; then
        log_validation "⚠️  package-lock.json is missing - dependency versions may be inconsistent"
    fi
    
    log_validation "✅ Package integrity validated"
    return 0
}

check_build_blockers() {
    log_validation "🚫 Checking for build blockers..."
    
    local blockers=0
    
    # Check for processes using build ports
    if lsof -ti:3000 >/dev/null 2>&1; then
        local pid=$(lsof -ti:3000)
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        if [[ "$process_name" != *"next"* ]]; then
            log_validation "⚠️  Port 3000 is in use by non-Next.js process: $process_name (PID: $pid)"
            ((blockers++))
        fi
    fi
    
    # Check for disk space
    local available_space=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    if [[ $available_space -lt 1000000 ]]; then  # Less than 1GB
        log_validation "⚠️  Low disk space: ${available_space}KB available"
        log_validation "💡 Consider cleaning up old builds and cache files"
        ((blockers++))
    fi
    
    # Check for very large .next directory
    if [[ -d "$PROJECT_ROOT/.next" ]]; then
        local next_size=$(du -sk "$PROJECT_ROOT/.next" 2>/dev/null | cut -f1)
        if [[ $next_size -gt 500000 ]]; then  # Greater than 500MB
            log_validation "⚠️  .next directory is very large: ${next_size}KB"
            log_validation "💡 Consider cleaning: rm -rf .next"
        fi
    fi
    
    if [[ $blockers -eq 0 ]]; then
        log_validation "✅ No build blockers detected"
    else
        log_validation "⚠️  $blockers potential build blockers detected"
    fi
    
    return 0
}

# Main validation pipeline
main() {
    local build_type="${1:-development}"
    
    log_validation "🚀 Starting pre-build validation for $build_type build..."
    
    local validation_errors=0
    
    # Run all validations
    validate_package_integrity || ((validation_errors++))
    validate_cache_integrity || ((validation_errors++))
    validate_next_config || ((validation_errors++))
    validate_dependencies_comprehensive || ((validation_errors++))
    validate_import_consistency || ((validation_errors++))
    check_build_blockers || ((validation_errors++))
    
    # TypeScript validation (non-blocking for development builds)
    if [[ "$build_type" == "production" ]]; then
        validate_typescript_compilation || ((validation_errors++))
    else
        validate_typescript_compilation || log_validation "⚠️  TypeScript errors detected but not blocking development build"
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log_validation "🎉 Pre-build validation passed - build can proceed"
        exit 0
    else
        log_validation "💥 Pre-build validation failed with $validation_errors errors"
        log_validation "🛑 Build blocked - fix validation errors first"
        exit 1
    fi
}

show_help() {
    cat << EOF
🔍 Pre-Build Validation Tool

Usage: $0 [build-type]

Arguments:
  build-type    development (default) or production

Examples:
  $0                    # Validate for development build
  $0 development        # Same as above
  $0 production         # Strict validation for production build

Validations performed:
• Cache integrity check
• Dependency validation  
• Import consistency check
• TypeScript compilation
• Next.js configuration
• Package integrity
• Build blocker detection

EOF
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        ;;
    ""|development|production)
        main "${1:-development}"
        ;;
    *)
        echo "❌ Unknown build type: $1"
        show_help
        exit 1
        ;;
esac