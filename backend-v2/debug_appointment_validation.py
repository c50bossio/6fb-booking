#!/usr/bin/env python3
"""
Debug script to show how Pydantic schema validation affects appointment data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import SessionLocal
from models import Appointment
from services.appointment_enhancement import enhance_appointments_list
from schemas import AppointmentResponse, AppointmentListResponse
from pprint import pprint
import json

def debug_schema_validation():
    """Show how Pydantic validation strips enhanced fields"""
    db = SessionLocal()
    try:
        # Get sample appointments
        appointments = db.query(Appointment).limit(2).all()
        
        if not appointments:
            print("No appointments found")
            return
            
        print("1. Enhanced appointment data (what enhance_appointments_list returns):")
        enhanced = enhance_appointments_list(appointments, db)
        print(f"Keys in enhanced data: {list(enhanced[0].keys())}")
        print(f"\nSample enhanced appointment:")
        pprint(enhanced[0])
        
        print("\n2. After Pydantic validation (what API returns with response_model):")
        # Simulate what happens with response_model=AppointmentListResponse
        validated_response = AppointmentListResponse(
            appointments=enhanced,
            total=len(enhanced)
        )
        
        # Convert to dict to see what gets sent
        validated_dict = validated_response.model_dump()
        print(f"Keys in validated appointment: {list(validated_dict['appointments'][0].keys())}")
        print(f"\nSample validated appointment:")
        pprint(validated_dict['appointments'][0])
        
        print("\n3. Missing fields after validation:")
        enhanced_keys = set(enhanced[0].keys())
        validated_keys = set(validated_dict['appointments'][0].keys())
        missing_fields = enhanced_keys - validated_keys
        print(f"Fields stripped by Pydantic: {missing_fields}")
        
        print("\n4. Frontend expects these fields (from BookingResponse type):")
        print("- barber_name (optional)")
        print("- client_name (optional)")
        print("- client_email (optional)")
        print("- client_phone (optional)")
        print("- end_time (optional)")
        
        print("\n5. Solution needed:")
        print("The AppointmentResponse schema needs to include the enhanced fields")
        print("so they don't get stripped out by Pydantic validation.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_schema_validation()