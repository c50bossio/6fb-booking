#!/bin/bash
# Quick test runner for slot fix verification

echo "🔍 Running Booking Slot Fix Verification..."
echo ""

# Change to the backend directory
cd /Users/bossio/6fb-booking/backend-v2

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  No virtual environment found. Please ensure dependencies are installed."
fi

# Run the verification test
echo "🧪 Running verification test..."
python verify_slot_fix.py --quick

echo ""
echo "✅ Verification complete!"
echo ""
echo "To run full test suite with multiple time scenarios:"
echo "  python verify_slot_fix.py"
echo ""
echo "To test the actual API manually:"
echo "  curl 'http://localhost:8000/api/v1/bookings/slots?booking_date=$(date +%Y-%m-%d)'"