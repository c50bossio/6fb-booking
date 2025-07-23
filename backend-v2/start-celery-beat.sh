#!/bin/bash

# BookedBarber V2 - Celery Beat Scheduler Startup Script
# Starts the Celery beat scheduler for periodic tasks (reminders, cleanup, etc.)

set -e

echo "⏰ Starting BookedBarber V2 Celery Beat Scheduler..."

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

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Celery beat scheduler
echo "📅 Starting Celery beat scheduler..."

celery -A services.celery_app beat \
    --loglevel=info \
    --pidfile=celery_beat.pid \
    --logfile=logs/celery_beat.log \
    --schedule=celerybeat-schedule

# Note: Beat scheduler handles:
# - Appointment reminders (every 5 minutes)
# - Marketing campaigns (every 30 minutes)  
# - Cache cleanup (daily at 2 AM)
# - Analytics generation (daily at 1 AM)
# - Health checks (every 15 minutes)
# - Data export processing (every 10 minutes)