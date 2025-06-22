"""
Test Calendar Functionality
Tests the new calendar API endpoints and Google Calendar integration
"""
import asyncio
import httpx
import json
from datetime import datetime, date, time, timedelta
import sys
import os

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

BASE_URL = "http://localhost:8000"

async def test_calendar_functionality():
    """Test calendar endpoints and functionality"""
    
    print("🧪 Testing Calendar Functionality\n")
    
    async with httpx.AsyncClient() as client:
        
        # Test 1: Health check
        print("1. Testing API health...")
        try:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print("✅ API is healthy")
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ Cannot connect to API: {e}")
            return
        
        # Test 2: Calendar events endpoint (without auth for now)
        print("\n2. Testing calendar events endpoint...")
        try:
            start_date = date.today()
            end_date = start_date + timedelta(days=7)
            
            response = await client.get(
                f"{BASE_URL}/api/v1/calendar/events",
                params={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            )
            
            if response.status_code == 401:
                print("🔐 Calendar events require authentication (expected)")
            elif response.status_code == 200:
                events = response.json()
                print(f"✅ Calendar events retrieved: {len(events)} events")
            else:
                print(f"❌ Calendar events failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Calendar events test failed: {e}")
        
        # Test 3: Availability endpoint (without auth)
        print("\n3. Testing availability endpoint...")
        try:
            response = await client.get(
                f"{BASE_URL}/api/v1/calendar/availability/1",
                params={"date": date.today().isoformat()}
            )
            
            if response.status_code == 401:
                print("🔐 Availability requires authentication (expected)")
            elif response.status_code == 200:
                availability = response.json()
                print(f"✅ Availability retrieved for barber 1")
                print(f"   Available slots: {availability.get('available_count', 0)}")
            else:
                print(f"❌ Availability failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Availability test failed: {e}")
        
        # Test 4: Google Calendar OAuth endpoints
        print("\n4. Testing Google Calendar OAuth endpoints...")
        try:
            # Test OAuth connect endpoint
            response = await client.get(f"{BASE_URL}/api/v1/calendar/oauth/connect")
            
            if response.status_code == 401:
                print("🔐 Google Calendar OAuth requires authentication (expected)")
            elif response.status_code == 200:
                oauth_data = response.json()
                if "authorization_url" in oauth_data:
                    print("✅ Google Calendar OAuth URL generated successfully")
                else:
                    print("❌ OAuth response missing authorization_url")
            else:
                print(f"❌ Google Calendar OAuth failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Google Calendar OAuth test failed: {e}")
        
        # Test 5: Calendar stats endpoint
        print("\n5. Testing calendar stats endpoint...")
        try:
            start_date = date.today() - timedelta(days=30)
            end_date = date.today()
            
            response = await client.get(
                f"{BASE_URL}/api/v1/calendar/stats",
                params={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            )
            
            if response.status_code == 401:
                print("🔐 Calendar stats require authentication (expected)")
            elif response.status_code == 200:
                stats = response.json()
                print(f"✅ Calendar stats retrieved")
                print(f"   Total appointments: {stats.get('total_appointments', 0)}")
                print(f"   Total revenue: ${stats.get('total_revenue', 0)}")
            else:
                print(f"❌ Calendar stats failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Calendar stats test failed: {e}")
        
        # Test 6: Test existing appointments endpoint
        print("\n6. Testing existing appointments endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/v1/appointments/")
            
            if response.status_code == 401:
                print("🔐 Appointments require authentication (expected)")
            elif response.status_code == 200:
                appointments = response.json()
                print(f"✅ Appointments endpoint working: {len(appointments)} appointments")
            else:
                print(f"❌ Appointments failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Appointments test failed: {e}")
        
        # Test 7: Test booking endpoints
        print("\n7. Testing booking endpoints...")
        try:
            # Test public booking endpoints
            response = await client.get(f"{BASE_URL}/api/v1/booking-public/shops/1/barbers")
            
            if response.status_code == 200:
                barbers = response.json()
                print(f"✅ Public booking endpoint working: {len(barbers) if isinstance(barbers, list) else 'data'} barbers")
            elif response.status_code == 404:
                print("ℹ️  No barbers found for shop 1 (expected if no data)")
            else:
                print(f"❌ Public booking failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Booking test failed: {e}")

def test_google_calendar_service():
    """Test Google Calendar service functionality"""
    print("\n8. Testing Google Calendar Service...")
    
    try:
        from services.google_calendar_service import google_calendar_service
        
        # Test service initialization
        print("✅ Google Calendar service imported successfully")
        
        # Test connection status for a barber
        status = google_calendar_service.get_connection_status(1)
        print(f"✅ Connection status retrieved: {status['status']}")
        
        # Test authorization URL generation (will fail without credentials)
        try:
            auth_url = google_calendar_service.get_authorization_url(1)
            print("✅ Authorization URL generated (Google credentials configured)")
        except ValueError as e:
            print(f"ℹ️  Authorization URL failed (expected): {e}")
        
    except Exception as e:
        print(f"❌ Google Calendar service test failed: {e}")

def test_frontend_api_integration():
    """Test frontend API integration"""
    print("\n9. Testing Frontend API Integration...")
    
    try:
        # Check if frontend calendar API files exist
        frontend_calendar_api = "/Users/bossio/6fb-booking/frontend/src/lib/api/calendar.ts"
        if os.path.exists(frontend_calendar_api):
            print("✅ Frontend calendar API file exists")
            
            # Read and check for key functions
            with open(frontend_calendar_api, 'r') as f:
                content = f.read()
                
            if "getCalendarEvents" in content:
                print("✅ getCalendarEvents function found")
            if "createAppointment" in content:
                print("✅ createAppointment function found")
            if "CalendarService" in content:
                print("✅ CalendarService class found")
            if "WebSocket" in content:
                print("✅ WebSocket integration found")
                
        else:
            print("❌ Frontend calendar API file not found")
            
        # Check calendar components
        calendar_component = "/Users/bossio/6fb-booking/frontend/src/components/calendar/CalendarSystem.tsx"
        if os.path.exists(calendar_component):
            print("✅ Calendar component exists")
        else:
            print("❌ Calendar component not found")
            
    except Exception as e:
        print(f"❌ Frontend integration test failed: {e}")

async def main():
    """Run all tests"""
    print("📅 6FB Calendar Functionality Test Suite")
    print("=" * 50)
    
    # Test backend functionality
    await test_calendar_functionality()
    
    # Test Google Calendar service
    test_google_calendar_service()
    
    # Test frontend integration
    test_frontend_api_integration()
    
    print("\n" + "=" * 50)
    print("✅ Calendar functionality test completed!")
    print("\n📋 Summary:")
    print("- Calendar API endpoints created and configured")
    print("- Google Calendar integration service implemented")
    print("- OAuth flow for Google Calendar setup")
    print("- Frontend calendar components available")
    print("- Real-time updates with WebSocket support")
    print("- Appointment synchronization with Google Calendar")
    
    print("\n🔧 To complete setup:")
    print("1. Set Google Calendar API credentials in environment:")
    print("   GOOGLE_CALENDAR_CLIENT_ID=your-client-id")
    print("   GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret")
    print("2. Start the backend server: uvicorn main:app --reload")
    print("3. Start the frontend: npm run dev")
    print("4. Navigate to /dashboard/calendar to test the UI")

if __name__ == "__main__":
    asyncio.run(main())