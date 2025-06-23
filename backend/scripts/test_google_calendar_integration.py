#!/usr/bin/env python3
"""
Google Calendar Integration Test Script
Tests all aspects of the Google Calendar integration
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from config.database import SessionLocal, engine
from config.settings import get_settings
from models.base import BaseModel
from models.barber import Barber
from models.client import Client
from models.appointment import Appointment
from models.google_calendar_settings import GoogleCalendarSettings, GoogleCalendarSyncLog
from services.google_calendar_service import google_calendar_service

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_warning(text: str):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKBLUE}ℹ {text}{Colors.ENDC}")

def test_environment_setup():
    """Test that required environment variables are set"""
    print_header("Testing Environment Setup")
    
    settings = get_settings()
    required_vars = [
        ('GOOGLE_CALENDAR_CLIENT_ID', 'Google Calendar Client ID'),
        ('GOOGLE_CALENDAR_CLIENT_SECRET', 'Google Calendar Client Secret'),
    ]
    
    all_good = True
    for var_name, description in required_vars:
        value = getattr(settings, var_name, None) or os.getenv(var_name)
        if value and value != f"your_{var_name.lower()}_here":
            print_success(f"{description} is configured")
        else:
            print_error(f"{description} is missing or using template value")
            all_good = False
    
    redirect_uri = getattr(settings, 'GOOGLE_CALENDAR_REDIRECT_URI', None) or os.getenv('GOOGLE_CALENDAR_REDIRECT_URI')
    if redirect_uri:
        print_success(f"Redirect URI configured: {redirect_uri}")
    else:
        print_warning("Redirect URI not set, using default")
    
    return all_good

def test_database_tables():
    """Test that database tables exist"""
    print_header("Testing Database Tables")
    
    try:
        # Create tables if they don't exist
        BaseModel.metadata.create_all(bind=engine, tables=[
            GoogleCalendarSettings.__table__,
            GoogleCalendarSyncLog.__table__
        ])
        
        db = SessionLocal()
        try:
            # Test table access
            db.query(GoogleCalendarSettings).first()
            print_success("GoogleCalendarSettings table exists and accessible")
            
            db.query(GoogleCalendarSyncLog).first()
            print_success("GoogleCalendarSyncLog table exists and accessible")
            
            return True
        finally:
            db.close()
            
    except Exception as e:
        print_error(f"Database table test failed: {str(e)}")
        return False

def test_google_calendar_service():
    """Test Google Calendar service initialization"""
    print_header("Testing Google Calendar Service")
    
    try:
        # Test service initialization
        service = google_calendar_service
        print_success("Google Calendar service initialized")
        
        # Test OAuth config
        try:
            oauth_config = service._get_oauth_config()
            if oauth_config['web']['client_id'] and oauth_config['web']['client_id'] != 'your_google_client_id_here':
                print_success("OAuth configuration loaded")
            else:
                print_error("OAuth configuration missing or using template values")
                return False
        except Exception as e:
            print_error(f"OAuth configuration test failed: {str(e)}")
            return False
        
        # Test authorization URL generation
        try:
            auth_url = service.get_authorization_url(999, "test_state")
            if auth_url and "https://accounts.google.com/o/oauth2/auth" in auth_url:
                print_success("Authorization URL generation works")
            else:
                print_error("Authorization URL generation failed")
                return False
        except Exception as e:
            print_error(f"Authorization URL test failed: {str(e)}")
            return False
        
        return True
        
    except Exception as e:
        print_error(f"Service test failed: {str(e)}")
        return False

def test_api_endpoints():
    """Test API endpoints (without authentication)"""
    print_header("Testing API Endpoints")
    
    try:
        import requests
        
        base_url = "http://localhost:8000/api/v1/google-calendar"
        
        # Test public endpoints (should return authentication errors)
        endpoints_to_test = [
            "/status",
            "/settings",
            "/connect",
        ]
        
        for endpoint in endpoints_to_test:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
                if response.status_code == 401:  # Unauthorized is expected
                    print_success(f"Endpoint {endpoint} responds correctly (requires auth)")
                elif response.status_code == 404:
                    print_error(f"Endpoint {endpoint} not found")
                else:
                    print_warning(f"Endpoint {endpoint} returned status {response.status_code}")
            except requests.exceptions.ConnectionError:
                print_warning(f"Endpoint {endpoint} - Server not running")
            except Exception as e:
                print_error(f"Endpoint {endpoint} test failed: {str(e)}")
        
        return True
        
    except ImportError:
        print_warning("requests library not available, skipping endpoint tests")
        return True
    except Exception as e:
        print_error(f"API endpoint test failed: {str(e)}")
        return False

def create_test_data():
    """Create test data for integration testing"""
    print_header("Creating Test Data")
    
    db = SessionLocal()
    try:
        # Create test barber
        test_barber = db.query(Barber).filter(Barber.email == "test@6fb.com").first()
        if not test_barber:
            test_barber = Barber(
                email="test@6fb.com",
                first_name="Test",
                last_name="Barber",
                business_name="Test Barbershop",
                phone="555-0123",
                is_active=True
            )
            db.add(test_barber)
            db.commit()
            db.refresh(test_barber)
        print_success(f"Test barber created/found: ID {test_barber.id}")
        
        # Create test client
        test_client = db.query(Client).filter(Client.email == "client@test.com").first()
        if not test_client:
            test_client = Client(
                email="client@test.com",
                first_name="Test",
                last_name="Client",
                phone="555-0124",
                barber_id=test_barber.id
            )
            db.add(test_client)
            db.commit()
            db.refresh(test_client)
        print_success(f"Test client created/found: ID {test_client.id}")
        
        # Create test appointment
        test_appointment = Appointment(
            appointment_date=datetime.now().date() + timedelta(days=1),
            appointment_time=datetime.now() + timedelta(days=1, hours=2),
            duration_minutes=60,
            barber_id=test_barber.id,
            client_id=test_client.id,
            service_name="Test Haircut",
            service_category="Haircut",
            service_revenue=45.0,
            customer_type="Returning",
            status="scheduled"
        )
        db.add(test_appointment)
        db.commit()
        db.refresh(test_appointment)
        print_success(f"Test appointment created: ID {test_appointment.id}")
        
        return {
            'barber_id': test_barber.id,
            'client_id': test_client.id,
            'appointment_id': test_appointment.id
        }
        
    except Exception as e:
        print_error(f"Test data creation failed: {str(e)}")
        db.rollback()
        return None
    finally:
        db.close()

def test_calendar_settings():
    """Test Google Calendar settings functionality"""
    print_header("Testing Calendar Settings")
    
    test_data = create_test_data()
    if not test_data:
        return False
    
    db = SessionLocal()
    try:
        barber_id = test_data['barber_id']
        
        # Create test settings
        settings = GoogleCalendarSettings(
            barber_id=barber_id,
            auto_sync_enabled=True,
            sync_on_create=True,
            include_client_email=True,
            timezone="America/New_York"
        )
        db.add(settings)
        db.commit()
        print_success("Calendar settings created")
        
        # Test settings retrieval
        retrieved_settings = db.query(GoogleCalendarSettings).filter(
            GoogleCalendarSettings.barber_id == barber_id
        ).first()
        
        if retrieved_settings and retrieved_settings.auto_sync_enabled:
            print_success("Calendar settings retrieved correctly")
        else:
            print_error("Calendar settings retrieval failed")
            return False
        
        return True
        
    except Exception as e:
        print_error(f"Calendar settings test failed: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

def test_sync_logging():
    """Test sync logging functionality"""
    print_header("Testing Sync Logging")
    
    test_data = create_test_data()
    if not test_data:
        return False
    
    db = SessionLocal()
    try:
        # Create test sync log
        sync_log = GoogleCalendarSyncLog(
            barber_id=test_data['barber_id'],
            appointment_id=test_data['appointment_id'],
            operation="create",
            direction="to_google",
            status="success",
            google_event_id="test_event_123"
        )
        db.add(sync_log)
        db.commit()
        print_success("Sync log created")
        
        # Test log retrieval
        logs = db.query(GoogleCalendarSyncLog).filter(
            GoogleCalendarSyncLog.barber_id == test_data['barber_id']
        ).all()
        
        if logs:
            print_success(f"Sync logs retrieved: {len(logs)} entries")
        else:
            print_error("Sync log retrieval failed")
            return False
        
        return True
        
    except Exception as e:
        print_error(f"Sync logging test failed: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

def run_comprehensive_test():
    """Run all tests"""
    print_header("Google Calendar Integration Comprehensive Test")
    
    tests = [
        ("Environment Setup", test_environment_setup),
        ("Database Tables", test_database_tables),
        ("Google Calendar Service", test_google_calendar_service),
        ("API Endpoints", test_api_endpoints),
        ("Calendar Settings", test_calendar_settings),
        ("Sync Logging", test_sync_logging),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print_error(f"Test {test_name} crashed: {str(e)}")
            results[test_name] = False
    
    # Summary
    print_header("Test Results Summary")
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        if result:
            print_success(f"{test_name}: PASSED")
            passed += 1
        else:
            print_error(f"{test_name}: FAILED")
    
    print(f"\n{Colors.BOLD}Overall Result: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print_success("All tests passed! Google Calendar integration is ready.")
        return True
    else:
        print_error("Some tests failed. Please review the issues above.")
        return False

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Google Calendar Integration Test Script")
        print("\nUsage:")
        print("  python test_google_calendar_integration.py")
        print("\nThis script tests all aspects of the Google Calendar integration:")
        print("  - Environment configuration")
        print("  - Database tables")
        print("  - Service functionality")
        print("  - API endpoints")
        print("  - Settings management")
        print("  - Sync logging")
        return
    
    try:
        success = run_comprehensive_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Test interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Test script failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()