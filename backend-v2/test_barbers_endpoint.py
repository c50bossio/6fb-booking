#!/usr/bin/env python3
"""Test the barbers endpoint directly"""

import requests
import json

def test_barbers_endpoint():
    try:
        print("Testing barbers endpoint...")
        
        # Test the barbers endpoint
        response = requests.get("http://localhost:8000/api/v1/barbers/")
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data)} barbers:")
            for barber in data:
                print(f"  - ID: {barber.get('id')}, Name: {barber.get('name')}, Role: {barber.get('role')}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_database_directly():
    try:
        print("\nTesting database directly...")
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import User
        
        db = SessionLocal()
        try:
            barbers = db.query(User).filter(
                User.role.in_(["barber", "admin", "super_admin"]),
                User.is_active == True
            ).all()
            
            print(f"Found {len(barbers)} barbers in database:")
            for barber in barbers:
                print(f"  - ID: {barber.id}, Name: {barber.name}, Role: {barber.role}, Email: {barber.email}")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"Database exception: {e}")

if __name__ == "__main__":
    test_barbers_endpoint()
    test_database_directly()