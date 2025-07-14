#!/bin/bash

# Context7 Documentation Suggestions Hook
# Provides intelligent documentation suggestions based on file being edited

set -e

HOOK_NAME="context7_documentation_suggestions"
LOG_FILE="/Users/bossio/6fb-booking/.claude/hooks.log"
SUGGESTIONS_FILE="/tmp/context7-suggestions.txt"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$HOOK_NAME] $1" >> "$LOG_FILE"
}

# Function to suggest documentation based on file type and content
suggest_documentation() {
    local file_path="$1"
    local file_name=$(basename "$file_path")
    local file_extension="${file_name##*.}"
    
    echo -e "${BLUE}📚 Context7 Documentation Suggestions for: $file_name${NC}" > "$SUGGESTIONS_FILE"
    echo "" >> "$SUGGESTIONS_FILE"
    
    # Frontend React/TypeScript files
    if [[ "$file_extension" == "tsx" || "$file_extension" == "ts" ]]; then
        echo -e "${GREEN}🔧 Frontend Development Suggestions:${NC}" >> "$SUGGESTIONS_FILE"
        
        # Check for specific patterns and suggest relevant docs
        if grep -q "useState\|useEffect\|useContext" "$file_path" 2>/dev/null; then
            echo "• React Hooks: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'hooks' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "Router\|useRouter\|navigation" "$file_path" 2>/dev/null; then
            echo "• Next.js Routing: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/nextjs', topic: 'app router' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "form\|input\|validation" "$file_path" 2>/dev/null; then
            echo "• Form Handling: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'forms' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "auth\|login\|token" "$file_path" 2>/dev/null; then
            echo "• Authentication: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/nextjs', topic: 'authentication' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "api\|fetch\|axios" "$file_path" 2>/dev/null; then
            echo "• API Integration: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/nextjs', topic: 'data fetching' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "calendar\|date\|appointment" "$file_path" 2>/dev/null; then
            echo "• Date/Calendar: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'date handling' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "payment\|stripe" "$file_path" 2>/dev/null; then
            echo "• Stripe Integration: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/stripe/stripe', topic: 'payment intents' })" >> "$SUGGESTIONS_FILE"
        fi
        
        # Component-specific suggestions
        if [[ "$file_name" =~ [Cc]alendar ]]; then
            echo "• Calendar Components: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'calendar components' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if [[ "$file_name" =~ [Bb]utton ]]; then
            echo "• Button Patterns: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'button components' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if [[ "$file_name" =~ [Mm]odal ]]; then
            echo "• Modal Patterns: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'modal dialogs' })" >> "$SUGGESTIONS_FILE"
        fi
        
    # Backend Python files
    elif [[ "$file_extension" == "py" ]]; then
        echo -e "${GREEN}⚙️ Backend Development Suggestions:${NC}" >> "$SUGGESTIONS_FILE"
        
        if grep -q "FastAPI\|router\|endpoint" "$file_path" 2>/dev/null; then
            echo "• FastAPI Routing: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'routing' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "Depends\|dependency" "$file_path" 2>/dev/null; then
            echo "• Dependency Injection: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'dependency injection' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "SQLAlchemy\|relationship\|model" "$file_path" 2>/dev/null; then
            echo "• SQLAlchemy Models: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/sqlalchemy/sqlalchemy', topic: 'relationships' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "auth\|jwt\|token" "$file_path" 2>/dev/null; then
            echo "• Authentication: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'security' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "stripe\|payment" "$file_path" 2>/dev/null; then
            echo "• Stripe API: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/stripe/stripe', topic: 'payment processing' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "async\|await" "$file_path" 2>/dev/null; then
            echo "• Async Programming: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'async' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "pydantic\|BaseModel" "$file_path" 2>/dev/null; then
            echo "• Pydantic Models: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/pydantic/pydantic', topic: 'models' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if grep -q "websocket\|WebSocket" "$file_path" 2>/dev/null; then
            echo "• WebSockets: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'websockets' })" >> "$SUGGESTIONS_FILE"
        fi
        
        # Service-specific suggestions
        if [[ "$file_name" =~ [Ss]ervice ]]; then
            echo "• Service Patterns: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'dependency injection' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if [[ "$file_name" =~ [Rr]outer ]]; then
            echo "• Router Patterns: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'routing' })" >> "$SUGGESTIONS_FILE"
        fi
        
        if [[ "$file_name" =~ [Mm]odel ]]; then
            echo "• Model Patterns: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/sqlalchemy/sqlalchemy', topic: 'declarative' })" >> "$SUGGESTIONS_FILE"
        fi
    fi
    
    # General suggestions for all files
    echo "" >> "$SUGGESTIONS_FILE"
    echo -e "${YELLOW}💡 Quick Context7 Commands:${NC}" >> "$SUGGESTIONS_FILE"
    echo "• Search libraries: mcp__context7__resolve-library-id({ libraryName: 'library-name' })" >> "$SUGGESTIONS_FILE"
    echo "• Get docs: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/org/project', topic: 'specific-topic' })" >> "$SUGGESTIONS_FILE"
    echo "" >> "$SUGGESTIONS_FILE"
    echo -e "${BLUE}🔗 Combined with Browser Logs:${NC}" >> "$SUGGESTIONS_FILE"
    echo "• Test changes: mcp__puppeteer__puppeteer_navigate + mcp__puppeteer__puppeteer_evaluate" >> "$SUGGESTIONS_FILE"
    echo "• Debug console: Watch for JavaScript errors during development" >> "$SUGGESTIONS_FILE"
    echo "• Monitor network: Track API calls and responses" >> "$SUGGESTIONS_FILE"
}

# Main execution
main() {
    local file_path="$1"
    
    if [[ -z "$file_path" ]]; then
        log "ERROR: No file path provided"
        exit 1
    fi
    
    log "Generating Context7 suggestions for: $file_path"
    
    # Check if file exists
    if [[ ! -f "$file_path" ]]; then
        log "WARNING: File does not exist: $file_path"
        echo -e "${YELLOW}📚 Context7 suggestions: File not found, but here are general docs:${NC}"
        echo "• React: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/context7/react_dev', topic: 'hooks' })"
        echo "• FastAPI: mcp__context7__get-library-docs({ context7CompatibleLibraryID: '/tiangolo/fastapi', topic: 'routing' })"
        exit 0
    fi
    
    # Generate suggestions
    suggest_documentation "$file_path"
    
    # Display suggestions (only if file has content)
    if [[ -s "$SUGGESTIONS_FILE" ]]; then
        cat "$SUGGESTIONS_FILE"
        log "Context7 suggestions generated successfully"
    else
        echo -e "${BLUE}📚 No specific Context7 suggestions for this file type${NC}"
        log "No specific suggestions generated"
    fi
    
    # Clean up
    rm -f "$SUGGESTIONS_FILE"
}

# Execute main function with all arguments
main "$@"