#!/bin/bash
# SuperClaude UI Review Hook
# Auto-triggers UI review for frontend changes

FILE_PATH="${CLAUDE_TOOL_ARG_file_path:-unknown}"
TASK_DESCRIPTION="${CLAUDE_USER_MESSAGE:-}"

PROJECT_ROOT="/Users/bossio/6fb-booking"
cd "$PROJECT_ROOT"

# Determine UI analysis type
UI_TYPE=""
if [[ "$FILE_PATH" == *"components"* ]]; then
    UI_TYPE="component"
elif [[ "$FILE_PATH" == *"app"* ]] && [[ "$FILE_PATH" == *"page.tsx" ]]; then
    UI_TYPE="page"
elif [[ "$FILE_PATH" == *"layout.tsx" ]]; then
    UI_TYPE="layout"
else
    UI_TYPE="ui"
fi

# Log the UI review
echo "🎨 UI Review triggered for $FILE_PATH:" >> .claude/superclaude-ui-review.log
echo "   Type: $UI_TYPE" >> .claude/superclaude-ui-review.log
echo "   Task: $TASK_DESCRIPTION" >> .claude/superclaude-ui-review.log
echo "   Timestamp: $(date)" >> .claude/superclaude-ui-review.log
echo "   ---" >> .claude/superclaude-ui-review.log

echo ""
echo "🎨 UI Review Recommendations"
echo "   File: $(basename "$FILE_PATH")"
echo "   Type: $UI_TYPE analysis"
echo ""
echo "🚀 Suggested SuperClaude Commands:"
echo "   • Design: /design --ui --persona-frontend --magic"
echo "   • Review: /review --$UI_TYPE --persona-frontend"
echo "   • Test: /test --ui --persona-frontend --pup"
echo ""
echo "💡 UI Best Practices:"
echo "   • Check accessibility compliance"
echo "   • Verify responsive design"
echo "   • Test component reusability"
echo "   • Validate design system adherence"

exit 0