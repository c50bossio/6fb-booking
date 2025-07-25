#!/usr/bin/env python3
"""
Create test appointments for calendar testing
"""

import requests
from datetime import datetime, timedelta
import random

# API configuration
API_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin.test@bookedbarber.com"
ADMIN_PASSWORD = "AdminTest123"

# Service types for variety - must match API validation
SERVICES = [
    {"name": "Haircut", "duration": 60, "price": 45},
    {"name": "Shave", "duration": 30, "price": 25},
    {"name": "Haircut & Shave", "duration": 90, "price": 65},
    {"name": "Haircut", "duration": 30, "price": 20},  # Different price point
    {"name": "Shave", "duration": 45, "price": 35}  # Premium shave
]

# Client names for variety
CLIENTS = [
    "John Smith", "Michael Johnson", "David Williams", "James Brown",
    "Robert Davis", "William Miller", "Richard Wilson", "Joseph Moore",
    "Thomas Taylor", "Charles Anderson", "Christopher Thomas", "Daniel Jackson"
]

# Appointment statuses
STATUSES = ["confirmed", "pending", "completed"]

def login():
    """Login as admin and get token"""
    response = requests.post(
        f"{API_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def create_appointment(token, appointment_data):
    """Create a single appointment"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{API_URL}/api/v1/appointments",
        json=appointment_data,
        headers=headers
    )
    
    if response.status_code in [200, 201]:
        return response.json()
    else:
        print(f"Failed to create appointment: {response.status_code} - {response.text}")
        return None

def create_test_appointments(token):
    """Create multiple test appointments"""
    appointments_created = []
    
    # Get current date and time
    now = datetime.now()
    today = now.replace(hour=9, minute=0, second=0, microsecond=0)
    
    # Create appointments for the next 7 days
    for day_offset in range(7):
        current_day = today + timedelta(days=day_offset)
        
        # Skip weekends if desired
        if current_day.weekday() in [5, 6]:  # Saturday, Sunday
            appointments_per_day = random.randint(2, 4)
        else:
            appointments_per_day = random.randint(4, 8)
        
        # Create appointments throughout the day
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
            service = random.choice(SERVICES)
            client = random.choice(CLIENTS)
            
            # Set appointment time
            appointment_time = current_day.replace(hour=hour, minute=minute)
            end_time = appointment_time + timedelta(minutes=service["duration"])
            
            # Determine status based on time
            if appointment_time < now:
                status = "completed"
            elif appointment_time < now + timedelta(hours=24):
                status = random.choice(["confirmed", "pending"])
            else:
                status = random.choice(["confirmed", "pending", "confirmed"])  # More confirmed
            
            # Create appointment data using correct API schema
            appointment_data = {
                "date": appointment_time.strftime("%Y-%m-%d"),
                "time": appointment_time.strftime("%H:%M"),
                "service": service["name"],
                "notes": f"Test appointment for {client}",
                "barber_id": None  # Will be assigned to current user
            }
            
            # Assign to a barber (if you have barber IDs)
            # appointment_data["barber_id"] = random.choice([1, 2, 3])
            
            print(f"Creating appointment: {client} - {service['name']} at {appointment_time.strftime('%Y-%m-%d %H:%M')}")
            
            result = create_appointment(token, appointment_data)
            if result:
                appointments_created.append(result)
    
    return appointments_created

def main():
    print("🔐 Logging in as admin...")
    token = login()
    
    if not token:
        print("❌ Failed to login")
        return
    
    print("✅ Login successful")
    print("\n📅 Creating test appointments...")
    
    appointments = create_test_appointments(token)
    
    print(f"\n✅ Created {len(appointments)} test appointments")
    print("\n📊 Summary:")
    print(f"- Total appointments: {len(appointments)}")
    
    # Count by status
    status_counts = {}
    for apt in appointments:
        status = apt.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    for status, count in status_counts.items():
        print(f"- {status.capitalize()}: {count}")
    
    print("\n🎯 You can now test the calendar with:")
    print("- Drag & drop appointments to different time slots")
    print("- Edit appointment details")
    print("- Cancel appointments")
    print("- View appointment hover effects")
    print("- Test the availability heatmap")

if __name__ == "__main__":
    main()