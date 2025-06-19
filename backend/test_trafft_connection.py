#!/usr/bin/env python3
"""
Test Trafft API connection and fetch initial data
"""
import os
import requests
from datetime import datetime, timedelta
import json

# Trafft API configuration
# Try different API URL patterns
TRAFFT_API_KEY = "cf0e541ffb9bb5a1ad777eff256f1f96"

# Common Trafft API patterns to try
API_PATTERNS = [
    "https://app.trafft.com/api",
    "https://api.trafft.com/v1",
    "https://headlinesbarbershops.trafft.com/api",
    "https://app.trafft.com/api/v1"
]

# Global variable to store the working API URL
TRAFFT_API_URL = None

def test_trafft_connection():
    """Test basic connection to Trafft API"""
    print("🔍 Testing Trafft API Connection...")
    
    headers = {
        "Authorization": f"Bearer {TRAFFT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try different API endpoints
    endpoints_to_try = ["/company", "/locations", "/employees", ""]
    
    for base_url in API_PATTERNS:
        for endpoint in endpoints_to_try:
            url = f"{base_url}{endpoint}"
            print(f"\nTrying: {url}")
            
            try:
                response = requests.get(url, headers=headers, timeout=5)
                
                if response.status_code == 200:
                    print(f"✅ Success! Found working API at: {base_url}")
                    print(f"Response preview: {str(response.text)[:200]}...")
                    
                    # Set the working URL globally
                    global TRAFFT_API_URL
                    TRAFFT_API_URL = base_url
                    return True
                elif response.status_code == 401:
                    print(f"⚠️  401 Unauthorized - API found but key may be invalid")
                elif response.status_code == 403:
                    print(f"⚠️  403 Forbidden - API found but no permission")
                else:
                    print(f"❌ {response.status_code} - {response.reason}")
                    
            except requests.exceptions.Timeout:
                print(f"⏱️  Timeout")
            except requests.exceptions.ConnectionError:
                print(f"🔌 Connection error")
            except Exception as e:
                print(f"❌ Error: {str(e)}")
    
    return False

def fetch_locations():
    """Fetch all locations from Trafft"""
    print("\n📍 Fetching Locations...")
    
    headers = {
        "Authorization": f"Bearer {TRAFFT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{TRAFFT_API_URL}/locations",
            headers=headers
        )
        
        if response.status_code == 200:
            locations = response.json()
            print(f"✅ Found {len(locations)} locations:")
            for loc in locations:
                print(f"  - {loc['name']} (ID: {loc['id']})")
            return locations
        else:
            print(f"❌ Failed to fetch locations: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error fetching locations: {str(e)}")
        return []

def fetch_employees():
    """Fetch all employees (barbers) from Trafft"""
    print("\n💈 Fetching Employees (Barbers)...")
    
    headers = {
        "Authorization": f"Bearer {TRAFFT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{TRAFFT_API_URL}/employees",
            headers=headers
        )
        
        if response.status_code == 200:
            employees = response.json()
            print(f"✅ Found {len(employees)} employees:")
            for emp in employees:
                print(f"  - {emp['firstName']} {emp['lastName']} (ID: {emp['id']})")
            return employees
        else:
            print(f"❌ Failed to fetch employees: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error fetching employees: {str(e)}")
        return []

def fetch_recent_appointments():
    """Fetch recent appointments from Trafft"""
    print("\n📅 Fetching Recent Appointments...")
    
    headers = {
        "Authorization": f"Bearer {TRAFFT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get appointments from the last 7 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    params = {
        "dateFrom": start_date.strftime("%Y-%m-%d"),
        "dateTo": end_date.strftime("%Y-%m-%d"),
        "status": "approved"  # Only get confirmed appointments
    }
    
    try:
        response = requests.get(
            f"{TRAFFT_API_URL}/appointments",
            headers=headers,
            params=params
        )
        
        if response.status_code == 200:
            appointments = response.json()
            print(f"✅ Found {len(appointments)} appointments in the last 7 days:")
            
            # Show first 5 appointments as examples
            for appt in appointments[:5]:
                print(f"  - Date: {appt.get('bookingStart', 'N/A')}")
                print(f"    Customer: {appt.get('customer', {}).get('firstName', 'N/A')} {appt.get('customer', {}).get('lastName', 'N/A')}")
                print(f"    Service: {appt.get('service', {}).get('name', 'N/A')}")
                print(f"    Employee: {appt.get('employee', {}).get('firstName', 'N/A')}")
                print()
            
            if len(appointments) > 5:
                print(f"  ... and {len(appointments) - 5} more appointments")
            
            return appointments
        else:
            print(f"❌ Failed to fetch appointments: {response.status_code}")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ Error fetching appointments: {str(e)}")
        return []

def fetch_services():
    """Fetch all services from Trafft"""
    print("\n✂️ Fetching Services...")
    
    headers = {
        "Authorization": f"Bearer {TRAFFT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{TRAFFT_API_URL}/services",
            headers=headers
        )
        
        if response.status_code == 200:
            services = response.json()
            print(f"✅ Found {len(services)} services:")
            for svc in services:
                print(f"  - {svc['name']} (${svc.get('price', 0)}) - Duration: {svc.get('duration', 0)} min")
            return services
        else:
            print(f"❌ Failed to fetch services: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error fetching services: {str(e)}")
        return []

if __name__ == "__main__":
    print("🚀 Trafft API Connection Test")
    print("=" * 50)
    
    # Test connection
    if test_trafft_connection():
        # Fetch data
        locations = fetch_locations()
        employees = fetch_employees()
        services = fetch_services()
        appointments = fetch_recent_appointments()
        
        print("\n📊 Summary:")
        print(f"  - Locations: {len(locations)}")
        print(f"  - Employees: {len(employees)}")
        print(f"  - Services: {len(services)}")
        print(f"  - Recent Appointments: {len(appointments)}")
        
        print("\n✅ Trafft integration is ready!")
        print("\nNext steps:")
        print("1. Run the sync command to import this data into your database")
        print("2. View the imported data in your analytics dashboard")
    else:
        print("\n❌ Failed to connect to Trafft API")
        print("\nPlease check:")
        print("1. Your API key is correct")
        print("2. Your Trafft account is active")
        print("3. The API key has proper permissions")