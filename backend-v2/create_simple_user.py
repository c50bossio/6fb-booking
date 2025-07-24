#!/usr/bin/env python3

"""
Simple script to create a test user that definitely works with the authentication system.
"""

import sqlite3
from passlib.context import CryptContext
from datetime import datetime

def create_test_user():
    # Create password hash
    pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
    hashed_password = pwd_context.hash('123')
    
    # Connect to database
    conn = sqlite3.connect('6fb_booking.db')
    cursor = conn.cursor()
    
    # Create a minimal users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        hashed_password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        onboarding_completed INTEGER DEFAULT 0,
        is_new_user INTEGER DEFAULT 1
    )
    ''')
    
    # Delete any existing admin user
    cursor.execute('DELETE FROM users WHERE email = ?', ('admin@bookedbarber.com',))
    
    # Insert the test user
    cursor.execute('''
    INSERT INTO users (email, name, hashed_password, role, is_active, onboarding_completed, is_new_user)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', ('admin@bookedbarber.com', 'Super Admin', hashed_password, 'SUPER_ADMIN', 1, 1, 0))
    
    conn.commit()
    
    # Verify the user
    cursor.execute('SELECT email, name, role, is_active FROM users WHERE email = ?', ('admin@bookedbarber.com',))
    user = cursor.fetchone()
    
    if user:
        print(f'✅ User created successfully:')
        print(f'   Email: {user[0]}')
        print(f'   Name: {user[1]}')
        print(f'   Role: {user[2]}')
        print(f'   Active: {user[3]}')
        
        # Test password verification
        cursor.execute('SELECT hashed_password FROM users WHERE email = ?', ('admin@bookedbarber.com',))
        stored_hash = cursor.fetchone()[0]
        
        # Test both passwords
        test1 = pwd_context.verify('123', stored_hash)
        test2 = pwd_context.verify('password123', stored_hash)
        
        print(f'   Password "123" works: {test1}')
        print(f'   Password "password123" works: {test2}')
        
        print(f'\n🎉 LOGIN CREDENTIALS:')
        print(f'   Email: admin@bookedbarber.com')
        print(f'   Password: 123')
        
        return True
    else:
        print('❌ User creation failed')
        return False
    
    conn.close()

if __name__ == '__main__':
    create_test_user()