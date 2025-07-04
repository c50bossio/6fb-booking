#!/usr/bin/env python3
"""
Simple staging data population script.
Creates basic test data without complex relationships.
"""

import sqlite3
import json
from datetime import datetime, timedelta
import random
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def populate_staging_data():
    """Populate staging database with simple test data."""
    print("🚀 Populating staging database with test data...\n")
    
    # Connect to staging database
    conn = sqlite3.connect('staging_6fb_booking.db')
    cursor = conn.cursor()
    
    try:
        # Clear existing data
        print("🧹 Clearing existing data...")
        cursor.execute("DELETE FROM appointments")
        cursor.execute("DELETE FROM services") 
        cursor.execute("DELETE FROM users WHERE role != 'admin'")
        conn.commit()
        print("   ✅ Cleared existing data")
        
        # Create services
        print("🛠️ Creating services...")
        services = [
            ("Classic Haircut", 30, 35.00, "#4F46E5", "Traditional men's haircut with styling"),
            ("Beard Trim", 20, 25.00, "#DC2626", "Professional beard trimming and shaping"),
            ("Hair & Beard Combo", 45, 55.00, "#059669", "Complete grooming experience"),
            ("Premium Cut", 60, 75.00, "#D97706", "Luxury haircut with wash and styling"),
            ("Buzz Cut", 15, 20.00, "#7C3AED", "Quick and clean military-style cut"),
            ("Fade Cut", 40, 45.00, "#EC4899", "Modern fade with precision styling"),
            ("Shampoo & Style", 25, 30.00, "#10B981", "Hair wash and professional styling"),
            ("Hot Towel Shave", 35, 40.00, "#F59E0B", "Traditional straight razor shave")
        ]
        
        for name, duration, price, color, description in services:
            cursor.execute("""
                INSERT INTO services (name, duration_minutes, base_price, description, category, is_active, is_bookable_online, created_at)
                VALUES (?, ?, ?, ?, 'haircut', 1, 1, ?)
            """, (name, duration, price, description, datetime.now()))
        
        conn.commit()
        print(f"   ✅ Created {len(services)} services")
        
        # Create barbers
        print("👨‍💼 Creating barbers...")
        barbers = [
            ("Marcus Johnson", "marcus@bookedbarber.com", "+1-555-0123", "🔥"),
            ("Diego Rivera", "diego@bookedbarber.com", "+1-555-0124", "✂️"),
            ("Aisha Thompson", "aisha@bookedbarber.com", "+1-555-0125", "💎")
        ]
        
        barber_ids = []
        for name, email, phone, symbol in barbers:
            profile_data = json.dumps({
                "symbol": symbol,
                "specialties": ["Haircuts", "Styling"],
                "bio": f"Professional barber with years of experience.",
                "working_hours": {"start": "09:00", "end": "18:00"}
            })
            
            cursor.execute("""
                INSERT INTO users (email, hashed_password, name, phone, role, is_active, is_verified, 
                                 profile_data, timezone, created_at)
                VALUES (?, ?, ?, ?, 'barber', 1, 1, ?, 'America/New_York', ?)
            """, (email, pwd_context.hash("password123"), name, phone, profile_data, datetime.now()))
            
            barber_ids.append(cursor.lastrowid)
        
        conn.commit()
        print(f"   ✅ Created {len(barbers)} barbers")
        
        # Create clients
        print("👥 Creating clients...")
        clients = [
            ("John Smith", "john.smith@email.com", "+1-555-1001"),
            ("Michael Brown", "mike.brown@email.com", "+1-555-1002"),
            ("David Wilson", "david.wilson@email.com", "+1-555-1003"),
            ("Chris Davis", "chris.davis@email.com", "+1-555-1004"),
            ("James Miller", "james.miller@email.com", "+1-555-1005")
        ]
        
        client_ids = []
        for name, email, phone in clients:
            cursor.execute("""
                INSERT INTO users (email, hashed_password, name, phone, role, is_active, is_verified, 
                                 timezone, created_at)
                VALUES (?, ?, ?, ?, 'client', 1, 1, 'America/New_York', ?)
            """, (email, pwd_context.hash("client123"), name, phone, datetime.now()))
            
            client_ids.append(cursor.lastrowid)
        
        conn.commit()
        print(f"   ✅ Created {len(clients)} clients")
        
        # Get service IDs
        cursor.execute("SELECT id FROM services")
        service_ids = [row[0] for row in cursor.fetchall()]
        
        # Create appointments
        print("📅 Creating appointments...")
        now = datetime.now()
        appointments_created = 0
        
        # Create appointments across different time periods
        appointment_periods = [
            # Past appointments
            {"days_range": (-14, -1), "count": 8, "statuses": ["completed"]},
            # Current/today
            {"days_range": (0, 0), "count": 6, "statuses": ["confirmed", "pending"]}, 
            # Tomorrow
            {"days_range": (1, 1), "count": 5, "statuses": ["confirmed"]},
            # Future 
            {"days_range": (2, 14), "count": 12, "statuses": ["confirmed", "pending"]},
            # Far future
            {"days_range": (15, 30), "count": 8, "statuses": ["confirmed"]}
        ]
        
        for period in appointment_periods:
            for _ in range(period["count"]):
                # Random selections
                days_offset = random.randint(period["days_range"][0], period["days_range"][1])
                appointment_date = now + timedelta(days=days_offset)
                
                # Random time during business hours
                hour = random.randint(9, 18)
                minute = random.choice([0, 15, 30, 45])
                appointment_time = appointment_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                barber_id = random.choice(barber_ids)
                client_id = random.choice(client_ids)
                service_id = random.choice(service_ids)
                status = random.choice(period["statuses"])
                
                # Get service details for duration and price
                cursor.execute("SELECT duration_minutes, base_price FROM services WHERE id = ?", (service_id,))
                duration, price = cursor.fetchone()
                
                cursor.execute("""
                    INSERT INTO appointments (user_id, client_id, service_id, start_time, duration_minutes,
                                            status, price, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (barber_id, client_id, service_id, appointment_time, duration, status, price,
                      f"Sample appointment - {status}", datetime.now()))
                
                appointments_created += 1
        
        conn.commit()
        print(f"   ✅ Created {appointments_created} appointments")
        
        # Print summary
        print("\n📋 Staging Data Summary:")
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'barber'")
        barber_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'client'")
        client_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM appointments")
        appointment_count = cursor.fetchone()[0]
        
        print(f"   👨‍💼 Barbers: {barber_count}")
        print(f"   👥 Clients: {client_count}")
        print(f"   🛠️ Services: {service_count}")
        print(f"   📅 Appointments: {appointment_count}")
        
        print(f"\n🌐 Staging Environment:")
        print(f"   Frontend: http://localhost:3002")
        print(f"   Backend: http://localhost:8001")
        print(f"   API Docs: http://localhost:8001/docs")
        
        print(f"\n🔐 Test Credentials:")
        print(f"   Barber: marcus@bookedbarber.com / password123")
        print(f"   Client: john.smith@email.com / client123")
        
        print("\n✨ Features ready for testing:")
        print("   🎨 Service color coding")
        print("   👤 Barber symbols")
        print("   🖱️ Drag-and-drop appointments")
        print("   📊 Realistic appointment distribution")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("BookedBarber V2 - Simple Staging Data Population")
    print("=" * 60)
    
    success = populate_staging_data()
    
    if success:
        print("\n🎉 Success! Staging environment populated with test data.")
        print("🚀 Ready for comprehensive app testing!")
    else:
        print("\n❌ Failed to populate staging data.")