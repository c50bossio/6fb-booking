#!/bin/bash

# Start Payout Processing Workers
# This script starts all necessary Celery workers for payout processing

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

# Check if Redis is running
check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        print_error "Redis is not running. Please start Redis first."
        exit 1
    fi
    print_status "Redis is running"
}

# Create log directory
create_log_dir() {
    LOG_DIR="logs/celery"
    mkdir -p $LOG_DIR
    print_status "Log directory created: $LOG_DIR"
}

# Start Celery Beat Scheduler
start_beat() {
    print_status "Starting Celery Beat scheduler..."

    celery -A config.celery_config:celery_app beat \
        --loglevel=info \
        --logfile=logs/celery/beat.log \
        --pidfile=/tmp/celerybeat.pid \
        --detach

    if [ $? -eq 0 ]; then
        print_status "Celery Beat started successfully"
    else
        print_error "Failed to start Celery Beat"
        exit 1
    fi
}

# Start high-priority payout worker
start_payout_worker() {
    print_status "Starting high-priority payout worker..."

    celery -A config.celery_config:celery_app worker \
        --hostname=payout-worker@%h \
        --queues=payouts,high_priority \
        --concurrency=2 \
        --max-tasks-per-child=100 \
        --prefetch-multiplier=1 \
        --loglevel=info \
        --logfile=logs/celery/payout-worker.log \
        --pidfile=/tmp/payout-worker.pid \
        --detach

    if [ $? -eq 0 ]; then
        print_status "Payout worker started successfully"
    else
        print_error "Failed to start payout worker"
        exit 1
    fi
}

# Start default worker for general tasks
start_default_worker() {
    print_status "Starting default worker..."

    celery -A config.celery_config:celery_app worker \
        --hostname=default-worker@%h \
        --queues=default,low_priority \
        --concurrency=4 \
        --max-tasks-per-child=1000 \
        --prefetch-multiplier=4 \
        --loglevel=info \
        --logfile=logs/celery/default-worker.log \
        --pidfile=/tmp/default-worker.pid \
        --detach

    if [ $? -eq 0 ]; then
        print_status "Default worker started successfully"
    else
        print_error "Failed to start default worker"
        exit 1
    fi
}

# Start Flower monitoring (optional)
start_flower() {
    if [ "$1" == "--with-flower" ]; then
        print_status "Starting Flower monitoring dashboard..."

        celery -A config.celery_config:celery_app flower \
            --port=5555 \
            --persistent=True \
            --db=/tmp/flower.db \
            --max_tasks=10000 \
            --basic_auth=admin:changeme \
            --logfile=logs/celery/flower.log \
            --url_prefix=flower \
            --detach

        if [ $? -eq 0 ]; then
            print_status "Flower started successfully on port 5555"
            print_warning "Remember to change the default Flower password!"
        else
            print_error "Failed to start Flower"
        fi
    fi
}

# Main execution
main() {
    print_status "Starting Payout Processing System..."

    # Change to backend directory
    cd "$(dirname "$0")/.."

    # Activate virtual environment if it exists
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        print_status "Virtual environment activated"
    fi

    # Run checks
    check_redis
    create_log_dir

    # Start services
    start_beat
    sleep 2

    start_payout_worker
    sleep 2

    start_default_worker
    sleep 2

    start_flower $1

    print_status "All workers started successfully!"
    print_status "Logs are available in: logs/celery/"

    # Show worker status
    echo ""
    print_status "Worker Status:"
    celery -A config.celery_config:celery_app status

    # Show active queues
    echo ""
    print_status "Active Queues:"
    celery -A config.celery_config:celery_app inspect active_queues

    if [ "$1" == "--with-flower" ]; then
        echo ""
        print_status "Flower dashboard available at: http://localhost:5555"
    fi
}

# Run main function
main $@
