#!/bin/bash

# Stop Payout Processing Workers
# This script gracefully stops all Celery workers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Stop a process by PID file
stop_process() {
    local name=$1
    local pidfile=$2

    if [ -f "$pidfile" ]; then
        PID=$(cat "$pidfile")
        if kill -0 $PID 2>/dev/null; then
            print_status "Stopping $name (PID: $PID)..."
            kill -TERM $PID

            # Wait for graceful shutdown
            local count=0
            while kill -0 $PID 2>/dev/null && [ $count -lt 30 ]; do
                sleep 1
                count=$((count + 1))
            done

            # Force kill if still running
            if kill -0 $PID 2>/dev/null; then
                print_warning "Force killing $name..."
                kill -KILL $PID
            fi

            rm -f "$pidfile"
            print_status "$name stopped"
        else
            print_warning "$name PID file exists but process not running"
            rm -f "$pidfile"
        fi
    else
        print_warning "$name PID file not found"
    fi
}

# Stop all Celery processes using control command
stop_celery_workers() {
    print_status "Sending shutdown signal to all Celery workers..."

    # Change to backend directory
    cd "$(dirname "$0")/.."

    # Activate virtual environment if it exists
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi

    # Send shutdown command to all workers
    celery -A config.celery_config:celery_app control shutdown || true

    # Give workers time to shutdown gracefully
    sleep 5
}

# Main execution
main() {
    print_status "Stopping Payout Processing System..."

    # Stop Celery workers via control command
    stop_celery_workers

    # Stop individual processes by PID
    stop_process "Celery Beat" "/tmp/celerybeat.pid"
    stop_process "Payout Worker" "/tmp/payout-worker.pid"
    stop_process "Default Worker" "/tmp/default-worker.pid"
    stop_process "Flower" "/tmp/flower.pid"

    # Clean up any stale PID files
    print_status "Cleaning up PID files..."
    rm -f /tmp/celery*.pid
    rm -f /tmp/*-worker.pid
    rm -f /tmp/flower.pid

    # Kill any remaining celery processes
    print_status "Checking for remaining Celery processes..."
    remaining=$(pgrep -f "celery.*config.celery_config" || true)

    if [ ! -z "$remaining" ]; then
        print_warning "Found remaining Celery processes, terminating..."
        echo "$remaining" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$remaining" | xargs kill -KILL 2>/dev/null || true
    fi

    print_status "All workers stopped successfully!"
}

# Run main function
main
