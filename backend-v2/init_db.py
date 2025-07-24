#!/usr/bin/env python3
"""
Initialize database with basic tables and test user
"""
import sqlite3
from datetime import datetime
import hashlib

# Create the database connection
conn = sqlite3.connect('6fb_booking.db')
cursor = conn.cursor()

# Create basic users table
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    hashed_password TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'client',
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timezone_preference VARCHAR(50),
    auto_detect_timezone BOOLEAN DEFAULT 1,
    timezone_last_updated TIMESTAMP,
    stripe_account_id VARCHAR(255),
    stripe_account_status VARCHAR(50),
    commission_rate DECIMAL(5,2),
    google_calendar_credentials TEXT,
    google_calendar_id VARCHAR(255),
    is_test_data BOOLEAN DEFAULT 0,
    email_verified BOOLEAN DEFAULT 1,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    verified_at TIMESTAMP,
    unified_role VARCHAR(50),
    role_migrated BOOLEAN DEFAULT 0,
    user_type VARCHAR(50),
    trial_started_at TIMESTAMP,
    trial_expires_at TIMESTAMP,
    trial_active BOOLEAN DEFAULT 0,
    subscription_status VARCHAR(50),
    location_id VARCHAR(255),
    lifetime_value DECIMAL(10,2),
    onboarding_completed BOOLEAN DEFAULT 0,
    onboarding_status VARCHAR(50),
    is_new_user BOOLEAN DEFAULT 1
)
''')

# Create basic appointments table (without organization_id)
cursor.execute('''
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    barber_id INTEGER,
    client_id INTEGER,
    service_id INTEGER, 
    service_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    buffer_time_before INTEGER DEFAULT 0,
    buffer_time_after INTEGER DEFAULT 0,
    notes TEXT,
    google_event_id VARCHAR(255),
    created_timezone VARCHAR(50),
    user_timezone VARCHAR(50),
    display_timezone VARCHAR(50),
    recurring_pattern_id INTEGER,
    recurring_series_id VARCHAR(255),
    is_recurring_instance BOOLEAN DEFAULT 0,
    original_scheduled_date TIMESTAMP,
    recurrence_sequence INTEGER,
    is_test_data BOOLEAN DEFAULT 0,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (barber_id) REFERENCES users (id),
    FOREIGN KEY (client_id) REFERENCES clients (id)
)
''')

# Create basic clients table
cursor.execute('''
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(255),
    last_name VARCHAR(255), 
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    customer_type VARCHAR(50),
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_ticket DECIMAL(10,2) DEFAULT 0,
    visit_frequency_days INTEGER,
    no_show_count INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    first_visit_date TIMESTAMP,
    last_visit_date TIMESTAMP,
    preferred_services TEXT,
    notes TEXT,
    tags TEXT,
    preferred_barber_id INTEGER,
    barber_id INTEGER,
    location_id VARCHAR(255),
    communication_preferences TEXT,
    sms_enabled BOOLEAN DEFAULT 1,
    email_enabled BOOLEAN DEFAULT 1,
    marketing_enabled BOOLEAN DEFAULT 1,
    email_opt_in BOOLEAN DEFAULT 1,
    sms_opt_in BOOLEAN DEFAULT 1,
    is_test_data BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id INTEGER,
    FOREIGN KEY (barber_id) REFERENCES users (id),
    FOREIGN KEY (preferred_barber_id) REFERENCES users (id)
)
''')

# Hash password for admin user using bcrypt (matching auth system)
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
password = "password123"
hashed_password = pwd_context.hash(password)

# Insert test admin user
cursor.execute('''
INSERT OR REPLACE INTO users (
    email, name, hashed_password, role, is_active, email_verified, 
    onboarding_completed, is_test_data
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    'admin@bookedbarber.com',
    'Administrator',
    hashed_password,
    'admin',
    1,
    1,
    1,
    1
))

# Insert some test appointments
now = datetime.now()
test_appointments = [
    {
        'user_id': 1,
        'barber_id': 1,
        'service_name': 'Haircut & Beard Trim',
        'start_time': '2025-07-24 10:00:00',
        'duration_minutes': 60,
        'price': 45.00,
        'status': 'confirmed',
        'is_test_data': 1
    },
    {
        'user_id': 1,
        'barber_id': 1,
        'service_name': 'Premium Cut',
        'start_time': '2025-07-24 14:30:00',
        'duration_minutes': 45,
        'price': 35.00,
        'status': 'pending',
        'is_test_data': 1
    },
    {
        'user_id': 1,
        'barber_id': 1,
        'service_name': 'Beard Trim',
        'start_time': '2025-07-25 09:00:00',
        'duration_minutes': 30,
        'price': 20.00,
        'status': 'confirmed',
        'is_test_data': 1
    }
]

for apt in test_appointments:
    cursor.execute('''
        INSERT INTO appointments (
            user_id, barber_id, service_name, start_time, duration_minutes,
            price, status, is_test_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        apt['user_id'], apt['barber_id'], apt['service_name'], 
        apt['start_time'], apt['duration_minutes'], apt['price'],
        apt['status'], apt['is_test_data']
    ))

# Commit and close
conn.commit()
conn.close()

print("✅ Database initialized successfully!")
print("✅ Created admin user: admin@bookedbarber.com / password123")
print("✅ Created sample appointments for testing")
print("✅ Database file: 6fb_booking.db")