#!/usr/bin/env python3
"""Insert basic test data for staging."""
import os
import sys
from datetime import datetime, timedelta
import sqlite3
from passlib.context import CryptContext

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to database
db_path = "/Users/bossio/6fb-booking/backend-v2/6fb_booking.db"
conn = sqlite3.connect(db_path)

try:
    print("🚀 Inserting test data...")
    
    # Insert test users
    users_data = [
        ("marcus@bookedbarber.com", "Marcus Johnson", "+1-555-0101", pwd_context.hash("password123"), "barber"),
        ("diego@bookedbarber.com", "Diego Rivera", "+1-555-0102", pwd_context.hash("password123"), "barber"),
        ("aisha@bookedbarber.com", "Aisha Thompson", "+1-555-0103", pwd_context.hash("password123"), "barber"),
        ("john.smith@email.com", "John Smith", "+1-555-0201", pwd_context.hash("client123"), "client"),
        ("sarah.wilson@email.com", "Sarah Wilson", "+1-555-0202", pwd_context.hash("client123"), "client"),
        ("mike.jones@email.com", "Mike Jones", "+1-555-0203", pwd_context.hash("client123"), "client"),
        ("admin@bookedbarber.com", "Admin User", "+1-555-0001", pwd_context.hash("admin123"), "admin"),
    ]
    
    conn.executemany("""
        INSERT INTO users (email, name, phone, hashed_password, role, is_active, timezone_preference)
        VALUES (?, ?, ?, ?, ?, 1, 'America/New_York')
    """, users_data)
    
    print(f"   ✅ Created {len(users_data)} users")
    
    # Insert services
    services_data = [
        ("Classic Haircut", "Traditional barber cut with scissor work", "haircut", 30.0, 30),
        ("Beard Trim", "Professional beard shaping and styling", "beard", 20.0, 20),
        ("Fade Cut", "Modern fade with clipper work", "haircut", 35.0, 35),
        ("Hot Towel Shave", "Traditional straight razor shave", "shave", 40.0, 45),
        ("Full Service", "Haircut + Beard trim combo", "package", 45.0, 50),
        ("Mustache Trim", "Quick mustache maintenance", "beard", 15.0, 15),
        ("Hair Wash & Style", "Shampoo and styling", "styling", 25.0, 25),
        ("Premium Cut & Style", "Deluxe haircut with premium styling", "haircut", 60.0, 60),
    ]
    
    conn.executemany("""
        INSERT INTO services (name, description, category, base_price, duration_minutes, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
    """, services_data)
    
    print(f"   ✅ Created {len(services_data)} services")
    
    # Create sample appointments
    now = datetime.now()
    appointments_data = []
    
    # Past appointments (last 2 weeks)
    for i in range(15):
        appointment_time = now - timedelta(days=i+1, hours=2*i % 8 + 9)  # 9am-5pm spread
        appointments_data.append((
            1 + (i % 3),  # barber_id (1, 2, or 3)
            4 + (i % 3),  # client_id (4, 5, or 6)
            1 + (i % 8),  # service_id (1-8)
            appointment_time.isoformat(),
            30 + (i % 4) * 15,  # duration 30-75 minutes
            30.0 + (i % 3) * 15,  # price $30-60
            "completed",
            f"Great service! Client was very satisfied. Session {i+1}.",
            (appointment_time - timedelta(days=i % 7 + 1)).isoformat()  # created_at
        ))
    
    # Future appointments (next 2 weeks)
    for i in range(10):
        appointment_time = now + timedelta(days=i+1, hours=2*i % 8 + 9)
        appointments_data.append((
            1 + (i % 3),  # barber_id
            4 + (i % 3),  # client_id
            1 + (i % 8),  # service_id
            appointment_time.isoformat(),
            30 + (i % 4) * 15,  # duration
            30.0 + (i % 3) * 15,  # price
            "confirmed",
            f"Upcoming appointment {i+1}. Looking forward to it!",
            (appointment_time - timedelta(days=1)).isoformat()  # created_at
        ))
    
    conn.executemany("""
        INSERT INTO appointments (
            barber_id, client_id, service_id, start_time, duration_minutes, 
            price, status, notes, created_at, is_test_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, appointments_data)
    
    print(f"   ✅ Created {len(appointments_data)} appointments")
    
    # Commit all changes
    conn.commit()
    
    print("\n🎉 Test data inserted successfully!")
    print("\nTest Credentials:")
    print("  Barbers:")
    print("    marcus@bookedbarber.com / password123")
    print("    diego@bookedbarber.com / password123") 
    print("    aisha@bookedbarber.com / password123")
    print("  Clients:")
    print("    john.smith@email.com / client123")
    print("    sarah.wilson@email.com / client123")
    print("    mike.jones@email.com / client123")
    print("  Admin:")
    print("    admin@bookedbarber.com / admin123")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()