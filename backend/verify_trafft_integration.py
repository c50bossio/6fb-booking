#!/usr/bin/env python3
"""
Verify Trafft Integration is Working
"""
import requests
import json
from datetime import datetime

BASE_URL = "https://sixfb-backend.onrender.com"

# Your admin credentials
EMAIL = "c50bossio@gmail.com"
PASSWORD = "admin123"  # Use your actual password

print("🔍 Verifying Trafft Integration")
print("=" * 50)

# Step 1: Login to get access token
print("\n1️⃣ Logging in...")
try:
    login_response = requests.post(
        f"{BASE_URL}/auth/token",
        data={
            "username": EMAIL,
            "password": PASSWORD
        }
    )
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print("✅ Login successful!")
        headers = {"Authorization": f"Bearer {token}"}
    else:
        print("❌ Login failed!")
        print(login_response.text)
        exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Step 2: Check webhook logs
print("\n2️⃣ Checking recent webhook logs...")
try:
    logs_response = requests.get(
        f"{BASE_URL}/api/v1/webhooks/trafft/logs",
        headers=headers
    )
    
    if logs_response.status_code == 200:
        logs = logs_response.json()
        print(f"✅ Found {logs['count']} webhook logs")
        
        if logs['count'] > 0:
            print("\nRecent webhooks:")
            for log in logs['logs'][:3]:
                print(f"  - {log['timestamp']} | {log['event_type']} | {log.get('body_parsed', {}).get('customerFullName', 'Unknown')}")
    else:
        print("❌ Could not fetch logs")
except:
    print("ℹ️  Webhook logs endpoint not accessible")

# Step 3: Check sync dashboard
print("\n3️⃣ Checking sync dashboard...")
try:
    dashboard_response = requests.get(
        f"{BASE_URL}/api/v1/sync/dashboard",
        headers=headers
    )
    
    if dashboard_response.status_code == 200:
        dashboard = dashboard_response.json()
        print(f"✅ Sync Health: {dashboard['sync_health']}%")
        print(f"   Total Synced Appointments: {dashboard['statistics']['total_synced_appointments']}")
        print(f"   Recent Syncs (24h): {dashboard['statistics']['recent_syncs_24h']}")
        print(f"   Barbers Connected: {dashboard['statistics']['barbers_connected']}")
        print(f"   Clients Imported: {dashboard['statistics']['clients_imported']}")
        
        if dashboard['recent_appointments']:
            print("\n   Recent Appointments:")
            for apt in dashboard['recent_appointments'][:3]:
                print(f"     - {apt['date']} | {apt['client_name']} with {apt['barber_name']} | {apt['service']}")
    else:
        print(f"❌ Dashboard error: {dashboard_response.status_code}")
except Exception as e:
    print(f"❌ Error accessing dashboard: {e}")

# Step 4: Check appointments
print("\n4️⃣ Checking appointments in database...")
try:
    appointments_response = requests.get(
        f"{BASE_URL}/api/v1/appointments",
        headers=headers
    )
    
    if appointments_response.status_code == 200:
        appointments = appointments_response.json()
        trafft_appointments = [a for a in appointments if a.get('trafft_appointment_id')]
        
        print(f"✅ Total appointments: {len(appointments)}")
        print(f"   From Trafft: {len(trafft_appointments)}")
        
        if trafft_appointments:
            print("\n   Sample Trafft appointments:")
            for apt in trafft_appointments[:3]:
                print(f"     - ID: {apt['trafft_appointment_id']} | {apt['appointment_date']} | Status: {apt['status']}")
    else:
        print("❌ Could not fetch appointments")
except Exception as e:
    print(f"❌ Error: {e}")

# Step 5: Test creating a test appointment in Trafft
print("\n5️⃣ To test the full flow:")
print("   1. Create a test appointment in Trafft")
print("   2. Wait a few seconds")
print("   3. Run this script again to see if it appears")
print("\n   OR check the logs:")
print(f"   {BASE_URL}/api/v1/sync/webhook-logs")

print("\n" + "=" * 50)
print("\n📊 Summary:")
print("If you see webhook logs and synced appointments above, the integration is working!")
print("\nMonitor live webhooks at:")
print(f"- Logs: {BASE_URL}/api/v1/webhooks/trafft/logs")
print(f"- Dashboard: {BASE_URL}/api/v1/sync/dashboard")
print(f"- Appointments: {BASE_URL}/api/v1/appointments")