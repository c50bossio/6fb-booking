#!/usr/bin/env python3
"""
Test the appointment API endpoints after fixing the hanging issue.
"""

import requests
import json
import logging
from datetime import date, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API Configuration
BASE_URL = "http://localhost:8000"
TEST_USER = {
    "email": "testuser@example.com",
    "password": "testpass123",
    "name": "Test User"
}

def register_and_login():
    """Register a test user and get auth token"""
    logger.info("Registering test user...")
    
    # Register user
    try:
        register_response = requests.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=TEST_USER,
            timeout=10
        )
        if register_response.status_code == 409:
            logger.info("User already exists, proceeding to login")
        elif register_response.status_code != 200:
            logger.error(f"Registration failed: {register_response.status_code} - {register_response.text}")
    except Exception as e:
        logger.warning(f"Registration request failed: {e}")
    
    # Login
    logger.info("Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        logger.error(f"Login failed: {login_response.status_code} - {login_response.text}")
        return None
    
    token = login_response.json()["access_token"]
    logger.info("✓ Login successful")
    return token

def test_appointment_creation(token):
    """Test creating an appointment"""
    logger.info("Testing appointment creation...")
    
    # Appointment data for tomorrow at 2 PM
    tomorrow = date.today() + timedelta(days=1)
    appointment_data = {
        "date": tomorrow.isoformat(),
        "time": "14:00",
        "service": "Haircut",
        "notes": "Test appointment via API"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/appointments/",
            json=appointment_data,
            headers=headers,
            timeout=30  # Extended timeout to see if it hangs
        )
        
        if response.status_code == 200:
            appointment = response.json()
            logger.info(f"✅ Appointment created successfully!")
            logger.info(f"   - ID: {appointment['id']}")
            logger.info(f"   - Date: {appointment['start_time']}")
            logger.info(f"   - Service: {appointment['service_name']}")
            logger.info(f"   - Status: {appointment['status']}")
            return appointment["id"]
        else:
            logger.error(f"❌ Appointment creation failed: {response.status_code}")
            logger.error(f"   Error: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error("❌ Appointment creation TIMED OUT - hanging issue still exists")
        return None
    except Exception as e:
        logger.error(f"❌ Appointment creation failed with error: {e}")
        return None

def test_appointment_retrieval(token, appointment_id):
    """Test retrieving the created appointment"""
    logger.info(f"Testing appointment retrieval for ID {appointment_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/appointments/{appointment_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            appointment = response.json()
            logger.info(f"✅ Appointment retrieved successfully!")
            logger.info(f"   - ID: {appointment['id']}")
            logger.info(f"   - Service: {appointment['service_name']}")
            return True
        else:
            logger.error(f"❌ Appointment retrieval failed: {response.status_code}")
            logger.error(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Appointment retrieval failed: {e}")
        return False

def test_appointment_list(token):
    """Test listing user's appointments"""
    logger.info("Testing appointment list...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/appointments/",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Appointment list retrieved successfully!")
            logger.info(f"   - Total appointments: {data['total']}")
            logger.info(f"   - Appointments returned: {len(data['appointments'])}")
            return True
        else:
            logger.error(f"❌ Appointment list failed: {response.status_code}")
            logger.error(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Appointment list failed: {e}")
        return False

def cleanup_appointment(token, appointment_id):
    """Clean up the test appointment"""
    if not appointment_id:
        return
        
    logger.info(f"Cleaning up appointment {appointment_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.delete(
            f"{BASE_URL}/api/v1/appointments/{appointment_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info("✅ Test appointment cleaned up")
        else:
            logger.warning(f"⚠️ Cleanup failed: {response.status_code}")
            
    except Exception as e:
        logger.warning(f"⚠️ Cleanup failed: {e}")

def main():
    """Main test function"""
    logger.info("🧪 Testing appointment API after hanging fix...")
    
    # Get auth token
    token = register_and_login()
    if not token:
        logger.error("❌ Could not authenticate - stopping tests")
        return
    
    # Test appointment creation
    appointment_id = test_appointment_creation(token)
    
    if appointment_id:
        logger.info("🎉 APPOINTMENT CREATION IS WORKING! The hanging issue is FIXED!")
        
        # Test other endpoints
        test_appointment_retrieval(token, appointment_id)
        test_appointment_list(token)
        
        # Cleanup
        cleanup_appointment(token, appointment_id)
    else:
        logger.error("❌ Appointment creation still has issues")
    
    logger.info("🧪 Testing completed")

if __name__ == "__main__":
    main()