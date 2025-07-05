#!/bin/bash

# BookedBarber V2 - Feature Existence Verification Script
# This script MUST be run before implementing any new feature
# It prevents code duplication by checking if features already exist

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="${BOOKEDBARBER_PROJECT_ROOT:-/Users/bossio/6fb-booking}"
BACKEND_DIR="$PROJECT_ROOT/backend-v2"
FRONTEND_DIR="$PROJECT_ROOT/backend-v2/frontend-v2"

# Function to log messages
log() {
    local level=$1
    shift
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*"
}

# Function to search for feature implementations
search_feature() {
    local feature_name=$1
    local search_term=$(echo "$feature_name" | tr '[:upper:]' '[:lower:]' | sed 's/[_-]//g')
    
    log "INFO" "Searching for feature: ${YELLOW}$feature_name${NC}"
    echo
    
    local found_items=0
    
    # Search in models
    echo -e "${BLUE}=== Checking Models ===${NC}"
    if find "$BACKEND_DIR/models" -name "*.py" -type f 2>/dev/null | xargs grep -l -i "$search_term" 2>/dev/null | grep -v __pycache__; then
        ((found_items++))
        echo -e "${YELLOW}Found model definitions related to '$feature_name'${NC}"
    fi
    echo
    
    # Search in services
    echo -e "${BLUE}=== Checking Services ===${NC}"
    if find "$BACKEND_DIR/services" -name "*.py" -type f 2>/dev/null | xargs grep -l -i "$search_term" 2>/dev/null | grep -v __pycache__; then
        ((found_items++))
        echo -e "${YELLOW}Found service implementations related to '$feature_name'${NC}"
    fi
    echo
    
    # Search in API endpoints
    echo -e "${BLUE}=== Checking API Endpoints ===${NC}"
    if find "$BACKEND_DIR/routers" "$BACKEND_DIR/api" -name "*.py" -type f 2>/dev/null | xargs grep -l -i "$search_term" 2>/dev/null | grep -v __pycache__; then
        ((found_items++))
        echo -e "${YELLOW}Found API endpoints related to '$feature_name'${NC}"
    fi
    echo
    
    # Search in frontend components
    echo -e "${BLUE}=== Checking Frontend Components ===${NC}"
    if find "$FRONTEND_DIR/components" "$FRONTEND_DIR/app" -name "*.tsx" -o -name "*.ts" -type f 2>/dev/null | xargs grep -l -i "$search_term" 2>/dev/null; then
        ((found_items++))
        echo -e "${YELLOW}Found frontend components related to '$feature_name'${NC}"
    fi
    echo
    
    # Check feature registry
    echo -e "${BLUE}=== Checking Feature Registry ===${NC}"
    if command -v python3 &> /dev/null; then
        python3 "$BACKEND_DIR/utils/registry_manager.py" check "$feature_name" 2>/dev/null || true
        python3 "$BACKEND_DIR/utils/registry_manager.py" search "$feature_name" 2>/dev/null || true
    fi
    echo
    
    # Search for similar function/class names
    echo -e "${BLUE}=== Checking for Similar Implementations ===${NC}"
    echo "Searching for class/function definitions..."
    
    # Python classes/functions
    find "$BACKEND_DIR" -name "*.py" -type f 2>/dev/null | xargs grep -n -E "(class|def).*$search_term" 2>/dev/null | grep -v __pycache__ | head -10 || true
    
    # TypeScript/React components
    find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.ts" -type f 2>/dev/null | xargs grep -n -E "(function|const|class|interface).*$search_term" 2>/dev/null | head -10 || true
    echo
    
    return $found_items
}

# Function to check for specific feature patterns
check_feature_patterns() {
    local feature_type=$1
    
    case $feature_type in
        "payment"|"commission"|"payout")
            echo -e "${BLUE}=== Payment/Commission Feature Check ===${NC}"
            echo "Existing payment features:"
            ls -la "$BACKEND_DIR/services/"*payment* 2>/dev/null || true
            ls -la "$BACKEND_DIR/services/"*commission* 2>/dev/null || true
            ls -la "$BACKEND_DIR/routers/"*payment* 2>/dev/null || true
            ls -la "$BACKEND_DIR/routers/"*commission* 2>/dev/null || true
            echo
            
            # Check for UnifiedCommissionService
            if [ -f "$BACKEND_DIR/services/unified_commission_service.py" ]; then
                echo -e "${GREEN}✓ UnifiedCommissionService already exists${NC}"
                echo "  This service handles all commission calculations"
            fi
            ;;
            
        "product"|"retail"|"inventory"|"pos")
            echo -e "${BLUE}=== Product/Retail Feature Check ===${NC}"
            echo "Existing retail features:"
            ls -la "$BACKEND_DIR/models/"*product* 2>/dev/null || true
            ls -la "$BACKEND_DIR/routers/"*product* 2>/dev/null || true
            ls -la "$BACKEND_DIR/services/"*inventory* 2>/dev/null || true
            echo
            ;;
            
        "analytics"|"reporting"|"metrics")
            echo -e "${BLUE}=== Analytics Feature Check ===${NC}"
            echo "Existing analytics features:"
            ls -la "$BACKEND_DIR/services/"*analytics* 2>/dev/null || true
            ls -la "$BACKEND_DIR/routers/"*analytics* 2>/dev/null || true
            find "$FRONTEND_DIR/components" -name "*Analytics*" -o -name "*Dashboard*" 2>/dev/null || true
            echo
            ;;
            
        "booking"|"appointment"|"scheduling")
            echo -e "${BLUE}=== Booking Feature Check ===${NC}"
            echo "Existing booking features:"
            ls -la "$BACKEND_DIR/services/"*booking* 2>/dev/null || true
            ls -la "$BACKEND_DIR/services/"*appointment* 2>/dev/null || true
            ls -la "$BACKEND_DIR/routers/"*booking* 2>/dev/null || true
            ls -la "$BACKEND_DIR/routers/"*appointment* 2>/dev/null || true
            echo
            ;;
    esac
}

# Function to suggest enhancement approach
suggest_enhancement() {
    local feature_name=$1
    
    echo -e "${GREEN}=== Enhancement Suggestions ===${NC}"
    echo "Before creating new code, consider:"
    echo "1. Can you extend an existing service with new methods?"
    echo "2. Can you add fields to existing models?"
    echo "3. Can you add new endpoints to existing routers?"
    echo "4. Can you compose existing components?"
    echo
    echo "Remember: ${YELLOW}Enhance > Extend > Create${NC}"
}

# Main execution
main() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Error: Please provide a feature name to verify${NC}"
        echo "Usage: $0 <feature-name> [feature-type]"
        echo "Example: $0 commission payment"
        echo "Example: $0 product-catalog retail"
        exit 1
    fi
    
    local feature_name=$1
    local feature_type=${2:-""}
    
    echo -e "${BLUE}BookedBarber V2 - Feature Existence Verification${NC}"
    echo "================================================"
    echo
    
    # Search for the feature
    if search_feature "$feature_name"; then
        echo -e "${RED}⚠️  WARNING: Found existing implementations!${NC}"
        echo
        
        # Check specific patterns if type provided
        if [ -n "$feature_type" ]; then
            check_feature_patterns "$feature_type"
        fi
        
        # Provide enhancement suggestions
        suggest_enhancement "$feature_name"
        
        echo -e "${RED}STOP: Do not create new implementations without reviewing existing code!${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ No direct implementations found for '$feature_name'${NC}"
        echo
        echo "However, please still check:"
        echo "1. Related features that might overlap"
        echo "2. Base classes/services you can extend"
        echo "3. Existing patterns you should follow"
        
        # Still check patterns if type provided
        if [ -n "$feature_type" ]; then
            check_feature_patterns "$feature_type"
        fi
    fi
    
    echo
    log "INFO" "Verification complete"
}

# Run main
main "$@"