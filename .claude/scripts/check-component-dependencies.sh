#!/bin/bash

# Component Dependency Check Script
# Validates component independence and dependency chains
# Used by component_dependency_check hook

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
    echo -e "${BLUE}[DEPENDENCY]${NC} $1" | tee -a "$LOG_FILE"
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

# Analyze component imports and dependencies
analyze_component_dependencies() {
    local file_path="$1"
    local errors=0
    
    log "Analyzing dependencies in: $file_path"
    
    if [[ ! -f "$file_path" ]]; then
        error "File not found: $file_path"
        return 1
    fi
    
    # Extract import statements
    local imports=$(grep -E "^import.*from|^import.*'|^import.*\"" "$file_path" || true)
    
    # Count different types of dependencies
    local internal_imports=$(echo "$imports" | grep -c "@/" || echo 0)
    local external_imports=$(echo "$imports" | grep -c -v "@/" || echo 0)
    local react_imports=$(echo "$imports" | grep -c "react\|next" || echo 0)
    
    log "Dependency analysis: Internal($internal_imports) External($external_imports) React($react_imports)"
    
    # Check for problematic dependency patterns
    
    # 1. Circular dependency risk
    if echo "$imports" | grep -q "\.\./\.\./"; then
        warning "⚠️ Deep relative imports detected - potential circular dependency risk"
    fi
    
    # 2. Too many internal dependencies
    if [[ $internal_imports -gt 8 ]]; then
        warning "⚠️ High number of internal imports ($internal_imports) - consider reducing coupling"
    fi
    
    # 3. Auth dependency in non-auth components
    local filename=$(basename "$file_path")
    if [[ ! "$filename" =~ [Aa]uth ]] && echo "$imports" | grep -q "auth\|Auth"; then
        warning "⚠️ Non-auth component importing auth dependencies"
    fi
    
    # 4. Heavy external dependencies
    if [[ $external_imports -gt 10 ]]; then
        warning "⚠️ Heavy external dependencies ($external_imports) - may impact bundle size"
    fi
    
    return $errors
}

# Check for dependency loops
check_dependency_loops() {
    local file_path="$1"
    local component_name=$(basename "$file_path" .tsx)
    
    log "Checking for dependency loops involving: $component_name"
    
    # Look for imports that might create loops
    local imports=$(grep -E "^import.*from" "$file_path" || true)
    
    # Check if any imported components import this component back
    while IFS= read -r import_line; do
        if [[ -n "$import_line" ]]; then
            # Extract the imported path
            local import_path=$(echo "$import_line" | sed -n "s/.*from ['\"]\\([^'\"]*\\).*/\\1/p")
            
            if [[ "$import_path" =~ ^@/ ]]; then
                # Convert to actual file path
                local actual_path="/Users/bossio/6fb-booking/backend-v2/frontend-v2/${import_path#@/}"
                
                # Add common extensions if not present
                if [[ ! -f "$actual_path" ]]; then
                    if [[ -f "${actual_path}.tsx" ]]; then
                        actual_path="${actual_path}.tsx"
                    elif [[ -f "${actual_path}.ts" ]]; then
                        actual_path="${actual_path}.ts"
                    fi
                fi
                
                # Check if that file imports our component back
                if [[ -f "$actual_path" ]] && grep -q "$component_name" "$actual_path"; then
                    warning "⚠️ Potential circular dependency: $component_name ↔ $(basename "$actual_path")"
                fi
            fi
        fi
    done <<< "$imports"
}

# Validate component independence
validate_component_independence() {
    local file_path="$1"
    local errors=0
    
    log "Validating component independence: $file_path"
    
    # Check for hardcoded external dependencies
    if grep -q "localhost:\|127\.0\.0\.1:\|http://\|https://" "$file_path"; then
        warning "⚠️ Hardcoded URLs found - component not environment-independent"
    fi
    
    # Check for global state dependencies
    if grep -q "window\.\|document\.\|global\." "$file_path"; then
        local global_deps=$(grep -c "window\.\|document\.\|global\." "$file_path")
        if [[ $global_deps -gt 3 ]]; then
            warning "⚠️ Heavy global state usage ($global_deps instances) - consider reducing"
        fi
    fi
    
    # Check for external service dependencies
    if grep -q "fetch(\|axios\|http\." "$file_path"; then
        if ! grep -q "try.*catch\|\.catch\|error" "$file_path"; then
            warning "⚠️ External service calls without error handling"
        fi
    fi
    
    # Check for authentication assumptions
    if grep -q "user\.\|auth\.\|token\." "$file_path"; then
        if ! grep -q "user\?\|auth\?\|null\|undefined" "$file_path"; then
            warning "⚠️ Component assumes auth state without null checks"
        fi
    fi
    
    return $errors
}

# Analyze component complexity
analyze_component_complexity() {
    local file_path="$1"
    
    log "Analyzing component complexity..."
    
    # Count hooks usage
    local hooks_count=$(grep -c "use[A-Z]" "$file_path" || echo 0)
    if [[ $hooks_count -gt 5 ]]; then
        warning "⚠️ High hook usage ($hooks_count) - consider splitting component"
    fi
    
    # Count conditional renderings
    local conditionals=$(grep -c "\?\|&&\|||" "$file_path" || echo 0)
    if [[ $conditionals -gt 8 ]]; then
        warning "⚠️ High conditional complexity ($conditionals) - consider simplifying"
    fi
    
    # Count props/interfaces
    local interfaces=$(grep -c "interface\|type.*=" "$file_path" || echo 0)
    if [[ $interfaces -gt 3 ]]; then
        warning "⚠️ Multiple interfaces ($interfaces) - consider separating concerns"
    fi
    
    # File size check
    local file_size=$(wc -l < "$file_path")
    if [[ $file_size -gt 300 ]]; then
        warning "⚠️ Large component file ($file_size lines) - consider splitting"
    fi
}

# Check for anti-patterns
check_antipatterns() {
    local file_path="$1"
    local errors=0
    
    log "Checking for anti-patterns..."
    
    # God component anti-pattern
    if grep -q "Dashboard\|Panel\|Manager\|Handler" "$file_path"; then
        local responsibility_count=$(grep -c "service\|api\|hook\|context" "$file_path" || echo 0)
        if [[ $responsibility_count -gt 4 ]]; then
            warning "⚠️ Potential god component - handles too many responsibilities"
        fi
    fi
    
    # Prop drilling
    local prop_passing=$(grep -c "\.\.\." "$file_path" || echo 0)
    if [[ $prop_passing -gt 3 ]]; then
        warning "⚠️ Heavy prop spreading ($prop_passing) - consider context or composition"
    fi
    
    # Side effects in render
    if grep -q "useEffect.*\[\]" "$file_path"; then
        local effects_count=$(grep -c "useEffect" "$file_path" || echo 0)
        if [[ $effects_count -gt 3 ]]; then
            warning "⚠️ Multiple effects ($effects_count) - consider custom hooks"
        fi
    fi
    
    return $errors
}

# Main dependency check function
check_component_dependencies() {
    local errors=0
    
    log "Starting component dependency analysis..."
    
    # Get the file being modified from environment or argument
    local target_file="${CLAUDE_FILE_PATH:-$1}"
    
    if [[ -z "$target_file" ]]; then
        # Check key component files
        local component_files=(
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/components/ui/CTASystem.tsx"
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/components/ui/AuthCTAs.tsx"
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/hooks/useAuth.ts"
            "/Users/bossio/6fb-booking/backend-v2/frontend-v2/app/page.tsx"
        )
        
        for component in "${component_files[@]}"; do
            if [[ -f "$component" ]]; then
                analyze_component_dependencies "$component"
                check_dependency_loops "$component"
                validate_component_independence "$component"
                analyze_component_complexity "$component"
                check_antipatterns "$component"
            fi
        done
    else
        if [[ -f "$target_file" ]]; then
            analyze_component_dependencies "$target_file"
            check_dependency_loops "$target_file"
            validate_component_independence "$target_file"
            analyze_component_complexity "$target_file"
            check_antipatterns "$target_file"
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "Component dependency analysis completed"
        return 0
    else
        error "Component dependency check failed with $errors errors"
        return 1
    fi
}

# Execute check
main() {
    log "Component dependency check started at $(date)"
    
    if check_component_dependencies "$@"; then
        success "Component dependency check completed successfully"
        exit 0
    else
        warning "Component dependency check completed with warnings"
        exit 0  # Non-blocking hook
    fi
}

# Run main function
main "$@"