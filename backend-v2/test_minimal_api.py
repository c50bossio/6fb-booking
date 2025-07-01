import requests
import json

def test_api():
    print("🔍 Testing API directly with Python...\n")
    
    # Login first
    login_data = {
        "username": "admin@6fb.com",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = f"{token_data['token_type']} {token_data['access_token']}"
            print("✅ Login successful")
            
            # Test bookings endpoint
            headers = {
                "Authorization": token,
                "Accept": "application/json"
            }
            
            bookings_response = requests.get(
                "http://localhost:8000/api/v1/bookings",
                headers=headers
            )
            
            print(f"Bookings status: {bookings_response.status_code}")
            
            if bookings_response.status_code == 200:
                data = bookings_response.json()
                print("✅ Bookings API works!")
                print(f"Response: {json.dumps(data, indent=2)}")
            else:
                print(f"❌ Error: {bookings_response.status_code}")
                print(f"Response: {bookings_response.text}")
                
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            
    except Exception as e:
        print(f"❌ Request error: {str(e)}")

if __name__ == "__main__":
    test_api()