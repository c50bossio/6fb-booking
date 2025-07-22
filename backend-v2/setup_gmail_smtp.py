#!/usr/bin/env python3
"""
Gmail SMTP Setup for BookedBarber V2 Notifications

This script helps configure Gmail SMTP as an alternative to SendGrid
for email notifications. Follow the prompts to set up your credentials.
"""

import os
import getpass
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

def test_gmail_smtp(email, password, test_recipient):
    """Test Gmail SMTP connection and send test email"""
    try:
        # Create message
        msg = MimeMultipart('alternative')
        msg['Subject'] = "🧪 BookedBarber V2 Gmail SMTP Test"
        msg['From'] = email
        msg['To'] = test_recipient
        
        # HTML content
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Gmail SMTP Test Successful! ✅</h2>
            <p>Your Gmail SMTP configuration is working correctly for BookedBarber V2.</p>
            <p><strong>From:</strong> {email}</p>
            <p><strong>To:</strong> {test_recipient}</p>
            <p><strong>Service:</strong> Gmail SMTP</p>
            <p>You can now use Gmail for sending:</p>
            <ul>
                <li>Appointment confirmations</li>
                <li>Appointment reminders</li>
                <li>Payment confirmations</li>
                <li>Marketing emails</li>
            </ul>
            <p><em>This is an automated test from BookedBarber V2</em></p>
        </body>
        </html>
        """
        
        msg.attach(MimeText(html, 'html'))
        
        # Connect and send
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(email, password)
        server.send_message(msg)
        server.quit()
        
        print("✅ Gmail SMTP test successful! Email sent.")
        return True
        
    except Exception as e:
        print(f"❌ Gmail SMTP test failed: {str(e)}")
        return False

def update_env_file(gmail_email, gmail_password):
    """Update .env file with Gmail SMTP settings"""
    env_path = ".env"
    
    # Read current .env
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # New SMTP configuration
    smtp_config = f"""
# Gmail SMTP Configuration (Alternative to SendGrid)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME={gmail_email}
SMTP_PASSWORD={gmail_password}
SMTP_USE_TLS=true

# Disable SendGrid (using Gmail instead)
SENDGRID_API_KEY=""

"""
    
    # Remove existing SMTP and SendGrid configs
    filtered_lines = []
    skip_next = False
    for line in lines:
        if any(key in line for key in ['SMTP_', 'SENDGRID_API_KEY=']):
            continue
        filtered_lines.append(line)
    
    # Add new configuration at the end
    with open(env_path, 'w') as f:
        f.writelines(filtered_lines)
        f.write(smtp_config)
    
    print("✅ .env file updated with Gmail SMTP configuration")

def main():
    print("📧 Gmail SMTP Setup for BookedBarber V2")
    print("=" * 50)
    print()
    print("This will configure Gmail SMTP as your email provider.")
    print("You'll need:")
    print("1. A Gmail account with 2-factor authentication enabled")
    print("2. An app-specific password (not your regular Gmail password)")
    print()
    print("📋 Steps to get Gmail app password:")
    print("1. Go to https://myaccount.google.com/apppasswords")
    print("2. Sign in to your Gmail account")
    print("3. Click 'Generate' and select 'Mail'")
    print("4. Copy the 16-character password")
    print()
    
    # Get credentials
    gmail_email = input("Enter your Gmail address: ").strip()
    if not gmail_email.endswith('@gmail.com'):
        print("❌ Please use a @gmail.com address")
        return
    
    print(f"\nGetting app password for {gmail_email}...")
    print("(This should be the 16-character app password, not your regular password)")
    gmail_password = getpass.getpass("Enter Gmail app password: ").strip()
    
    if len(gmail_password) != 16:
        print("⚠️  Warning: App passwords are usually 16 characters")
        confirm = input("Continue anyway? (y/n): ")
        if confirm.lower() != 'y':
            return
    
    # Test recipient
    test_email = input(f"Enter test email address (default: {gmail_email}): ").strip()
    if not test_email:
        test_email = gmail_email
    
    print(f"\n🧪 Testing Gmail SMTP connection...")
    print(f"From: {gmail_email}")
    print(f"To: {test_email}")
    
    # Test connection
    if test_gmail_smtp(gmail_email, gmail_password, test_email):
        print("\n✅ Gmail SMTP is working!")
        
        update_env = input("\nUpdate .env file with these settings? (y/n): ")
        if update_env.lower() == 'y':
            update_env_file(gmail_email, gmail_password)
            
            print("\n🎉 Gmail SMTP setup complete!")
            print("\nNext steps:")
            print("1. Restart your FastAPI server")
            print("2. Test with: curl -X POST 'http://localhost:8000/test/notifications'")
            print("3. Set up Twilio for SMS (see NOTIFICATION_CREDENTIAL_FIX_GUIDE.md)")
        else:
            print("\n📝 Manual .env update needed:")
            print(f"SMTP_SERVER=smtp.gmail.com")
            print(f"SMTP_PORT=587") 
            print(f"SMTP_USERNAME={gmail_email}")
            print(f"SMTP_PASSWORD={gmail_password}")
            print(f"SMTP_USE_TLS=true")
            print(f"SENDGRID_API_KEY=\"\"")
    else:
        print("\n❌ Gmail SMTP setup failed.")
        print("\nCommon issues:")
        print("1. Make sure 2-factor authentication is enabled on Gmail")
        print("2. Use app password, not regular Gmail password")
        print("3. Check if 'Less secure app access' is disabled (use app password instead)")

if __name__ == "__main__":
    main()