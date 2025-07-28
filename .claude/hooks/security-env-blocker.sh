#!/bin/bash

# Security Hook - Environment Variable and API Key Protection
# Prevents Claude Code from sharing sensitive information in chat or responses
# Created: $(date '+%Y-%m-%d %H:%M:%S')

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/../logs/security-env-blocker.log"
ALERT_FILE="$SCRIPT_DIR/../logs/security-alerts.log"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$ALERT_FILE")"

# Logging function
log_security_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    if [[ "$level" == "ALERT" || "$level" == "BLOCK" ]]; then
        echo "[$timestamp] [$level] $message" >> "$ALERT_FILE"
    fi
}

# Environment variable patterns to detect and block
declare -a SENSITIVE_PATTERNS=(
    # API Keys
    "ANTHROPIC_API_KEY"
    "CLAUDE_API_KEY"
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_PUBLISHABLE_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "TWILIO_AUTH_TOKEN"
    "TWILIO_ACCOUNT_SID"
    "SENDGRID_API_KEY"
    "GOOGLE_CALENDAR_CLIENT_SECRET"
    "GOOGLE_CLIENT_SECRET"
    "GITHUB_TOKEN"
    "RENDER_API_KEY"
    
    # Database credentials
    "DATABASE_URL"
    "POSTGRES_PASSWORD"
    "REDIS_URL"
    "REDIS_PASSWORD"
    
    # JWT and Security tokens
    "JWT_SECRET"
    "JWT_SECRET_KEY"
    "SECRET_KEY"
    "ENCRYPTION_KEY"
    "SESSION_SECRET"
    
    # Generic patterns
    "[A-Za-z0-9_]*_API_KEY"
    "[A-Za-z0-9_]*_SECRET"
    "[A-Za-z0-9_]*_TOKEN"
    "[A-Za-z0-9_]*_PASSWORD"
    "[A-Za-z0-9_]*_PRIVATE_KEY"
    
    # Specific value patterns
    "sk-[a-zA-Z0-9]{20,}"     # Stripe secret keys
    "pk_[a-zA-Z0-9]{20,}"     # Stripe public keys
    "ey[A-Za-z0-9_-]{20,}"    # JWT tokens
    "xoxb-[0-9]{11,}"         # Slack tokens
    "ghp_[a-zA-Z0-9]{36}"     # GitHub personal access tokens
    "AIza[0-9A-Za-z_-]{35}"   # Google API keys
)

# Function to check for sensitive content in text
check_sensitive_content() {
    local content="$1"
    local context="$2"
    local violations=()
    
    # Check each pattern
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if echo "$content" | grep -qE "$pattern"; then
            violations+=("$pattern")
        fi
    done
    
    # Check for .env file content exposure
    if echo "$content" | grep -qE "^[A-Z_]+=" || echo "$content" | grep -qE "export [A-Z_]+="; then
        violations+=("ENV_FILE_CONTENT")
    fi
    
    # Check for actual API key values (common formats)
    if echo "$content" | grep -qE "['\"]?[a-zA-Z0-9_-]{20,}['\"]?" && \
       echo "$content" | grep -qiE "(key|token|secret|password)"; then
        violations+=("POTENTIAL_API_KEY_VALUE")
    fi
    
    if [[ ${#violations[@]} -gt 0 ]]; then
        log_security_event "BLOCK" "Sensitive content detected in $context: ${violations[*]}"
        return 1
    fi
    
    return 0
}

# Function to scan environment files
scan_env_files() {
    local env_files=(
        "$PROJECT_ROOT/.env"
        "$PROJECT_ROOT/.env.local"
        "$PROJECT_ROOT/.env.production"
        "$PROJECT_ROOT/.env.development"
        "$PROJECT_ROOT/backend-v2/.env"
        "$PROJECT_ROOT/backend-v2/frontend-v2/.env.local"
    )
    
    for env_file in "${env_files[@]}"; do
        if [[ -f "$env_file" ]]; then
            log_security_event "INFO" "Protecting environment file: $env_file"
            
            # Check if the file contains actual secrets (not just templates)
            if grep -qE "^[A-Z_]+=.{10,}" "$env_file" 2>/dev/null; then
                log_security_event "ALERT" "Active environment file detected: $env_file - MUST NOT BE SHARED"
                echo "PROTECTED_ENV_FILE:$env_file"
            fi
        fi
    done
}

# Function to create sanitized environment template
create_env_template() {
    local env_file="$1"
    local template_file="${env_file}.template"
    
    if [[ -f "$env_file" && ! -f "$template_file" ]]; then
        log_security_event "INFO" "Creating sanitized template for $env_file"
        
        # Create template with masked values
        sed -E 's/=.*/=<REDACTED>/g' "$env_file" > "$template_file"
        echo "TEMPLATE_CREATED:$template_file"
    fi
}

# Function to validate Claude Code response content
validate_response_content() {
    local response_file="$1"
    
    if [[ ! -f "$response_file" ]]; then
        return 0
    fi
    
    local content=$(cat "$response_file")
    
    if ! check_sensitive_content "$content" "Claude Code Response"; then
        log_security_event "BLOCK" "BLOCKING Claude Code response due to sensitive content exposure"
        
        # Create blocked response
        cat > "$response_file" << 'EOF'
🚨 SECURITY BLOCK: Response contains sensitive information

This response has been blocked by the security hook because it contains:
- API keys, tokens, or secrets
- Environment variable values
- Database credentials
- Other sensitive configuration data

Please:
1. Review your request to avoid exposing sensitive data
2. Use environment variable names without values
3. Refer to .env.template files instead of actual .env files
4. Use generic examples instead of real credentials

Security is paramount. This protection helps prevent accidental exposure
of sensitive information in chat logs or responses.
EOF
        
        return 1
    fi
    
    return 0
}

# Function to intercept and validate file read operations
intercept_file_read() {
    local file_path="$1"
    local basename=$(basename "$file_path")
    
    # Block reading of actual environment files
    if [[ "$basename" =~ ^\.env$ ]] || [[ "$basename" =~ ^\.env\. ]]; then
        log_security_event "BLOCK" "Blocking read access to environment file: $file_path"
        
        # Check if template exists
        local template_file="${file_path}.template"
        if [[ -f "$template_file" ]]; then
            echo "REDIRECT_TO_TEMPLATE:$template_file"
        else
            echo "BLOCKED_ENV_FILE:$file_path"
        fi
        return 1
    fi
    
    # Block reading of files with sensitive content
    if [[ -f "$file_path" ]]; then
        local content=$(head -100 "$file_path" 2>/dev/null || echo "")
        if ! check_sensitive_content "$content" "File Read: $file_path"; then
            log_security_event "BLOCK" "Blocking read access to file with sensitive content: $file_path"
            return 1
        fi
    fi
    
    return 0
}

# Main execution based on hook trigger
main() {
    local hook_type="${1:-scan}"
    local target_file="${2:-}"
    
    log_security_event "INFO" "Security hook triggered: $hook_type $target_file"
    
    case "$hook_type" in
        "scan")
            # Full security scan
            echo "🔒 Running security scan..."
            scan_env_files
            
            # Create templates for existing env files
            for env_file in "$PROJECT_ROOT"/.env*; do
                if [[ -f "$env_file" ]]; then
                    create_env_template "$env_file"
                fi
            done
            ;;
            
        "validate-response")
            # Validate Claude Code response before sending
            if [[ -n "$target_file" ]]; then
                if ! validate_response_content "$target_file"; then
                    exit 1
                fi
            fi
            ;;
            
        "intercept-read")
            # Intercept file read operations
            if [[ -n "$target_file" ]]; then
                if ! intercept_file_read "$target_file"; then
                    exit 1
                fi
            fi
            ;;
            
        "check-content")
            # Check arbitrary content for sensitive information
            local content="$target_file"
            if ! check_sensitive_content "$content" "Content Check"; then
                exit 1
            fi
            ;;
            
        *)
            echo "Usage: $0 {scan|validate-response|intercept-read|check-content} [target]"
            exit 1
            ;;
    esac
    
    log_security_event "INFO" "Security hook completed successfully: $hook_type"
}

# Execute main function
main "$@"