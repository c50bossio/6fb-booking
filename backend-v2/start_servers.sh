#!/bin/bash

echo "🚀 Starting 6FB Booking V2 Development Servers"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create test users
echo -e "\n${BLUE}Creating test users...${NC}"
python create_test_user.py

# Start backend server
echo -e "\n${GREEN}Starting backend server on http://localhost:8000${NC}"
echo -e "${YELLOW}API Docs available at: http://localhost:8000/docs${NC}"
source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server in new terminal (macOS)
echo -e "\n${GREEN}Starting frontend server on http://localhost:3000${NC}"
osascript -e 'tell app "Terminal" to do script "cd /Users/bossio/6fb-booking/backend-v2/frontend-v2 && npm run dev"'

echo -e "\n${GREEN}✅ Both servers starting!${NC}"
echo -e "\n📱 Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "📚 API Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop the backend server${NC}"

# Wait for backend process
wait $BACKEND_PID