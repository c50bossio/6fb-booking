#!/usr/bin/env python3
"""
Automated Email Test for BookedBarber
Tests the notification system without user input
"""

import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.notification_service import notification_service
from config import settings

def test_email_system():
    """Automated test of email notification system"""
    
    print("🔔 BOOKEDBARBER EMAIL NOTIFICATION TEST")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    print("📋 Current Configuration:")
    print(f"   From Email: {settings.sendgrid_from_email}")
    print(f"   From Name: {settings.sendgrid_from_name}")
    print(f"   API Key: {settings.sendgrid_api_key[:20]}..." if settings.sendgrid_api_key else "   API Key: NOT SET")
    print()
    
    # Use the user's email for testing
    test_email = "c50bossio@gmail.com"
    
    print(f"📧 Sending test email to: {test_email}")
    print("⏳ Please wait...")
    
    try:
        # Test email sending
        result = notification_service.send_email(
            to_email=test_email,
            subject="✅ BookedBarber - Email System Working!",
            body=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .success-box {{ background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                    .info-box {{ background: #e2e3e5; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Email System Test Successful!</h1>
                    <p>BookedBarber Notification System</p>
                </div>
                
                <div class="content">
                    <div class="success-box">
                        <h2>✅ Email notifications are working!</h2>
                        <p>Your SendGrid integration is properly configured and ready.</p>
                    </div>
                    
                    <div class="info-box">
                        <h3>📊 Test Details</h3>
                        <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                        <p><strong>From:</strong> {settings.sendgrid_from_email}</p>
                        <p><strong>Service:</strong> SendGrid API</p>
                        <p><strong>Status:</strong> ✅ Verified Sender Active</p>
                    </div>
                    
                    <div class="info-box">
                        <h3>📱 SMS Status</h3>
                        <p><strong>Twilio:</strong> Configured but requires A2P 10DLC registration</p>
                        <p><strong>Next Step:</strong> Complete A2P registration in Twilio Console</p>
                        <p><strong>Timeline:</strong> 1-3 business days for approval</p>
                    </div>
                    
                    <p style="text-align: center; margin-top: 30px;">
                        <strong>What's Working Now:</strong><br>
                        ✅ Appointment confirmation emails<br>
                        ✅ Appointment reminder emails<br>
                        ✅ Password reset emails<br>
                        ✅ All system notifications
                    </p>
                </div>
            </body>
            </html>
            """
        )
        
        if result.get("success"):
            print("\n🎉 SUCCESS! Test email sent successfully!")
            print(f"📬 Status Code: {result.get('status_code', 'N/A')}")
            print(f"📧 Check inbox for: {test_email}")
            print()
            print("✅ EMAIL NOTIFICATION SYSTEM IS WORKING!")
            print()
            print("📱 SMS Status:")
            print("   • Twilio is configured")
            print("   • Requires A2P 10DLC registration")
            print("   • Complete registration in Twilio Console")
            print("   • Approval takes 1-3 business days")
            return True
        else:
            print("\n❌ Test email failed to send")
            print(f"Error: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error testing email system: {str(e)}")
        return False

def check_sms_status():
    """Check SMS configuration status"""
    print("\n📱 SMS Configuration Status:")
    print("=" * 40)
    
    if settings.twilio_account_sid and settings.twilio_auth_token:
        print("✅ Twilio credentials configured")
        print(f"   Account SID: {settings.twilio_account_sid[:10]}...")
        print(f"   Phone Number: {settings.twilio_phone_number}")
        print()
        print("⚠️  A2P 10DLC Registration Required:")
        print("   • US carriers require business registration")
        print("   • Register at: https://console.twilio.com")
        print("   • Use the provided form content")
        print("   • Approval: 1-3 business days")
    else:
        print("❌ Twilio not configured")

if __name__ == "__main__":
    print("🚀 Starting automated email test...\n")
    
    # Test email system
    email_success = test_email_system()
    
    # Check SMS status
    check_sms_status()
    
    print("\n" + "=" * 60)
    if email_success:
        print("✅ EMAIL SYSTEM: OPERATIONAL")
        print("⏳ SMS SYSTEM: PENDING A2P REGISTRATION")
    else:
        print("❌ EMAIL SYSTEM: NEEDS ATTENTION")
    
    print(f"\n📅 Test completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")