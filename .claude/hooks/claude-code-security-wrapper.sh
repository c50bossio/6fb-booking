#!/bin/bash

# Claude Code Security Wrapper
# Integrates security hook with Claude Code operations
# Created: $(date '+%Y-%m-%d %H:%M:%S')

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_HOOK="$SCRIPT_DIR/security-env-blocker.sh"
LOG_FILE="$SCRIPT_DIR/../logs/claude-security-wrapper.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log_wrapper_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Hook into Claude Code file operations
hook_file_read() {
    local file_path="$1"
    
    log_wrapper_event "INFO" "Intercepting file read: $file_path"
    
    # Run security check
    if "$SECURITY_HOOK" intercept-read "$file_path" 2>&1; then
        log_wrapper_event "ALLOW" "File read permitted: $file_path"
        return 0
    else
        log_wrapper_event "BLOCK" "File read blocked: $file_path"
        echo "🚨 SECURITY BLOCK: Access to sensitive file blocked"
        echo "File: $file_path"
        echo "Reason: Contains sensitive information (API keys, secrets, credentials)"
        echo ""
        echo "If you need to reference environment variables:"
        echo "- Use variable names without values (e.g., STRIPE_SECRET_KEY=...)"
        echo "- Refer to .env.template files instead"
        echo "- Use generic examples instead of real values"
        return 1
    fi
}

# Hook into Claude Code response generation
hook_response_validation() {
    local response_content="$1"
    
    log_wrapper_event "INFO" "Validating Claude Code response content"
    
    # Create temporary file for validation
    local temp_file=$(mktemp)
    echo "$response_content" > "$temp_file"
    
    if "$SECURITY_HOOK" validate-response "$temp_file" 2>&1; then
        log_wrapper_event "ALLOW" "Response validation passed"
        rm "$temp_file"
        return 0
    else
        log_wrapper_event "BLOCK" "Response validation failed - contains sensitive data"
        rm "$temp_file"
        return 1
    fi
}

# Hook into content analysis
hook_content_check() {
    local content="$1"
    
    log_wrapper_event "INFO" "Checking content for sensitive information"
    
    if "$SECURITY_HOOK" check-content "$content" 2>&1; then
        log_wrapper_event "ALLOW" "Content check passed"
        return 0
    else
        log_wrapper_event "BLOCK" "Content check failed - sensitive information detected"
        echo "🚨 SECURITY ALERT: Sensitive information detected in content"
        echo ""
        echo "The content you're trying to share contains:"
        echo "- API keys, tokens, or secrets"
        echo "- Database credentials"
        echo "- Environment variable values"
        echo "- Other sensitive configuration data"
        echo ""
        echo "Please sanitize the content before sharing."
        return 1
    fi
}

# Initialize security scan
initialize_security() {
    log_wrapper_event "INFO" "Initializing Claude Code security protection"
    
    # Run initial security scan
    "$SECURITY_HOOK" scan
    
    echo "🔒 Claude Code Security Protection Active"
    echo ""
    echo "The following protections are now enabled:"
    echo "✅ Environment file access blocking"
    echo "✅ API key exposure prevention"
    echo "✅ Response content validation"
    echo "✅ Sensitive data detection"
    echo ""
    echo "Logs are available at: $LOG_FILE"
    echo "Security alerts: $SCRIPT_DIR/../logs/security-alerts.log"
}

# Main execution
main() {
    local action="${1:-initialize}"
    shift || true
    
    case "$action" in
        "initialize")
            initialize_security
            ;;
        "check-file")
            hook_file_read "$1"
            ;;
        "check-response")
            hook_response_validation "$*"
            ;;
        "check-content")
            hook_content_check "$*"
            ;;
        *)
            echo "Usage: $0 {initialize|check-file|check-response|check-content} [args...]"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"