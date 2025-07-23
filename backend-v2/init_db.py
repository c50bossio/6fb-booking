#!/usr/bin/env python3
"""Initialize database with core tables only."""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from config import settings

# Create engine
engine = create_engine(settings.database_url)

# SQL to create core tables
sql = """
-- Drop existing tables if any
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    phone VARCHAR,
    hashed_password VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    timezone_preference VARCHAR(50),
    auto_detect_timezone BOOLEAN DEFAULT 1,
    timezone_last_updated DATETIME,
    stripe_account_id VARCHAR,
    stripe_account_status VARCHAR,
    commission_rate FLOAT DEFAULT 0.20,
    google_calendar_credentials TEXT,
    google_calendar_id VARCHAR,
    is_test_data BOOLEAN DEFAULT 0
);

-- Create services table
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    sku VARCHAR UNIQUE,
    base_price FLOAT NOT NULL,
    min_price FLOAT,
    max_price FLOAT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    buffer_time_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    barber_id INTEGER,
    client_id INTEGER,
    service_id INTEGER REFERENCES services(id),
    service_name VARCHAR,
    start_time DATETIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price FLOAT,
    status VARCHAR DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    buffer_time_before INTEGER DEFAULT 0,
    buffer_time_after INTEGER DEFAULT 0,
    notes TEXT,
    google_event_id VARCHAR,
    created_timezone VARCHAR(50),
    user_timezone VARCHAR(50),
    client_timezone VARCHAR(50),
    barber_timezone VARCHAR(50),
    display_timezone VARCHAR(50),
    is_test_data BOOLEAN DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_service_id ON appointments(service_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
"""

try:
    print("🗄️  Initializing database...")
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    print("✅ Database initialized successfully!")
    
    # Verify tables were created
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
        tables = [row[0] for row in result]
        print(f"\n📋 Created tables: {', '.join(tables)}")
        
except Exception as e:
    print(f"❌ Error initializing database: {e}")
    raise