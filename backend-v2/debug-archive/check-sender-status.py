#!/usr/bin/env python3
"""Check the status of noreply@bookedbarber.com sender in SendGrid"""

import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings

print("🔍 Checking SendGrid Sender Status\n")

# Check all verified senders
curl_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

try:
    result = subprocess.run(curl_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        response = json.loads(result.stdout)
        senders = response.get('results', [])
        
        print("📧 All Verified Senders:\n")
        bookedbarber_found = False
        
        for sender in senders:
            email = sender.get('from_email', 'Unknown')
            name = sender.get('from_name', 'Unknown')
            verified = sender.get('verified', False)
            created_at = sender.get('created_at', 0)
            
            # Convert timestamp to readable date
            if created_at:
                created_date = datetime.fromtimestamp(created_at).strftime('%Y-%m-%d %H:%M:%S')
            else:
                created_date = "Unknown"
            
            print(f"Email: {email}")
            print(f"Name: {name}")
            print(f"Status: {'✅ Verified' if verified else '❌ Not Verified'}")
            print(f"Created: {created_date}")
            print(f"ID: {sender.get('id', 'Unknown')}")
            print("-" * 50)
            
            if email == "noreply@bookedbarber.com":
                bookedbarber_found = True
                if not verified:
                    print("\n⚠️ IMPORTANT: noreply@bookedbarber.com is NOT verified yet!")
                    print("\n📬 Troubleshooting Steps:")
                    print("1. The email might be in spam/junk folder")
                    print("2. Check if noreply@bookedbarber.com is a real email inbox")
                    print("3. SendGrid might need a real email address to send verification to")
                    print("\n💡 Alternative Solutions:")
                    print("1. Use a real email address you have access to (e.g., your personal email)")
                    print("2. Or use support@bookedbarber.com if you have access to it")
                    print("3. Or resend the verification email (see below)")
        
        if not bookedbarber_found:
            print("\n❌ noreply@bookedbarber.com not found in SendGrid!")
            print("The sender might not have been added successfully.")
            
    else:
        print(f"❌ Failed to get sender list: {result.stderr}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Check if we can resend verification
print("\n\n🔄 Resending Verification Email...")
print("\nNote: SendGrid sends verification emails to the actual email address.")
print("If noreply@bookedbarber.com is not a real inbox, you won't receive the email.")
print("\n💡 IMPORTANT: You need access to the email inbox to complete verification!")

# Get sender ID for resending
print("\n📋 Options:")
print("1. Use a different email address that you have access to")
print("2. Set up noreply@bookedbarber.com as a real email inbox")
print("3. Use an existing verified sender temporarily")

# Show command to delete the unverified sender if needed
print("\n🗑️ To remove the unverified sender and try again:")
print("Run: python remove-unverified-sender.py")

# Create removal script
removal_script = '''#!/usr/bin/env python3
"""Remove unverified sender from SendGrid"""

import subprocess
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import settings

# First get the sender ID
get_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

result = subprocess.run(get_command, capture_output=True, text=True)
if result.returncode == 0:
    senders = json.loads(result.stdout).get('results', [])
    for sender in senders:
        if sender.get('from_email') == 'noreply@bookedbarber.com' and not sender.get('verified'):
            sender_id = sender.get('id')
            print(f"Removing unverified sender: {sender.get('from_email')} (ID: {sender_id})")
            
            # Delete the sender
            delete_command = [
                'curl',
                '--request', 'DELETE',
                '--url', f'https://api.sendgrid.com/v3/verified_senders/{sender_id}',
                '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
                '--silent'
            ]
            
            delete_result = subprocess.run(delete_command, capture_output=True, text=True)
            if delete_result.returncode == 0:
                print("✅ Successfully removed unverified sender")
            else:
                print(f"❌ Failed to remove: {delete_result.stderr}")
'''

with open('remove-unverified-sender.py', 'w') as f:
    f.write(removal_script)
    
print("\n✅ Created remove-unverified-sender.py if you need to start over")