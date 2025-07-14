#!/bin/bash

# Reset staging database
echo "🔄 Resetting BookedBarber V2 Staging Database"
echo "=============================================="

# Check if staging is running and warn
if lsof -i:8001 >/dev/null 2>&1 || lsof -i:3001 >/dev/null 2>&1; then
    echo "⚠️  Staging environment is currently running"
    echo "Please stop the staging environment first:"
    echo "./stop-staging-environment.sh"
    echo ""
    read -p "Do you want to continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Database reset cancelled"
        exit 1
    fi
fi

# Backup current staging database
if [ -f "staging_6fb_booking.db" ]; then
    BACKUP_FILE="staging_6fb_booking.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Creating backup: $BACKUP_FILE"
    cp staging_6fb_booking.db "$BACKUP_FILE"
fi

# Reset database by copying from main database
echo "🔄 Resetting staging database from main database..."
if [ -f "6fb_booking.db" ]; then
    cp 6fb_booking.db staging_6fb_booking.db
    echo "✅ Staging database reset complete"
else
    echo "❌ Error: Main database (6fb_booking.db) not found"
    exit 1
fi

# Show database status
echo ""
echo "📊 Database Status:"
if [ -f "staging_6fb_booking.db" ]; then
    DB_SIZE=$(ls -lh staging_6fb_booking.db | awk '{print $5}')
    echo "✅ Staging database size: $DB_SIZE"
else
    echo "❌ Staging database not found"
fi

# Show available test accounts
echo ""
echo "🔐 Available Test Accounts:"
ENVIRONMENT=staging DATABASE_URL=sqlite:///./staging_6fb_booking.db python -c "
from database import SessionLocal
from models import User
import sys

try:
    db = SessionLocal()
    users = db.query(User).filter(User.email.like('%staging%')).all()
    if users:
        print('Staging-specific accounts:')
        for user in users:
            print(f'- {user.email} ({user.unified_role}) - {user.name}')
    else:
        print('No staging-specific accounts found')
    
    # Also show some general test accounts
    test_users = db.query(User).filter(User.email.like('%@example.com')).limit(3).all()
    if test_users:
        print('\nGeneral test accounts:')
        for user in test_users:
            print(f'- {user.email} ({user.unified_role}) - {user.name}')
    
    db.close()
except Exception as e:
    print(f'Error checking accounts: {e}')
    sys.exit(1)
"

echo ""
echo "🔑 All accounts use password: staging123!"
echo ""
echo "🚀 To start staging environment:"
echo "./start-staging-environment.sh"