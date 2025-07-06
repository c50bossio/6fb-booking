#!/usr/bin/env python3
"""
Create test appointments for enterprise accounts with proper barber assignments
"""

import sqlite3
from datetime import datetime, timedelta
import random

# Database connection
DB_PATH = "6fb_booking.db"

def create_enterprise_appointments():
    """Create test appointments for enterprise owner's locations"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get the enterprise owner user ID
    cursor.execute("SELECT id FROM users WHERE email = ?", ("enterprise.owner@elitebarbergroup.com",))
    enterprise_owner = cursor.fetchone()
    if not enterprise_owner:
        print("❌ Enterprise owner not found.")
        return
    
    owner_id = enterprise_owner[0]
    print(f"✅ Found enterprise owner: ID {owner_id}")
    
    # Get barbers for each location
    barbers_by_org = {
        11: [],  # Manhattan
        12: [],  # Brooklyn
    }
    
    # Get Manhattan barbers
    cursor.execute("""
        SELECT u.id, u.email, u.name 
        FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id 
        WHERE uo.organization_id = 11 AND u.unified_role IN ('barber', 'shop_manager')
    """)
    manhattan_barbers = cursor.fetchall()
    barbers_by_org[11] = manhattan_barbers
    print(f"✅ Found {len(manhattan_barbers)} barbers in Manhattan location")
    
    # Get Brooklyn barbers  
    cursor.execute("""
        SELECT u.id, u.email, u.name 
        FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id 
        WHERE uo.organization_id = 12 AND u.unified_role = 'barber'
    """)
    brooklyn_barbers = cursor.fetchall()
    barbers_by_org[12] = brooklyn_barbers
    print(f"✅ Found {len(brooklyn_barbers)} barbers in Brooklyn location")
    
    # Get services
    cursor.execute("""
        SELECT id, name, duration_minutes, base_price 
        FROM services 
        WHERE is_active = 1 AND is_bookable_online = 1
        LIMIT 10
    """)
    services = cursor.fetchall()
    
    # Get clients
    cursor.execute("""
        SELECT id, first_name, last_name 
        FROM clients 
        WHERE is_test_data = 1
        LIMIT 20
    """)
    clients = cursor.fetchall()
    
    # Create appointments
    appointments_created = 0
    now = datetime.now()
    
    # Create appointments for the next 2 weeks
    for org_id, org_barbers in barbers_by_org.items():
        if not org_barbers:
            continue
            
        org_name = "Manhattan" if org_id == 11 else "Brooklyn"
        
        for day_offset in range(14):  # 2 weeks
            current_day = now + timedelta(days=day_offset)
            
            # Skip if Sunday
            if current_day.weekday() == 6:
                continue
            
            # 4-8 appointments per day per location
            daily_appointments = random.randint(4, 8)
            
            # Track used time slots to avoid conflicts
            used_times = []
            
            for _ in range(daily_appointments):
                # Random time between 9 AM and 6 PM
                hour = random.randint(9, 17)
                minute = random.choice([0, 30])
                
                # Ensure no time conflicts
                time_slot = (hour, minute)
                if time_slot in used_times:
                    continue
                used_times.append(time_slot)
                
                # Select random barber, service and client
                barber_id, barber_email, barber_name = random.choice(org_barbers)
                service_id, service_name, duration, price = random.choice(services)
                client_id, first_name, last_name = random.choice(clients)
                
                # Set appointment time
                appointment_time = current_day.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Determine status based on time
                if appointment_time < now:
                    status = "completed"
                elif appointment_time < now + timedelta(hours=24):
                    status = random.choice(["confirmed", "pending"])
                else:
                    status = random.choice(["confirmed", "pending", "confirmed"])
                
                # Insert appointment
                cursor.execute("""
                    INSERT INTO appointments (
                        user_id, barber_id, client_id, service_id,
                        service_name, start_time, duration_minutes,
                        price, status, notes, is_test_data,
                        created_at, version, location_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    owner_id,  # Enterprise owner can see all appointments
                    barber_id,
                    client_id,
                    service_id,
                    service_name,
                    appointment_time,
                    duration,
                    price,
                    status,
                    f"Test appointment - {service_name} @ {org_name} with {barber_name or barber_email}",
                    1,  # is_test_data
                    now,
                    1,  # version
                    org_id  # location_id (using org_id as location_id)
                ))
                
                appointments_created += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Created {appointments_created} test appointments for enterprise locations!")
    print("\nEnterprise Owner Login:")
    print("  Email: enterprise.owner@elitebarbergroup.com")
    print("  Password: test123")
    print("\nThis account has:")
    print("  - 2 locations (Manhattan & Brooklyn)")
    print("  - Multiple barbers at each location")
    print(f"  - {appointments_created} appointments across both locations")

if __name__ == "__main__":
    create_enterprise_appointments()