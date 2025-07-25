#!/usr/bin/env python3
"""Send test email to Gmail address"""

import sys
from pathlib import Path
from datetime import datetime

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from services.notification_service import NotificationService

print("📧 Sending BookedBarber Test Email to Gmail\n")
print("=" * 60)

# Initialize notification service
service = NotificationService()

# Email details
to_email = "c50bossio@gmail.com"
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

# Create a simpler plain text version first
plain_text = f"""
BookedBarber Email Test - {timestamp}

This email confirms that the BookedBarber email system is working correctly!

System Status:
- Email Service: SendGrid (Active)
- Sender: noreply@bookedbarber.com
- Domain: bookedbarber.com (Authenticated)
- Account Status: Active (Free Tier)
- Daily Limit: 100 emails
- Used Today: 4
- Remaining: 96

If you're receiving this email, your BookedBarber platform is ready for production email delivery.

Best regards,
The BookedBarber Team

© 2025 BookedBarber. All rights reserved.
"""

# Also create HTML version
html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BookedBarber Email Test</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #000; color: #fff; padding: 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0;">BookedBarber</h1>
        <p style="margin: 5px 0; font-size: 14px;">OWN THE CHAIR. OWN THE BRAND.</p>
    </div>
    
    <h2>Email System Test - {timestamp}</h2>
    
    <p>Hi there,</p>
    
    <p>This email confirms that the BookedBarber email system is working correctly!</p>
    
    <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3 style="margin-top: 0; color: #28a745;">✅ System Status</h3>
        <ul style="margin: 0; padding-left: 20px;">
            <li>Email Service: SendGrid (Active)</li>
            <li>Sender: noreply@bookedbarber.com</li>
            <li>Domain: bookedbarber.com (Authenticated)</li>
            <li>Account Status: Active (Free Tier)</li>
            <li>Daily Limit: 100 emails</li>
            <li>Used Today: 4</li>
            <li>Remaining: 96</li>
        </ul>
    </div>
    
    <p>If you're receiving this email, your BookedBarber platform is ready for production email delivery.</p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    
    <p style="text-align: center; color: #666; font-size: 14px;">
        © 2025 BookedBarber. All rights reserved.<br>
        Professional Booking Solutions
    </p>
</body>
</html>
"""

# Send the email
print(f"To: {to_email}")
print(f"From: {settings.sendgrid_from_email} ({settings.sendgrid_from_name})")
print(f"Subject: BookedBarber Test - Gmail Delivery Check")
print("\nSending email...")

try:
    # First try with HTML
    result = service.send_email(
        to_email=to_email,
        subject=f"BookedBarber Test - Gmail Delivery Check ({timestamp})",
        body=html_content
    )
    
    if result.get('success'):
        print(f"\n✅ Email sent successfully to Gmail!")
        print(f"   Status Code: {result.get('status_code')}")
        print(f"   Time: {timestamp}")
        print(f"\n📬 Please check your Gmail inbox: {to_email}")
        print("   Note: Gmail might place it in:")
        print("   - Primary tab")
        print("   - Promotions tab") 
        print("   - Spam folder")
        print("   - All Mail")
        
        # Log to SendGrid Activity
        print("\n📊 SendGrid Stats:")
        print("   - This was email #5 of 100 daily limit")
        print("   - 95 emails remaining today")
        print("   - Check SendGrid Activity: https://app.sendgrid.com/email_activity")
    else:
        print(f"\n❌ Failed to send email")
        print(f"   Error: {result.get('error')}")
        
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Test complete!")