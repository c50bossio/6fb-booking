#!/usr/bin/env python3
"""
Check SendGrid email activity and retry sending
"""
import os
import sys
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from core.config import settings

def send_test_email(to_email: str, attempt: int = 1):
    """Send a test email with retry logic"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"6FB Platform - Test Email (Attempt #{attempt})"
        msg['From'] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        msg['Reply-To'] = "reply@em3014.6fbmentorship.com"
        
        # Add timestamp to make each email unique
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Email body with timestamp
        text = f"""Hello!

This is test email #{attempt} from the 6FB Platform (sent at {timestamp}).

If you're receiving this email, your SendGrid setup is working correctly!

Important: Check these locations:
1. Primary Inbox
2. Promotions tab (Gmail)
3. Spam/Junk folder
4. All Mail (Gmail)

Best regards,
Chris Bossio
6FB Mentorship Team
"""
        
        html = f"""<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; margin-top: 0;">🎉 SendGrid Test #{attempt}</h2>
        
        <p style="color: #666; line-height: 1.6;">
            This test email was sent at: <strong>{timestamp}</strong>
        </p>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <p style="margin: 0; color: #856404;">
                <strong>📍 Can't find this email?</strong><br>
                Check these locations:
            </p>
            <ul style="margin: 10px 0 0 0; color: #856404;">
                <li>Primary Inbox</li>
                <li>Promotions tab (Gmail)</li>
                <li>Spam/Junk folder</li>
                <li>All Mail (Gmail)</li>
            </ul>
        </div>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <p style="margin: 0; color: #155724;">
                ✅ <strong>Your SendGrid email service is working!</strong>
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="color: #999; font-size: 14px; margin-bottom: 0;">
            Best regards,<br>
            <strong>Chris Bossio</strong><br>
            6FB Mentorship Team<br>
            <a href="https://6fbmentorship.com" style="color: #007bff;">6fbmentorship.com</a>
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
        print(f"\n📤 Sending test email #{attempt} to {to_email}...")
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Test email #{attempt} sent successfully!")
        print(f"   Timestamp: {timestamp}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False

def main():
    """Main function to check and retry email sending"""
    print("=== SendGrid Email Retry Tool ===\n")
    
    print("📊 First, check your SendGrid Activity Feed:")
    print("   https://app.sendgrid.com/email_activity")
    print("\n   Look for emails to 'bossio@tomb45.com' to see their status")
    print("   (delivered, bounced, blocked, etc.)")
    
    print("\n📧 Email Configuration:")
    print(f"  - From: {settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>")
    print(f"  - Reply-To: reply@em3014.6fbmentorship.com")
    
    # Ask if user wants to retry
    retry = input("\n🔄 Do you want to send another test email? (y/n): ")
    
    if retry.lower() == 'y':
        email = input("📬 Enter email address (or press Enter for bossio@tomb45.com): ")
        if not email:
            email = "bossio@tomb45.com"
        
        # Send multiple attempts
        attempts = input("How many test emails to send? (default: 1): ")
        attempts = int(attempts) if attempts else 1
        
        for i in range(1, attempts + 1):
            if send_test_email(email, i):
                print(f"\n✅ Attempt {i} successful")
            else:
                print(f"\n❌ Attempt {i} failed")
                break
        
        print("\n📋 Next steps:")
        print("1. Check your email inbox (including spam/promotions)")
        print("2. Check SendGrid Activity: https://app.sendgrid.com/email_activity")
        print("3. Look for any bounces or blocks in SendGrid")
        
        print("\n💡 Tips if emails aren't arriving:")
        print("- Gmail: Check 'All Mail' and 'Promotions' tab")
        print("- Add support@em3014.6fbmentorship.com to your contacts")
        print("- Check if your email provider is blocking SendGrid")
        print("- Verify the recipient email address is correct")

if __name__ == "__main__":
    main()