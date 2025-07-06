#!/usr/bin/env python3
import requests

# Login with verified user
login_data = {
    'email': 'test-barber@6fb.com',
    'password': 'testpass123'
}

login_response = requests.post('http://localhost:8000/api/v1/auth/login', json=login_data)
print('Login response:', login_response.status_code)

if login_response.status_code != 200:
    print('Login failed:', login_response.json())
else:
    token = login_response.json()['access_token']
    
    # Test analytics endpoint
    headers = {'Authorization': f'Bearer {token}'}
    analytics_response = requests.get(
        'http://localhost:8000/api/v1/agents/analytics',
        headers=headers,
        params={
            'start_date': '2025-06-04T00:00:00Z',
            'end_date': '2025-07-04T00:00:00Z'
        }
    )
    
    print('Analytics response:', analytics_response.status_code)
    print('Analytics data:', analytics_response.json())