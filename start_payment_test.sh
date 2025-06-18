#!/bin/bash

echo "🚀 Starting 6FB Payment Test Environment"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database migrations have been run
echo "📊 Checking database setup..."
cd backend
if ! python3 -c "from database import engine; from models.payment import Payment" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Running database migrations...${NC}"
    alembic upgrade head
    echo -e "${GREEN}✅ Database migrations complete!${NC}"
else
    echo -e "${GREEN}✅ Database ready${NC}"
fi
cd ..

echo ""
echo "Starting services..."
echo ""

# Function to open new terminal tab (macOS)
open_new_tab() {
    osascript -e "tell application \"Terminal\" to do script \"cd $PWD && $1\""
}

# Start backend
echo -e "${BLUE}1. Starting Backend Server...${NC}"
open_new_tab "cd backend && uvicorn main:app --reload"
sleep 2

# Start frontend
echo -e "${BLUE}2. Starting Frontend Server...${NC}"
open_new_tab "cd frontend && npm run dev"
sleep 2

# Start Stripe webhook forwarding
echo -e "${BLUE}3. Starting Stripe Webhook Forwarding...${NC}"
open_new_tab "stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe"
sleep 2

echo ""
echo -e "${GREEN}✅ All services starting!${NC}"
echo ""
echo "========================================"
echo "🧪 Test Instructions:"
echo "========================================"
echo ""
echo "1. Wait ~10 seconds for all services to start"
echo "2. Open: http://localhost:3000/payments"
echo "3. Add a test card: 4242 4242 4242 4242"
echo "   - Expiry: 12/25"
echo "   - CVC: 123"
echo "   - ZIP: 12345"
echo "4. Make a test payment"
echo ""
echo "📝 Test Cards:"
echo "   - Success: 4242 4242 4242 4242"
echo "   - Requires Auth: 4000 0025 0000 3155"
echo "   - Decline: 4000 0000 0000 9995"
echo ""
echo "========================================"
echo ""
echo "Press Ctrl+C to stop this monitoring script"
echo "(The services will continue running in their tabs)"

# Keep script running to show logs
while true; do
    sleep 1
done