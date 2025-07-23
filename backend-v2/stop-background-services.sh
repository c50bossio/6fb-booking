#!/bin/bash

# BookedBarber V2 - Stop Background Services
# Gracefully stops all Celery workers and beat scheduler

set -e

echo "🛑 Stopping BookedBarber V2 Background Services..."

# Change to backend directory
cd "$(dirname "$0")"

# Function to stop a service by PID file
stop_service_by_pid() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill -TERM "$pid"
            
            # Wait for graceful shutdown
            local timeout=10
            while [ $timeout -gt 0 ] && kill -0 "$pid" 2>/dev/null; do
                sleep 1
                timeout=$((timeout - 1))
            done
            
            if kill -0 "$pid" 2>/dev/null; then
                echo "⚠️  $service_name didn't stop gracefully, forcing..."
                kill -KILL "$pid"
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name PID file exists but process is not running"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file found for $service_name"
    fi
}

# Function to stop processes by pattern
stop_service_by_pattern() {
    local service_name=$1
    local pattern=$2
    
    local pids=$(pgrep -f "$pattern" || true)
    if [ -n "$pids" ]; then
        echo "🛑 Stopping $service_name processes..."
        echo "$pids" | while read -r pid; do
            if [ -n "$pid" ]; then
                echo "  Stopping PID: $pid"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill any remaining processes
        local remaining_pids=$(pgrep -f "$pattern" || true)
        if [ -n "$remaining_pids" ]; then
            echo "  Force killing remaining processes..."
            echo "$remaining_pids" | while read -r pid; do
                if [ -n "$pid" ]; then
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            done
        fi
        
        echo "✅ $service_name stopped"
    else
        echo "ℹ️  No $service_name processes found"
    fi
}

# Stop Celery Beat
stop_service_by_pid "Celery Beat" "celery_beat.pid"
stop_service_by_pid "Celery Beat" "pids/celery-beat.pid"

# Stop Celery Workers
stop_service_by_pid "Celery Worker" "celery_worker.pid"
stop_service_by_pid "Celery Worker" "pids/celery-worker.pid"

# Fallback: Stop any remaining Celery processes
stop_service_by_pattern "Celery Beat" "celery.*beat"
stop_service_by_pattern "Celery Worker" "celery.*worker"

# Clean up lock files
echo "🧹 Cleaning up lock files..."
rm -f celery_beat.pid celery_worker.pid
rm -f pids/celery-*.pid
rm -f celerybeat-schedule*

# Optional: Stop Redis if started by this script
read -p "🤔 Do you want to stop Redis as well? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Stopping Redis..."
    if command -v brew >/dev/null 2>&1; then
        brew services stop redis
    elif command -v systemctl >/dev/null 2>&1; then
        sudo systemctl stop redis
    elif docker ps | grep -q bookedbarber-redis; then
        docker stop bookedbarber-redis
        docker rm bookedbarber-redis
    else
        echo "⚠️  Could not determine how to stop Redis. Please stop it manually."
    fi
fi

echo ""
echo "✅ Background services shutdown complete!"
echo ""
echo "📊 Final Status Check:"
echo "  Celery Worker: $(pgrep -f "celery.*worker" >/dev/null && echo 'STILL RUNNING ⚠️' || echo 'STOPPED ✅')"
echo "  Celery Beat:   $(pgrep -f "celery.*beat" >/dev/null && echo 'STILL RUNNING ⚠️' || echo 'STOPPED ✅')"
echo "  Redis:         $(redis-cli ping 2>/dev/null >/dev/null && echo 'RUNNING' || echo 'STOPPED')"