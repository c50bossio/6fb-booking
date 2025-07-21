#!/bin/bash

# Worktree-Aware Test Runner for Claude Hooks
# This script runs appropriate tests based on the current worktree context

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Source worktree context detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/worktree-context-detection.sh" > /dev/null 2>&1

# Function to run worktree-appropriate tests
run_worktree_tests() {
    if [ "$WORKTREE_CONTEXT_DETECTED" != "true" ]; then
        echo -e "${YELLOW}[TEST]${NC} Not in worktree context - using standard test runner"
        exec "$SCRIPT_DIR/../hooks/smart-test-runner.sh" "$@"
        return $?
    fi
    
    echo -e "${BLUE}[TEST]${NC} Running tests for $WORKTREE_TYPE worktree ($WORKTREE_NAME)"
    
    case $WORKTREE_TYPE in
        "feature")
            echo -e "${BLUE}[TEST]${NC} Feature worktree - running focused unit tests"
            cd backend-v2
            
            # Run unit tests with appropriate environment
            if [ -f "venv/bin/activate" ]; then
                source venv/bin/activate
            fi
            
            ENV_FILE="$ENV_FILE" python -m pytest tests/ -m 'unit' -v --tb=short --maxfail=3 || {
                echo -e "${RED}[TEST]${NC} Backend unit tests failed"
                return 1
            }
            
            # Run frontend tests
            cd frontend-v2
            npm test -- --watchAll=false --passWithNoTests --silent || {
                echo -e "${RED}[TEST]${NC} Frontend tests failed"
                return 1
            }
            
            echo -e "${GREEN}[TEST]${NC} Feature worktree tests completed successfully"
            ;;
            
        "staging")
            echo -e "${YELLOW}[TEST]${NC} Staging worktree - running integration tests"
            cd backend-v2
            
            # Run integration tests with staging environment
            if [ -f "venv/bin/activate" ]; then
                source venv/bin/activate
            fi
            
            ENV_FILE="$ENV_FILE" python -m pytest tests/ -m 'integration' -v --tb=short --maxfail=5 || {
                echo -e "${RED}[TEST]${NC} Backend integration tests failed"
                return 1
            }
            
            # Run frontend tests
            cd frontend-v2
            npm test -- --watchAll=false --passWithNoTests || {
                echo -e "${RED}[TEST]${NC} Frontend tests failed"
                return 1
            }
            
            echo -e "${GREEN}[TEST]${NC} Staging worktree tests completed successfully"
            ;;
            
        "main")
            echo -e "${GREEN}[TEST]${NC} Main worktree - running comprehensive tests"
            # Delegate to the existing smart test runner
            exec "$SCRIPT_DIR/../hooks/smart-test-runner.sh" "$@"
            ;;
            
        *)
            echo -e "${RED}[TEST]${NC} Unknown worktree type: $WORKTREE_TYPE"
            return 1
            ;;
    esac
    
    return 0
}

# Function to check if tests should be skipped based on file changes
should_skip_tests() {
    local changed_file="$1"
    
    # Skip tests for certain file types
    case "$changed_file" in
        *.md|*.txt|*.yml|*.yaml)
            echo -e "${YELLOW}[TEST]${NC} Skipping tests for documentation/config file: $changed_file"
            return 0
            ;;
        */migrations/*)
            echo -e "${YELLOW}[TEST]${NC} Skipping tests for migration file: $changed_file"
            return 0
            ;;
        */test-results*/*)
            echo -e "${YELLOW}[TEST]${NC} Skipping tests for test results: $changed_file"
            return 0
            ;;
    esac
    
    return 1
}

# Function to determine test scope based on changed files
determine_test_scope() {
    local changed_files=("$@")
    local backend_changed=false
    local frontend_changed=false
    local critical_changed=false
    
    for file in "${changed_files[@]}"; do
        if should_skip_tests "$file"; then
            continue
        fi
        
        case "$file" in
            */backend-v2/*)
                backend_changed=true
                
                # Check for critical backend files
                case "$file" in
                    */models/*|*/routers/*|*/services/*)
                        critical_changed=true
                        ;;
                esac
                ;;
            */frontend-v2/*)
                frontend_changed=true
                
                # Check for critical frontend files
                case "$file" in
                    */app/*|*/components/*)
                        critical_changed=true
                        ;;
                esac
                ;;
        esac
    done
    
    # Export scope variables for use by test runner
    export BACKEND_TESTS_NEEDED="$backend_changed"
    export FRONTEND_TESTS_NEEDED="$frontend_changed"
    export CRITICAL_TESTS_NEEDED="$critical_changed"
    
    echo -e "${BLUE}[TEST]${NC} Test scope: Backend=$backend_changed, Frontend=$frontend_changed, Critical=$critical_changed"
}

# Main execution
main() {
    echo -e "${BLUE}[TEST]${NC} Worktree-aware test runner starting..."
    
    # Determine test scope if files are provided
    if [ $# -gt 0 ]; then
        determine_test_scope "$@"
    fi
    
    # Run appropriate tests for worktree
    if run_worktree_tests "$@"; then
        echo -e "${GREEN}[TEST]${NC} All tests completed successfully"
        exit 0
    else
        echo -e "${RED}[TEST]${NC} Tests failed"
        exit 1
    fi
}

# Handle direct execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi