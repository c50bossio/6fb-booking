#!/usr/bin/env python3
"""
Create test appointments using existing services and clients in the database
"""

import sqlite3
from datetime import datetime, timedelta
import random

# Database connection
DB_PATH = "6fb_booking.db"

def create_appointments():
    """Create test appointments in the database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get the admin user (barber)
    cursor.execute("SELECT id FROM users WHERE email = ?", ("admin.test@bookedbarber.com",))
    admin_user = cursor.fetchone()
    
    if not admin_user:
        print("❌ Admin user not found. Please run create_test_admin.py first.")
        return
    
    barber_id = admin_user[0]
    
    # Get active services
    cursor.execute("""
        SELECT id, name, duration_minutes, base_price 
        FROM services 
        WHERE is_active = 1 AND is_bookable_online = 1
        LIMIT 10
    """)
    services = cursor.fetchall()
    
    if not services:
        print("❌ No active services found.")
        return
    
    # Get test clients
    cursor.execute("""
        SELECT id, first_name, last_name 
        FROM clients 
        WHERE is_test_data = 1
        LIMIT 20
    """)
    clients = cursor.fetchall()
    
    if not clients:
        print("❌ No test clients found.")
        return
    
    # Clear existing test appointments
    cursor.execute("DELETE FROM appointments WHERE is_test_data = 1")
    
    # Generate appointments for the next 7 days
    now = datetime.now()
    today = now.replace(hour=9, minute=0, second=0, microsecond=0)
    
    appointments_created = 0
    
    for day_offset in range(7):
        current_day = today + timedelta(days=day_offset)
        
        # Skip weekends or create fewer appointments
        if current_day.weekday() in [5, 6]:  # Saturday, Sunday
            appointments_per_day = random.randint(2, 4)
        else:
            appointments_per_day = random.randint(4, 8)
        
        # Track used time slots to avoid conflicts
        used_times = []
        
        for _ in range(appointments_per_day):
            # Random time between 9 AM and 6 PM
            hour = random.randint(9, 17)
            minute = random.choice([0, 30])
            
            # Ensure no time conflicts
            time_slot = (hour, minute)
            if time_slot in used_times:
                continue
            used_times.append(time_slot)
            
            # Select random service and client
            service_id, service_name, duration, price = random.choice(services)
            client_id, first_name, last_name = random.choice(clients)
            
            # Set appointment time
            appointment_time = current_day.replace(hour=hour, minute=minute)
            
            # Determine status based on time
            if appointment_time < now:
                status = "completed"
            elif appointment_time < now + timedelta(hours=24):
                status = random.choice(["confirmed", "pending"])
            else:
                status = random.choice(["confirmed", "pending", "confirmed"])  # More confirmed
            
            # Create appointment
            try:
                cursor.execute("""
                    INSERT INTO appointments (
                        user_id, barber_id, client_id, service_id,
                        service_name, start_time, duration_minutes,
                        price, status, notes, is_test_data,
                        created_at, version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    barber_id, barber_id, client_id, service_id,
                    service_name, appointment_time.isoformat(), duration,
                    price, status, f"Test appointment - {service_name}",
                    True, datetime.now().isoformat(), 1
                ))
                
                appointments_created += 1
                print(f"✅ Created: {first_name} {last_name} - {service_name} at {appointment_time.strftime('%Y-%m-%d %H:%M')}")
                
            except Exception as e:
                print(f"❌ Failed to create appointment: {e}")
    
    # Commit changes
    conn.commit()
    conn.close()
    
    print(f"\n✅ Created {appointments_created} test appointments")
    print("\n🎯 You can now test the calendar with:")
    print("- Drag & drop appointments to different time slots")
    print("- Edit appointment details")
    print("- Cancel appointments")
    print("- View appointment hover effects")
    print("- Test the availability heatmap")
    print("\n📍 View the calendar at: http://localhost:3001/calendar")

if __name__ == "__main__":
    print("📅 Creating test appointments...")
    create_appointments()