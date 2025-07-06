#!/usr/bin/env python3
"""Quick test to verify noreply@bookedbarber.com is working"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Update this after changing .env
TEST_EMAIL = "noreply@bookedbarber.com"

print(f"Testing email from {TEST_EMAIL}...")

try:
    sg = SendGridAPIClient(settings.sendgrid_api_key)
    message = Mail(
        from_email=(TEST_EMAIL, "BookedBarber"),
        to_emails="test@example.com",
        subject="BookedBarber Email Verification Test",
        html_content="<p>If you see this, noreply@bookedbarber.com is verified and working!</p>"
    )
    
    response = sg.send(message)
    print(f"✅ Success! Status: {response.status_code}")
    print("Email sending is working!")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    if "403" in str(e):
        print("Sender not verified yet. Complete verification first.")
