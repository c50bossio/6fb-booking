#!/usr/bin/env python3
"""Quick fix to create a working user account"""

import sqlite3
import bcrypt
from datetime import datetime, timedelta

def create_working_user():
    """Create a working user directly in SQLite"""
    
    # Create/connect to database
    conn = sqlite3.connect('6fb_booking.db')
    cursor = conn.cursor()
    
    try:
        # Create users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT DEFAULT 'barber',
                unified_role TEXT NOT NULL DEFAULT 'barber',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                email_verified BOOLEAN DEFAULT 1,
                user_type TEXT DEFAULT 'barber',
                role_migrated BOOLEAN DEFAULT 0,
                trial_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                trial_expires_at TIMESTAMP,
                trial_active BOOLEAN DEFAULT 1,
                subscription_status TEXT DEFAULT 'trial',
                lifetime_value REAL DEFAULT 0.0,
                onboarding_completed BOOLEAN DEFAULT 0,
                is_new_user BOOLEAN DEFAULT 1,
                timezone TEXT DEFAULT 'UTC',
                auto_detect_timezone BOOLEAN DEFAULT 1,
                commission_rate REAL DEFAULT 0.2
            )
        ''')
        
        # Hash the password properly
        password = "TestPass123@"
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        # Calculate trial expiry (14 days from now)
        trial_expiry = datetime.now() + timedelta(days=14)
        
        # Insert test user
        cursor.execute('''
            INSERT OR REPLACE INTO users 
            (email, name, hashed_password, role, unified_role, is_active, email_verified, user_type, trial_expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'demo@test.com',
            'Demo User', 
            hashed_password,
            'barber',
            'barber',
            1,
            1,
            'barber',
            trial_expiry.isoformat()
        ))
        
        conn.commit()
        
        print('✅ Working user created successfully!')
        print('📧 Email: demo@test.com')
        print('🔑 Password: TestPass123@')
        print('👤 Role: barber')
        print(f'🔒 Hash: {hashed_password}')
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    create_working_user()