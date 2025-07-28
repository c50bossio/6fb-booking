#!/bin/bash

# Query Duplication Detection Hook Wrapper
# Integrates Python query duplication detector with Claude Code hook system
# Created: 2025-07-28

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_HOOK="$SCRIPT_DIR/query-duplication-detector.py"
LOG_FILE="$SCRIPT_DIR/../logs/query-duplication-wrapper.log"
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
    
    # Filter for query-related files
    local query_files=()
    for file in "${modified_files[@]}"; do
        # Remove any surrounding quotes or whitespace
        file=$(echo "$file" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
        
        # Check if it's a query-related file
        if [[ "$file" =~ queries/ ]] || \
           [[ "$file" =~ sql/ ]] || \
           [[ "$file" =~ database/ ]] || \
           [[ "$file" =~ db/ ]] || \
           [[ "$file" =~ models/ ]] || \
           [[ "$file" =~ *query*.ts ]] || \
           [[ "$file" =~ *query*.js ]] || \
           [[ "$file" =~ *query*.py ]] || \
           [[ "$file" =~ *sql*.ts ]] || \
           [[ "$file" =~ *sql*.js ]] || \
           [[ "$file" =~ *sql*.py ]] || \
           [[ "$file" =~ *db*.ts ]] || \
           [[ "$file" =~ *db*.js ]] || \
           [[ "$file" =~ *db*.py ]] || \
           [[ "$file" =~ *.sql ]] || \
           [[ "$file" =~ *.mysql ]] || \
           [[ "$file" =~ *.pgsql ]] || \
           [[ "$file" =~ *.sqlite ]]; then
            query_files+=("$file")
        fi
    done
    
    echo "${query_files[@]}"
}

# Check if query duplication checking should be skipped
should_skip_checking() {
    # Skip if explicitly disabled
    if [[ "$CLAUDE_SKIP_QUERY_CHECK" == "true" ]]; then
        log_event "INFO" "Query duplication checking disabled via CLAUDE_SKIP_QUERY_CHECK"
        return 0
    fi
    
    # Skip if no query directories or files found
    local query_dirs=("queries" "sql" "database" "db" "models")
    local found_query_structure=false
    
    for dir in "${query_dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            found_query_structure=true
            break
        fi
    done
    
    # Also check for query files in the project
    if ! $found_query_structure; then
        if find "$PROJECT_ROOT" -name "*query*" -o -name "*sql*" -o -name "*.sql" | grep -q .; then
            found_query_structure=true
        fi
    fi
    
    if ! $found_query_structure; then
        log_event "INFO" "No query structure found, skipping duplication checking"
        return 0
    fi
    
    return 1
}

# Check if Claude Code is available for reviewer instance
check_claude_availability() {
    if ! command -v claude-code &> /dev/null; then
        log_event "WARNING" "claude-code command not found, using alternative approach"
        return 1
    fi
    return 0
}

# Main query duplication checking function
run_query_duplication_check() {
    local modified_files=($1)
    
    log_event "INFO" "Starting query duplication checking"
    log_event "INFO" "Modified files: ${modified_files[*]}"
    
    # Check if we should skip
    if should_skip_checking; then
        echo "ℹ️ Query duplication checking skipped"
        return 0
    fi
    
    # Check Claude Code availability
    if ! check_claude_availability; then
        log_event "WARNING" "Claude Code not available for reviewer instance"
        echo "⚠️ Claude Code reviewer not available - running basic duplication check"
    fi
    
    # Prepare arguments for Python script
    local python_args=(
        "--project-root" "$PROJECT_ROOT"
    )
    
    # Add modified files if any
    if [[ ${#modified_files[@]} -gt 0 ]]; then
        python_args+=("--modified-files" "${modified_files[@]}")
    fi
    
    # Add config file if it exists
    local config_file="$PROJECT_ROOT/.claude/query-duplication-config.json"
    if [[ -f "$config_file" ]]; then
        python_args+=("--config-file" "$config_file")
    fi
    
    # Run the Python query duplication detector
    if python3 "$PYTHON_HOOK" "${python_args[@]}"; then
        log_event "INFO" "Query duplication checking completed successfully"
        return 0
    else
        local exit_code=$?
        log_event "ERROR" "Query duplication checking failed with exit code $exit_code"
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
            # Run query duplication check after file modifications
            if [[ -n "$modified_files_str" ]]; then
                echo "🔍 Checking for query duplications..."
                run_query_duplication_check "$modified_files_str"
            else
                echo "ℹ️ No query files modified - skipping duplication check"
                return 0
            fi
            ;;
            
        "manual")
            # Manual trigger for testing
            echo "🔍 Manual query duplication check requested..."
            run_query_duplication_check "$modified_files_str"
            ;;
            
        "status")
            # Status check
            if should_skip_checking; then
                echo "❌ Query duplication checking is disabled or not applicable"
            else
                echo "✅ Query duplication checking is enabled"
                
                # Show detected query directories
                local query_dirs=("queries" "sql" "database" "db" "models")
                for dir in "${query_dirs[@]}"; do
                    if [[ -d "$PROJECT_ROOT/$dir" ]]; then
                        echo "  📁 Query directory: $dir"
                    fi
                done
                
                # Show query file count
                local query_count=$(find "$PROJECT_ROOT" -name "*query*" -o -name "*sql*" -o -name "*.sql" | wc -l)
                echo "  📊 Estimated query files: $query_count"
                
                # Check Claude Code availability
                if check_claude_availability; then
                    echo "  🤖 Claude Code reviewer: Available"
                else
                    echo "  ⚠️ Claude Code reviewer: Not available"
                fi
            fi
            ;;
            
        "config")
            # Show configuration
            local config_file="$PROJECT_ROOT/.claude/query-duplication-config.json"
            if [[ -f "$config_file" ]]; then
                echo "📋 Query Duplication Configuration:"
                cat "$config_file"
            else
                echo "📋 Using default configuration (no custom config file found)"
                echo "Create $config_file to customize settings"
            fi
            ;;
            
        *)
            echo "Usage: $0 {post-edit|post-write|post-multiedit|manual|status|config} [files...]"
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
        echo "🚨 Error: Python3 is required for query duplication checking"
        exit 1
    fi
    
    # Validate Python script exists
    if [[ ! -f "$PYTHON_HOOK" ]]; then
        log_event "ERROR" "Python hook script not found: $PYTHON_HOOK"
        echo "🚨 Error: Query duplication detector script not found"
        exit 1
    fi
    
    # Handle the hook trigger
    handle_hook_trigger "$trigger_type" "$@"
}

# Execute main function
main "$@"