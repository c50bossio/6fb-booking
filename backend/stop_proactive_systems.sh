#!/bin/bash

echo "🛑 Stopping Proactive Systems..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Stop services using PID files
if [ -f /tmp/auto_fixer.pid ]; then
    PID=$(cat /tmp/auto_fixer.pid)
    kill $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Auto-Fixer${NC}"
    rm /tmp/auto_fixer.pid
fi

if [ -f /tmp/proactive_monitor.pid ]; then
    PID=$(cat /tmp/proactive_monitor.pid)
    kill $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Proactive Monitor${NC}"
    rm /tmp/proactive_monitor.pid
fi

if [ -f /tmp/performance_optimizer.pid ]; then
    PID=$(cat /tmp/performance_optimizer.pid)
    kill $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Performance Optimizer${NC}"
    rm /tmp/performance_optimizer.pid
fi

# Also kill by port if PID files missing
pkill -f "enhanced_auto_fixer.py" 2>/dev/null
pkill -f "proactive_monitor.py" 2>/dev/null
pkill -f "performance_optimizer.py" 2>/dev/null

# Clean up state file
rm -f /tmp/proactive_systems_state.json

echo -e "\n${GREEN}All proactive systems stopped.${NC}"
