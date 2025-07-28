#!/bin/bash

# TypeScript Type Checking Hook Wrapper
# Integrates Python TypeScript checker with Claude Code hook system
# Created: 2025-07-28

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_HOOK="$SCRIPT_DIR/typescript-type-checker.py"
LOG_FILE="$SCRIPT_DIR/../logs/typescript-hook-wrapper.log"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Extract modified files from Claude Code environment variables
get_modified_files() {
    local modified_files=()
    
    # Try to get modified files from environment variables
    if [[ -n "$CLAUDE_MODIFIED_FILES" ]]; then
        IFS=',' read -ra modified_files <<< "$CLAUDE_MODIFIED_FILES"
    elif [[ -n "$CLAUDE_CURRENT_FILE" ]]; then
        modified_files=("$CLAUDE_CURRENT_FILE")
    elif [[ $# -gt 0 ]]; then
        # Use command line arguments as modified files
        modified_files=("$@")
    fi
    
    # Filter for relevant file types
    local relevant_files=()
    for file in "${modified_files[@]}"; do
        # Remove any surrounding quotes or whitespace
        file=$(echo "$file" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
        
        # Check if it's a relevant file type
        if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] || [[ "$(basename "$file")" == "tsconfig.json" ]] || [[ "$(basename "$file")" == "package.json" ]]; then
            relevant_files+=("$file")
        fi
    done
    
    echo "${relevant_files[@]}"
}

# Check if TypeScript checking should be skipped
should_skip_checking() {
    # Skip if explicitly disabled
    if [[ "$CLAUDE_SKIP_TYPE_CHECK" == "true" ]]; then
        log_event "INFO" "TypeScript checking disabled via CLAUDE_SKIP_TYPE_CHECK"
        return 0
    fi
    
    # Skip if no TypeScript projects found
    if ! find "$PROJECT_ROOT" -name "tsconfig.json" -not -path "*/node_modules/*" | head -1 | grep -q .; then
        log_event "INFO" "No TypeScript projects found, skipping type checking"
        return 0
    fi
    
    return 1
}

# Main type checking function
run_typescript_check() {
    local modified_files=($1)
    
    log_event "INFO" "Starting TypeScript type checking"
    log_event "INFO" "Modified files: ${modified_files[*]}"
    
    # Check if we should skip
    if should_skip_checking; then
        echo "ℹ️ TypeScript type checking skipped"
        return 0
    fi
    
    # Prepare arguments for Python script
    local python_args=(
        "--project-root" "$PROJECT_ROOT"
    )
    
    # Add modified files if any
    if [[ ${#modified_files[@]} -gt 0 ]]; then
        python_args+=("--modified-files" "${modified_files[@]}")
    fi
    
    # Run the Python type checker
    if python3 "$PYTHON_HOOK" "${python_args[@]}"; then
        log_event "INFO" "TypeScript type checking completed successfully"
        return 0
    else
        local exit_code=$?
        log_event "ERROR" "TypeScript type checking failed with exit code $exit_code"
        return $exit_code
    fi
}

# Handle different hook trigger scenarios
handle_hook_trigger() {
    local trigger_type="${1:-post-edit}"
    shift || true
    local modified_files_str=$(get_modified_files "$@")
    
    log_event "INFO" "Hook triggered: $trigger_type"
    
    case "$trigger_type" in
        "post-edit"|"post-write"|"post-multiedit")
            # Run type checking after file modifications
            echo "🔍 Running TypeScript type checking..."
            run_typescript_check "$modified_files_str"
            ;;
            
        "manual")
            # Manual trigger for testing
            echo "🔍 Manual TypeScript type check requested..."
            run_typescript_check "$modified_files_str"
            ;;
            
        "status")
            # Status check
            if should_skip_checking; then
                echo "❌ TypeScript type checking is disabled or not available"
            else
                echo "✅ TypeScript type checking is enabled"
                find "$PROJECT_ROOT" -name "tsconfig.json" -not -path "*/node_modules/*" | while read -r tsconfig; do
                    echo "  📁 TypeScript project: $(dirname "$tsconfig")"
                done
            fi
            ;;
            
        *)
            echo "Usage: $0 {post-edit|post-write|post-multiedit|manual|status} [files...]"
            exit 1
            ;;
    esac
}

# Enhanced error handling
trap 'log_event "ERROR" "Script interrupted"; exit 130' INT
trap 'log_event "ERROR" "Script failed with exit code $?"; exit 1' ERR

# Main execution
main() {
    local trigger_type="${1:-post-edit}"
    shift || true
    
    # Validate Python installation
    if ! command -v python3 &> /dev/null; then
        log_event "ERROR" "Python3 not found"
        echo "🚨 Error: Python3 is required for TypeScript type checking"
        exit 1
    fi
    
    # Validate Python script exists
    if [[ ! -f "$PYTHON_HOOK" ]]; then
        log_event "ERROR" "Python hook script not found: $PYTHON_HOOK"
        echo "🚨 Error: TypeScript checker script not found"
        exit 1
    fi
    
    # Handle the hook trigger
    handle_hook_trigger "$trigger_type" "$@"
}

# Execute main function
main "$@"