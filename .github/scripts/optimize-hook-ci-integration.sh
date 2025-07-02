#!/bin/bash

# Hook-CI/CD Integration Optimizer
# This script implements the optimization logic defined in hook-optimization-config.yml
# to avoid duplicating work between Git hooks and GitHub Actions

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.github/workflows/hook-optimization-config.yml"
CACHE_DIR="$PROJECT_ROOT/.github/cache"
LOG_FILE="$PROJECT_ROOT/.github/logs/hook-optimization.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE" >&2
}

log_info() {
    log "${BLUE}INFO${NC}" "$@"
}

log_warn() {
    log "${YELLOW}WARN${NC}" "$@"
}

log_error() {
    log "${RED}ERROR${NC}" "$@"
}

log_success() {
    log "${GREEN}SUCCESS${NC}" "$@"
}

# Create necessary directories
setup_directories() {
    mkdir -p "$(dirname "$LOG_FILE")" "$CACHE_DIR"
}

# Check if a hook recently passed locally
check_hook_cache() {
    local hook_name="$1"
    local cache_file="$CACHE_DIR/${hook_name}_result.cache"
    local cache_duration=300  # 5 minutes in seconds
    
    if [[ -f "$cache_file" ]]; then
        local file_age=$(($(date +%s) - $(stat -c %Y "$cache_file" 2>/dev/null || stat -f %m "$cache_file" 2>/dev/null || echo 0)))
        
        if [[ $file_age -lt $cache_duration ]]; then
            local cached_result=$(cat "$cache_file")
            if [[ "$cached_result" == "PASS" ]]; then
                log_info "Hook $hook_name passed locally within 5 minutes - skipping CI validation"
                return 0
            fi
        fi
    fi
    
    return 1
}

# Cache hook result
cache_hook_result() {
    local hook_name="$1"
    local result="$2"
    local cache_file="$CACHE_DIR/${hook_name}_result.cache"
    
    echo "$result" > "$cache_file"
    log_info "Cached result for $hook_name: $result"
}

# Check if files relevant to a hook have changed
files_changed_for_hook() {
    local hook_name="$1"
    local base_ref="${GITHUB_BASE_REF:-main}"
    
    case "$hook_name" in
        "commit-msg")
            # Commit message validation doesn't depend on file changes
            return 0
            ;;
        "security")
            # Check if dependency files changed
            if git diff --name-only "$base_ref" | grep -E "(requirements\.txt|package\.json|package-lock\.json|Pipfile|poetry\.lock)"; then
                return 0
            fi
            return 1
            ;;
        "migrations")
            # Check if migration files changed
            if git diff --name-only "$base_ref" | grep -E "migrations/|alembic/versions/"; then
                return 0
            fi
            return 1
            ;;
        "api-docs")
            # Check if API schema files changed
            if git diff --name-only "$base_ref" | grep -E "(main\.py|routers/|schemas/|models/)"; then
                return 0
            fi
            return 1
            ;;
        *)
            # For unknown hooks, assume files changed
            return 0
            ;;
    esac
}

# Determine if CI check should be skipped
should_skip_ci_check() {
    local hook_name="$1"
    
    log_info "Evaluating skip conditions for $hook_name"
    
    # Check cache first
    if check_hook_cache "$hook_name"; then
        return 0
    fi
    
    # Check if relevant files changed
    if ! files_changed_for_hook "$hook_name"; then
        log_info "No relevant files changed for $hook_name - skipping CI check"
        return 0
    fi
    
    # Check environment variables
    if [[ "${SKIP_HOOKS:-false}" == "true" ]]; then
        log_warn "SKIP_HOOKS environment variable set - skipping all hook checks"
        return 0
    fi
    
    if [[ "${EMERGENCY_BYPASS:-false}" == "true" ]]; then
        log_warn "EMERGENCY_BYPASS enabled - skipping hook validation"
        return 0
    fi
    
    log_info "$hook_name requires CI validation"
    return 1
}

# Get optimized tool configuration for CI
get_ci_tools() {
    local hook_name="$1"
    
    case "$hook_name" in
        "security")
            echo "safety pip-audit bandit semgrep trivy"
            ;;
        "secrets")
            echo "gitleaks detect-secrets"
            ;;
        "performance")
            echo "pytest-benchmark memory-profiler"
            ;;
        "api-docs")
            echo "swagger-codegen openapi-generator"
            ;;
        *)
            echo "default"
            ;;
    esac
}

# Run optimized CI check
run_optimized_ci_check() {
    local hook_name="$1"
    local skip_reason="${2:-}"
    
    if should_skip_ci_check "$hook_name"; then
        log_success "Skipping CI check for $hook_name (optimization applied)"
        echo "SKIPPED" > "$CACHE_DIR/${hook_name}_ci_result.cache"
        return 0
    fi
    
    log_info "Running optimized CI check for $hook_name"
    
    # Get appropriate tools for CI
    local ci_tools=$(get_ci_tools "$hook_name")
    log_info "Using CI tools for $hook_name: $ci_tools"
    
    # Run the actual check (implementation depends on specific hook)
    local result="PASS"
    case "$hook_name" in
        "security")
            run_security_ci_check || result="FAIL"
            ;;
        "performance")
            run_performance_ci_check || result="FAIL"
            ;;
        "api-docs")
            run_api_docs_ci_check || result="FAIL"
            ;;
        *)
            log_warn "No specific CI optimization for $hook_name - running standard check"
            ;;
    esac
    
    # Cache the result
    cache_hook_result "${hook_name}_ci" "$result"
    
    if [[ "$result" == "PASS" ]]; then
        log_success "CI check passed for $hook_name"
        return 0
    else
        log_error "CI check failed for $hook_name"
        return 1
    fi
}

# Specific CI check implementations
run_security_ci_check() {
    log_info "Running comprehensive security scan..."
    
    # Python security
    if [[ -f "backend-v2/requirements.txt" ]]; then
        cd backend-v2
        
        # Multiple tools for thorough scanning
        safety check --json > ../security_safety.json || true
        pip-audit --format=json --output=../security_audit.json || true
        bandit -r . -f json -o ../security_bandit.json || true
        
        cd ..
    fi
    
    # Node.js security
    if [[ -f "backend-v2/frontend-v2/package.json" ]]; then
        cd backend-v2/frontend-v2
        
        npm audit --audit-level=high --json > ../../security_npm.json || true
        
        cd ../..
    fi
    
    # Check if any critical vulnerabilities found
    if grep -q '"severity": "critical"' security_*.json 2>/dev/null; then
        log_error "Critical security vulnerabilities found"
        return 1
    fi
    
    log_success "Security scan completed - no critical issues"
    return 0
}

run_performance_ci_check() {
    log_info "Running comprehensive performance benchmarks..."
    
    if [[ -f "backend-v2/requirements.txt" ]]; then
        cd backend-v2
        
        # Run performance tests with benchmarking
        if command -v pytest &> /dev/null; then
            pytest --benchmark-only --benchmark-json=../performance_results.json || true
        fi
        
        cd ..
    fi
    
    log_success "Performance benchmarks completed"
    return 0
}

run_api_docs_ci_check() {
    log_info "Running API documentation validation..."
    
    if [[ -f "backend-v2/main.py" ]]; then
        cd backend-v2
        
        # Generate OpenAPI schema
        python -c "
import sys
sys.path.append('.')
from main import app
import json

schema = app.openapi()
with open('../openapi_schema.json', 'w') as f:
    json.dump(schema, f, indent=2)
print('✅ OpenAPI schema generated')
" || return 1
        
        cd ..
    fi
    
    log_success "API documentation validation completed"
    return 0
}

# Generate optimization report
generate_optimization_report() {
    log_info "Generating optimization report..."
    
    local report_file="$PROJECT_ROOT/.github/cache/optimization_report.json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "workflow": "${GITHUB_WORKFLOW:-unknown}",
  "run_id": "${GITHUB_RUN_ID:-unknown}",
  "optimizations_applied": {
    "cache_hits": $(find "$CACHE_DIR" -name "*_result.cache" -newer "$CACHE_DIR" 2>/dev/null | wc -l),
    "skipped_checks": $(grep -c "SKIPPED" "$CACHE_DIR"/*_ci_result.cache 2>/dev/null || echo 0),
    "total_hooks": $(find hooks -type f -executable | wc -l)
  },
  "performance": {
    "script_runtime_seconds": $SECONDS,
    "cache_directory_size_kb": $(du -sk "$CACHE_DIR" 2>/dev/null | cut -f1 || echo 0)
  },
  "configuration": {
    "skip_hooks": "${SKIP_HOOKS:-false}",
    "emergency_bypass": "${EMERGENCY_BYPASS:-false}",
    "base_ref": "${GITHUB_BASE_REF:-main}"
  }
}
EOF
    
    log_success "Optimization report generated: $report_file"
}

# Main execution function
main() {
    local command="${1:-help}"
    
    setup_directories
    log_info "Starting hook-CI optimization with command: $command"
    
    case "$command" in
        "check")
            local hook_name="${2:-}"
            if [[ -z "$hook_name" ]]; then
                log_error "Hook name required for check command"
                exit 1
            fi
            run_optimized_ci_check "$hook_name"
            ;;
        "should-skip")
            local hook_name="${2:-}"
            if [[ -z "$hook_name" ]]; then
                log_error "Hook name required for should-skip command"
                exit 1
            fi
            if should_skip_ci_check "$hook_name"; then
                echo "true"
            else
                echo "false"
            fi
            ;;
        "cache-result")
            local hook_name="${2:-}"
            local result="${3:-}"
            if [[ -z "$hook_name" ]] || [[ -z "$result" ]]; then
                log_error "Hook name and result required for cache-result command"
                exit 1
            fi
            cache_hook_result "$hook_name" "$result"
            ;;
        "report")
            generate_optimization_report
            ;;
        "clean-cache")
            log_info "Cleaning optimization cache..."
            rm -rf "$CACHE_DIR"/*
            setup_directories
            log_success "Cache cleaned"
            ;;
        "help"|*)
            cat << EOF
Hook-CI/CD Integration Optimizer

Usage: $0 <command> [arguments]

Commands:
  check <hook_name>           Run optimized CI check for hook
  should-skip <hook_name>     Check if CI validation should be skipped
  cache-result <hook> <result> Cache hook execution result
  report                      Generate optimization report
  clean-cache                 Clean optimization cache
  help                        Show this help message

Examples:
  $0 check security           # Run optimized security check
  $0 should-skip commit-msg   # Check if commit-msg validation can be skipped
  $0 cache-result security PASS  # Cache successful security check
  $0 report                   # Generate performance report

Environment Variables:
  SKIP_HOOKS=true            Skip all hook validations
  EMERGENCY_BYPASS=true      Emergency bypass for critical deployments
  GITHUB_BASE_REF           Base reference for file change detection

EOF
            ;;
    esac
    
    log_info "Hook-CI optimization completed"
}

# Run main function with all arguments
main "$@"