#!/bin/bash

echo "🛡️ Starting Proactive Error Prevention Systems..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "/Users/bossio/6fb-booking/backend/.env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Load environment
source /Users/bossio/6fb-booking/backend/.env

# Function to check if port is in use
check_port() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null
}

# Start services
echo -e "\n${YELLOW}Starting all proactive systems...${NC}\n"

# 1. Enhanced Auto-Fixer (Port 8003)
if check_port 8003; then
    echo -e "${YELLOW}⚠️  Auto-Fixer already running on port 8003${NC}"
else
    echo -e "${GREEN}✅ Starting Enhanced Auto-Fixer...${NC}"
    cd /Users/bossio/6fb-booking/backend
    python3 enhanced_auto_fixer.py > /tmp/auto_fixer.log 2>&1 &
    echo $! > /tmp/auto_fixer.pid
    sleep 2
fi

# 2. Proactive Monitor (Port 8004)
if check_port 8004; then
    echo -e "${YELLOW}⚠️  Proactive Monitor already running on port 8004${NC}"
else
    echo -e "${GREEN}✅ Starting Proactive Monitor...${NC}"
    python3 proactive_monitor.py > /tmp/proactive_monitor.log 2>&1 &
    echo $! > /tmp/proactive_monitor.pid
    sleep 2
fi

# 3. Performance Optimizer (Port 8005)
if check_port 8005; then
    echo -e "${YELLOW}⚠️  Performance Optimizer already running on port 8005${NC}"
else
    echo -e "${GREEN}✅ Starting Performance Optimizer...${NC}"
    python3 performance_optimizer.py > /tmp/performance_optimizer.log 2>&1 &
    echo $! > /tmp/performance_optimizer.pid
    sleep 2
fi

# 4. Start scheduled tasks
echo -e "${GREEN}✅ Setting up scheduled tasks...${NC}"

# Create cron jobs for periodic tasks
(crontab -l 2>/dev/null; echo "*/5 * * * * cd /Users/bossio/6fb-booking/backend && python3 -c 'from proactive_monitor import monitor; import asyncio; asyncio.run(monitor.check_system_health())'") | crontab -
(crontab -l 2>/dev/null; echo "0 9 * * 1 cd /Users/bossio/6fb-booking/backend && python3 auto_fixer_reporter.py") | crontab -

# Display status
echo -e "\n${GREEN}=== Proactive Systems Status ===${NC}\n"

echo "🤖 Enhanced Auto-Fixer:"
echo "   - URL: http://localhost:8003"
echo "   - Docs: http://localhost:8003/docs"
echo "   - Features: Pattern learning, notifications, auto-rollback"

echo -e "\n🛡️ Proactive Monitor:"
echo "   - URL: http://localhost:8004"
echo "   - Health: http://localhost:8004/health"
echo "   - Predictions: http://localhost:8004/predictions"
echo "   - Features: Health monitoring, issue prediction, auto-scaling"

echo -e "\n⚡ Performance Optimizer:"
echo "   - URL: http://localhost:8005"
echo "   - Analyze: http://localhost:8005/performance/analyze"
echo "   - Features: Query optimization, caching, memory management"

# Check ngrok for webhooks
if pgrep -f ngrok > /dev/null; then
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data['tunnels'][0]['public_url'])
except:
    print('')
")

    if [ ! -z "$NGROK_URL" ]; then
        echo -e "\n🌐 Webhook URL: ${GREEN}$NGROK_URL/sentry/webhook${NC}"
    fi
fi

# Display monitoring dashboard
echo -e "\n${GREEN}=== Monitoring Dashboards ===${NC}\n"
echo "📊 Auto-Fixer Dashboard: file:///Users/bossio/6fb-booking/backend/auto_fixer_dashboard.html"
echo "📈 System Metrics: http://localhost:8004/metrics/history"
echo "🔍 Performance Report: http://localhost:8005/performance/report"

# Health check
echo -e "\n${YELLOW}Running initial health check...${NC}"
sleep 3

# Check Auto-Fixer
if curl -s http://localhost:8003/status > /dev/null; then
    echo -e "${GREEN}✅ Auto-Fixer: Healthy${NC}"
else
    echo -e "${RED}❌ Auto-Fixer: Not responding${NC}"
fi

# Check Proactive Monitor
if curl -s http://localhost:8004/health > /dev/null; then
    HEALTH=$(curl -s http://localhost:8004/health | python3 -c "import json, sys; print(json.load(sys.stdin)['status'])")
    echo -e "${GREEN}✅ Proactive Monitor: $HEALTH${NC}"
else
    echo -e "${RED}❌ Proactive Monitor: Not responding${NC}"
fi

# Check Performance Optimizer
if curl -s http://localhost:8005/performance/report > /dev/null; then
    echo -e "${GREEN}✅ Performance Optimizer: Healthy${NC}"
else
    echo -e "${RED}❌ Performance Optimizer: Not responding${NC}"
fi

# Save state
cat > /tmp/proactive_systems_state.json << EOF
{
    "started_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "services": {
        "auto_fixer": {"port": 8003, "pid_file": "/tmp/auto_fixer.pid"},
        "proactive_monitor": {"port": 8004, "pid_file": "/tmp/proactive_monitor.pid"},
        "performance_optimizer": {"port": 8005, "pid_file": "/tmp/performance_optimizer.pid"}
    }
}
EOF

echo -e "\n${GREEN}✅ All proactive systems started successfully!${NC}"
echo -e "\n${YELLOW}Tips:${NC}"
echo "- View logs: tail -f /tmp/*.log"
echo "- Stop all: ./stop_proactive_systems.sh"
echo "- Check status: ./status_proactive_systems.sh"

# Keep running and monitor
echo -e "\n${YELLOW}Press Ctrl+C to stop all systems...${NC}"

# Trap Ctrl+C
trap 'echo -e "\n${RED}Stopping all systems...${NC}"; ./stop_proactive_systems.sh; exit 0' INT

# Keep script running
while true; do
    sleep 60
    # Periodic health check (silent)
    curl -s http://localhost:8004/health > /dev/null || echo -e "${RED}⚠️  Monitor health check failed${NC}"
done
