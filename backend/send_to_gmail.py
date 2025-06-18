#!/usr/bin/env python3
"""
Send test email to Gmail
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

def send_to_gmail():
    """Send test email to c50bossio@gmail.com"""
    to_email = "c50bossio@gmail.com"
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "6FB Platform - Welcome to Your Mentorship Dashboard"
        msg['From'] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        msg['Reply-To'] = "reply@em3014.6fbmentorship.com"
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Email body
        text = f"""Welcome to 6FB Mentorship!

This email confirms that your 6FB Platform email notifications are working correctly.

You'll receive emails for:
- Appointment confirmations and reminders
- Payment receipts
- Important platform updates
- Weekly performance reports

Email sent at: {timestamp}

Best regards,
Chris Bossio
6FB Mentorship Team
"""
        
        html = f"""<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #1a1a1a; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">6FB Mentorship</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.8;">Your Barbering Success Platform</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0;">✅ Email Notifications Active!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
                Great news! Your email notifications are working perfectly. You're all set to receive important updates from the 6FB Platform.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">You'll receive notifications for:</h3>
                <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>📅 Appointment confirmations and reminders</li>
                    <li>💳 Payment receipts and invoices</li>
                    <li>📊 Weekly performance summaries</li>
                    <li>🎯 Goal achievement alerts</li>
                    <li>💬 Client communication updates</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://6fbmentorship.com" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Dashboard</a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
                <em>Sent at: {timestamp}</em>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="color: #666; font-size: 14px; margin: 0;">
                6FB Mentorship Platform<br>
                <a href="https://6fbmentorship.com" style="color: #007bff; text-decoration: none;">6fbmentorship.com</a>
            </p>
        </div>
    </div>
</body>
</html>"""
        
        # Attach parts
        text_part = MIMEText(text, 'plain')
        html_part = MIMEText(html, 'html')
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        print(f"📤 Sending test email to {to_email}...")
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email sent successfully to {to_email}!")
        print(f"\n📍 Check these Gmail locations:")
        print("   1. Primary inbox")
        print("   2. Promotions tab")
        print("   3. Spam folder")
        print("   4. All Mail")
        print(f"\n⏰ Sent at: {timestamp}")
        print("\n📊 Track delivery: https://app.sendgrid.com/email_activity")
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")

if __name__ == "__main__":
    send_to_gmail()