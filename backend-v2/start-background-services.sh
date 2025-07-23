#!/bin/bash

# BookedBarber V2 - Complete Background Services Startup
# Starts Redis, Celery Worker, and Celery Beat in development mode

set -e

echo "🚀 Starting BookedBarber V2 Background Services..."

# Change to backend directory
cd "$(dirname "$0")"

# Function to check if a service is running
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo "✅ $service_name is already running"
        return 0
    else
        echo "❌ $service_name is not running"
        return 1
    fi
}

# Function to start a service in background
start_service() {
    local service_name=$1
    local start_script=$2
    local service_name_lower=$(echo "$service_name" | tr '[:upper:]' '[:lower:]')
    
    echo "🚀 Starting $service_name..."
    chmod +x "$start_script"
    nohup "$start_script" > "logs/${service_name_lower}.out" 2>&1 &
    local pid=$!
    echo $pid > "pids/${service_name_lower}.pid"
    echo "✅ $service_name started with PID $pid"
}

# Create necessary directories
mkdir -p logs pids

# Check and start Redis
if ! check_service "Redis" "redis-cli ping"; then
    echo "🔄 Starting Redis..."
    if command -v brew >/dev/null 2>&1; then
        brew services start redis
    elif command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start redis
    elif command -v docker >/dev/null 2>&1; then
        docker run -d --name bookedbarber-redis -p 6379:6379 redis:alpine
    else
        echo "❌ Could not start Redis. Please start it manually."
        exit 1
    fi
    
    # Wait for Redis to start
    echo "⏳ Waiting for Redis to be ready..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if redis-cli ping >/dev/null 2>&1; then
            echo "✅ Redis is ready"
            break
        fi
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [ $timeout -eq 0 ]; then
        echo "❌ Redis failed to start within 30 seconds"
        exit 1
    fi
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Start Celery Worker
if ! pgrep -f "celery.*worker" >/dev/null; then
    start_service "Celery-Worker" "./start-celery-worker.sh"
else
    echo "✅ Celery Worker is already running"
fi

# Start Celery Beat
if ! pgrep -f "celery.*beat" >/dev/null; then
    start_service "Celery-Beat" "./start-celery-beat.sh"
else
    echo "✅ Celery Beat is already running"
fi

echo ""
echo "🎉 Background services startup complete!"
echo ""
echo "📊 Service Status:"
echo "  Redis:        $(redis-cli ping 2>/dev/null || echo 'DOWN')"
echo "  Celery Worker: $(pgrep -f "celery.*worker" >/dev/null && echo 'RUNNING' || echo 'DOWN')"
echo "  Celery Beat:   $(pgrep -f "celery.*beat" >/dev/null && echo 'RUNNING' || echo 'DOWN')"
echo ""
echo "📝 Logs are available in:"
echo "  logs/celery_worker.log"
echo "  logs/celery_beat.log"
echo "  logs/celery-worker.out"
echo "  logs/celery-beat.out"
echo ""
echo "🛑 To stop services, run: ./stop-background-services.sh"
echo ""
echo "🔍 Monitor tasks with:"
echo "  celery -A services.celery_app flower  # Web UI"
echo "  celery -A services.celery_app status  # CLI status"