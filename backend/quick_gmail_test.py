#!/usr/bin/env python3
"""
Quick Gmail SMTP Test for c50bossio@gmail.com
Tests email delivery using Gmail SMTP while SendGrid is being set up
"""

import asyncio
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from services.email_campaign_service import get_email_campaign_service
from services.email_campaign_config import EmailCampaignConfigManager

def send_gmail_smtp(to_email, subject, html_content, text_content):
    """Send email using Gmail SMTP directly"""
    
    # Gmail SMTP configuration
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_username = "c50bossio@gmail.com"  # Your Gmail
    smtp_password = "your-gmail-app-password-here"  # You'll need to set this
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = smtp_username
        message["To"] = to_email
        message["Subject"] = subject
        
        # Add text and HTML parts
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")
        
        message.attach(text_part)
        message.attach(html_part)
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        
        # Note: You'll need to replace this with your actual Gmail app password
        if smtp_password == "your-gmail-app-password-here":
            print("⚠️  Gmail app password not configured yet")
            print("📝 Email content ready to send:")
            print(f"   TO: {to_email}")
            print(f"   SUBJECT: {subject}")
            print("🔧 To actually send:")
            print("   1. Enable 2FA on c50bossio@gmail.com")
            print("   2. Generate App Password")
            print("   3. Update smtp_password in this script")
            return False
            
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, to_email, message.as_string())
        server.quit()
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

async def test_gmail_delivery():
    """Test Gmail SMTP delivery with our new email templates"""
    
    print("📧 Testing Gmail SMTP delivery to c50bossio@gmail.com")
    print("=" * 60)
    
    try:
        service = get_email_campaign_service()
        
        # Test Valentine's Day email with discount
        print("\n💕 Testing Valentine's Day Email...")
        config = EmailCampaignConfigManager.get_config('valentines_with_discount')
        
        test_data = {
            'client_first_name': 'Carlos',
            'barbershop_name': 'Six Figure Barber',
            **config.to_dict(),
            'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe'
        }
        
        rendered = await service.render_template('valentines_day_special', test_data)
        
        # Try to send via Gmail SMTP
        success = send_gmail_smtp(
            to_email="c50bossio@gmail.com",
            subject=rendered['subject'],
            html_content=rendered['html_content'],
            text_content=rendered['text_content']
        )
        
        if success:
            print("🎉 Valentine's Day email delivered!")
        else:
            print("📋 Email ready for delivery (need Gmail setup)")
            
        # Show email preview
        print(f"\n📧 EMAIL PREVIEW:")
        print(f"TO: c50bossio@gmail.com")
        print(f"FROM: Six Figure Barber <c50bossio@gmail.com>")
        print(f"SUBJECT: {rendered['subject']}")
        print(f"OFFER: {config.offer_details}")
        print(f"PROMO: {config.promo_code}")
        
        return success
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def show_gmail_setup_instructions():
    """Show instructions for Gmail app password setup"""
    
    print("\n" + "=" * 60)
    print("🔧 GMAIL SMTP SETUP INSTRUCTIONS")
    print("=" * 60)
    print("To test email delivery to c50bossio@gmail.com:")
    print()
    print("1. Go to Google Account Settings:")
    print("   → https://myaccount.google.com/security")
    print()
    print("2. Enable 2-Factor Authentication")
    print("   → Security > 2-Step Verification")
    print()
    print("3. Generate App Password:")
    print("   → Security > App Passwords")
    print("   → Select 'Mail' as the app")
    print("   → Copy the 16-character password")
    print()
    print("4. Update this script:")
    print("   → Replace 'your-gmail-app-password-here' with real password")
    print()
    print("5. Run test again:")
    print("   → python quick_gmail_test.py")
    print()
    print("🎯 Alternative: Set up SendGrid for production")
    print("   → See SENDGRID_SETUP_GUIDE_6FB.md")

if __name__ == "__main__":
    print("📧 Six Figure Barber Email Test")
    print("Testing company-level email service")
    print()
    
    # Test email delivery
    success = asyncio.run(test_gmail_delivery())
    
    if not success:
        show_gmail_setup_instructions()
    else:
        print("\n🎉 Email system working! Check c50bossio@gmail.com")
        print("📈 Ready for production with SendGrid setup")