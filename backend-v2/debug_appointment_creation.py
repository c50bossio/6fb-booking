#!/usr/bin/env python3
"""
Debug appointment creation flow to identify issues.
"""
import sys
sys.path.append('.')

from db import SessionLocal
from models import User, Appointment, Service
from services import booking_service
from datetime import date, timedelta
import traceback

def test_appointment_creation():
    db = SessionLocal()
    try:
        print("🔍 DEBUGGING APPOINTMENT CREATION FLOW")
        print("=" * 50)
        
        # 1. Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@6fb.com").first()
        if not admin:
            print("❌ Admin user not found")
            return
        print(f"✅ Found admin user: {admin.email} (ID: {admin.id})")
        
        # 2. Check services
        print("\n🔍 Checking available services...")
        services = db.query(Service).all()
        print(f"✅ Found {len(services)} services in database")
        for service in services:
            print(f"  - {service.name}: ${service.base_price}, {service.duration_minutes}min")
        
        # 3. Check if we can get available slots
        print("\n🔍 Testing slot availability...")
        tomorrow = date.today() + timedelta(days=1)
        
        try:
            slots_data = booking_service.get_available_slots(db, tomorrow)
            print(f"✅ Found slots for {tomorrow}")
            print(f"  - Total slots: {len(slots_data.get('slots', []))}")
            available_slots = [s for s in slots_data.get('slots', []) if s.get('available')]
            print(f"  - Available slots: {len(available_slots)}")
            
            if available_slots:
                print(f"  - First available slot: {available_slots[0]['time']}")
            else:
                print("  ⚠️  No available slots found")
                
        except Exception as e:
            print(f"❌ Error getting slots: {str(e)}")
            traceback.print_exc()
        
        # 4. Test appointment creation
        if available_slots:
            print("\n🔍 Testing appointment creation...")
            try:
                first_slot = available_slots[0]['time']
                
                # Try creating appointment
                appointment = booking_service.create_booking(
                    db=db,
                    user_id=admin.id,
                    booking_date=tomorrow,
                    booking_time=first_slot,
                    service="Haircut",
                    user_timezone="America/New_York"
                )
                
                print(f"✅ Successfully created appointment!")
                print(f"  - ID: {appointment.id}")
                print(f"  - Service: {appointment.service_name}")
                print(f"  - Start time: {appointment.start_time}")
                print(f"  - Status: {appointment.status}")
                
                # Verify appointment exists
                created_apt = db.query(Appointment).filter(Appointment.id == appointment.id).first()
                if created_apt:
                    print(f"✅ Appointment verified in database")
                else:
                    print(f"❌ Appointment not found in database")
                
            except Exception as e:
                print(f"❌ Error creating appointment: {str(e)}")
                traceback.print_exc()
        
        # 5. Check frontend API endpoint behavior
        print("\n🔍 Testing appointments API endpoint logic...")
        from schemas import AppointmentCreate
        
        try:
            # Simulate the request from frontend
            appointment_data = AppointmentCreate(
                date=tomorrow,
                time="10:00",
                service="Haircut",
                notes="Test appointment"
            )
            
            print(f"✅ Schema validation passed")
            print(f"  - Date: {appointment_data.date}")
            print(f"  - Time: {appointment_data.time}")
            print(f"  - Service: {appointment_data.service}")
            
        except Exception as e:
            print(f"❌ Schema validation failed: {str(e)}")
            traceback.print_exc()
        
        # 6. Check booking settings
        print("\n🔍 Checking booking settings...")
        try:
            settings = booking_service.get_booking_settings(db)
            print(f"✅ Booking settings found")
            print(f"  - Business hours: {settings.business_start_time} - {settings.business_end_time}")
            print(f"  - Slot duration: {settings.slot_duration_minutes} minutes")
            print(f"  - Min lead time: {settings.min_lead_time_minutes} minutes")
            print(f"  - Max advance days: {settings.max_advance_days}")
            
        except Exception as e:
            print(f"❌ Error getting booking settings: {str(e)}")
            traceback.print_exc()
        
        # 7. Check for potential barber issues
        print("\n🔍 Checking barber availability...")
        try:
            from services import barber_availability_service
            
            barbers = db.query(User).filter(
                User.role.in_(["barber", "admin", "super_admin"]),
                User.is_active == True
            ).all()
            
            print(f"✅ Found {len(barbers)} active barbers")
            for barber in barbers:
                print(f"  - {barber.name or barber.email} ({barber.role})")
                
            if barbers:
                # Check if first barber has availability
                first_barber = barbers[0]
                available = barber_availability_service.get_available_barbers_for_slot(
                    db=db,
                    check_date=tomorrow,
                    start_time=appointment_data.time,
                    end_time="10:30"  # 30 min slot
                )
                print(f"  - Available barbers for {appointment_data.time}: {len(available)}")
            
        except Exception as e:
            print(f"❌ Error checking barber availability: {str(e)}")
            traceback.print_exc()
        
    finally:
        db.close()

def test_frontend_api_call():
    """Test the exact API call that the frontend makes"""
    print("\n" + "=" * 50)
    print("🔍 TESTING FRONTEND API CALL")
    print("=" * 50)
    
    import requests
    
    # Get token first
    try:
        login_response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"email": "admin@6fb.com", "password": "admin123"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            print("✅ Successfully logged in")
            
            # Test appointment creation
            tomorrow = (date.today() + timedelta(days=1)).isoformat()
            
            appointment_data = {
                "date": tomorrow,
                "time": "10:00",
                "service": "Haircut",
                "notes": "Test from debug script"
            }
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                "http://localhost:8000/api/v1/appointments",
                json=appointment_data,
                headers=headers
            )
            
            print(f"API Response Status: {response.status_code}")
            print(f"API Response Body: {response.text}")
            
            if response.status_code == 200:
                print("✅ Appointment created successfully via API")
            else:
                print("❌ API call failed")
                
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Is it running on port 8000?")
    except Exception as e:
        print(f"❌ Error testing API: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    test_appointment_creation()
    test_frontend_api_call()