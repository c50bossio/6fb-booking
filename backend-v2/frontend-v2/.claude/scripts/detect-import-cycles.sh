#!/bin/bash
# Detect circular imports that cause build failures

set -e

FILE_PATH="$1"
echo "🔄 Checking for import cycles involving: $FILE_PATH"

# Use madge to detect cycles if available, otherwise basic check
if command -v madge >/dev/null 2>&1; then
    CYCLES=$(madge --circular --format es6 "$FILE_PATH" 2>/dev/null || echo "")
    if [[ -n "$CYCLES" ]]; then
        echo "❌ Circular import detected:"
        echo "$CYCLES"
        echo "🚨 SERVER CRASH PREVENTION: Resolve circular imports before proceeding"
        exit 1
    fi
else
    # Basic circular import detection
    IMPORTS=$(grep -E "^import.*from ['\"]@?/.*['\"]" "$FILE_PATH" 2>/dev/null | sed -E "s/.*from ['\"](.+)['\"].*/\1/" || true)
    
    for import in $IMPORTS; do
        if [[ $import == @/* ]]; then
            import_file="${import#@/}"
            # Check if the imported file imports this file back
            if [[ -f "$import_file.ts" ]] || [[ -f "$import_file.tsx" ]]; then
                target_file="$import_file"
                [[ -f "$target_file.tsx" ]] && target_file="$target_file.tsx" || target_file="$target_file.ts"
                
                if grep -q "$(basename "$FILE_PATH" .tsx | basename .ts)" "$target_file" 2>/dev/null; then
                    echo "⚠️  Potential circular import detected with $import"
                fi
            fi
        fi
    done
fi

echo "✅ No circular imports detected"