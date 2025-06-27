#!/bin/bash
"""
Stop 6FB Booking Platform Monitoring System
This script stops all monitoring components
"""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping 6FB Booking Platform Monitoring System${NC}"
echo "=================================================================="

# Function to stop a process by script name
stop_process() {
    local process_name="$1"
    local friendly_name="$2"

    echo -e "${YELLOW}🔧 Stopping $friendly_name...${NC}"

    # Find and kill processes
    pids=$(pgrep -f "$process_name")

    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -TERM
        sleep 2

        # Force kill if still running
        remaining_pids=$(pgrep -f "$process_name")
        if [ -n "$remaining_pids" ]; then
            echo "$remaining_pids" | xargs kill -KILL
            sleep 1
        fi

        # Check if stopped
        if ! pgrep -f "$process_name" > /dev/null; then
            echo -e "${GREEN}✅ $friendly_name stopped successfully${NC}"
        else
            echo -e "${RED}❌ Failed to stop $friendly_name${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $friendly_name was not running${NC}"
    fi
}

# Stop monitoring components
stop_process "serve_dashboard.py" "Dashboard Server"
stop_process "comprehensive_health_monitor.py" "Health Monitor"
stop_process "api_endpoint_validator.py" "API Validator"
stop_process "bundle_size_monitor.py" "Bundle Monitor"

# Clean up any remaining monitoring processes
echo -e "\n${YELLOW}🧹 Cleaning up remaining monitoring processes...${NC}"
pkill -f "monitoring"

echo -e "\n${GREEN}✅ Monitoring system stopped successfully${NC}"
echo "=================================================================="
