#\!/usr/bin/env python3
import requests
from datetime import datetime, timedelta
import json

# Login first
login_response = requests.post('http://localhost:8000/api/v1/auth/login', 
    json={'email': 'john@example.com', 'password': 'Test123!@#'})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Get appointments
appointments_response = requests.get('http://localhost:8000/api/v1/appointments/', headers=headers)
if appointments_response.status_code != 200:
    print(f"Failed to get appointments: {appointments_response.status_code}")
    exit(1)

appointments = appointments_response.json()
print(f"Total appointments: {len(appointments)}")

# Group by date
by_date = {}
for apt in appointments:
    date = apt['start_time'].split('T')[0]
    if date not in by_date:
        by_date[date] = []
    by_date[date].append({
        'id': apt['id'],
        'time': apt['start_time'].split('T')[1].split('+')[0],
        'client': apt['client_name'],
        'service': apt['service_name'],
        'barber': apt.get('barber_name', 'Unknown')
    })

# Show appointments by date
for date in sorted(by_date.keys()):
    print(f"\n{date}: {len(by_date[date])} appointments")
    for apt in sorted(by_date[date], key=lambda x: x['time']):
        print(f"  - {apt['time'][:5]} {apt['client']} ({apt['service']}) with {apt['barber']}")

# Check for July 5th specifically
july_5_date = "2025-07-05"
if july_5_date in by_date:
    print(f"\n\nJuly 5th has {len(by_date[july_5_date])} appointments in the data")
else:
    print(f"\n\nNo appointments found for July 5th in the data")
