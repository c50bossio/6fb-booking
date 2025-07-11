#!/bin/bash
# Essential frontend verification after file changes
# Simplified from SuperClaude V2 system

echo "🔍 Verifying frontend changes..."

# Check if we're in the project root
if [ ! -f "backend-v2/frontend-v2/package.json" ]; then
    echo "ℹ️  Not in 6FB project root, skipping verification"
    exit 0
fi

# Quick syntax check for TypeScript files
if command -v npx >/dev/null 2>&1; then
    cd backend-v2/frontend-v2
    echo "📝 Checking TypeScript syntax..."
    npx tsc --noEmit --skipLibCheck 2>/dev/null && echo "✅ TypeScript syntax OK" || echo "⚠️  TypeScript syntax issues detected"
    cd - >/dev/null
else
    echo "ℹ️  TypeScript not available, skipping syntax check"
fi

echo "✅ Frontend verification complete"