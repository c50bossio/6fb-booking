#!/usr/bin/env python3

"""
Create minimal staging database without alembic dependencies
This bypasses potential alembic configuration issues
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add the staging backend to path
staging_backend_path = "/Users/bossio/6fb-booking-staging/backend-v2"
sys.path.insert(0, staging_backend_path)

# Change to staging directory
os.chdir(staging_backend_path)

# Set environment variables from .env.staging
env_file = Path(".env.staging")
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

print("🗃️  Creating minimal staging database...")

# Database path
db_path = "staging_6fb_booking.db"

# Remove existing database
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"   Removed existing database: {db_path}")

# Create new database with basic tables
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create essential tables for basic functionality
tables = [
    """
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'CLIENT',
        is_active BOOLEAN DEFAULT 1,
        is_verified BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        barber_id INTEGER,
        service TEXT,
        appointment_date TIMESTAMP,
        duration INTEGER DEFAULT 30,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id),
        FOREIGN KEY (barber_id) REFERENCES users (id)
    )
    """,
    """
    CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER,
        amount DECIMAL(10,2),
        status TEXT DEFAULT 'pending',
        stripe_payment_intent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
    )
    """,
    """
    CREATE TABLE barber_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barber_id INTEGER,
        day_of_week INTEGER,
        start_time TIME,
        end_time TIME,
        is_available BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (barber_id) REFERENCES users (id)
    )
    """,
    """
    CREATE TABLE services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        duration INTEGER DEFAULT 30,
        price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
]

# Create tables
for table_sql in tables:
    try:
        cursor.execute(table_sql)
        print(f"   ✓ Created table")
    except sqlite3.Error as e:
        print(f"   ✗ Error creating table: {e}")

# Insert sample data for staging testing
sample_data = [
    """
    INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified)
    VALUES 
        ('staging-admin@bookedbarber.com', 'hashed_password', 'Staging Admin', 'ENTERPRISE_OWNER', 1, 1),
        ('staging-barber@bookedbarber.com', 'hashed_password', 'Staging Barber', 'BARBER', 1, 1),
        ('staging-client@bookedbarber.com', 'hashed_password', 'Staging Client', 'CLIENT', 1, 1)
    """,
    """
    INSERT INTO services (name, description, duration, price, is_active)
    VALUES 
        ('Haircut', 'Professional haircut', 30, 25.00, 1),
        ('Beard Trim', 'Beard styling and trim', 15, 15.00, 1),
        ('Full Service', 'Haircut and beard trim', 45, 35.00, 1)
    """,
    """
    INSERT INTO locations (name, address, phone, email, is_active)
    VALUES 
        ('BookedBarber Staging Location', '123 Staging Street', '+1234567890', 'staging@bookedbarber.com', 1)
    """
]

# Insert sample data
for data_sql in sample_data:
    try:
        cursor.execute(data_sql)
        print(f"   ✓ Inserted sample data")
    except sqlite3.Error as e:
        print(f"   ✗ Error inserting data: {e}")

# Commit and close
conn.commit()
conn.close()

print(f"✅ Staging database created successfully!")
print(f"   Location: {os.path.abspath(db_path)}")
print(f"   Size: {os.path.getsize(db_path)} bytes")

# Test database connection
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM services") 
    service_count = cursor.fetchone()[0]
    conn.close()
    
    print(f"   Users: {user_count}")
    print(f"   Services: {service_count}")
    print("✅ Database verification successful!")
    
except sqlite3.Error as e:
    print(f"❌ Database verification failed: {e}")

print("\n🚀 Staging database is ready!")
print("   Next steps:")
print("   1. cd /Users/bossio/6fb-booking-staging") 
print("   2. ./start-staging.sh")
print("   3. Visit http://localhost:3001")