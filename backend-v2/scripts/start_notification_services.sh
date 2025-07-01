#!/bin/bash

# Start notification services for 6FB Booking V2
# This script starts Redis, Celery worker, and Celery beat scheduler

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting 6FB Booking V2 Notification Services...${NC}"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Check if Redis is running
echo -e "${YELLOW}Checking Redis connection...${NC}"
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${RED}Redis is not running! Starting Redis...${NC}"
    if command -v redis-server > /dev/null 2>&1; then
        redis-server --daemonize yes --port 6379
        echo -e "${GREEN}Redis started on port 6379${NC}"
    else
        echo -e "${RED}Redis is not installed. Please install Redis first.${NC}"
        echo "macOS: brew install redis"
        echo "Ubuntu/Debian: sudo apt-get install redis-server"
        exit 1
    fi
else
    echo -e "${GREEN}Redis is running${NC}"
fi

# Create logs directory
mkdir -p logs

# Function to check if a process is running
is_running() {
    pgrep -f "$1" > /dev/null 2>&1
}

# Function to stop existing processes
stop_existing() {
    echo -e "${YELLOW}Stopping existing notification services...${NC}"
    
    # Stop Celery worker
    if is_running "celery.*notification_worker"; then
        pkill -f "celery.*notification_worker" || true
        echo "Stopped Celery worker"
    fi
    
    # Stop Celery beat
    if is_running "celery.*beat"; then
        pkill -f "celery.*beat" || true
        echo "Stopped Celery beat"
    fi
    
    sleep 2
}

# Function to start Celery worker
start_worker() {
    echo -e "${YELLOW}Starting Celery worker...${NC}"
    
    nohup celery -A workers.notification_worker worker \
        --loglevel=info \
        --concurrency=4 \
        --queues=notifications,urgent_notifications,maintenance \
        --logfile=logs/celery_worker.log \
        --pidfile=logs/celery_worker.pid \
        > logs/celery_worker_stdout.log 2>&1 &
    
    sleep 3
    
    if is_running "celery.*notification_worker.*worker"; then
        echo -e "${GREEN}Celery worker started successfully${NC}"
    else
        echo -e "${RED}Failed to start Celery worker${NC}"
        return 1
    fi
}

# Function to start Celery beat scheduler
start_beat() {
    echo -e "${YELLOW}Starting Celery beat scheduler...${NC}"
    
    nohup celery -A workers.notification_worker beat \
        --loglevel=info \
        --logfile=logs/celery_beat.log \
        --pidfile=logs/celery_beat.pid \
        > logs/celery_beat_stdout.log 2>&1 &
    
    sleep 3
    
    if is_running "celery.*notification_worker.*beat"; then
        echo -e "${GREEN}Celery beat scheduler started successfully${NC}"
    else
        echo -e "${RED}Failed to start Celery beat scheduler${NC}"
        return 1
    fi
}

# Function to populate notification templates
populate_templates() {
    echo -e "${YELLOW}Populating notification templates...${NC}"
    
    if python scripts/populate_notification_templates.py; then
        echo -e "${GREEN}Notification templates populated successfully${NC}"
    else
        echo -e "${RED}Failed to populate notification templates${NC}"
        return 1
    fi
}

# Function to show status
show_status() {
    echo -e "\n${BLUE}Service Status:${NC}"
    
    # Redis status
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "Redis: ${GREEN}Running${NC}"
    else
        echo -e "Redis: ${RED}Not running${NC}"
    fi
    
    # Celery worker status
    if is_running "celery.*notification_worker.*worker"; then
        echo -e "Celery Worker: ${GREEN}Running${NC}"
    else
        echo -e "Celery Worker: ${RED}Not running${NC}"
    fi
    
    # Celery beat status
    if is_running "celery.*notification_worker.*beat"; then
        echo -e "Celery Beat: ${GREEN}Running${NC}"
    else
        echo -e "Celery Beat: ${RED}Not running${NC}"
    fi
}

# Function to test notifications
test_notifications() {
    echo -e "\n${YELLOW}Testing notification system...${NC}"
    
    # Test Celery worker
    echo "Testing Celery worker health..."
    if python -c "
from workers.notification_worker import celery_app
result = celery_app.send_task('notification_worker.health_check')
print('Worker health check:', result.get(timeout=10))
"; then
        echo -e "${GREEN}Celery worker is responding${NC}"
    else
        echo -e "${RED}Celery worker test failed${NC}"
    fi
}

# Main execution
case "${1:-start}" in
    "start")
        stop_existing
        populate_templates
        start_worker
        start_beat
        show_status
        echo -e "\n${GREEN}All notification services started successfully!${NC}"
        echo -e "${BLUE}Logs are available in the logs/ directory${NC}"
        ;;
    
    "stop")
        stop_existing
        echo -e "${GREEN}All notification services stopped${NC}"
        ;;
    
    "restart")
        stop_existing
        sleep 2
        start_worker
        start_beat
        show_status
        echo -e "${GREEN}All notification services restarted${NC}"
        ;;
    
    "status")
        show_status
        ;;
    
    "test")
        test_notifications
        ;;
    
    "populate-templates")
        populate_templates
        ;;
    
    "logs")
        echo -e "${BLUE}Recent Celery worker logs:${NC}"
        tail -20 logs/celery_worker.log 2>/dev/null || echo "No worker logs found"
        echo -e "\n${BLUE}Recent Celery beat logs:${NC}"
        tail -20 logs/celery_beat.log 2>/dev/null || echo "No beat logs found"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|restart|status|test|populate-templates|logs}"
        echo ""
        echo "Commands:"
        echo "  start              Start all notification services"
        echo "  stop               Stop all notification services"
        echo "  restart            Restart all notification services"
        echo "  status             Show status of all services"
        echo "  test               Test notification system"
        echo "  populate-templates Populate notification templates in database"
        echo "  logs               Show recent logs"
        exit 1
        ;;
esac