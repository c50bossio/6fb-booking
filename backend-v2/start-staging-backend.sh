#!/bin/bash

# Start staging backend server
echo "🚀 Starting BookedBarber V2 Staging Backend"
echo "============================================"

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo "❌ Error: .env.staging file not found"
    echo "Please create .env.staging file with staging configuration"
    exit 1
fi

# Check if staging database exists
if [ ! -f "staging_6fb_booking.db" ]; then
    echo "❌ Error: Staging database not found"
    echo "Please run init_staging_database.py first"
    exit 1
fi

# Set environment variables for staging
export ENVIRONMENT=staging
export DATABASE_URL=sqlite:///./staging_6fb_booking.db

# Load environment variables from .env.staging
set -a
source .env.staging
set +a

# Start the backend server on port 8001
echo "🔧 Starting backend server on port 8001..."
echo "📊 Database: staging_6fb_booking.db"
echo "🌍 Environment: staging"
echo "📝 API Documentation: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8001 --env-file .env.staging