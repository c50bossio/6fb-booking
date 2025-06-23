#!/usr/bin/env bash
# Render Build Script for 6FB Booking Platform Backend
# This script runs during Render's build process

set -e

echo "🚀 Starting 6FB Booking Platform build..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations
echo "🗄️ Running database migrations..."
alembic upgrade head

# Make scripts executable
echo "🔧 Setting script permissions..."
chmod +x scripts/*.py scripts/*.sh scripts/admin/*.py

# Validate environment
echo "✅ Validating environment..."
python scripts/validate-environment.py || true

echo "✅ Build completed successfully!"