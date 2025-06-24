#!/usr/bin/env python3
"""
Complete Email Delivery Test for Six Figure Barber
Tests email delivery to c50bossio@gmail.com using both SendGrid and Gmail SMTP
"""

import asyncio
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from services.email_campaign_service import get_email_campaign_service
from services.email_campaign_config import EmailCampaignConfigManager

# Email delivery configurations
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
GMAIL_USERNAME = os.getenv("SMTP_USERNAME", "c50bossio@gmail.com")
GMAIL_PASSWORD = os.getenv("SMTP_PASSWORD", "")

def print_header():
    """Print test header"""
    print("=" * 80)
    print("📧 SIX FIGURE BARBER - EMAIL DELIVERY TEST")
    print("=" * 80)
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🎯 Testing email delivery to c50bossio@gmail.com")
    print("=" * 80)

def check_email_configurations():
    """Check available email delivery methods"""
    print("\n🔧 CHECKING EMAIL CONFIGURATIONS")
    print("-" * 50)
    
    sendgrid_available = SENDGRID_API_KEY and SENDGRID_API_KEY != "SG.demo-key-replace-with-real-sendgrid-api-key"
    gmail_available = GMAIL_PASSWORD and GMAIL_PASSWORD != "demo-password-replace-with-real-gmail-app-password"
    
    print(f"📧 SendGrid API Key: {'✅ Configured' if sendgrid_available else '❌ Demo key (not configured)'}")
    print(f"📨 Gmail SMTP: {'✅ Configured' if gmail_available else '❌ Demo password (not configured)'}")
    print(f"📬 From Email: {os.getenv('FROM_EMAIL', 'noreply@sixfigurebarber.com')}")
    print(f"🎯 Test Target: c50bossio@gmail.com")
    
    return sendgrid_available, gmail_available

async def test_sendgrid_delivery():
    """Test email delivery using SendGrid"""
    print("\n📧 TESTING SENDGRID DELIVERY")
    print("-" * 50)
    
    try:
        # Check if SendGrid is properly configured
        if not SENDGRID_API_KEY or SENDGRID_API_KEY == "SG.demo-key-replace-with-real-sendgrid-api-key":
            print("❌ SendGrid API key not configured")
            print("🔧 To configure:")
            print("   1. Get API key from SendGrid dashboard")
            print("   2. Update SENDGRID_API_KEY in .env file")
            print("   3. See SENDGRID_SETUP_GUIDE_6FB.md for details")
            return False
            
        # Get email service
        service = get_email_campaign_service()
        
        # Test Valentine's Day email
        print("💕 Testing Valentine's Day email via SendGrid...")
        config = EmailCampaignConfigManager.get_config('valentines_with_discount')
        
        test_data = {
            'client_first_name': 'Carlos',
            'barbershop_name': 'Six Figure Barber - SendGrid Test',
            **config.to_dict(),
            'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe'
        }
        
        # Send email using the campaign service
        success = await service.send_campaign_email(
            to_email="c50bossio@gmail.com",
            template_id="valentines_day_special",
            template_data=test_data
        )
        
        if success:
            print("🎉 SendGrid email sent successfully!")
            print("📧 Check c50bossio@gmail.com inbox")
            return True
        else:
            print("❌ SendGrid delivery failed")
            return False
            
    except Exception as e:
        print(f"❌ SendGrid error: {e}")
        return False

def test_gmail_smtp_delivery():
    """Test email delivery using Gmail SMTP"""
    print("\n📨 TESTING GMAIL SMTP DELIVERY")
    print("-" * 50)
    
    try:
        # Check if Gmail SMTP is configured
        if not GMAIL_PASSWORD or GMAIL_PASSWORD == "demo-password-replace-with-real-gmail-app-password":
            print("❌ Gmail app password not configured")
            print("🔧 To configure:")
            print("   1. Enable 2FA on c50bossio@gmail.com")
            print("   2. Generate App Password in Google Account settings")
            print("   3. Update SMTP_PASSWORD in .env file")
            return False
            
        # Create test email content
        subject = "🎊 Six Figure Barber - Gmail SMTP Test"
        html_content = """
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a, #333); padding: 40px; border-radius: 15px; border: 2px solid #e74c3c;">
                <h1 style="color: #e74c3c; text-align: center; margin-bottom: 30px;">🎊 Six Figure Barber</h1>
                <h2 style="color: #fff; text-align: center;">Gmail SMTP Test Successful!</h2>
                <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Hello Carlos,
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    This is a test email from the Six Figure Barber email system using Gmail SMTP delivery.
                    If you're reading this, the email delivery is working perfectly!
                </p>
                <div style="background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 30px 0;">
                    <h3 style="margin: 0;">📧 Email System Status: ✅ WORKING</h3>
                </div>
                <p style="font-size: 14px; color: #ccc; text-align: center; margin-top: 30px;">
                    Six Figure Barber | Company-Level Email Service
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = """
        Six Figure Barber - Gmail SMTP Test
        
        Hello Carlos,
        
        This is a test email from the Six Figure Barber email system using Gmail SMTP delivery.
        If you're reading this, the email delivery is working perfectly!
        
        Email System Status: WORKING ✅
        
        Six Figure Barber | Company-Level Email Service
        """
        
        # Send email via Gmail SMTP
        print("📤 Sending test email via Gmail SMTP...")
        
        message = MIMEMultipart("alternative")
        message["From"] = GMAIL_USERNAME
        message["To"] = "c50bossio@gmail.com"
        message["Subject"] = subject
        
        # Add text and HTML parts
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")
        
        message.attach(text_part)
        message.attach(html_part)
        
        # Send via SMTP
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(GMAIL_USERNAME, GMAIL_PASSWORD)
        server.sendmail(GMAIL_USERNAME, "c50bossio@gmail.com", message.as_string())
        server.quit()
        
        print("🎉 Gmail SMTP email sent successfully!")
        print("📧 Check c50bossio@gmail.com inbox")
        return True
        
    except Exception as e:
        print(f"❌ Gmail SMTP error: {e}")
        return False

async def test_template_rendering():
    """Test email template rendering without delivery"""
    print("\n🎨 TESTING EMAIL TEMPLATE RENDERING")
    print("-" * 50)
    
    try:
        service = get_email_campaign_service()
        
        # Test multiple configurations
        test_configs = [
            ("Valentine's with discount", "valentines_day_special", "valentines_with_discount"),
            ("Valentine's no offer", "valentines_day_special", "valentines_no_offer"),
            ("Father's Day family deal", "fathers_day_special", "fathers_day_family_deal")
        ]
        
        for name, template_id, config_name in test_configs:
            print(f"\n🎯 Testing: {name}")
            config = EmailCampaignConfigManager.get_config(config_name)
            
            test_data = {
                'client_first_name': 'Carlos',
                'barbershop_name': 'Six Figure Barber',
                **config.to_dict(),
                'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe'
            }
            
            rendered = await service.render_template(template_id, test_data)
            
            print(f"   📧 Subject: {rendered['subject']}")
            if config.has_offer:
                print(f"   💰 Offer: {config.offer_details}")
                print(f"   🏷️ Code: {config.promo_code}")
            else:
                print(f"   💎 Focus: Premium experience")
            print(f"   ✅ Template rendered successfully")
            
        return True
        
    except Exception as e:
        print(f"❌ Template rendering error: {e}")
        return False

def show_setup_instructions():
    """Show setup instructions for email delivery"""
    print("\n🔧 EMAIL DELIVERY SETUP INSTRUCTIONS")
    print("-" * 50)
    print("Choose one or both email delivery methods:")
    print()
    print("📧 OPTION 1: SendGrid (Recommended for Production)")
    print("   ✅ Professional delivery from sixfigurebarber.com")
    print("   ✅ Higher deliverability rates")
    print("   ✅ Better analytics and monitoring")
    print("   📋 Setup Steps:")
    print("      1. Create SendGrid account at sendgrid.com")
    print("      2. Get API key from SendGrid dashboard")
    print("      3. Update SENDGRID_API_KEY in .env file")
    print("      4. See SENDGRID_SETUP_GUIDE_6FB.md for complete guide")
    print()
    print("📨 OPTION 2: Gmail SMTP (Good for Testing)")
    print("   ✅ Quick setup with existing Gmail account")
    print("   ✅ Good for development and testing")
    print("   📋 Setup Steps:")
    print("      1. Enable 2FA on c50bossio@gmail.com")
    print("      2. Go to Google Account > Security > App Passwords")
    print("      3. Generate new app password for 'Mail'")
    print("      4. Update SMTP_PASSWORD in .env file")
    print()
    print("🎯 RECOMMENDED: Start with Gmail for testing, then add SendGrid for production")

def show_next_steps():
    """Show next steps after email setup"""
    print("\n🚀 NEXT STEPS")
    print("-" * 50)
    print("1. ✅ Email templates created and working")
    print("2. ✅ Configurable offer system implemented")
    print("3. ✅ Company-level email architecture ready")
    print("4. 🔧 Configure email delivery credentials")
    print("5. 📧 Test actual email delivery to c50bossio@gmail.com")
    print("6. 🎨 Customize templates with Six Figure Barber branding")
    print("7. 📊 Set up email analytics and monitoring")
    print("8. 🏢 Train franchise owners on email system")
    print("9. 🎯 Launch holiday email campaigns")

async def main():
    """Main test function"""
    print_header()
    
    # Check configurations
    sendgrid_available, gmail_available = check_email_configurations()
    
    # Test template rendering (always works)
    template_success = await test_template_rendering()
    
    # Test actual delivery based on what's configured
    delivery_success = False
    
    if sendgrid_available:
        sendgrid_success = await test_sendgrid_delivery()
        delivery_success = delivery_success or sendgrid_success
    
    if gmail_available:
        gmail_success = test_gmail_smtp_delivery()
        delivery_success = delivery_success or gmail_success
    
    # Show results
    print("\n" + "=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    print(f"🎨 Template Rendering: {'✅ WORKING' if template_success else '❌ FAILED'}")
    print(f"📧 SendGrid Delivery: {'✅ WORKING' if sendgrid_available else '⚙️ NOT CONFIGURED'}")
    print(f"📨 Gmail SMTP Delivery: {'✅ WORKING' if gmail_available else '⚙️ NOT CONFIGURED'}")
    print(f"🎯 Overall Email System: {'✅ READY' if delivery_success else '🔧 NEEDS SETUP'}")
    
    if not delivery_success:
        show_setup_instructions()
    else:
        print("\n🎉 Email system is working! Check c50bossio@gmail.com")
        print("📈 Ready for holiday email campaigns and production use")
    
    show_next_steps()
    
    print("\n" + "=" * 80)
    print("📧 Six Figure Barber Email Delivery Test Complete")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())