#!/usr/bin/env python3
"""
Populate test appointments directly in the database for calendar testing
"""

import sqlite3
from datetime import datetime, timedelta
import random
import uuid

# Database connection
DB_PATH = "6fb_booking.db"

# Service types
SERVICES = [
    ("Haircut", 60, 45.00),
    ("Shave", 30, 25.00),
    ("Haircut & Shave", 90, 65.00),
]

# Client names for variety
CLIENTS = [
    ("John Smith", "john.smith@example.com", "+11234567890"),
    ("Michael Johnson", "michael.johnson@example.com", "+11234567891"),
    ("David Williams", "david.williams@example.com", "+11234567892"),
    ("James Brown", "james.brown@example.com", "+11234567893"),
    ("Robert Davis", "robert.davis@example.com", "+11234567894"),
    ("William Miller", "william.miller@example.com", "+11234567895"),
    ("Richard Wilson", "richard.wilson@example.com", "+11234567896"),
    ("Joseph Moore", "joseph.moore@example.com", "+11234567897"),
    ("Thomas Taylor", "thomas.taylor@example.com", "+11234567898"),
    ("Charles Anderson", "charles.anderson@example.com", "+11234567899"),
]

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
    
    # Clear existing appointments (optional)
    cursor.execute("DELETE FROM appointments WHERE notes LIKE '%Test appointment%'")
    
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
            service_name, duration, price = random.choice(SERVICES)
            client_name, client_email, client_phone = random.choice(CLIENTS)
            
            # Set appointment time
            appointment_time = current_day.replace(hour=hour, minute=minute)
            end_time = appointment_time + timedelta(minutes=duration)
            
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
                        client_name, client_email, client_phone,
                        service_name, start_time, end_time,
                        price, status, notes, barber_id,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    client_name, client_email, client_phone,
                    service_name, appointment_time.isoformat(), end_time.isoformat(),
                    price, status, f"Test appointment for {service_name}",
                    barber_id, datetime.now().isoformat(), datetime.now().isoformat()
                ))
                
                appointments_created += 1
                print(f"✅ Created appointment: {client_name} - {service_name} at {appointment_time.strftime('%Y-%m-%d %H:%M')}")
                
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

if __name__ == "__main__":
    print("📅 Creating test appointments...")
    create_appointments()