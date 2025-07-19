#!/usr/bin/env python3
"""
Direct API Testing Script - bypasses middleware issues
Tests core functionality directly
"""

import sqlite3
import requests
import json
import time
from datetime import datetime

def test_database_direct():
    """Direct database testing"""
    print("🗄️ Direct Database Testing...")
    
    try:
        conn = sqlite3.connect("6fb_booking.db")
        cursor = conn.cursor()
        
        # Test critical queries
        print("✅ Database connection successful")
        
        # Check users with passwords
        cursor.execute("SELECT email, role, hashed_password FROM users WHERE email LIKE '%admin%' OR email LIKE '%barber%' LIMIT 3;")
        users = cursor.fetchall()
        print(f"📊 Found {len(users)} admin/barber users:")
        for email, role, hashed_pw in users:
            print(f"   - {email} ({role}) - {'has password' if hashed_pw else 'no password'}")
        
        # Check appointments
        cursor.execute("SELECT COUNT(*) FROM appointments;")
        apt_count = cursor.fetchone()[0]
        print(f"📅 Appointments in database: {apt_count}")
        
        # Check services
        cursor.execute("SELECT name, base_price FROM services LIMIT 3;")
        services = cursor.fetchall()
        print(f"💰 Sample services:")
        for name, price in services:
            print(f"   - {name}: ${price}")
        
        # Check payments
        cursor.execute("SELECT COUNT(*) FROM payments WHERE status='completed';")
        completed_payments = cursor.fetchone()[0]
        print(f"💳 Completed payments: {completed_payments}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_auth_bypass():
    """Test auth with a simpler approach"""
    print("\n🔐 Testing Authentication (Direct)...")
    
    # Create test user in database if needed
    try:
        conn = sqlite3.connect("6fb_booking.db")
        cursor = conn.cursor()
        
        # Check if we can find a user with a known password pattern
        cursor.execute("SELECT email, role FROM users WHERE email LIKE '%admin%' OR email LIKE '%test%' LIMIT 1;")
        user = cursor.fetchone()
        
        if user:
            email, role = user
            print(f"📧 Found test user: {email} ({role})")
            
            # Try common test passwords
            test_passwords = ["admin123", "password", "test123", "admin", "123456"]
            
            for password in test_passwords:
                try:
                    response = requests.post(
                        "http://localhost:8000/api/v2/auth/login",
                        json={"email": email, "password": password},
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        print(f"✅ Login successful with password: {password}")
                        data = response.json()
                        token = data.get("access_token")
                        print(f"🔑 Received token: {token[:50]}...")
                        return token
                    elif response.status_code == 401:
                        print(f"❌ Wrong password: {password}")
                    else:
                        print(f"⚠️  Unexpected status {response.status_code} for {password}")
                        
                except requests.exceptions.Timeout:
                    print(f"⏱️  Timeout testing password: {password}")
                except Exception as e:
                    print(f"⚠️  Error testing {password}: {e}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Auth test error: {e}")
    
    return None

def test_simple_endpoints():
    """Test endpoints that should work without auth"""
    print("\n🌐 Testing Simple Endpoints...")
    
    simple_tests = [
        ("/", "root"),
        ("/docs", "docs"),
        ("/openapi.json", "openapi"),
        ("/api/v2/services", "services")  # This might be public
    ]
    
    for endpoint, name in simple_tests:
        try:
            start_time = time.time()
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                print(f"✅ {name}: OK ({elapsed*1000:.0f}ms)")
                if name == "services":
                    try:
                        data = response.json()
                        print(f"   Services count: {len(data) if isinstance(data, list) else 'not a list'}")
                    except:
                        print(f"   Response length: {len(response.text)} chars")
            elif response.status_code in [302, 301]:
                print(f"🔄 {name}: Redirected to {response.headers.get('location', 'unknown')}")
            else:
                print(f"❌ {name}: Status {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"⏱️  {name}: Timeout")
        except Exception as e:
            print(f"⚠️  {name}: Error - {e}")

def test_with_auth_token(token):
    """Test protected endpoints with authentication"""
    if not token:
        print("\n🔒 Skipping authenticated tests - no token available")
        return
        
    print(f"\n🔑 Testing with Authentication Token...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    protected_tests = [
        ("/api/v2/auth/me", "current_user"),
        ("/api/v2/users", "users_list"),
        ("/api/v2/appointments", "appointments"),
        ("/api/v2/clients", "clients")
    ]
    
    for endpoint, name in protected_tests:
        try:
            start_time = time.time()
            response = requests.get(f"http://localhost:8000{endpoint}", headers=headers, timeout=5)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                print(f"✅ {name}: OK ({elapsed*1000:.0f}ms)")
                try:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"   Returned {len(data)} items")
                    elif isinstance(data, dict):
                        print(f"   Keys: {list(data.keys())[:5]}")
                except:
                    print(f"   Response length: {len(response.text)} chars")
            elif response.status_code == 401:
                print(f"🔒 {name}: Unauthorized (expected for some endpoints)")
            elif response.status_code == 403:
                print(f"🚫 {name}: Forbidden (insufficient permissions)")
            else:
                print(f"❌ {name}: Status {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"⏱️  {name}: Timeout")
        except Exception as e:
            print(f"⚠️  {name}: Error - {e}")

def check_server_logs():
    """Check if there are any obvious server errors"""
    print("\n📋 Checking Server Status...")
    
    try:
        # Check if log files exist and show recent errors
        log_files = ["backend.log", "server.log", "staging_backend.log"]
        
        for log_file in log_files:
            try:
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    if lines:
                        recent_lines = lines[-10:]  # Last 10 lines
                        error_lines = [line for line in recent_lines if 'ERROR' in line or 'error' in line.lower()]
                        if error_lines:
                            print(f"⚠️  Errors in {log_file}:")
                            for line in error_lines[-3:]:  # Show last 3 errors
                                print(f"   {line.strip()}")
                        else:
                            print(f"✅ No recent errors in {log_file}")
            except FileNotFoundError:
                pass
                
    except Exception as e:
        print(f"❌ Error checking logs: {e}")

def main():
    print("🚀 Direct API Testing - BookedBarber V2")
    print("="*60)
    
    # Test database first
    db_ok = test_database_direct()
    
    if not db_ok:
        print("❌ Database issues detected - stopping tests")
        return
    
    # Check server status
    check_server_logs()
    
    # Test simple endpoints
    test_simple_endpoints()
    
    # Test authentication
    token = test_auth_bypass()
    
    # Test protected endpoints
    test_with_auth_token(token)
    
    print("\n📊 Direct Testing Complete")
    print("="*60)

if __name__ == "__main__":
    main()