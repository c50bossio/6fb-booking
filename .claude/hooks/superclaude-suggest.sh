#!/bin/bash
# SuperClaude Command Suggestion Hook
# Suggests optimal SuperClaude commands based on context

# Get the file being modified from environment variables
FILE_PATH="${CLAUDE_TOOL_ARG_file_path:-unknown}"
TASK_DESCRIPTION="${CLAUDE_USER_MESSAGE:-}"

# Extract project root
PROJECT_ROOT="/Users/bossio/6fb-booking"
cd "$PROJECT_ROOT"

# Run the smart routing system to get command suggestion
SUGGESTION=$(python .claude/superclaude-auto.py "$TASK_DESCRIPTION" "$FILE_PATH" 2>/dev/null)

# Log the suggestion
echo "📋 SuperClaude Command Suggestion for $FILE_PATH:" >> .claude/superclaude-suggestions.log
echo "   Task: $TASK_DESCRIPTION" >> .claude/superclaude-suggestions.log
echo "   Suggested: $SUGGESTION" >> .claude/superclaude-suggestions.log
echo "   Timestamp: $(date)" >> .claude/superclaude-suggestions.log
echo "   ---" >> .claude/superclaude-suggestions.log

# Only show suggestion if not empty
if [ -n "$SUGGESTION" ] && [ "$SUGGESTION" != "/analyze --code --persona-architect" ]; then
    echo ""
    echo "🚀 SuperClaude Suggestion:"
    echo "   $SUGGESTION"
    echo ""
    echo "💡 This command was auto-selected based on file patterns and context."
    echo "   Use '/analyze --help' to see all available SuperClaude commands."
fi

exit 0