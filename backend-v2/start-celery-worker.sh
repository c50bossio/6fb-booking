#!/bin/bash

# BookedBarber V2 - Celery Worker Startup Script
# Starts the Celery worker for background task processing

set -e

echo "🚀 Starting BookedBarber V2 Celery Worker..."

# Change to backend directory
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if ! python -c "import redis; redis.Redis.from_url('redis://localhost:6379').ping()" 2>/dev/null; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   brew services start redis  # macOS with Homebrew"
    echo "   sudo systemctl start redis  # Linux with systemd"
    echo "   docker run -d -p 6379:6379 redis:alpine  # Docker"
    exit 1
fi

echo "✅ Redis connection successful"

# Export environment for Celery
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start Celery worker with optimized settings
echo "🏭 Starting Celery worker processes..."

celery -A services.celery_app worker \
    --loglevel=info \
    --queues=notifications,data_processing,maintenance,marketing,high_priority,default \
    --concurrency=4 \
    --max-tasks-per-child=1000 \
    --hostname=worker@%h \
    --pidfile=celery_worker.pid \
    --logfile=logs/celery_worker.log

# Note: For production, consider using:
# celery multi start worker1 worker2 \
#     -A services.celery_app \
#     --pidfile=/var/run/celery/%n.pid \
#     --logfile=/var/log/celery/%n%I.log