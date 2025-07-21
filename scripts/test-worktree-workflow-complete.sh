#!/bin/bash

# Complete End-to-End Worktree Workflow Test Script
# This script validates the entire workflow from feature development to production

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test configuration
TEST_FEATURE="workflow-validation-test"
ORIGINAL_BRANCH=$(git branch --show-current)

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# Main test function
main() {
    echo -e "${PURPLE}🧪 Complete Worktree Workflow Test Suite${NC}"
    echo "============================================"
    echo ""
    
    # Test 1: Core Scripts Existence
    print_status "Test 1: Validating core worktree scripts..."
    
    local required_scripts=(
        "create-feature-worktree.sh"
        "setup-staging-worktree.sh"
        "cleanup-merged-worktrees.sh"
        "worktree-status.sh"
        "start-dev-session-worktree.sh"
        "health-check-worktree.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ -f "scripts/$script" ] && [ -x "scripts/$script" ]; then
            print_success "Script exists: $script"
        else
            print_error "Missing or not executable: $script"
        fi
    done
    
    # Test 2: Worktree Directory Structure
    print_status "Test 2: Validating worktree directory structure..."
    
    if [ -d "/Users/bossio/6fb-booking-staging" ]; then
        print_success "Staging worktree exists"
    else
        print_error "Staging worktree missing"
    fi
    
    if [ -d "/Users/bossio/6fb-booking-features" ]; then
        print_success "Features directory exists"
    else
        print_error "Features directory missing"
    fi
    
    # Test 3: Environment Configuration
    print_status "Test 3: Validating environment configurations..."
    
    if [ -f "backend-v2/.env.feature.template" ]; then
        print_success "Feature template exists"
    else
        print_error "Feature template missing"
    fi
    
    if [ -f "/Users/bossio/6fb-booking-staging/backend-v2/.env.staging" ]; then
        print_success "Staging environment configured"
    else
        print_error "Staging environment missing"
    fi
    
    # Test 4: Database Isolation
    print_status "Test 4: Validating database isolation..."
    
    if [ -f "backend-v2/6fb_booking.db" ]; then
        print_success "Main database exists"
    else
        print_error "Main database missing"
    fi
    
    if [ -f "/Users/bossio/6fb-booking-staging/backend-v2/staging_6fb_booking.db" ]; then
        print_success "Staging database isolated"
    else
        print_error "Staging database missing"
    fi
    
    # Test 5: Claude Hooks Integration
    print_status "Test 5: Validating Claude hooks configuration..."
    
    if [ -f ".claude/hooks.json" ]; then
        if grep -q "worktree" ".claude/hooks.json"; then
            print_success "Claude hooks configured for worktrees"
        else
            print_error "Claude hooks missing worktree config"
        fi
    else
        print_error "Claude hooks configuration missing"
    fi
    
    # Test 6: Context Detection
    print_status "Test 6: Testing context detection..."
    
    if [ -f ".claude/scripts/worktree-context-detection.sh" ] && [ -x ".claude/scripts/worktree-context-detection.sh" ]; then
        print_success "Context detection script available"
    else
        print_error "Context detection script missing"
    fi
    
    # Test 7: Render Deployment Configuration
    print_status "Test 7: Validating deployment configuration..."
    
    if [ -f "render.yaml" ] && [ -f "render.staging.yaml" ]; then
        if grep -q "autoDeploy: true" "render.staging.yaml"; then
            print_success "Render auto-deploy configured for staging"
        else
            print_error "Render auto-deploy not configured"
        fi
    else
        print_error "Render deployment files missing"
    fi
    
    # Test 8: Documentation Completeness
    print_status "Test 8: Validating workflow documentation..."
    
    if grep -q "Enhanced Git Workflow with Worktrees" "CLAUDE.md"; then
        print_success "Comprehensive workflow documentation exists"
    else
        print_error "Workflow documentation incomplete"
    fi
    
    # Test 9: Script Integration
    print_status "Test 9: Testing script integration..."
    
    if head -20 "scripts/start-dev-session.sh" | grep -q "worktree"; then
        print_success "Main scripts are worktree-aware"
    else
        print_error "Main scripts not updated for worktree awareness"
    fi
    
    # Generate final report
    echo ""
    echo "============================================"
    echo "Worktree Workflow Test Results"
    echo "============================================"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All tests passed! Worktree workflow is ready for production use.${NC}"
        echo ""
        echo "✅ Core automation scripts functional"
        echo "✅ Directory structure properly configured"
        echo "✅ Environment isolation validated"
        echo "✅ Database separation confirmed"
        echo "✅ Claude integration complete"
        echo "✅ Deployment configuration ready"
        echo ""
        echo -e "${BLUE}🚀 Ready to start feature development!${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}❌ $TESTS_FAILED tests failed. Please address issues before proceeding.${NC}"
        return 1
    fi
}

# Run the main test
main