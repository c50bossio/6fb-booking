#!/usr/bin/env python3
"""
Setup and Demo Script for 6FB Booking Platform
==============================================
This script creates a working test user and demonstrates the calendar features.

Usage:
    python setup_test_demo.py

Features:
    1. Creates a test user with proper password hashing
    2. Tests login with correct credentials
    3. Creates sample appointments for today
    4. Opens the calendar page in browser
"""

import os
import sys
from datetime import datetime, timedelta, timezone
import webbrowser
import time
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import subprocess
import json

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our models and utilities
from db import Base, engine, SessionLocal
from models import User, Appointment, Service, Client
from utils.auth import get_password_hash, authenticate_user

# API base URL
API_BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Test user credentials
TEST_EMAIL = "demo@6fb.com"
TEST_PASSWORD = "Demo123!@#"
TEST_NAME = "Demo Barber"

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user(db):
    """Create a test barber user with proper password hashing."""
    print("\n🔧 Creating test user...")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == TEST_EMAIL).first()
    if existing_user:
        print(f"   ℹ️  User {TEST_EMAIL} already exists, updating password...")
        # Update the password
        existing_user.hashed_password = get_password_hash(TEST_PASSWORD)
        existing_user.role = "barber"
        existing_user.name = TEST_NAME
        existing_user.is_active = True
        db.commit()
        print("   ✅ User password updated successfully!")
        return existing_user
    
    # Create new user
    hashed_password = get_password_hash(TEST_PASSWORD)
    user = User(
        email=TEST_EMAIL,
        name=TEST_NAME,
        hashed_password=hashed_password,
        role="barber",
        is_active=True,
        timezone="America/New_York",
        commission_rate=0.20
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    print(f"   ✅ User created successfully!")
    print(f"   📧 Email: {TEST_EMAIL}")
    print(f"   🔑 Password: {TEST_PASSWORD}")
    print(f"   👤 Role: barber")
    
    return user

def test_login():
    """Test login with the created user."""
    print("\n🔐 Testing login...")
    
    login_data = {
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/v1/auth/login", json=login_data)
        
        if response.status_code == 200:
            tokens = response.json()
            print("   ✅ Login successful!")
            print(f"   🎫 Access token: {tokens['access_token'][:30]}...")
            return tokens
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Login error: {str(e)}")
        return None

def create_test_service(db, user_id):
    """Create a test service."""
    print("\n💈 Creating test service...")
    
    service = db.query(Service).filter(Service.barber_id == user_id).first()
    if service:
        print("   ℹ️  Service already exists")
        return service
    
    service = Service(
        name="Premium Haircut",
        description="Professional haircut with consultation",
        duration=45,
        price=50.00,
        barber_id=user_id,
        is_active=True
    )
    
    db.add(service)
    db.commit()
    db.refresh(service)
    
    print("   ✅ Service created: Premium Haircut ($50)")
    return service

def create_test_clients(db):
    """Create test clients."""
    print("\n👥 Creating test clients...")
    
    clients_data = [
        {"name": "John Smith", "email": "john@example.com", "phone": "+1234567890"},
        {"name": "Mike Johnson", "email": "mike@example.com", "phone": "+1234567891"},
        {"name": "David Williams", "email": "david@example.com", "phone": "+1234567892"},
    ]
    
    clients = []
    for client_data in clients_data:
        existing = db.query(Client).filter(Client.email == client_data["email"]).first()
        if existing:
            clients.append(existing)
            continue
            
        client = Client(**client_data)
        db.add(client)
        db.commit()
        db.refresh(client)
        clients.append(client)
    
    print(f"   ✅ Created/found {len(clients)} test clients")
    return clients

def create_test_appointments(db, user_id, service_id, clients):
    """Create test appointments for today with various statuses."""
    print("\n📅 Creating test appointments...")
    
    # Get current time in EST
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
    
    appointments_data = [
        # Completed appointments (for revenue)
        {
            "start_time": today_start,
            "end_time": today_start + timedelta(minutes=45),
            "status": "completed",
            "client": clients[0],
            "price": 50.00
        },
        {
            "start_time": today_start + timedelta(hours=1),
            "end_time": today_start + timedelta(hours=1, minutes=45),
            "status": "completed",
            "client": clients[1],
            "price": 50.00
        },
        # Upcoming appointment
        {
            "start_time": now + timedelta(hours=2),
            "end_time": now + timedelta(hours=2, minutes=45),
            "status": "confirmed",
            "client": clients[2],
            "price": 50.00
        },
        # Future appointments
        {
            "start_time": now + timedelta(hours=4),
            "end_time": now + timedelta(hours=4, minutes=45),
            "status": "confirmed",
            "client": clients[0],
            "price": 50.00
        }
    ]
    
    created_count = 0
    for appt_data in appointments_data:
        # Check if similar appointment exists
        existing = db.query(Appointment).filter(
            Appointment.barber_id == user_id,
            Appointment.start_time == appt_data["start_time"]
        ).first()
        
        if existing:
            # Update existing appointment
            existing.status = appt_data["status"]
            existing.price = appt_data["price"]
            db.commit()
            continue
        
        appointment = Appointment(
            barber_id=user_id,
            client_id=appt_data["client"].id,
            service_id=service_id,
            start_time=appt_data["start_time"],
            end_time=appt_data["end_time"],
            status=appt_data["status"],
            price=appt_data["price"],
            notes=f"Test appointment for {appt_data['client'].name}"
        )
        
        db.add(appointment)
        created_count += 1
    
    db.commit()
    
    # Calculate today's revenue
    completed_today = db.query(Appointment).filter(
        Appointment.barber_id == user_id,
        Appointment.status == "completed",
        Appointment.start_time >= today_start,
        Appointment.start_time < today_start + timedelta(days=1)
    ).all()
    
    today_revenue = sum(appt.price for appt in completed_today)
    
    print(f"   ✅ Created {created_count} new appointments")
    print(f"   💰 Today's revenue: ${today_revenue:.2f}")
    print(f"   📊 Total appointments today: {len(appointments_data)}")
    
    return appointments_data

def open_calendar_page(access_token):
    """Open the calendar page in the browser with authentication."""
    print("\n🌐 Opening calendar page...")
    
    # Create a simple HTML file that will handle authentication
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>6FB Calendar Demo</title>
        <script>
            // Store the token in localStorage
            localStorage.setItem('6fb_access_token', '{access_token}');
            localStorage.setItem('6fb_user', JSON.stringify({{
                email: '{TEST_EMAIL}',
                name: '{TEST_NAME}',
                role: 'barber'
            }}));
            
            // Redirect to calendar page
            window.location.href = '{FRONTEND_URL}/calendar';
        </script>
    </head>
    <body>
        <p>Setting up authentication and redirecting to calendar...</p>
    </body>
    </html>
    """
    
    # Save the HTML file
    temp_file = "temp_auth.html"
    with open(temp_file, "w") as f:
        f.write(html_content)
    
    # Open in browser
    file_url = f"file://{os.path.abspath(temp_file)}"
    webbrowser.open(file_url)
    
    print("   ✅ Browser opened with authentication")
    print("   📅 You should now see the calendar page with:")
    print("      - Today's revenue counter at the top")
    print("      - Your appointments displayed")
    print("      - Ability to create new appointments")
    
    # Clean up after a delay
    time.sleep(3)
    if os.path.exists(temp_file):
        os.remove(temp_file)

def check_servers():
    """Check if backend and frontend servers are running."""
    print("\n🔍 Checking servers...")
    
    backend_running = False
    frontend_running = False
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        backend_running = response.status_code == 200
    except:
        pass
    
    try:
        response = requests.get(FRONTEND_URL)
        frontend_running = response.status_code == 200
    except:
        pass
    
    if not backend_running:
        print("   ⚠️  Backend server is not running!")
        print("   💡 Start it with: cd backend-v2 && uvicorn main:app --reload")
    else:
        print("   ✅ Backend server is running")
    
    if not frontend_running:
        print("   ⚠️  Frontend server is not running!")
        print("   💡 Start it with: cd frontend-v2 && npm run dev")
    else:
        print("   ✅ Frontend server is running")
    
    return backend_running and frontend_running

def main():
    """Main function to set up and demo the system."""
    print("🚀 6FB Booking Platform - Setup & Demo Script")
    print("=" * 50)
    
    # Check if servers are running
    if not check_servers():
        print("\n❌ Please start both servers before running this script.")
        print("\nInstructions:")
        print("1. Terminal 1: cd backend-v2 && uvicorn main:app --reload")
        print("2. Terminal 2: cd frontend-v2 && npm run dev")
        print("3. Run this script again")
        return
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create test user
        user = create_test_user(db)
        
        # Test login
        tokens = test_login()
        if not tokens:
            print("\n❌ Login failed. Please check the backend server.")
            return
        
        # Create test data
        service = create_test_service(db, user.id)
        clients = create_test_clients(db)
        appointments = create_test_appointments(db, user.id, service.id, clients)
        
        # Open calendar page
        open_calendar_page(tokens['access_token'])
        
        print("\n✅ Setup complete!")
        print("\n📝 Summary:")
        print(f"   - User: {TEST_EMAIL} / {TEST_PASSWORD}")
        print(f"   - Service: Premium Haircut ($50)")
        print(f"   - Clients: {len(clients)} test clients")
        print(f"   - Appointments: {len(appointments)} (2 completed, 2 upcoming)")
        print("\n🎯 Next steps:")
        print("   1. The calendar page should be open in your browser")
        print("   2. You should see today's revenue at the top")
        print("   3. Try creating a new appointment")
        print("   4. Check the week and month views")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()