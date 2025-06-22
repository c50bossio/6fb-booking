#!/usr/bin/env python3
"""
Test Email Configuration Script

This script tests your email configuration without running the full application.
It will attempt to send a test email using your configured SMTP settings.

Usage:
    python test_email_config.py [recipient_email]
    
If no recipient email is provided, it will send to the FROM_EMAIL address.
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(".env.auth")


def test_email_configuration():
    """Test email configuration and send a test email"""
    
    # Get email configuration
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", smtp_username)
    from_name = os.getenv("EMAIL_FROM_NAME", "6FB Platform")
    
    # Check if email is configured
    if not all([smtp_server, smtp_username, smtp_password]):
        print("❌ Email configuration is incomplete!")
        print("\nMissing configuration:")
        if not smtp_server:
            print("  - SMTP_SERVER")
        if not smtp_username:
            print("  - SMTP_USERNAME")
        if not smtp_password:
            print("  - SMTP_PASSWORD")
        print("\nPlease check your .env file and ensure all email settings are configured.")
        print("See .env.template for configuration examples.")
        return False
    
    # Get recipient email
    recipient = sys.argv[1] if len(sys.argv) > 1 else from_email
    
    print(f"📧 Testing email configuration...")
    print(f"   SMTP Server: {smtp_server}:{smtp_port}")
    print(f"   Username: {smtp_username}")
    print(f"   From: {from_name} <{from_email}>")
    print(f"   To: {recipient}")
    print()
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🧪 6FB Platform - Email Configuration Test'
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = recipient
        
        # Create the HTML content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Email Configuration Test Successful! ✅</h2>
                
                <p>This test email confirms that your email configuration is working correctly.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">Configuration Details:</h3>
                    <p style="margin: 5px 0;"><strong>SMTP Server:</strong> {smtp_server}:{smtp_port}</p>
                    <p style="margin: 5px 0;"><strong>Username:</strong> {smtp_username}</p>
                    <p style="margin: 5px 0;"><strong>From Email:</strong> {from_email}</p>
                    <p style="margin: 5px 0;"><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>✅ Success!</strong> Your email service is properly configured and ready to send notifications.</p>
                </div>
                
                <h3>Email Features Now Available:</h3>
                <ul>
                    <li>Appointment confirmations and reminders</li>
                    <li>Payment receipts</li>
                    <li>Password reset emails</li>
                    <li>Welcome emails for new users</li>
                    <li>Cancellation notifications</li>
                </ul>
                
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    This is a test email from the 6FB Booking Platform email configuration test script.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        text_content = f"""
Email Configuration Test Successful! ✅

This test email confirms that your email configuration is working correctly.

Configuration Details:
- SMTP Server: {smtp_server}:{smtp_port}
- Username: {smtp_username}
- From Email: {from_email}
- Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Your email service is properly configured and ready to send notifications.

Email Features Now Available:
- Appointment confirmations and reminders
- Payment receipts
- Password reset emails
- Welcome emails for new users
- Cancellation notifications

---
This is a test email from the 6FB Booking Platform email configuration test script.
        """
        
        # Attach parts
        text_part = MIMEText(text_content, 'plain')
        html_part = MIMEText(html_content, 'html')
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Connect to server and send email
        print("🔌 Connecting to SMTP server...")
        
        if smtp_port == 587:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
        elif smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
        
        print("🔐 Authenticating...")
        server.login(smtp_username, smtp_password)
        
        print("📨 Sending test email...")
        server.send_message(msg)
        server.quit()
        
        print("\n✅ SUCCESS! Test email sent successfully!")
        print(f"   Check {recipient} for the test email.")
        print("\n   Your email configuration is working correctly.")
        print("   The platform can now send automated notifications.")
        
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print("\n❌ AUTHENTICATION ERROR!")
        print("   Failed to authenticate with the SMTP server.")
        print("\n   Common causes:")
        print("   - Incorrect username or password")
        print("   - For Gmail: Not using an App Password (regular password won't work)")
        print("   - For Gmail: 2-factor authentication not enabled")
        print("   - Account security settings blocking the connection")
        print(f"\n   Error: {str(e)}")
        return False
        
    except smtplib.SMTPConnectError as e:
        print("\n❌ CONNECTION ERROR!")
        print("   Failed to connect to the SMTP server.")
        print("\n   Common causes:")
        print("   - Incorrect SMTP server address or port")
        print("   - Firewall blocking the connection")
        print("   - Network connectivity issues")
        print(f"\n   Error: {str(e)}")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}")
        print(f"   {str(e)}")
        print("\n   Please check your email configuration in the .env file.")
        return False


def check_email_requirement():
    """Check if email is required for core functionality"""
    print("\n📋 Email Service Requirements:")
    print("   Email configuration is OPTIONAL but recommended.")
    print("\n   Core features that work WITHOUT email:")
    print("   ✅ User registration and login")
    print("   ✅ Booking appointments")
    print("   ✅ Payment processing")
    print("   ✅ Analytics and reporting")
    print("   ✅ Barber management")
    print("\n   Features that REQUIRE email:")
    print("   ⚠️  Appointment confirmation emails")
    print("   ⚠️  Appointment reminder emails")
    print("   ⚠️  Payment receipt emails")
    print("   ⚠️  Password reset functionality")
    print("   ⚠️  Welcome emails for new users")
    print("\n   The platform will detect if email is not configured and")
    print("   gracefully disable email-dependent features.")


if __name__ == "__main__":
    print("🧪 6FB Platform - Email Configuration Test")
    print("=" * 50)
    
    # Test email configuration
    success = test_email_configuration()
    
    # Show requirements
    check_email_requirement()
    
    if not success:
        print("\n💡 Setup Instructions:")
        print("   1. Copy .env.template to .env")
        print("   2. Choose an email provider (Gmail recommended for testing)")
        print("   3. Follow the setup instructions in .env.template")
        print("   4. Run this script again to test")
        
    sys.exit(0 if success else 1)