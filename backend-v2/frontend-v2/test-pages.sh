#!/bin/bash

# Test pages to see which ones return 200 status
echo "Testing BookedBarber pages..."
echo "============================"

# Public pages that should work without auth
echo -e "\n🌐 Public Pages (should return 200):"
for page in "" "login" "register" "forgot-password" "terms" "privacy" "cookies"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$page")
  if [ "$status" = "200" ]; then
    echo "✅ /$page - $status"
  else
    echo "❌ /$page - $status"
  fi
done

# Protected pages (should return 307 redirect to login)
echo -e "\n🔐 Protected Pages (should return 307 redirect):"
for page in "dashboard" "calendar" "clients" "bookings" "analytics" "settings" "admin" "payments" "notifications"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$page")
  if [ "$status" = "307" ]; then
    echo "✅ /$page - $status (redirect to login - expected)"
  else
    echo "❌ /$page - $status (unexpected status)"
  fi
done

# API endpoints
echo -e "\n🔌 API Endpoints:"
for endpoint in "health" "api/v1/auth/login" "api/v1/services"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/$endpoint")
  echo "📡 /$endpoint - $status"
done

echo -e "\n✨ Test complete!"