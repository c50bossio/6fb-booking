#!/usr/bin/env python3
"""Test SendGrid email sending functionality"""

import sys
from pathlib import Path

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import time

print("📧 Testing SendGrid Email Sending\n")

# Test email details
test_email = f"test_{int(time.time())}@example.com"
print(f"Test recipient: {test_email}")
print(f"From email: {settings.sendgrid_from_email}")
print(f"From name: {settings.sendgrid_from_name}")
print(f"API Key: {settings.sendgrid_api_key[:20]}...\n" if settings.sendgrid_api_key else "API Key: NOT SET\n")

if not settings.sendgrid_api_key:
    print("❌ Cannot test - SendGrid API key not configured")
    sys.exit(1)

# Create SendGrid client
try:
    sg = SendGridAPIClient(settings.sendgrid_api_key)
    print("✅ SendGrid client created successfully")
except Exception as e:
    print(f"❌ Failed to create SendGrid client: {str(e)}")
    sys.exit(1)

# Create test email
message = Mail(
    from_email=(settings.sendgrid_from_email, settings.sendgrid_from_name),
    to_emails=test_email,
    subject='BookedBarber Email Test',
    html_content='<p>This is a test email from BookedBarber V2.</p><p>If you receive this, SendGrid is working correctly!</p>'
)

# Send email
print("\n🚀 Attempting to send email...")
try:
    response = sg.send(message)
    print(f"✅ Email sent successfully!")
    print(f"   Status code: {response.status_code}")
    print(f"   Response body: {response.body}")
    print(f"   Response headers: {dict(response.headers)}")
except Exception as e:
    print(f"❌ Failed to send email: {str(e)}")
    
    # Check if it's a 403 error
    if hasattr(e, 'status_code') and e.status_code == 403:
        print("\n⚠️ 403 Forbidden - Possible causes:")
        print("   1. API key is invalid or expired")
        print("   2. Sender email is not verified in SendGrid")
        print("   3. Account permissions issue")
        print("\nTo fix:")
        print("   1. Log in to SendGrid: https://app.sendgrid.com")
        print("   2. Go to Settings > API Keys")
        print("   3. Create a new API key with 'Full Access'")
        print("   4. Update SENDGRID_API_KEY in .env file")
        print("   5. Verify sender at Settings > Sender Authentication")
    
    import traceback
    traceback.print_exc()

# Test using notification service
print("\n🔧 Testing via NotificationService...")
try:
    from services.notification_service import NotificationService
    service = NotificationService()
    
    result = service.send_email(
        to_email=test_email,
        subject="BookedBarber NotificationService Test",
        body="<p>This test was sent via the NotificationService.</p>"
    )
    
    if result.get('success'):
        print("✅ NotificationService email sent successfully!")
    else:
        print(f"❌ NotificationService failed: {result.get('error')}")
        
except Exception as e:
    print(f"❌ NotificationService error: {str(e)}")
    import traceback
    traceback.print_exc()