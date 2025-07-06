#!/usr/bin/env python3
"""Send a test email from BookedBarber to bossio@tomb45.com"""

import sys
from pathlib import Path
from datetime import datetime
import time

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from services.notification_service import NotificationService

print("📧 Sending BookedBarber Test Email\n")
print("=" * 60)

# Initialize notification service
service = NotificationService()

# Email details
to_email = "bossio@tomb45.com"
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

# Create professional HTML email
html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookedBarber Email Test</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #000000; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">BookedBarber</h1>
                            <p style="margin: 10px 0 0 0; color: #cccccc; font-size: 14px;">OWN THE CHAIR. OWN THE BRAND.</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">Email System Test Successful! 🎉</h2>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                                Hi there,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                                This email confirms that the BookedBarber email system is working correctly and ready for production use.
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 30px 0;">
                                <h3 style="margin: 0 0 10px 0; color: #28a745; font-size: 18px;">✅ System Status</h3>
                                <ul style="margin: 10px 0; padding-left: 20px; color: #666666;">
                                    <li style="margin: 5px 0;">Email Service: SendGrid</li>
                                    <li style="margin: 5px 0;">Sender: noreply@bookedbarber.com</li>
                                    <li style="margin: 5px 0;">Domain: bookedbarber.com (Authenticated)</li>
                                    <li style="margin: 5px 0;">Status: Verified & Active</li>
                                    <li style="margin: 5px 0;">Test Time: {timestamp}</li>
                                </ul>
                            </div>
                            
                            <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                                Your BookedBarber platform is configured for production email delivery with professional branding and domain authentication.
                            </p>
                            
                            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                                <h4 style="margin: 0 0 10px 0; color: #333333; font-size: 16px;">Next Steps:</h4>
                                <ol style="margin: 10px 0; padding-left: 20px; color: #666666; font-size: 14px;">
                                    <li style="margin: 5px 0;">Monitor email delivery rates in SendGrid dashboard</li>
                                    <li style="margin: 5px 0;">Set up email templates for consistent branding</li>
                                    <li style="margin: 5px 0;">Configure bounce and complaint handling</li>
                                    <li style="margin: 5px 0;">Implement email analytics tracking</li>
                                </ol>
                            </div>
                            
                            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                            
                            <p style="margin: 0; color: #999999; font-size: 14px; text-align: center;">
                                This is a test email from the BookedBarber platform.<br>
                                If you have any questions, please contact support.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                                © 2025 BookedBarber. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                BookedBarber Platform | Professional Booking Solutions
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

# Send the email
print(f"To: {to_email}")
print(f"From: {settings.sendgrid_from_email} ({settings.sendgrid_from_name})")
print(f"Subject: BookedBarber Platform Test - Email System Verification")
print("\nSending email...")

try:
    result = service.send_email(
        to_email=to_email,
        subject="BookedBarber Platform Test - Email System Verification",
        body=html_content
    )
    
    if result.get('success'):
        print(f"\n✅ Email sent successfully!")
        print(f"   Status Code: {result.get('status_code')}")
        print(f"   Message ID: {result.get('message_id', 'Not provided')}")
        print(f"\n📬 Please check your inbox at {to_email}")
        print("   (Also check spam/junk folder if not in inbox)")
    else:
        print(f"\n❌ Failed to send email")
        print(f"   Error: {result.get('error')}")
        
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Test complete!")