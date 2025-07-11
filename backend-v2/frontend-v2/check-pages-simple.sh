#!/bin/bash

BASE_URL="http://localhost:3000"

# Define pages to check
pages=(
    "Dashboard|/dashboard"
    "Calendar|/calendar"
    "My_Bookings|/bookings"
    "Availability|/barber/availability"
    "Recurring|/recurring"
    "Clients|/clients"
    "Communication|/notifications"
    "Marketing_Campaigns|/marketing/campaigns"
    "Marketing_Templates|/marketing/templates"
    "Marketing_Contacts|/marketing/contacts"
    "Marketing_Analytics|/marketing/analytics"
    "Marketing_Billing|/marketing/billing"
    "Payment_Overview|/payments"
    "Earnings|/barber/earnings"
    "Gift_Certificates|/payments/gift-certificates"
    "Commissions|/commissions"
    "Payouts|/payouts"
    "Financial_Analytics|/finance/analytics"
    "Analytics|/analytics"
    "Enterprise|/enterprise/dashboard"
    "Admin_Overview|/admin"
    "Services|/admin/services"
    "Staff_Invitations|/dashboard/staff/invitations"
    "Booking_Rules|/admin/booking-rules"
    "Data_Import|/import"
    "Data_Export|/export"
    "Webhooks|/admin/webhooks"
    "Product_Catalog|/products"
    "Profile_Settings|/settings/profile"
    "Calendar_Sync|/settings/calendar"
    "Notification_Settings|/settings/notifications"
    "Integrations|/settings/integrations"
    "Tracking_Pixels|/settings/tracking-pixels"
    "Test_Data|/settings/test-data"
    "Support|/support"
    "Sign_Out|/logout"
)

echo "=== CHECKING BOOKEDBARBER V2 PAGES ==="
echo "Base URL: $BASE_URL"
echo "======================================="
echo

# First check if the server is running
echo "Checking if server is running..."
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$status" != "200" ]; then
    echo "❌ Server is not responding at $BASE_URL (Status: $status)"
    exit 1
fi
echo "✅ Server is running"
echo

# Check each page
echo "Checking individual pages..."
echo

# Track results
total=0
success=0
failed=0
redirects=0

# Check each page
for page_entry in "${pages[@]}"; do
    IFS='|' read -r page_name path <<< "$page_entry"
    url="$BASE_URL$path"
    
    # Make request and capture status
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
    total=$((total + 1))
    
    # Replace underscores with spaces for display
    display_name="${page_name//_/ }"
    
    if [ "$status" = "200" ]; then
        echo "✅ $display_name ($path) - OK"
        success=$((success + 1))
    elif [ "$status" = "404" ]; then
        echo "❌ $display_name ($path) - NOT FOUND (404)"
        failed=$((failed + 1))
    elif [ "$status" = "500" ]; then
        echo "❌ $display_name ($path) - SERVER ERROR (500)"
        failed=$((failed + 1))
    elif [ "$status" = "302" ] || [ "$status" = "301" ] || [ "$status" = "307" ]; then
        echo "↩️  $display_name ($path) - REDIRECT ($status)"
        redirects=$((redirects + 1))
    else
        echo "⚠️  $display_name ($path) - UNEXPECTED STATUS ($status)"
        failed=$((failed + 1))
    fi
done

echo
echo "======================================="
echo "SUMMARY:"
echo "Total pages checked: $total"
echo "✅ Successful: $success"
echo "↩️  Redirects: $redirects"
echo "❌ Failed: $failed"
echo "======================================="