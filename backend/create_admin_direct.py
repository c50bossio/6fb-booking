#!/usr/bin/env python3
# Simple script to create admin user - run this in Render Shell

import os
import sys
from datetime import datetime

# Direct database connection
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

# Parse DATABASE_URL and connect
conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
cur = conn.cursor()

# User details
email = 'c50bossio@gmail.com'
password = 'Welcome123!'
first_name = 'Chris'
last_name = 'Bossio'

# Hash password
salt = bcrypt.gensalt()
hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# Check if user exists
cur.execute("SELECT id FROM users WHERE email = %s", (email,))
existing = cur.fetchone()

if existing:
    # Update existing user to super_admin
    cur.execute("""
        UPDATE users 
        SET role = 'super_admin', 
            hashed_password = %s,
            is_active = true,
            is_verified = true,
            updated_at = %s
        WHERE email = %s
    """, (hashed_password, datetime.utcnow(), email))
    print(f"✅ Updated existing user {email} to super_admin")
else:
    # Create new user
    cur.execute("""
        INSERT INTO users (
            email, first_name, last_name, hashed_password, 
            role, is_active, is_verified, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        email, first_name, last_name, hashed_password,
        'super_admin', True, True, datetime.utcnow(), datetime.utcnow()
    ))
    print(f"✅ Created new admin user {email}")

# Commit changes
conn.commit()
cur.close()
conn.close()

print("\n📧 Email:", email)
print("🔑 Password:", password)
print("\n✅ Admin user ready! Use these credentials at https://sixfb-backend.onrender.com/docs")