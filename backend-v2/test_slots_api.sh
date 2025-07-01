#!/bin/bash

echo "🔍 Testing appointment slots API..."

# Test the slots endpoint
echo -e "\n📅 Getting available slots for today..."
TODAY=$(date +%Y-%m-%d)
curl -X GET "http://localhost:8000/api/v1/appointments/slots?appointment_date=$TODAY" \
  -H "Accept: application/json" | python -m json.tool

echo -e "\n✅ Test completed. Check the response above."