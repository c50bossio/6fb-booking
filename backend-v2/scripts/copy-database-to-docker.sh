#!/bin/bash

# Copy Database to Docker Script
# This script copies the native development database (with admin user) to Docker

echo "🔄 Copying native database to Docker shared volume..."

# Ensure the shared directory exists
mkdir -p ./shared

# Copy the database file from native to Docker shared volume
if [ -f "./6fb_booking.db" ]; then
    cp ./6fb_booking.db ./shared/6fb_booking.db
    echo "✅ Database copied successfully"
    echo "📊 Database info:"
    sqlite3 ./shared/6fb_booking.db "SELECT email, role, unified_role, is_system_admin FROM users WHERE email LIKE '%admin%';"
else
    echo "❌ Native database not found at ./6fb_booking.db"
    echo "💡 Make sure you've run the native development environment first"
    exit 1
fi

echo "🐳 Database is now ready for Docker containers"
echo "📍 Docker database location: ./shared/6fb_booking.db"