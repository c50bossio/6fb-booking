#!/bin/bash
# Test that new components compile without errors

set -e

FILE_PATH="$1"
echo "🧪 Testing compilation for: $FILE_PATH"

# Quick TypeScript check
npx tsc --noEmit --skipLibCheck "$FILE_PATH" 2>/dev/null || {
    echo "❌ TypeScript compilation failed for $FILE_PATH"
    echo "🚨 SERVER CRASH PREVENTION: Fix TypeScript errors before proceeding"
    exit 1
}

echo "✅ TypeScript compilation passed"

# Check for React-specific issues
if [[ $FILE_PATH == *.tsx ]]; then
    # Check for common React issues
    if grep -q "export default.*function.*(" "$FILE_PATH"; then
        echo "✅ React component structure looks good"
    else
        echo "⚠️  Warning: No default export function found - may not be a valid React component"
    fi
fi

echo "✅ Component compilation test passed"