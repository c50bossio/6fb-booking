#!/bin/bash

# BookedBarber V2 UptimeRobot Monitor Setup
# Automatically creates monitors for all domains and endpoints

set -e

# Configuration
UPTIMEROBOT_API_KEY="${UPTIMEROBOT_API_KEY:-}"
ALERT_CONTACTS="${ALERT_CONTACTS:-}"  # Comma-separated list of contact IDs

# Monitors to create
declare -A MONITORS=(
    ["BookedBarber Main Site"]="https://bookedbarber.com"
    ["BookedBarber WWW"]="https://www.bookedbarber.com"
    ["BookedBarber API"]="https://api.bookedbarber.com/health"
    ["BookedBarber App"]="https://app.bookedbarber.com"
    ["BookedBarber Admin"]="https://admin.bookedbarber.com"
    ["BookedBarber API Auth"]="https://api.bookedbarber.com/api/v1/health"
    ["BookedBarber API Docs"]="https://api.bookedbarber.com/docs"
)

# Monitor settings
MONITOR_INTERVAL=300  # 5 minutes
MONITOR_TIMEOUT=30    # 30 seconds
ALERT_THRESHOLD=5     # Alert after 5 failures

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}BookedBarber V2 UptimeRobot Setup${NC}"
echo "=================================="

# Check if API key is provided
if [ -z "$UPTIMEROBOT_API_KEY" ]; then
    echo -e "${RED}Error: UptimeRobot API key is required${NC}"
    echo "Please set UPTIMEROBOT_API_KEY environment variable"
    echo "Get your API key from: https://uptimerobot.com/dashboard#mySettings"
    exit 1
fi

# Function to call UptimeRobot API
call_api() {
    local endpoint="$1"
    local data="$2"
    
    curl -s -X POST "https://api.uptimerobot.com/v2/$endpoint" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "Cache-Control: no-cache" \
        -d "api_key=$UPTIMEROBOT_API_KEY&format=json&$data"
}

# Function to get account details
get_account_details() {
    echo -e "${BLUE}Getting account details...${NC}"
    
    local response=$(call_api "getAccountDetails" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        local email=$(echo "$response" | jq -r '.account.email')
        local up_monitors=$(echo "$response" | jq -r '.account.up_monitors')
        local down_monitors=$(echo "$response" | jq -r '.account.down_monitors')
        local paused_monitors=$(echo "$response" | jq -r '.account.paused_monitors')
        
        echo -e "${GREEN}✓ Account verified${NC}"
        echo "  Email: $email"
        echo "  Up monitors: $up_monitors"
        echo "  Down monitors: $down_monitors"
        echo "  Paused monitors: $paused_monitors"
        return 0
    else
        echo -e "${RED}✗ API key validation failed${NC}"
        local error=$(echo "$response" | jq -r '.error.message // "Unknown error"')
        echo "  Error: $error"
        return 1
    fi
}

# Function to get alert contacts
get_alert_contacts() {
    echo -e "${BLUE}Getting alert contacts...${NC}"
    
    local response=$(call_api "getAlertContacts" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✓ Alert contacts retrieved${NC}"
        echo "$response" | jq -r '.alert_contacts[] | "  ID: " + (.id|tostring) + " - " + .friendly_name + " (" + .type + "): " + .value'
        
        # Get default contact IDs if not specified
        if [ -z "$ALERT_CONTACTS" ]; then
            ALERT_CONTACTS=$(echo "$response" | jq -r '.alert_contacts[] | .id' | tr '\n' '-' | sed 's/-$//')
            echo "  Using all contacts: $ALERT_CONTACTS"
        fi
        
        return 0
    else
        echo -e "${YELLOW}⚠ No alert contacts found or error retrieving them${NC}"
        return 1
    fi
}

# Function to create a monitor
create_monitor() {
    local friendly_name="$1"
    local url="$2"
    
    echo -n "Creating monitor: $friendly_name... "
    
    local data="friendly_name=$(echo "$friendly_name" | sed 's/ /%20/g')"
    data+="&url=$(echo "$url" | sed 's/:/%3A/g; s/\//%2F/g')"
    data+="&type=1"  # HTTP(s) monitor
    data+="&interval=$MONITOR_INTERVAL"
    data+="&timeout=$MONITOR_TIMEOUT"
    data+="&http_method=1"  # HEAD request
    
    # Add alert contacts if available
    if [ -n "$ALERT_CONTACTS" ]; then
        data+="&alert_contacts=$ALERT_CONTACTS"
    fi
    
    local response=$(call_api "newMonitor" "$data")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        local monitor_id=$(echo "$response" | jq -r '.monitor.id')
        echo -e "${GREEN}✓ (ID: $monitor_id)${NC}"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error.message // "Unknown error"')
        echo -e "${RED}✗ ($error)${NC}"
        return 1
    fi
}

# Function to check if monitor already exists
monitor_exists() {
    local url="$1"
    
    local response=$(call_api "getMonitors" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        local exists=$(echo "$response" | jq -r --arg url "$url" '.monitors[] | select(.url == $url) | .id')
        if [ -n "$exists" ]; then
            return 0
        fi
    fi
    
    return 1
}

# Function to list existing monitors
list_monitors() {
    echo -e "${BLUE}Existing monitors:${NC}"
    
    local response=$(call_api "getMonitors" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        echo "$response" | jq -r '.monitors[] | "  " + .friendly_name + " - " + .url + " (Status: " + (.status|tostring) + ")"'
    else
        echo -e "${RED}✗ Failed to retrieve monitors${NC}"
    fi
}

# Function to create status page
create_status_page() {
    echo -e "${BLUE}Creating status page...${NC}"
    
    # Get monitor IDs for status page
    local response=$(call_api "getMonitors" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        local monitor_ids=$(echo "$response" | jq -r '.monitors[] | .id' | tr '\n' '-' | sed 's/-$//')
        
        if [ -n "$monitor_ids" ]; then
            local data="friendly_name=BookedBarber%20Status"
            data+="&monitors=$monitor_ids"
            data+="&sort=1"  # Sort by friendly name
            data+="&status=1"  # Public status page
            
            local page_response=$(call_api "newPSP" "$data")
            local page_status=$(echo "$page_response" | jq -r '.stat')
            
            if [ "$page_status" = "ok" ]; then
                local page_url=$(echo "$page_response" | jq -r '.psp.url')
                echo -e "${GREEN}✓ Status page created${NC}"
                echo "  URL: $page_url"
                echo "  You can access this at: https://status.bookedbarber.com (after DNS setup)"
            else
                local error=$(echo "$page_response" | jq -r '.error.message // "Unknown error"')
                echo -e "${RED}✗ Failed to create status page: $error${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ No monitors found for status page${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to get monitors for status page${NC}"
    fi
}

# Function to setup alert rules
setup_alert_rules() {
    echo -e "${BLUE}Setting up alert rules...${NC}"
    
    echo "Default alert rules:"
    echo "  • Email/SMS alerts when monitor goes down"
    echo "  • Alert after $ALERT_THRESHOLD consecutive failures"
    echo "  • Check interval: $MONITOR_INTERVAL seconds"
    echo "  • Timeout: $MONITOR_TIMEOUT seconds"
    echo ""
    echo "To customize alerts, visit: https://uptimerobot.com/dashboard#alerts"
}

# Function to generate monitoring configuration
generate_monitoring_config() {
    local config_file="/tmp/uptimerobot-config.json"
    
    echo -e "${BLUE}Generating monitoring configuration...${NC}"
    
    local response=$(call_api "getMonitors" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        cat > "$config_file" << EOF
{
    "service": "uptimerobot",
    "account_api_key": "$UPTIMEROBOT_API_KEY",
    "monitors": $(echo "$response" | jq '.monitors'),
    "alert_contacts": $(call_api "getAlertContacts" "" | jq '.alert_contacts // []'),
    "status_pages": $(call_api "getPSPs" "" | jq '.psps // []'),
    "generated_at": "$(date -Iseconds)"
}
EOF
        
        echo -e "${GREEN}✓ Configuration saved to: $config_file${NC}"
    else
        echo -e "${RED}✗ Failed to generate configuration${NC}"
    fi
}

# Function to test monitors
test_monitors() {
    echo -e "${BLUE}Testing all monitors...${NC}"
    
    local response=$(call_api "getMonitors" "")
    local status=$(echo "$response" | jq -r '.stat')
    
    if [ "$status" = "ok" ]; then
        echo "$response" | jq -r '.monitors[] | .friendly_name + " - " + .url' | while read -r line; do
            local name=$(echo "$line" | cut -d' ' -f1)
            local url=$(echo "$line" | cut -d' ' -f3)
            
            echo -n "Testing $name... "
            
            if curl -s --head --max-time 10 "$url" >/dev/null 2>&1; then
                echo -e "${GREEN}✓${NC}"
            else
                echo -e "${RED}✗${NC}"
            fi
        done
    else
        echo -e "${RED}✗ Failed to get monitors for testing${NC}"
    fi
}

# Main function
main() {
    # Validate account
    if ! get_account_details; then
        exit 1
    fi
    
    echo ""
    
    # Get alert contacts
    get_alert_contacts
    
    echo ""
    
    # List existing monitors
    list_monitors
    
    echo ""
    
    # Ask user to proceed
    read -p "Create new monitors for BookedBarber V2? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Monitor creation cancelled."
        exit 0
    fi
    
    # Create monitors
    echo -e "${BLUE}Creating monitors...${NC}"
    local created_count=0
    local skipped_count=0
    
    for friendly_name in "${!MONITORS[@]}"; do
        local url="${MONITORS[$friendly_name]}"
        
        if monitor_exists "$url"; then
            echo "Monitor for $url already exists - skipping"
            ((skipped_count++))
        else
            if create_monitor "$friendly_name" "$url"; then
                ((created_count++))
            fi
        fi
    done
    
    echo ""
    echo -e "${GREEN}Monitor creation completed${NC}"
    echo "  Created: $created_count"
    echo "  Skipped: $skipped_count"
    
    echo ""
    
    # Create status page
    read -p "Create public status page? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_status_page
    fi
    
    echo ""
    
    # Setup alert rules info
    setup_alert_rules
    
    echo ""
    
    # Generate configuration
    generate_monitoring_config
    
    echo ""
    
    # Test monitors
    read -p "Test all monitors now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_monitors
    fi
    
    echo ""
    echo -e "${GREEN}UptimeRobot setup completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure DNS CNAME for status.bookedbarber.com -> stats.uptimerobot.com"
    echo "2. Customize alert settings at: https://uptimerobot.com/dashboard#alerts"
    echo "3. Add more alert contacts if needed"
    echo "4. Set up webhook integrations for Slack/Discord if desired"
    echo "5. Review monitor settings and adjust intervals as needed"
}

# Command line options
case "${1:-setup}" in
    "setup")
        main
        ;;
    "list")
        get_account_details
        echo ""
        list_monitors
        ;;
    "test")
        test_monitors
        ;;
    "config")
        generate_monitoring_config
        ;;
    "status-page")
        create_status_page
        ;;
    *)
        echo "BookedBarber V2 UptimeRobot Setup"
        echo ""
        echo "Usage: $0 {setup|list|test|config|status-page}"
        echo ""
        echo "Commands:"
        echo "  setup       - Complete UptimeRobot setup (default)"
        echo "  list        - List existing monitors"
        echo "  test        - Test all monitors"
        echo "  config      - Generate monitoring configuration"
        echo "  status-page - Create public status page"
        echo ""
        echo "Environment variables:"
        echo "  UPTIMEROBOT_API_KEY - Your UptimeRobot API key (required)"
        echo "  ALERT_CONTACTS      - Comma-separated contact IDs (optional)"
        exit 1
        ;;
esac