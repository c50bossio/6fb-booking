#!/usr/bin/env python3
"""Check SendGrid activity and email delivery status"""

import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings

print("🔍 Checking SendGrid Activity and Email Delivery\n")
print("=" * 60)

# Check recent activity
print("1️⃣ Checking Recent SendGrid Activity...")

# Get activity from the last hour
end_time = int(datetime.now().timestamp())
start_time = int((datetime.now() - timedelta(hours=1)).timestamp())

curl_command = [
    'curl',
    '--request', 'GET',
    '--url', f'https://api.sendgrid.com/v3/messages?limit=20',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

try:
    result = subprocess.run(curl_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        try:
            response = json.loads(result.stdout)
            messages = response.get('messages', [])
            
            if messages:
                print(f"\n📧 Recent Email Activity (Last {len(messages)} emails):\n")
                for msg in messages[:5]:  # Show last 5 emails
                    print(f"To: {msg.get('to_email', 'Unknown')}")
                    print(f"From: {msg.get('from_email', 'Unknown')}")
                    print(f"Subject: {msg.get('subject', 'No subject')}")
                    print(f"Status: {msg.get('status', 'Unknown')}")
                    print(f"Time: {msg.get('last_event_time', 'Unknown')}")
                    print("-" * 40)
            else:
                print("   No recent messages found in activity feed")
                
        except json.JSONDecodeError:
            print(f"   Response: {result.stdout}")
    else:
        print(f"   ❌ Failed to get activity: {result.stderr}")
        if "404" in result.stderr or "404" in result.stdout:
            print("   Note: Activity API might require additional permissions")
            
except Exception as e:
    print(f"   ❌ Error: {str(e)}")

# Check account status
print("\n2️⃣ Checking SendGrid Account Status...")

status_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/user/account',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

try:
    result = subprocess.run(status_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        try:
            response = json.loads(result.stdout)
            print(f"   Account Type: {response.get('type', 'Unknown')}")
            print(f"   Reputation: {response.get('reputation', 'Unknown')}")
        except:
            print(f"   Response: {result.stdout}")
    else:
        print(f"   Unable to get account status")
        
except Exception as e:
    print(f"   Error: {str(e)}")

# Check email credits/limits
print("\n3️⃣ Checking Email Limits...")

limits_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/user/credits',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

try:
    result = subprocess.run(limits_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0 and result.stdout:
        try:
            response = json.loads(result.stdout)
            print(f"   Daily Limit: {response.get('total', 'Unknown')}")
            print(f"   Used Today: {response.get('used', 'Unknown')}")
            print(f"   Remaining: {response.get('remain', 'Unknown')}")
        except:
            print(f"   Unable to parse limits")
    else:
        print(f"   Limits information not available")
        
except Exception as e:
    print(f"   Error: {str(e)}")

print("\n📋 Troubleshooting:")
print("1. Emails might be delayed (SendGrid can take 5-10 minutes)")
print("2. Check spam/junk folders")
print("3. Some email providers block test domains (@example.com)")
print("4. Gmail might be filtering automated emails")
print("\n💡 Let's try sending to your Gmail address instead...")