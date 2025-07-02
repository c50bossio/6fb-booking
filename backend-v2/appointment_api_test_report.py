#!/usr/bin/env python3
"""
Comprehensive Appointment API Test Report
Tests all appointment endpoints and verifies data accessibility for the calendar.
"""

import requests
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

# API configuration
BASE_URL = "http://localhost:8000"
API_V1_BASE = f"{BASE_URL}/api/v1"

# Test credentials
TEST_EMAIL = "testadmin@test.com"
TEST_PASSWORD = "testadmin123"

def get_auth_token() -> Optional[str]:
    """Authenticate and get JWT token."""
    login_url = f"{API_V1_BASE}/auth/login"
    login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return None

def test_endpoint(token: str, endpoint: str, description: str) -> Dict[str, Any]:
    """Test a specific API endpoint."""
    url = f"{API_V1_BASE}{endpoint}"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n--- Testing {description} ---")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success!")
            return {"success": True, "data": data, "status": response.status_code}
        else:
            print(f"❌ Failed!")
            print(f"Error: {response.text}")
            return {"success": False, "error": response.text, "status": response.status_code}
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return {"success": False, "error": str(e), "status": None}

def analyze_appointments_data(data: Dict[str, Any], endpoint_name: str) -> Dict[str, Any]:
    """Analyze appointment data structure and content."""
    print(f"\n=== ANALYSIS: {endpoint_name} ===")
    
    # Extract appointments list
    appointments = []
    total_count = 0
    
    if isinstance(data, dict):
        if "appointments" in data:
            appointments = data["appointments"]
            total_count = data.get("total", len(appointments))
        else:
            # Direct appointment object
            appointments = [data]
            total_count = 1
    elif isinstance(data, list):
        appointments = data
        total_count = len(appointments)
    
    print(f"Total appointments: {total_count}")
    print(f"Returned appointments: {len(appointments)}")
    
    if not appointments:
        print("⚠️  No appointments found")
        return {"has_appointments": False, "appointment_52_found": False}
    
    # Check for appointment ID 52
    appointment_52 = None
    for apt in appointments:
        if apt.get("id") == 52:
            appointment_52 = apt
            break
    
    appointment_52_found = appointment_52 is not None
    
    if appointment_52_found:
        print(f"✅ Found appointment ID 52!")
        print(f"   - Start: {appointment_52.get('start_time')}")
        print(f"   - Service: {appointment_52.get('service_name')}")
        print(f"   - Status: {appointment_52.get('status')}")
        print(f"   - Notes: {appointment_52.get('notes')}")
    else:
        print("⚠️  Appointment ID 52 not found")
    
    # Analyze first appointment structure
    if appointments:
        sample = appointments[0]
        print(f"\nSample appointment fields: {list(sample.keys())}")
        
        # Check required fields for calendar
        required_fields = ["id", "start_time", "status"]
        missing_fields = [f for f in required_fields if f not in sample]
        
        if missing_fields:
            print(f"❌ Missing required fields: {missing_fields}")
        else:
            print(f"✅ All required fields present")
        
        # Show date format
        start_time = sample.get("start_time")
        if start_time:
            print(f"Date format example: {start_time}")
            try:
                parsed = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                print(f"✅ Date is ISO format compatible")
            except:
                print(f"⚠️  Date format may need conversion")
    
    # List recent appointment IDs
    recent_ids = [apt.get("id") for apt in appointments[:10]]
    print(f"\nRecent appointment IDs: {recent_ids}")
    
    return {
        "has_appointments": len(appointments) > 0,
        "appointment_count": len(appointments),
        "total_count": total_count,
        "appointment_52_found": appointment_52_found,
        "appointment_52_data": appointment_52,
        "sample_appointment": appointments[0] if appointments else None
    }

def main():
    """Run comprehensive appointment API tests."""
    print("="*80)
    print("COMPREHENSIVE APPOINTMENT API TEST REPORT")
    print("="*80)
    
    # Get authentication token
    print("\n1. AUTHENTICATION")
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    print(f"✅ Authentication successful")
    
    # Test results storage
    results = {}
    
    # Test endpoints
    endpoints_to_test = [
        ("/appointments/", "User Appointments (Calendar Main Endpoint)"),
        ("/appointments/all/list", "All Appointments (Admin Endpoint)"),
        ("/appointments/52", "Specific Appointment (ID 52)"),
    ]
    
    print(f"\n2. ENDPOINT TESTING")
    
    for endpoint, description in endpoints_to_test:
        result = test_endpoint(token, endpoint, description)
        results[endpoint] = result
        
        if result["success"]:
            analysis = analyze_appointments_data(result["data"], description)
            results[endpoint]["analysis"] = analysis
    
    # Generate summary report
    print(f"\n\n" + "="*80)
    print("SUMMARY REPORT")
    print("="*80)
    
    calendar_endpoint = results.get("/appointments/")
    admin_endpoint = results.get("/appointments/all/list")
    specific_endpoint = results.get("/appointments/52")
    
    print(f"\n🔍 ENDPOINT STATUS:")
    print(f"   • User appointments (/appointments/): {'✅ Working' if calendar_endpoint and calendar_endpoint['success'] else '❌ Failed'}")
    print(f"   • Admin appointments (/appointments/all/list): {'✅ Working' if admin_endpoint and admin_endpoint['success'] else '❌ Failed'}")
    print(f"   • Specific appointment (/appointments/52): {'✅ Working' if specific_endpoint and specific_endpoint['success'] else '❌ Failed'}")
    
    print(f"\n📊 DATA AVAILABILITY:")
    
    # Check calendar endpoint (main one used by frontend)
    if calendar_endpoint and calendar_endpoint["success"] and calendar_endpoint.get("analysis"):
        cal_analysis = calendar_endpoint["analysis"]
        print(f"   • Calendar endpoint has appointments: {'✅ Yes' if cal_analysis['has_appointments'] else '⚠️  No'}")
        print(f"   • Calendar endpoint shows ID 52: {'✅ Yes' if cal_analysis['appointment_52_found'] else '⚠️  No'}")
    else:
        print(f"   • Calendar endpoint: ❌ Failed or no data")
    
    # Check admin endpoint
    if admin_endpoint and admin_endpoint["success"] and admin_endpoint.get("analysis"):
        admin_analysis = admin_endpoint["analysis"]
        print(f"   • Admin endpoint has appointments: {'✅ Yes' if admin_analysis['has_appointments'] else '⚠️  No'}")
        print(f"   • Admin endpoint shows ID 52: {'✅ Yes' if admin_analysis['appointment_52_found'] else '⚠️  No'}")
        print(f"   • Total appointments in system: {admin_analysis['total_count']}")
    else:
        print(f"   • Admin endpoint: ❌ Failed or no data")
    
    print(f"\n🎯 KEY FINDINGS:")
    
    # Key finding 1: Calendar data access
    calendar_has_data = (calendar_endpoint and 
                        calendar_endpoint["success"] and 
                        calendar_endpoint.get("analysis", {}).get("has_appointments", False))
    
    if calendar_has_data:
        print(f"   ✅ Calendar endpoint provides appointment data")
    else:
        print(f"   ⚠️  Calendar endpoint returns empty results")
        print(f"      → This means the frontend calendar won't show appointments")
        print(f"      → User appointments are filtered by user_id")
        
    # Key finding 2: Admin access
    admin_has_data = (admin_endpoint and 
                     admin_endpoint["success"] and 
                     admin_endpoint.get("analysis", {}).get("has_appointments", False))
    
    if admin_has_data:
        print(f"   ✅ Admin endpoint shows all system appointments")
        total = admin_endpoint["analysis"]["total_count"]
        print(f"      → {total} total appointments in system")
    
    # Key finding 3: Appointment 52 specifically
    apt_52_in_admin = (admin_endpoint and 
                      admin_endpoint.get("analysis", {}).get("appointment_52_found", False))
    apt_52_in_calendar = (calendar_endpoint and 
                         calendar_endpoint.get("analysis", {}).get("appointment_52_found", False))
    
    if apt_52_in_admin:
        print(f"   ✅ Appointment ID 52 exists in system")
        if apt_52_in_calendar:
            print(f"      → Also visible in calendar endpoint")
        else:
            print(f"      → NOT visible in calendar endpoint (user permission issue)")
    else:
        print(f"   ❌ Appointment ID 52 not found in system")
    
    # Key finding 4: Data format compatibility
    if admin_has_data:
        sample = admin_endpoint["analysis"]["sample_appointment"]
        if sample:
            has_required = all(field in sample for field in ["id", "start_time", "status"])
            print(f"   {'✅' if has_required else '❌'} Data format compatible with calendar")
            
            # Check date format
            start_time = sample.get("start_time")
            if start_time:
                print(f"      → Date format: {start_time}")
    
    print(f"\n💡 RECOMMENDATIONS:")
    
    if not calendar_has_data and admin_has_data:
        print(f"   • Calendar endpoint issue: User-specific filtering prevents data access")
        print(f"   • Solution: Create appointments for the authenticated user or use admin view")
        print(f"   • For testing: Use admin endpoint (/appointments/all/list) to see all data")
    
    if specific_endpoint and not specific_endpoint["success"]:
        print(f"   • Single appointment endpoint has service layer issues")
        print(f"   • Error: {specific_endpoint.get('error', 'Unknown')}")
        print(f"   • This may affect calendar detail views")
    
    print(f"\n📋 DETAILED ENDPOINT RESULTS:")
    for endpoint, result in results.items():
        print(f"\n   {endpoint}:")
        print(f"      Status: {result.get('status', 'N/A')}")
        print(f"      Success: {result.get('success', False)}")
        if result.get("analysis"):
            analysis = result["analysis"]
            print(f"      Appointments: {analysis.get('appointment_count', 0)}")
            print(f"      Has ID 52: {analysis.get('appointment_52_found', False)}")
    
    print(f"\n" + "="*80)
    print("END OF REPORT")
    print("="*80)

if __name__ == "__main__":
    main()