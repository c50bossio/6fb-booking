#!/usr/bin/env python3
"""
Simple SMS and Email Notification Test

Tests the core notification functionality without database dependencies.
This test focuses on verifying that SendGrid and Twilio are properly configured
and can send messages.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from services.notification_service import notification_service
from config import settings

# Test Configuration
TEST_EMAIL = "bossio@proton.me"  # Change to your test email
TEST_PHONE = "+1234567890"  # Change to your test phone number (must be verified in Twilio for trial accounts)

def test_configuration():
    """Test if notification services are properly configured"""
    print("🔧 Testing Configuration...")
    print(f"   SendGrid API Key configured: {bool(settings.sendgrid_api_key and settings.sendgrid_api_key != '')}")
    print(f"   SendGrid client initialized: {notification_service.sendgrid_client is not None}")
    print(f"   Twilio credentials configured: {bool(settings.twilio_account_sid and settings.twilio_auth_token)}")
    print(f"   Twilio client initialized: {notification_service.twilio_client is not None}")
    print()

def test_email_sending():
    """Test email sending via SendGrid"""
    print("📧 Testing Email Sending...")
    
    if not notification_service.sendgrid_client:
        print("❌ SendGrid not configured - skipping email test")
        return False
    
    try:
        result = notification_service.send_email(
            to_email=TEST_EMAIL,
            subject="🧪 BookedBarber V2 - Email Test",
            body=f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">BookedBarber V2</h1>
                    <p style="color: white; margin: 5px 0;">Email System Test</p>
                </div>
                
                <div style="padding: 20px; background: #f8f9fa;">
                    <h2 style="color: #333;">✅ Email Test Successful!</h2>
                    <p>This email confirms that the BookedBarber V2 notification system is working correctly.</p>
                    
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Test Details:</h3>
                        <ul>
                            <li><strong>Test Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                            <li><strong>Service:</strong> SendGrid Email API</li>
                            <li><strong>From:</strong> {settings.sendgrid_from_email}</li>
                            <li><strong>Environment:</strong> {settings.environment}</li>
                        </ul>
                    </div>
                    
                    <p>🎉 If you're reading this, email notifications are ready for:</p>
                    <ul>
                        <li>Appointment confirmations and reminders</li>
                        <li>Payment confirmations</li>
                        <li>Marketing campaigns</li>
                        <li>System notifications</li>
                    </ul>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                        <p>This is an automated test message from BookedBarber V2. If you received this in error, please ignore.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        )
        
        if result.get("success"):
            print("✅ Email sent successfully!")
            print(f"   Status Code: {result.get('status_code')}")
            print(f"   Message ID: {result.get('message_id', 'N/A')}")
            return True
        else:
            print("❌ Email sending failed!")
            print(f"   Error: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Email test exception: {str(e)}")
        return False

def test_sms_sending():
    """Test SMS sending via Twilio"""
    print("📱 Testing SMS Sending...")
    
    if not notification_service.twilio_client:
        print("❌ Twilio not configured - skipping SMS test")
        return False
    
    try:
        test_message = f"🧪 BookedBarber V2 SMS Test - {datetime.now().strftime('%H:%M')} - If you received this, SMS notifications are working! 📱✅"
        
        result = notification_service.send_sms(
            to_phone=TEST_PHONE,
            body=test_message
        )
        
        if result.get("success"):
            print("✅ SMS sent successfully!")
            print(f"   Message SID: {result.get('message_sid')}")
            print(f"   Status: {result.get('status')}")
            print(f"   Phone: {TEST_PHONE}")
            return True
        else:
            print("❌ SMS sending failed!")
            print(f"   Error: {result.get('error', 'Unknown error')}")
            print(f"   Twilio Code: {result.get('twilio_code', 'N/A')}")
            return False
            
    except Exception as e:
        print(f"❌ SMS test exception: {str(e)}")
        return False

def test_phone_number_formatting():
    """Test phone number formatting"""
    print("📞 Testing Phone Number Formatting...")
    
    test_numbers = [
        "1234567890",      # 10 digits
        "+11234567890",    # E.164 format
        "(123) 456-7890",  # US format with parentheses
        "123-456-7890",    # US format with dashes
        "123.456.7890",    # US format with dots
    ]
    
    for number in test_numbers:
        formatted = notification_service._format_phone_number(number)
        print(f"   {number:<15} → {formatted}")
    
    print()

def test_error_handling():
    """Test error handling for invalid inputs"""
    print("⚠️  Testing Error Handling...")
    
    # Test invalid email
    if notification_service.sendgrid_client:
        result = notification_service.send_email(
            to_email="invalid-email",
            subject="Test",
            body="Test"
        )
        invalid_email_handled = not result.get("success", False)
        print(f"   Invalid email handled: {'✅' if invalid_email_handled else '❌'}")
    
    # Test invalid phone
    if notification_service.twilio_client:
        result = notification_service.send_sms(
            to_phone="invalid-phone",
            body="Test"
        )
        invalid_phone_handled = not result.get("success", False)
        print(f"   Invalid phone handled: {'✅' if invalid_phone_handled else '❌'}")
    
    print()

def main():
    """Run all notification tests"""
    print("🧪 BookedBarber V2 - Simple Notification Test")
    print("=" * 60)
    print(f"📧 Test Email: {TEST_EMAIL}")
    print(f"📱 Test Phone: {TEST_PHONE}")
    print()
    
    test_configuration()
    
    # Run tests
    email_success = test_email_sending()
    print()
    
    sms_success = test_sms_sending()
    print()
    
    test_phone_number_formatting()
    test_error_handling()
    
    # Summary
    print("📊 Test Results Summary")
    print("=" * 60)
    
    email_status = "✅ Working" if email_success else "❌ Failed"
    sms_status = "✅ Working" if sms_success else "❌ Failed"
    
    print(f"📧 Email (SendGrid): {email_status}")
    print(f"📱 SMS (Twilio): {sms_status}")
    print()
    
    if email_success and sms_success:
        print("🎉 SUCCESS: Both email and SMS notifications are working!")
        print("✅ The notification system is ready for production use.")
        print()
        print("Next steps:")
        print("• Set up notification templates for appointments")
        print("• Configure automatic reminders")
        print("• Test with real appointment bookings")
        print("• Set up monitoring for delivery rates")
        
    elif email_success or sms_success:
        print("⚠️  PARTIAL SUCCESS: One notification method is working.")
        if not email_success:
            print("• Check SendGrid API key and from email configuration")
            print("• Verify SendGrid domain authentication")
        if not sms_success:
            print("• Check Twilio credentials and phone number")
            print("• Verify recipient phone number (must be verified for trial accounts)")
            print("• Check Twilio account balance")
    else:
        print("❌ FAILED: Neither email nor SMS notifications are working.")
        print("• Check API credentials in .env file")
        print("• Verify service provider account status")
        print("• Check network connectivity")
    
    return email_success and sms_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)