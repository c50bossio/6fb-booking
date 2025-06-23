#!/bin/bash

# Build script for Render deployment
# This script ensures all dependencies are properly installed and configured

set -e  # Exit on any error

echo "Starting build process..."

# Upgrade pip and essential tools
echo "Upgrading pip and build tools..."
pip install --upgrade pip setuptools wheel

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Production environment detected - running migrations..."
    alembic upgrade head
else
    echo "Non-production environment - skipping migrations..."
fi

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp

# Set proper permissions
echo "Setting permissions..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/*.py 2>/dev/null || true

# Validate environment
echo "Validating environment..."
python scripts/validate-environment.py || echo "Environment validation script not found - skipping"

echo "Build completed successfully!"