#!/usr/bin/env python3
"""
Debug script to check appointment data structure
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import SessionLocal
from models import Appointment, User, Client
from services.appointment_enhancement import enhance_appointments_list
from pprint import pprint
import json

def debug_appointment_structure():
    """Check the structure of appointments as returned by the API"""
    db = SessionLocal()
    try:
        # Get a sample appointment
        appointments = db.query(Appointment).limit(5).all()
        
        if not appointments:
            print("No appointments found in database")
            return
            
        print(f"Found {len(appointments)} appointments")
        print("\n1. Raw appointment model fields:")
        if appointments:
            apt = appointments[0]
            print(f"  - id: {apt.id}")
            print(f"  - start_time: {apt.start_time}")
            print(f"  - duration_minutes: {apt.duration_minutes}")
            print(f"  - service_name: {apt.service_name}")
            print(f"  - barber_id: {apt.barber_id}")
            print(f"  - client_id: {apt.client_id}")
            print(f"  - status: {apt.status}")
            
        print("\n2. Enhanced appointment structure:")
        enhanced = enhance_appointments_list(appointments, db)
        if enhanced:
            print("Enhanced appointment keys:")
            for key in enhanced[0].keys():
                print(f"  - {key}: {type(enhanced[0][key]).__name__}")
                
            print("\n3. Sample enhanced appointment:")
            pprint(enhanced[0])
            
            print("\n4. JSON serialized (as sent to frontend):")
            print(json.dumps(enhanced[0], indent=2, default=str))
            
        # Check if barber and client relationships are loaded
        if appointments[0].barber:
            print(f"\n5. Barber relationship loaded: {appointments[0].barber.name or appointments[0].barber.email}")
        if appointments[0].client:
            print(f"6. Client relationship loaded: {appointments[0].client.first_name} {appointments[0].client.last_name}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_appointment_structure()