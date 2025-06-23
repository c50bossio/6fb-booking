#!/usr/bin/env bash
# Render Start Script for 6FB Booking Platform Backend
# This script starts the application on Render

set -e

echo "🚀 Starting 6FB Booking Platform..."

# Export Python path
export PYTHONPATH=/opt/render/project/src/backend:$PYTHONPATH

# Run any pre-start tasks
if [ "$RUN_MIGRATIONS_ON_START" = "true" ]; then
    echo "🗄️ Running migrations..."
    alembic upgrade head
fi

# Create initial admin if specified
if [ -n "$CREATE_INITIAL_ADMIN" ] && [ "$CREATE_INITIAL_ADMIN" = "true" ]; then
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        echo "👤 Creating initial admin user..."
        python scripts/admin/create_admin_user.py \
            --email "$ADMIN_EMAIL" \
            --password "$ADMIN_PASSWORD" \
            --name "${ADMIN_NAME:-Admin User}" || true
    fi
fi

# Populate initial data if specified
if [ "$POPULATE_INITIAL_DATA" = "true" ]; then
    echo "📊 Populating initial data..."
    python scripts/admin/populate_test_data.py --type all || true
fi

# Start the application
echo "🌐 Starting Uvicorn server..."
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT:-10000} \
    --workers ${WORKERS:-4} \
    --log-level ${LOG_LEVEL:-info} \
    --access-log
