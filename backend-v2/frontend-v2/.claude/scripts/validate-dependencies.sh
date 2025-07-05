#!/bin/bash
# Validate that all imports in a file exist to prevent server crashes

set -e

FILE_PATH="$1"
echo "🔍 Validating dependencies in: $FILE_PATH"

# Extract imports from the file
IMPORTS=$(grep -E "^import.*from ['\"]@?/.*['\"]" "$FILE_PATH" 2>/dev/null | sed -E "s/.*from ['\"](.+)['\"].*/\1/" || true)

MISSING_DEPS=()
FRONTEND_ROOT="/Users/bossio/6fb-booking/backend-v2/frontend-v2"

for import in $IMPORTS; do
    # Convert @/ to relative path
    if [[ $import == @/* ]]; then
        import_path="${FRONTEND_ROOT}/${import#@/}"
    else
        # Handle relative imports
        dir=$(dirname "$FILE_PATH")
        import_path="$dir/$import"
    fi
    
    # Check for file with various extensions
    found=false
    for ext in "" ".ts" ".tsx" ".js" ".jsx" ".css"; do
        if [[ -f "${import_path}${ext}" ]]; then
            found=true
            break
        fi
        # Check for index files
        if [[ -f "${import_path}/index${ext}" ]]; then
            found=true
            break
        fi
    done
    
    if [[ $found == false ]]; then
        MISSING_DEPS+=("$import")
    fi
done

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
    echo "❌ Missing dependencies found:"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    echo ""
    echo "🚨 SERVER CRASH PREVENTION: Please create these files before proceeding:"
    for dep in "${MISSING_DEPS[@]}"; do
        if [[ $dep == @/* ]]; then
            echo "  touch ${FRONTEND_ROOT}/${dep#@/}.ts"
        fi
    done
    exit 1
else
    echo "✅ All dependencies exist"
fi