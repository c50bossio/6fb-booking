#!/usr/bin/env python3
"""
Simple SendGrid test without database dependencies
"""
import os
import sys
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from core.config import settings

def test_sendgrid_simple():
    """Test SendGrid email configuration without database"""
    print("=== SendGrid Configuration Test (Simple) ===\n")
    
    # Check configuration
    print("📧 Email Configuration:")
    print(f"  - SMTP Host: {settings.SMTP_HOST}")
    print(f"  - SMTP Port: {settings.SMTP_PORT}")
    print(f"  - SMTP Username: {settings.SMTP_USERNAME}")
    print(f"  - From Address: {settings.EMAIL_FROM_ADDRESS}")
    print(f"  - From Name: {settings.EMAIL_FROM_NAME}")
    
    if not all([settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD]):
        print("\n❌ Email is not configured. Please check your .env file.")
        return
    
    # Test connection
    print("\n🔌 Testing SMTP Connection...")
    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.quit()
        print("✅ Successfully connected to SendGrid SMTP")
    except Exception as e:
        print(f"❌ Failed to connect: {str(e)}")
        return
    
    # Send test email
    test_email = input("\n📬 Enter email address to send test to: ")
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "6FB Platform - SendGrid Test Email"
        msg['From'] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
        msg['To'] = test_email
        msg['Reply-To'] = "reply@em3014.6fbmentorship.com"
        
        # Email body
        text = """Hello!

This is a test email from the 6FB Platform to verify your SendGrid configuration.

If you're receiving this email, your SendGrid setup is working correctly!

Best regards,
Chris Bossio
6FB Mentorship Team
"""
        
        html = """<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; margin-top: 0;">🎉 SendGrid Test Successful!</h2>
        
        <p style="color: #666; line-height: 1.6;">
            This is a test email from the <strong>6FB Platform</strong> to verify your SendGrid configuration.
        </p>
        
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #495057;">
                ✅ <strong>Your SendGrid email service is working correctly!</strong>
            </p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
            Your platform can now send:
        </p>
        <ul style="color: #666; line-height: 1.8;">
            <li>Appointment confirmations</li>
            <li>Payment receipts</li>
            <li>Welcome emails</li>
            <li>Password resets</li>
            <li>And more...</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="color: #999; font-size: 14px; margin-bottom: 0;">
            Best regards,<br>
            <strong>Chris Bossio</strong><br>
            6FB Mentorship Team
        </p>
    </div>
</body>
</html>"""
        
        # Attach parts
        text_part = MIMEText(text, 'plain')
        html_part = MIMEText(html, 'html')
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        print(f"\n📤 Sending test email to {test_email}...")
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Test email sent successfully to {test_email}!")
        print("\n📊 You can view email statistics in your SendGrid dashboard:")
        print("   https://app.sendgrid.com/statistics")
        print("\n📨 Check your inbox (and spam folder) for the test email.")
        
    except Exception as e:
        print(f"\n❌ Failed to send email: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Verify your SendGrid API key is correct")
        print("2. Check that your sender email is verified in SendGrid")
        print("3. Ensure your SendGrid account is active")

if __name__ == "__main__":
    test_sendgrid_simple()