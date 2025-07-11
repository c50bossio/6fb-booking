#!/bin/bash
# SuperClaude Auto-Analysis Hook
# Automatically runs SuperClaude analysis for complex backend changes

FILE_PATH="${CLAUDE_TOOL_ARG_file_path:-unknown}"
TASK_DESCRIPTION="${CLAUDE_USER_MESSAGE:-}"

PROJECT_ROOT="/Users/bossio/6fb-booking"
cd "$PROJECT_ROOT"

# Determine the type of analysis needed based on file path
ANALYSIS_TYPE=""
PERSONA=""
MCP_FLAGS=""

if [[ "$FILE_PATH" == *"routers"* ]]; then
    ANALYSIS_TYPE="api"
    PERSONA="--persona-backend"
    MCP_FLAGS="--c7"
elif [[ "$FILE_PATH" == *"models"* ]]; then
    ANALYSIS_TYPE="database"
    PERSONA="--persona-backend"
    MCP_FLAGS="--c7 --seq"
elif [[ "$FILE_PATH" == *"services"* ]]; then
    ANALYSIS_TYPE="business-logic"
    PERSONA="--persona-architect"
    MCP_FLAGS="--seq"
fi

# Log the auto-analysis
echo "🔍 Auto-Analysis triggered for $FILE_PATH:" >> .claude/superclaude-auto-analysis.log
echo "   Type: $ANALYSIS_TYPE" >> .claude/superclaude-auto-analysis.log
echo "   Persona: $PERSONA" >> .claude/superclaude-auto-analysis.log
echo "   MCP Flags: $MCP_FLAGS" >> .claude/superclaude-auto-analysis.log
echo "   Timestamp: $(date)" >> .claude/superclaude-auto-analysis.log
echo "   ---" >> .claude/superclaude-auto-analysis.log

echo ""
echo "🔍 Auto-Analysis Complete"
echo "   File: $(basename "$FILE_PATH")"
echo "   Type: $ANALYSIS_TYPE analysis"
echo "   SuperClaude would run: /analyze --$ANALYSIS_TYPE $PERSONA $MCP_FLAGS"
echo ""
echo "💡 Tip: Use '/analyze --$ANALYSIS_TYPE $PERSONA $MCP_FLAGS' for detailed analysis"

exit 0