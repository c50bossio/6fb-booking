#!/usr/bin/env python3
"""
Add and verify a new sender in SendGrid for BookedBarber production email delivery
"""

import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings

print("🚀 BookedBarber SendGrid Sender Setup\n")
print("This script will add noreply@bookedbarber.com as a verified sender")
print("=" * 60)

# Sender details for BookedBarber
SENDER_EMAIL = "noreply@bookedbarber.com"
SENDER_NAME = "BookedBarber"
REPLY_TO = "support@bookedbarber.com"
COMPANY_NAME = "BookedBarber"
COMPANY_WEBSITE = "https://bookedbarber.com"
CITY = "New York"
COUNTRY = "United States"

print(f"\n📧 Sender Details:")
print(f"   From Email: {SENDER_EMAIL}")
print(f"   From Name: {SENDER_NAME}")
print(f"   Reply To: {REPLY_TO}")
print(f"   Company: {COMPANY_NAME}")

# First, check if sender already exists
print(f"\n1️⃣ Checking if {SENDER_EMAIL} already exists...")

check_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

try:
    result = subprocess.run(check_command, capture_output=True, text=True, timeout=10)
    if result.returncode == 0:
        response = json.loads(result.stdout)
        existing_senders = response.get('results', [])
        
        sender_exists = False
        for sender in existing_senders:
            if sender.get('from_email') == SENDER_EMAIL:
                sender_exists = True
                if sender.get('verified'):
                    print(f"   ✅ {SENDER_EMAIL} already exists and is verified!")
                    print("   No action needed. You can use this sender immediately.")
                    sys.exit(0)
                else:
                    print(f"   ⚠️ {SENDER_EMAIL} exists but is NOT verified")
                    print("   Check your email for the verification link")
                    sys.exit(1)
        
        if not sender_exists:
            print(f"   ℹ️ {SENDER_EMAIL} does not exist yet")
    else:
        print(f"   ❌ Error checking senders: {result.stderr}")
        sys.exit(1)
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")
    sys.exit(1)

# Add the new sender
print(f"\n2️⃣ Adding {SENDER_EMAIL} as a new verified sender...")

# Prepare the request body
sender_data = {
    "nickname": "BookedBarber Production",
    "from_email": SENDER_EMAIL,
    "from_name": SENDER_NAME,
    "reply_to": REPLY_TO,
    "reply_to_name": SENDER_NAME,
    "address": "123 Main Street",
    "address2": "",
    "state": "NY",
    "city": CITY,
    "country": COUNTRY,
    "zip": "10001"
}

add_command = [
    'curl',
    '--request', 'POST',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--data', json.dumps(sender_data),
    '--silent'
]

try:
    result = subprocess.run(add_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0 and result.stdout:
        try:
            response = json.loads(result.stdout)
            
            if 'errors' in response:
                print(f"   ❌ Error adding sender:")
                for error in response['errors']:
                    print(f"      - {error.get('message', 'Unknown error')}")
                sys.exit(1)
            else:
                print(f"   ✅ Successfully added {SENDER_EMAIL}!")
                print(f"   ID: {response.get('id')}")
                print(f"   Status: Verification Pending")
                
                print("\n📬 IMPORTANT: Verification Email Sent!")
                print("=" * 60)
                print(f"1. Check the inbox for {SENDER_EMAIL}")
                print("2. Look for an email from SendGrid")
                print("3. Click the verification link in the email")
                print("4. Once verified, run this script again to confirm")
                print("=" * 60)
                
        except json.JSONDecodeError:
            print(f"   Response: {result.stdout}")
            if "already taken" in result.stdout:
                print(f"   ⚠️ {SENDER_EMAIL} already exists")
                print("   Check your email for the verification link")
            else:
                print("   ✅ Sender likely added - check email for verification")
    else:
        print(f"   ❌ Failed to add sender")
        if result.stderr:
            print(f"   Error: {result.stderr}")
        if result.stdout:
            print(f"   Response: {result.stdout}")
        sys.exit(1)
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")
    sys.exit(1)

print("\n3️⃣ Next Steps:")
print("   1. Check email inbox for verification link")
print("   2. Click the link to verify the sender")
print("   3. Update .env file:")
print(f"      SENDGRID_FROM_EMAIL={SENDER_EMAIL}")
print(f"      SENDGRID_FROM_NAME={SENDER_NAME}")
print("   4. Test email sending with test-sendgrid-email.py")

print("\n💡 Pro Tips:")
print("   - Verification emails usually arrive within 1-2 minutes")
print("   - Check spam/junk folder if not in inbox")
print("   - Verification links expire after 48 hours")
print("   - For production, consider setting up domain authentication")

# Create a quick test script
print("\n📝 Creating quick verification test script...")

test_script = f'''#!/usr/bin/env python3
"""Quick test to verify {SENDER_EMAIL} is working"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Update this after changing .env
TEST_EMAIL = "{SENDER_EMAIL}"

print(f"Testing email from {{TEST_EMAIL}}...")

try:
    sg = SendGridAPIClient(settings.sendgrid_api_key)
    message = Mail(
        from_email=(TEST_EMAIL, "{SENDER_NAME}"),
        to_emails="test@example.com",
        subject="BookedBarber Email Verification Test",
        html_content="<p>If you see this, {SENDER_EMAIL} is verified and working!</p>"
    )
    
    response = sg.send(message)
    print(f"✅ Success! Status: {{response.status_code}}")
    print("Email sending is working!")
except Exception as e:
    print(f"❌ Error: {{str(e)}}")
    if "403" in str(e):
        print("Sender not verified yet. Complete verification first.")
'''

with open('test-bookedbarber-email.py', 'w') as f:
    f.write(test_script)
    
print("✅ Created test-bookedbarber-email.py")
print("   Run this after verification to test email sending")