#!/bin/bash
# SuperClaude Security Analysis Hook
# Auto-triggers security analysis for sensitive files

FILE_PATH="${CLAUDE_TOOL_ARG_file_path:-unknown}"
TASK_DESCRIPTION="${CLAUDE_USER_MESSAGE:-}"

PROJECT_ROOT="/Users/bossio/6fb-booking"
cd "$PROJECT_ROOT"

# Determine security analysis type
SECURITY_TYPE=""
if [[ "$FILE_PATH" == *"auth"* ]]; then
    SECURITY_TYPE="authentication"
elif [[ "$FILE_PATH" == *"payment"* ]] || [[ "$FILE_PATH" == *"stripe"* ]]; then
    SECURITY_TYPE="payment-security"
elif [[ "$FILE_PATH" == *"security"* ]]; then
    SECURITY_TYPE="general-security"
else
    SECURITY_TYPE="security"
fi

# Log the security analysis
echo "🛡️ Security Analysis triggered for $FILE_PATH:" >> .claude/superclaude-security.log
echo "   Type: $SECURITY_TYPE" >> .claude/superclaude-security.log
echo "   Task: $TASK_DESCRIPTION" >> .claude/superclaude-security.log
echo "   Timestamp: $(date)" >> .claude/superclaude-security.log
echo "   ---" >> .claude/superclaude-security.log

echo ""
echo "🛡️ Security Analysis Alert"
echo "   File: $(basename "$FILE_PATH")"
echo "   Analysis: $SECURITY_TYPE"
echo ""
echo "🚨 Security Recommendations:"
echo "   • Run: /scan --security --persona-security --c7"
echo "   • Review: /review --security --persona-security"
echo "   • Test: /test --security --persona-security"
echo ""
echo "💡 SuperClaude detected sensitive file modifications."
echo "   Consider running security analysis before deployment."

exit 0