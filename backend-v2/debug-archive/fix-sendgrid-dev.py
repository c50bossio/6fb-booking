#!/usr/bin/env python3
"""
Temporary fix for SendGrid 403 issue in development
Updates the notification service to handle email failures gracefully
"""

import sys
from pathlib import Path

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

print("🔧 Fixing SendGrid 403 issue for development\n")

# First, let's check if we can find the issue
print("1️⃣ Checking current configuration...")

from config import settings
print(f"   SendGrid API Key: {settings.sendgrid_api_key[:20]}..." if settings.sendgrid_api_key else "   SendGrid API Key: NOT SET")
print(f"   From Email: {settings.sendgrid_from_email}")
print(f"   From Name: {settings.sendgrid_from_name}")

# Test with curl to verify API key
import subprocess
import json

print("\n2️⃣ Testing SendGrid API key with curl...")

curl_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/user/profile',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json'
]

try:
    result = subprocess.run(curl_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        try:
            response = json.loads(result.stdout)
            print("   ✅ API Key is valid!")
            print(f"   Account: {response.get('username', 'Unknown')}")
            print(f"   Email: {response.get('email', 'Unknown')}")
        except:
            print(f"   Response: {result.stdout}")
    else:
        print(f"   ❌ API request failed: {result.stderr}")
        
        if "401" in result.stderr or "401" in result.stdout:
            print("   ⚠️ API key is invalid or expired")
        elif "403" in result.stderr or "403" in result.stdout:
            print("   ⚠️ API key lacks required permissions")
            
except Exception as e:
    print(f"   ❌ Error testing API: {str(e)}")

# Check sender authentication
print("\n3️⃣ Checking sender authentication...")

curl_sender_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json'
]

try:
    result = subprocess.run(curl_sender_command, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        try:
            response = json.loads(result.stdout)
            print("   Verified senders:")
            if response.get('results'):
                for sender in response['results']:
                    print(f"   - {sender.get('from_email')} ({sender.get('from_name')})")
                    if sender.get('verified'):
                        print("     ✅ Verified")
                    else:
                        print("     ❌ Not verified")
            else:
                print("   ❌ No verified senders found!")
                print("   ⚠️ This is likely the cause of 403 errors")
        except:
            print(f"   Response: {result.stdout}")
    else:
        print(f"   ❌ Failed to get sender list: {result.stderr}")
        
except Exception as e:
    print(f"   ❌ Error checking senders: {str(e)}")

print("\n📋 Summary and Recommendations:")
print("1. The API key appears to be from V1 and may need updating")
print("2. The sender email 'noreply@sixfigurebarber.com' needs to be verified")
print("3. For development, consider using console output instead")

print("\n🛠️ Temporary Solutions:")
print("1. Use console output for email verification in development")
print("2. Get a new SendGrid API key from the SendGrid dashboard")
print("3. Verify the sender email in SendGrid")
print("4. Or use a different email service (SMTP/Gmail)")

# Create a development-friendly email handler
print("\n4️⃣ Creating development email handler...")

dev_email_handler = '''#!/usr/bin/env python3
"""Development email handler that logs to console instead of sending"""

def send_development_email(to_email: str, subject: str, body: str):
    """Log email to console in development"""
    print(f"""
    ╔════════════════════════════════════════════════════════════════╗
    ║                     📧 EMAIL (DEVELOPMENT MODE)                 ║
    ╠════════════════════════════════════════════════════════════════╣
    ║ To: {to_email:<55} ║
    ║ Subject: {subject:<50} ║
    ╠════════════════════════════════════════════════════════════════╣
    ║ Body:                                                          ║
    ╚════════════════════════════════════════════════════════════════╝
    
{body}
    
    ╚════════════════════════════════════════════════════════════════╝
    """)
    
    # Extract verification link if present
    import re
    link_match = re.search(r'(http[s]?://[^\s<>"]+verify[^\s<>"]*)', body)
    if link_match:
        print(f"🔗 Verification Link: {link_match.group(1)}")
    
    return True
'''

# Save the development handler
with open('dev_email_handler.py', 'w') as f:
    f.write(dev_email_handler)
    
print("✅ Created dev_email_handler.py for console email output")