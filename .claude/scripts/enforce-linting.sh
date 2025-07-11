#!/bin/bash
#
# Linting Enforcement Script
# Prevents disabling of linting in build/test commands
# Part of the BookedBarber V2 Claude Code Hooks System
#

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extract the command that was attempted
COMMAND="$1"

echo -e "${RED}🚫 LINTING ENFORCEMENT VIOLATION${NC}"
echo ""
echo -e "${YELLOW}Attempted command:${NC} $COMMAND"
echo ""
echo -e "${RED}❌ This command attempts to disable linting, which is forbidden.${NC}"
echo ""

# Provide specific guidance based on the command type
if [[ "$COMMAND" =~ "next build --no-lint" ]]; then
    echo -e "${BLUE}✅ Use instead:${NC}"
    echo "   npx next build"
    echo ""
    echo -e "${BLUE}💡 For debugging TypeScript issues only:${NC}"
    echo "   npx tsc --noEmit"
    
elif [[ "$COMMAND" =~ "npm run build.*--.*lint" ]]; then
    echo -e "${BLUE}✅ Use instead:${NC}"
    echo "   npm run build"
    echo ""
    echo -e "${BLUE}💡 For auto-fixing lint issues:${NC}"
    echo "   npm run lint:fix"
    
elif [[ "$COMMAND" =~ "ESLINT=false" ]]; then
    echo -e "${BLUE}✅ Use instead:${NC}"
    echo "   npm run build    # (without disabling ESLint)"
    echo ""
    echo -e "${BLUE}💡 For targeted fixes:${NC}"
    echo "   npx eslint --fix src/specific-file.ts"
    
else
    echo -e "${BLUE}✅ Use proper debugging approaches:${NC}"
    echo "   npx next build           # Full build with linting"
    echo "   npx tsc --noEmit        # TypeScript-only check"
    echo "   npm run lint:fix        # Auto-fix linting issues"
fi

echo ""
echo -e "${YELLOW}📚 Why linting cannot be disabled:${NC}"
echo "   • Catches bugs before they reach production"
echo "   • Enforces security and accessibility standards"
echo "   • Maintains code consistency across the team"
echo "   • Prevents runtime errors and performance issues"

echo ""
echo -e "${YELLOW}🆘 For emergency situations only:${NC}"
echo "   1. Document the emergency in your commit message"
echo "   2. Use targeted disabling: // eslint-disable-next-line rule-name"
echo "   3. Create a tracking issue for re-enabling linting"
echo "   4. Set CLAUDE_BYPASS_HOOKS=true (emergency only)"

echo ""
echo -e "${RED}This command has been blocked to maintain code quality.${NC}"

# Exit with failure to block the command
exit 1