#!/usr/bin/env python3
"""Check all verified senders in SendGrid"""

import subprocess
import json
import sys
from pathlib import Path

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings

print("🔍 Checking SendGrid Verified Senders\n")

# Get all verified senders
curl_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json'
]

try:
    result = subprocess.run(curl_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        response = json.loads(result.stdout)
        print("📧 Verified Senders in SendGrid:\n")
        
        if response.get('results'):
            for sender in response['results']:
                email = sender.get('from_email', 'Unknown')
                name = sender.get('from_name', 'Unknown')
                nickname = sender.get('nickname', '')
                verified = sender.get('verified', False)
                
                print(f"Email: {email}")
                print(f"Name: {name}")
                if nickname:
                    print(f"Nickname: {nickname}")
                print(f"Status: {'✅ Verified' if verified else '❌ Not Verified'}")
                print("-" * 50)
        else:
            print("❌ No verified senders found!")
            
        print("\n📋 Recommendations:")
        print("1. Add and verify noreply@bookedbarber.com")
        print("2. Add and verify support@bookedbarber.com")
        print("3. Use one of these for production emails")
        
    else:
        print(f"❌ Failed to get sender list: {result.stderr}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Check domain authentication
print("\n🌐 Checking Domain Authentication:\n")

curl_domain_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/whitelabel/domains',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json'
]

try:
    result = subprocess.run(curl_domain_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        try:
            response = json.loads(result.stdout)
            if isinstance(response, list) and response:
                print("Authenticated Domains:")
                for domain in response:
                    print(f"- {domain.get('domain', 'Unknown')}: {'✅ Valid' if domain.get('valid', False) else '❌ Invalid'}")
            else:
                print("❌ No authenticated domains found")
        except:
            print(f"Response: {result.stdout}")
    else:
        print(f"Failed to get domain list: {result.stderr}")
        
except Exception as e:
    print(f"Error checking domains: {str(e)}")

print("\n💡 Next Steps:")
print("1. Log in to SendGrid: https://app.sendgrid.com")
print("2. Go to Settings > Sender Authentication")
print("3. Add a new sender with email: noreply@bookedbarber.com")
print("4. Verify the email address")
print("5. Update .env file with the verified email")