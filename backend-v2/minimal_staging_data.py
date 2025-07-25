#!/usr/bin/env python3
"""
Minimal staging data population script.
Creates essential test data for calendar testing.
"""

import sqlite3
from datetime import datetime, timedelta
import random

def populate_minimal_data():
    """Populate staging database with minimal test data."""
    print("🚀 Populating staging database with minimal test data...\n")
    
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
        
        # Create services with minimal required fields
        print("🛠️ Creating services...")
        services = [
            ("Classic Haircut", 30, 35.00, "Traditional men's haircut"),
            ("Beard Trim", 20, 25.00, "Professional beard trimming"),
            ("Hair & Beard Combo", 45, 55.00, "Complete grooming experience"),
            ("Premium Cut", 60, 75.00, "Luxury haircut with wash"),
            ("Buzz Cut", 15, 20.00, "Quick military-style cut"),
            ("Fade Cut", 40, 45.00, "Modern fade styling"),
        ]
        
        for name, duration, price, description in services:
            cursor.execute("""
                INSERT INTO services (name, duration_minutes, base_price, description, category, is_active, is_bookable_online, created_at)
                VALUES (?, ?, ?, ?, 'haircut', 1, 1, ?)
            """, (name, duration, price, description, datetime.now().isoformat()))
        
        conn.commit()
        print(f"   ✅ Created {len(services)} services")
        
        # Create barbers with minimal required fields
        print("👨‍💼 Creating barbers...")
        barbers = [
            ("Marcus Johnson", "marcus@bookedbarber.com", "+1-555-0123"),
            ("Diego Rivera", "diego@bookedbarber.com", "+1-555-0124"),
            ("Aisha Thompson", "aisha@bookedbarber.com", "+1-555-0125")
        ]
        
        barber_ids = []
        for name, email, phone in barbers:
            cursor.execute("""
                INSERT INTO users (email, hashed_password, name, phone, role, is_active, timezone, created_at)
                VALUES (?, 'test_hash', ?, ?, 'barber', 1, 'America/New_York', ?)
            """, (email, name, phone, datetime.now().isoformat()))
            
            barber_ids.append(cursor.lastrowid)
        
        conn.commit()
        print(f"   ✅ Created {len(barbers)} barbers")
        
        # Create clients
        print("👥 Creating clients...")
        clients = [
            ("John Smith", "john.smith@email.com", "+1-555-1001"),
            ("Michael Brown", "mike.brown@email.com", "+1-555-1002"),
            ("David Wilson", "david.wilson@email.com", "+1-555-1003"),
        ]
        
        client_ids = []
        for name, email, phone in clients:
            cursor.execute("""
                INSERT INTO users (email, hashed_password, name, phone, role, is_active, timezone, created_at)
                VALUES (?, 'test_hash', ?, ?, 'client', 1, 'America/New_York', ?)
            """, (email, name, phone, datetime.now().isoformat()))
            
            client_ids.append(cursor.lastrowid)
        
        conn.commit()
        print(f"   ✅ Created {len(clients)} clients")
        
        # Get service IDs
        cursor.execute("SELECT id FROM services")
        service_ids = [row[0] for row in cursor.fetchall()]
        
        # Create sample appointments
        print("📅 Creating appointments...")
        now = datetime.now()
        appointments_created = 0
        
        # Create appointments for different time periods
        for days_offset in [-7, -1, 0, 1, 2, 7, 14]:
            for hour in [9, 11, 14, 16]:
                appointment_time = now.replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(days=days_offset)
                
                barber_id = random.choice(barber_ids)
                client_id = random.choice(client_ids)
                service_id = random.choice(service_ids)
                
                if days_offset < 0:
                    status = "completed"
                elif days_offset == 0:
                    status = "confirmed"
                else:
                    status = "confirmed"
                
                cursor.execute("SELECT duration_minutes, base_price FROM services WHERE id = ?", (service_id,))
                duration, price = cursor.fetchone()
                
                cursor.execute("""
                    INSERT INTO appointments (user_id, barber_id, client_id, service_id, start_time, duration_minutes, 
                                            status, price, created_at, version, is_test_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
                """, (barber_id, barber_id, client_id, service_id, appointment_time.isoformat(), duration, status, price, datetime.now().isoformat()))
                
                appointments_created += 1
        
        conn.commit()
        print(f"   ✅ Created {appointments_created} appointments")
        
        # Print summary
        print("\n📋 Staging Data Summary:")
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'barber'")
        print(f"   👨‍💼 Barbers: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'client'")
        print(f"   👥 Clients: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM services")
        print(f"   🛠️ Services: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM appointments")
        print(f"   📅 Appointments: {cursor.fetchone()[0]}")
        
        print(f"\n🌐 Access staging environment:")
        print(f"   Frontend: http://localhost:3002")
        print(f"   Backend: http://localhost:8001")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("BookedBarber V2 - Minimal Staging Data Population")
    print("=" * 60)
    
    success = populate_minimal_data()
    
    if success:
        print("\n🎉 Success! Staging environment ready for testing.")
        print("🚀 Calendar should now display sample appointments!")
    else:
        print("\n❌ Failed to populate staging data.")