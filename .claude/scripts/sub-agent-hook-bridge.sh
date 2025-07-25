#!/bin/bash

# Sub-Agent Hook Bridge
# Bridges existing Claude hooks with sub-agent automation system
# Monitors hook outputs and triggers sub-agents based on results

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="/Users/bossio/6fb-booking/.claude/sub-agent-bridge.log"
AUTOMATION_CONFIG="/Users/bossio/6fb-booking/.claude/sub-agent-automation.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[BRIDGE]${NC} $1" | tee -a "$LOG_FILE"
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

# Check if sub-agent automation is enabled
is_automation_enabled() {
    if [ -f "$AUTOMATION_CONFIG" ]; then
        python3 -c "
import json
with open('$AUTOMATION_CONFIG', 'r') as f:
    config = json.load(f)
print('true' if config.get('enabled', False) else 'false')
" 2>/dev/null || echo "false"
    else
        echo "false"
    fi
}

# Trigger sub-agent based on hook results
trigger_sub_agent() {
    local hook_name="$1"
    local hook_result="$2"
    local hook_output="$3"
    local affected_files="$4"
    
    # Only trigger if automation is enabled
    if [ "$(is_automation_enabled)" != "true" ]; then
        log "Sub-agent automation disabled, skipping trigger"
        return 0
    fi
    
    log "Analyzing hook result for sub-agent triggers: $hook_name"
    
    # Determine which sub-agent to trigger based on hook name and result
    case "$hook_name" in
        "frontend_page_verification"|"analytics_page_verification")
            if [ "$hook_result" -ne 0 ]; then
                trigger_debugger_agent "frontend_verification_failed" "Hook $hook_name failed: $hook_output" "$affected_files"
            fi
            ;;
        "api_endpoint_verification")
            if [ "$hook_result" -ne 0 ]; then
                trigger_debugger_agent "api_verification_failed" "API verification failed: $hook_output" "$affected_files"
            fi
            ;;
        "test_runner")
            if [ "$hook_result" -ne 0 ]; then
                trigger_debugger_agent "test_failures" "Tests failed: $hook_output" "$affected_files"
            fi
            ;;
        "security_scan_before_edit"|"compliance_check")
            if [ "$hook_result" -ne 0 ]; then
                trigger_code_reviewer_agent "security_issues" "Security scan failed: $hook_output" "$affected_files"
            fi
            ;;
        "performance_check")
            if [ "$hook_result" -ne 0 ]; then
                trigger_data_scientist_agent "performance_issues" "Performance check failed: $hook_output" "$affected_files"
            fi
            ;;
        "integration_health_check")
            if [ "$hook_result" -ne 0 ]; then
                trigger_general_purpose_agent "integration_issues" "Integration health check failed: $hook_output" "$affected_files"
            fi
            ;;
        *)
            log "No sub-agent trigger configured for hook: $hook_name"
            ;;
    esac
}

# Trigger debugger agent
trigger_debugger_agent() {
    local trigger_name="$1"
    local error_details="$2"
    local affected_files="$3"
    
    log "Triggering debugger agent for: $trigger_name"
    
    # Create trigger file for automation system to pick up
    local trigger_file="/tmp/sub-agent-trigger-debugger-$(date +%s).json"
    cat > "$trigger_file" << EOF
{
    "trigger_name": "$trigger_name",
    "agent_type": "debugger",
    "error_details": "$error_details",
    "affected_files": "$affected_files",
    "timestamp": "$(date -Iseconds)",
    "priority": "high",
    "auto_execute": true,
    "source": "hook_bridge"
}
EOF
    
    # Signal the automation system
    python3 "$SCRIPT_DIR/sub-agent-automation.py" --trigger-file "$trigger_file" &
    
    success "Debugger agent triggered for: $trigger_name"
}

# Trigger code reviewer agent
trigger_code_reviewer_agent() {
    local trigger_name="$1"
    local error_details="$2"
    local affected_files="$3"
    
    log "Triggering code reviewer agent for: $trigger_name"
    
    local trigger_file="/tmp/sub-agent-trigger-code-reviewer-$(date +%s).json"
    cat > "$trigger_file" << EOF
{
    "trigger_name": "$trigger_name",
    "agent_type": "code-reviewer",
    "error_details": "$error_details",
    "affected_files": "$affected_files",
    "timestamp": "$(date -Iseconds)",
    "priority": "high",
    "auto_execute": true,
    "source": "hook_bridge"
}
EOF
    
    python3 "$SCRIPT_DIR/sub-agent-automation.py" --trigger-file "$trigger_file" &
    
    success "Code reviewer agent triggered for: $trigger_name"
}

# Trigger data scientist agent
trigger_data_scientist_agent() {
    local trigger_name="$1"
    local error_details="$2"
    local affected_files="$3"
    
    log "Triggering data scientist agent for: $trigger_name"
    
    local trigger_file="/tmp/sub-agent-trigger-data-scientist-$(date +%s).json"
    cat > "$trigger_file" << EOF
{
    "trigger_name": "$trigger_name",
    "agent_type": "data-scientist",
    "error_details": "$error_details",
    "affected_files": "$affected_files",
    "timestamp": "$(date -Iseconds)",
    "priority": "medium",
    "auto_execute": true,
    "source": "hook_bridge"
}
EOF
    
    python3 "$SCRIPT_DIR/sub-agent-automation.py" --trigger-file "$trigger_file" &
    
    success "Data scientist agent triggered for: $trigger_name"
}

# Trigger general purpose agent
trigger_general_purpose_agent() {
    local trigger_name="$1"
    local error_details="$2"
    local affected_files="$3"
    
    log "Triggering general purpose agent for: $trigger_name"
    
    local trigger_file="/tmp/sub-agent-trigger-general-purpose-$(date +%s).json"
    cat > "$trigger_file" << EOF
{
    "trigger_name": "$trigger_name",
    "agent_type": "general-purpose",
    "error_details": "$error_details",
    "affected_files": "$affected_files",
    "timestamp": "$(date -Iseconds)",
    "priority": "medium",
    "auto_execute": false,
    "source": "hook_bridge"
}
EOF
    
    python3 "$SCRIPT_DIR/sub-agent-automation.py" --trigger-file "$trigger_file" &
    
    success "General purpose agent triggered for: $trigger_name"
}

# Monitor hook execution and trigger agents
monitor_hook_execution() {
    local hook_name="$1"
    local hook_command="$2"
    local affected_files="$3"
    
    log "Monitoring hook execution: $hook_name"
    
    # Execute the original hook command and capture output
    local temp_output=$(mktemp)
    local hook_result=0
    
    if ! eval "$hook_command" > "$temp_output" 2>&1; then
        hook_result=$?
    fi
    
    local hook_output=$(cat "$temp_output")
    rm -f "$temp_output"
    
    # Analyze hook result and trigger sub-agents if needed
    trigger_sub_agent "$hook_name" "$hook_result" "$hook_output" "$affected_files"
    
    return $hook_result
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --hook-name)
                HOOK_NAME="$2"
                shift 2
                ;;
            --hook-command)
                HOOK_COMMAND="$2"
                shift 2
                ;;
            --affected-files)
                AFFECTED_FILES="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 --hook-name NAME --hook-command COMMAND [--affected-files FILES]"
                echo "Monitor hook execution and trigger sub-agents based on results"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    log "Sub-agent hook bridge starting at $(date)"
    
    if [ -z "$HOOK_NAME" ] || [ -z "$HOOK_COMMAND" ]; then
        error "Hook name and command are required"
        echo "Usage: $0 --hook-name NAME --hook-command COMMAND [--affected-files FILES]"
        exit 1
    fi
    
    # Monitor hook execution and trigger sub-agents
    if monitor_hook_execution "$HOOK_NAME" "$HOOK_COMMAND" "${AFFECTED_FILES:-}"; then
        success "Hook execution completed successfully"
        exit 0
    else
        error "Hook execution failed - sub-agents may have been triggered"
        exit 1
    fi
}

# Parse arguments and run
parse_args "$@"
main