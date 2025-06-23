#!/bin/bash

# Pre-deployment script for Render
# This script runs before the application starts

set -e  # Exit on any error

echo "Running pre-deployment checks..."

# Check Python version
python --version

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    exit 1
fi

# Check if critical environment variables are set
required_vars=("SECRET_KEY" "JWT_SECRET_KEY" "ENVIRONMENT")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "WARNING: $var is not set - this may cause issues!"
    fi
done

# Test database connection
echo "Testing database connection..."
python -c "
import os
from sqlalchemy import create_engine
try:
    engine = create_engine(os.environ['DATABASE_URL'])
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('Database connection successful!')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"

echo "Pre-deployment checks completed successfully!"
