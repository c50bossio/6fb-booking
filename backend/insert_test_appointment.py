#!/usr/bin/env python3
"""
Manually insert test appointment data to verify dashboard
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from datetime import datetime, date
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def insert_test_data():
    """Insert test appointment directly via SQL"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # First ensure we have a location
            result = conn.execute(text("""
                INSERT INTO locations (id, name, business_name, location_code, address, city, state, zip_code, phone, is_active, created_at, updated_at)
                VALUES (1, 'Headlines Barbershop - Bloomingdale', 'Headlines Barbershop', 'headlines_bloomingdale', 
                        '909 E Bloomingdale Ave', 'Brandon', 'FL', '33511', '+18132785346', true, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
            """))
            location_id = result.scalar()
            logger.info(f"Location ready: {location_id}")
            
            # Insert a barber
            result = conn.execute(text("""
                INSERT INTO barbers (id, email, first_name, last_name, phone, is_active, location_id, created_at, updated_at)
                VALUES (1, 'matthew.navaa@gmail.com', 'Matthew', 'Nava', '+18135551234', true, 1, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
                RETURNING id
            """))
            barber_id = result.scalar()
            logger.info(f"Barber ready: {barber_id}")
            
            # Insert a client
            result = conn.execute(text("""
                INSERT INTO clients (id, email, first_name, last_name, phone, is_active, created_at, updated_at)
                VALUES (1, 'test@6fbtest.com', 'Dashboard', 'Test', '+18137679851', true, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
                RETURNING id
            """))
            client_id = result.scalar()
            logger.info(f"Client ready: {client_id}")
            
            # Insert today's appointment
            result = conn.execute(text("""
                INSERT INTO appointments (
                    trafft_appointment_id, location_id, barber_id, client_id,
                    appointment_date, appointment_time, end_time,
                    service_name, service_duration, service_revenue,
                    status, trafft_status, trafft_location_name,
                    created_at, updated_at
                ) VALUES (
                    :trafft_id, :location_id, :barber_id, :client_id,
                    :appointment_date, :appointment_time, :end_time,
                    :service_name, :service_duration, :service_revenue,
                    :status, :trafft_status, :location_name,
                    NOW(), NOW()
                )
            """), {
                'trafft_id': f'TEST{datetime.now().timestamp()}',
                'location_id': location_id,
                'barber_id': barber_id,
                'client_id': client_id,
                'appointment_date': date.today(),
                'appointment_time': '14:30:00',
                'end_time': '15:00:00',
                'service_name': 'Haircut Only',
                'service_duration': 30,
                'service_revenue': 30.00,
                'status': 'confirmed',
                'trafft_status': 'Approved',
                'location_name': 'Headlines Barbershop - Bloomingdale'
            })
            
            conn.commit()
            logger.info("✅ Test appointment inserted successfully!")
            
            # Verify
            result = conn.execute(text("SELECT COUNT(*) FROM appointments WHERE appointment_date = :today"), 
                                {'today': date.today()})
            count = result.scalar()
            logger.info(f"📊 Total appointments today: {count}")
            
        except Exception as e:
            logger.error(f"❌ Failed to insert test data: {e}")
            conn.rollback()

if __name__ == "__main__":
    logger.info("🚀 Inserting test appointment data...")
    insert_test_data()