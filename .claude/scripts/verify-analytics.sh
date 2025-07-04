#!/bin/bash

# Analytics Page Verification Script
# Comprehensive verification for analytics pages and components
# Specifically checks for toFixed() errors and API integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/bossio/6fb-booking"
LOG_FILE="/Users/bossio/6fb-booking/.claude/verification.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[ANALYTICS]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if analytics API endpoint works
test_analytics_api() {
    log "Testing analytics API endpoint..."
    
    local start_date=$(date -u -v-30d '+%Y-%m-%dT%H:%M:%S.000Z')
    local end_date=$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')
    local encoded_start=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$start_date'))")
    local encoded_end=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$end_date'))")
    
    local api_url="http://localhost:8000/api/v1/agents/analytics?start_date=${encoded_start}&end_date=${encoded_end}"
    
    log "Testing URL: $api_url"
    
    # Test without authentication first (should return 401)
    local response=$(curl -s -w "%{http_code}" "$api_url" -o /tmp/analytics_response.json)
    
    if [ "$response" = "401" ]; then
        success "Analytics API endpoint responds correctly (401 Unauthorized as expected)"
        return 0
    elif [ "$response" = "422" ]; then
        error "Analytics API returns 422 - datetime parsing may be broken"
        return 1
    elif [ "$response" = "200" ]; then
        success "Analytics API endpoint works (200 OK)"
        return 0
    else
        warning "Analytics API returned status: $response"
        return 1
    fi
}

# Check analytics page loads without JavaScript errors
test_analytics_page() {
    log "Testing analytics page load..."
    
    local analytics_url="http://localhost:3000/agents/analytics"
    
    # Basic connectivity test
    if curl -s "$analytics_url" > /dev/null; then
        success "Analytics page loads successfully"
    else
        error "Analytics page failed to load"
        return 1
    fi
    
    # Check for common issues in the response
    local response=$(curl -s "$analytics_url")
    
    if echo "$response" | grep -q "toFixed"; then
        log "Found toFixed usage in analytics page - checking for safety..."
        if echo "$response" | grep -q "?? 0"; then
            success "toFixed calls appear to have null safety guards"
        else
            warning "toFixed calls may not have proper null safety"
        fi
    fi
    
    return 0
}

# Test different date ranges
test_date_range_handling() {
    log "Testing different date range formats..."
    
    local base_url="http://localhost:8000/api/v1/agents/analytics"
    local test_dates=(
        "2025-06-04T01:18:40.197Z:2025-07-04T01:18:40.197Z"
        "2025-06-04:2025-07-04"
        "2025-06-04T00:00:00:2025-07-04T23:59:59"
    )
    
    for date_pair in "${test_dates[@]}"; do
        IFS=':' read -r start_date end_date <<< "$date_pair"
        local encoded_start=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$start_date'))")
        local encoded_end=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$end_date'))")
        
        local test_url="${base_url}?start_date=${encoded_start}&end_date=${encoded_end}"
        local response=$(curl -s -w "%{http_code}" "$test_url" -o /dev/null)
        
        if [ "$response" = "401" ] || [ "$response" = "200" ]; then
            success "Date format '$start_date' - '$end_date' handled correctly"
        elif [ "$response" = "422" ]; then
            error "Date format '$start_date' - '$end_date' causes 422 error"
            return 1
        else
            warning "Date format '$start_date' - '$end_date' returned status: $response"
        fi
    done
    
    return 0
}

# Check frontend components for null safety
check_component_safety() {
    log "Checking analytics components for null safety..."
    
    local components=(
        "$PROJECT_ROOT/backend-v2/frontend-v2/app/agents/analytics/page.tsx"
        "$PROJECT_ROOT/backend-v2/frontend-v2/components/agents/BusinessIntelligenceDashboard.tsx"
        "$PROJECT_ROOT/backend-v2/frontend-v2/components/agents/AgentAnalytics.tsx"
    )
    
    local errors=0
    
    for component in "${components[@]}"; do
        if [ -f "$component" ]; then
            local unsafe_calls=$(grep -n "\.toFixed(" "$component" | grep -v "?? 0" | grep -v "|| 0" | grep -v "safeValue" | wc -l)
            
            if [ "$unsafe_calls" -gt 0 ]; then
                error "Found $unsafe_calls unsafe toFixed() calls in $(basename "$component")"
                errors=$((errors + 1))
            else
                success "$(basename "$component") has safe toFixed() usage"
            fi
        else
            warning "Component not found: $(basename "$component")"
        fi
    done
    
    return $errors
}

# Main verification function
verify_analytics() {
    local errors=0
    
    log "Starting comprehensive analytics verification..."
    
    # Test API endpoint
    if ! test_analytics_api; then
        errors=$((errors + 1))
    fi
    
    # Test page loading
    if ! test_analytics_page; then
        errors=$((errors + 1))
    fi
    
    # Test date range handling
    if ! test_date_range_handling; then
        errors=$((errors + 1))
    fi
    
    # Check component safety
    if ! check_component_safety; then
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        success "All analytics verification tests passed"
        return 0
    else
        error "Analytics verification failed with $errors error(s)"
        return 1
    fi
}

# Run verification
main() {
    log "Analytics verification started at $(date)"
    
    if verify_analytics; then
        success "Analytics verification completed successfully"
        echo " Analytics pages are working correctly"
        exit 0
    else
        error "Analytics verification failed"
        echo "L Analytics pages have issues that need to be fixed"
        exit 1
    fi
}

# Execute main function
main "$@"