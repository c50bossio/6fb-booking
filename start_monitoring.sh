#!/bin/bash
"""
Start 6FB Booking Platform Monitoring System
This script starts all monitoring components for the platform
"""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/Users/bossio/6fb-booking"
MONITORING_DIR="$BASE_DIR/monitoring"
SCRIPTS_DIR="$MONITORING_DIR/scripts"
DASHBOARD_DIR="$MONITORING_DIR/dashboard"
LOGS_DIR="$BASE_DIR/logs"

echo -e "${BLUE}🚀 Starting 6FB Booking Platform Monitoring System${NC}"
echo "=================================================================="

# Create necessary directories
echo -e "${YELLOW}📁 Creating monitoring directories...${NC}"
mkdir -p "$MONITORING_DIR/metrics"
mkdir -p "$MONITORING_DIR/alerts"
mkdir -p "$LOGS_DIR"

# Function to check if a process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to start a monitoring component
start_component() {
    local name="$1"
    local script="$2"
    local log_file="$3"

    echo -e "${YELLOW}🔧 Starting $name...${NC}"

    if check_process "$script"; then
        echo -e "${GREEN}✅ $name is already running${NC}"
    else
        cd "$SCRIPTS_DIR"
        nohup python3 "$script" > "$log_file" 2>&1 &
        sleep 2

        if check_process "$script"; then
            echo -e "${GREEN}✅ $name started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start $name${NC}"
        fi
    fi
}

# Start monitoring components
echo -e "\n${BLUE}🔍 Starting monitoring components...${NC}"

# 1. Start Alert Manager (initialize database and rules)
echo -e "${YELLOW}🚨 Initializing Alert Manager...${NC}"
cd "$SCRIPTS_DIR"
python3 -c "
from alert_manager import initialize_alert_manager
manager = initialize_alert_manager()
print('Alert Manager initialized successfully')
"

# 2. Start Dashboard Server
echo -e "${YELLOW}📊 Starting Monitoring Dashboard...${NC}"
if check_process "serve_dashboard.py"; then
    echo -e "${GREEN}✅ Dashboard server is already running${NC}"
else
    cd "$DASHBOARD_DIR"
    nohup python3 serve_dashboard.py --port 8080 > "$LOGS_DIR/dashboard.log" 2>&1 &
    sleep 3

    if check_process "serve_dashboard.py"; then
        echo -e "${GREEN}✅ Dashboard server started on http://localhost:8080${NC}"
    else
        echo -e "${RED}❌ Failed to start dashboard server${NC}"
    fi
fi

# 3. Start Comprehensive Health Monitor (runs continuously)
start_component "Health Monitor" "comprehensive_health_monitor.py" "$LOGS_DIR/health_monitor.log"

# 4. Check system status
echo -e "\n${BLUE}📋 System Status Check${NC}"
echo "=================================================================="

# Run a quick validation
echo -e "${YELLOW}🧪 Running system validation...${NC}"
cd "$SCRIPTS_DIR"
if python3 test_monitoring_system.py > "$LOGS_DIR/validation.log" 2>&1; then
    echo -e "${GREEN}✅ Monitoring system validation passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some validation tests failed (check logs for details)${NC}"
fi

# Show running processes
echo -e "\n${BLUE}🔍 Active Monitoring Processes:${NC}"
echo "=================================================================="

if check_process "serve_dashboard.py"; then
    echo -e "${GREEN}✅ Dashboard Server (Port 8080)${NC}"
else
    echo -e "${RED}❌ Dashboard Server${NC}"
fi

if check_process "comprehensive_health_monitor.py"; then
    echo -e "${GREEN}✅ Health Monitor${NC}"
else
    echo -e "${RED}❌ Health Monitor${NC}"
fi

# Show useful commands
echo -e "\n${BLUE}📖 Useful Commands:${NC}"
echo "=================================================================="
echo "View Dashboard:           http://localhost:8080"
echo "Check Health Status:      python3 $SCRIPTS_DIR/comprehensive_health_monitor.py"
echo "Validate APIs:            python3 $SCRIPTS_DIR/api_endpoint_validator.py"
echo "Check Bundle Sizes:       python3 $SCRIPTS_DIR/bundle_size_monitor.py"
echo "Run Tests:                python3 $SCRIPTS_DIR/test_monitoring_system.py"
echo ""
echo "Log Files:"
echo "- Dashboard:              $LOGS_DIR/dashboard.log"
echo "- Health Monitor:         $LOGS_DIR/health_monitor.log"
echo "- Validation:             $LOGS_DIR/validation.log"
echo "- General Monitoring:     $LOGS_DIR/monitoring.log"

# Final status
echo -e "\n${BLUE}🎯 Monitoring System Status:${NC}"
echo "=================================================================="

active_components=0
total_components=2

if check_process "serve_dashboard.py"; then
    ((active_components++))
fi

if check_process "comprehensive_health_monitor.py"; then
    ((active_components++))
fi

if [ $active_components -eq $total_components ]; then
    echo -e "${GREEN}✅ All monitoring components are running ($active_components/$total_components)${NC}"
    echo -e "${GREEN}🚀 Monitoring system is fully operational!${NC}"
    echo -e "${BLUE}📊 Access the dashboard at: http://localhost:8080${NC}"
else
    echo -e "${YELLOW}⚠️  Some components may not be running ($active_components/$total_components)${NC}"
    echo -e "${YELLOW}Check the logs for more details.${NC}"
fi

echo ""
echo -e "${BLUE}To stop monitoring system: ./stop_monitoring.sh${NC}"
echo "=================================================================="
