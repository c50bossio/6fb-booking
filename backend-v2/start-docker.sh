#!/bin/bash

# BookedBarber V2 Docker Startup Script
# This script checks if Docker is running and starts the application

echo "🐳 BookedBarber V2 Docker Startup"
echo "================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "Please install Docker Desktop from: https://docs.docker.com/desktop/install/mac-install/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "Please start Docker Desktop application"
    exit 1
fi

echo "✅ Docker is installed and running"

# Stop any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down

# Build and start the application
echo "🚀 Starting BookedBarber V2 application..."
echo "Building containers (this may take a few minutes on first run)..."

docker-compose up --build

echo "🎉 Application should now be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Database: PostgreSQL on localhost:5432"