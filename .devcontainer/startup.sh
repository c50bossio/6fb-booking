#!/bin/bash
# =============================================================================
# BookedBarber V2 - Codespaces Startup Script
# =============================================================================
# 🎯 Automated environment setup for GitHub Codespaces
# 🚀 Eliminates server conflicts and ensures stable development environment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}BookedBarber V2 - Codespaces Development Environment${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# =============================================================================
# Environment Setup
# =============================================================================
echo -e "\n${YELLOW}🔧 Setting up development environment...${NC}"

# Navigate to the workspace
cd /app

# Set up Python environment
echo -e "${YELLOW}🐍 Setting up Python environment...${NC}"
python -m pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Set up Node.js environment
echo -e "${YELLOW}📦 Setting up Node.js environment...${NC}"
cd frontend-v2
npm install
echo -e "${GREEN}✅ Node.js dependencies installed${NC}"

# Initialize database
echo -e "\n${YELLOW}🗄️ Initializing database...${NC}"
cd /app
python -c "
import os
import sqlite3
from pathlib import Path

# Create database if it doesn't exist
db_path = Path('./6fb_booking.db')
if not db_path.exists():
    conn = sqlite3.connect(str(db_path))
    conn.close()
    print('SQLite database created')

# Create staging database
staging_db_path = Path('./staging_6fb_booking.db')
if not staging_db_path.exists():
    conn = sqlite3.connect(str(staging_db_path))
    conn.close()
    print('Staging SQLite database created')
"
echo -e "${GREEN}✅ Database initialized${NC}"

# Set up development directories
echo -e "\n${YELLOW}📁 Creating development directories...${NC}"
mkdir -p logs uploads .next node_modules/.cache
echo -e "${GREEN}✅ Development directories created${NC}"

# Set up Git configuration (if not already configured)
if ! git config --global user.name >/dev/null 2>&1; then
    echo -e "${YELLOW}⚙️ Setting up Git configuration...${NC}"
    git config --global user.name "BookedBarber Developer"
    git config --global user.email "dev@bookedbarber.com"
    git config --global init.defaultBranch main
    echo -e "${GREEN}✅ Git configuration complete${NC}"
fi

# =============================================================================
# Service Health Checks
# =============================================================================
echo -e "\n${YELLOW}🏥 Running health checks...${NC}"

# Check Python installation
python --version
echo -e "${GREEN}✅ Python ready${NC}"

# Check Node.js installation
node --version
npm --version
echo -e "${GREEN}✅ Node.js ready${NC}"

# Check Docker availability
if command -v docker &> /dev/null; then
    docker --version
    echo -e "${GREEN}✅ Docker ready${NC}"
else
    echo -e "${YELLOW}⚠️ Docker not available (will be available after container start)${NC}"
fi

# =============================================================================
# Development Instructions
# =============================================================================
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}🎉 BookedBarber V2 Development Environment Ready!${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "\n${YELLOW}🚀 Quick Start Commands:${NC}"
echo -e "Start development servers: ${GREEN}./backend-v2/docker-dev-start.sh${NC}"
echo -e "Manual backend start:      ${GREEN}cd backend-v2 && uvicorn main:app --reload${NC}"
echo -e "Manual frontend start:     ${GREEN}cd frontend-v2 && npm run dev${NC}"

echo -e "\n${YELLOW}📊 Service URLs (auto-forwarded):${NC}"
echo -e "Frontend:                  ${GREEN}http://localhost:3000${NC}"
echo -e "Backend API:               ${GREEN}http://localhost:8000${NC}"
echo -e "API Documentation:         ${GREEN}http://localhost:8000/docs${NC}"

echo -e "\n${YELLOW}🔐 Test Credentials:${NC}"
echo -e "Email:                     ${GREEN}admin@bookedbarber.com${NC}"
echo -e "Password:                  ${GREEN}admin123${NC}"

echo -e "\n${YELLOW}📋 Development Workflow:${NC}"
echo -e "1. Use the integrated terminal for all commands"
echo -e "2. Ports are automatically forwarded - no manual setup needed"
echo -e "3. File changes auto-sync with hot reload enabled"
echo -e "4. Database persists between Codespace sessions"
echo -e "5. No more server conflicts or port issues!"

echo -e "\n${GREEN}🎯 Development environment successfully initialized!${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# Make script executable
chmod +x /usr/local/bin/startup.sh