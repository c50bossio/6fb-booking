#!/usr/bin/env bash

# Build script specifically for Render deployment
# This script is called by Render during the build phase

set -o errexit  # Exit on error

echo "Starting Render build process..."
echo "Python version: $(python --version)"
echo "Pip version: $(pip --version)"

# Upgrade pip and install build tools
echo "Upgrading pip and build tools..."
pip install --upgrade pip wheel setuptools

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Run pre-deployment checks (non-blocking)
echo "Running pre-deployment checks..."
python scripts/pre-deploy.sh || echo "Pre-deploy checks completed with warnings"

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p logs uploads temp

# Set up environment-specific configurations
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Setting up production configurations..."
    # Copy production configs if they exist
    if [ -f "config/production.py" ]; then
        cp config/production.py config/environment.py
    fi
fi

echo "Render build completed successfully!"
