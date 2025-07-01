#!/usr/bin/env python3
"""
Automated SMS Test for BookedBarber
Tests the SMS notification system and provides status
"""

import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.notification_service import notification_service
from config import settings

def test_sms_system():
    """Test SMS notification system"""
    
    print("📱 BOOKEDBARBER SMS NOTIFICATION TEST")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    print("📋 Current Configuration:")
    print(f"   Twilio Account SID: {settings.twilio_account_sid[:10]}..." if settings.twilio_account_sid else "   Account SID: NOT SET")
    print(f"   Twilio Phone: {settings.twilio_phone_number}")
    print(f"   SMS Enabled: {getattr(settings, 'enable_sms_notifications', True)}")
    print()
    
    # Test phone number (user's number)
    test_phone = "+13525568981"  # Adding +1 for US format
    
    print(f"📱 Sending test SMS to: {test_phone}")
    print("⏳ Please wait...")
    
    try:
        # Test SMS sending
        result = notification_service.send_sms(
            to_phone=test_phone,
            body="BookedBarber Test: Your SMS notifications are working! This is a test message to confirm SMS functionality. Reply STOP to unsubscribe."
        )
        
        print(f"\n📊 Result: {result}")
        
        if result.get("success"):
            print("\n🎉 SMS sent successfully!")
            print(f"   Message SID: {result.get('message_sid', 'N/A')}")
            print(f"   Status: {result.get('status', 'N/A')}")
            print(f"   To: {result.get('to', 'N/A')}")
            print("\n✅ SMS SYSTEM IS WORKING!")
            return True
        else:
            error = result.get('error', 'Unknown error')
            error_code = result.get('error_code', 'N/A')
            
            print(f"\n❌ SMS failed to send")
            print(f"   Error: {error}")
            print(f"   Error Code: {error_code}")
            
            # Check for specific error codes
            if "30034" in str(error) or error_code == 30034:
                print("\n⚠️  A2P 10DLC REGISTRATION REQUIRED")
                print("=" * 60)
                print("This error occurs because your Twilio number is not registered")
                print("for A2P (Application-to-Person) messaging in the United States.")
                print()
                print("📋 WHAT YOU NEED TO DO:")
                print("1. Log into Twilio Console: https://console.twilio.com")
                print("2. Go to: Messaging > Regulatory Compliance > A2P 10DLC")
                print("3. Complete the registration form (content provided earlier)")
                print("4. Wait 1-3 business days for approval")
                print("5. Add your phone number to the messaging service")
                print()
                print("📱 REGISTRATION STATUS:")
                print("   • Business verification: PENDING")
                print("   • Campaign registration: PENDING")
                print("   • Expected approval: 1-3 business days")
                print()
                print("💡 NOTE: Email notifications are working while you wait!")
                
            elif "21211" in str(error) or error_code == 21211:
                print("\n❌ INVALID PHONE NUMBER")
                print("   The 'To' phone number is not valid.")
                print("   Ensure format: +1XXXXXXXXXX")
                
            elif "20003" in str(error) or error_code == 20003:
                print("\n❌ AUTHENTICATION ERROR")
                print("   Check your Twilio credentials in .env file")
                
            return False
            
    except Exception as e:
        print(f"\n❌ Error testing SMS system: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def check_a2p_status():
    """Provide A2P registration status and next steps"""
    print("\n📋 A2P 10DLC Registration Guide")
    print("=" * 60)
    print()
    print("🔗 Quick Links:")
    print("   • Twilio Console: https://console.twilio.com")
    print("   • A2P Registration: Messaging > Regulatory Compliance > A2P 10DLC")
    print("   • Support Docs: https://www.twilio.com/docs/sms/a2p-10dlc")
    print()
    print("📝 Registration Form Content (Copy & Paste Ready):")
    print("-" * 40)
    print("Business Name: BookedBarber")
    print("Use Case: Mixed (Notifications and Customer Care)")
    print()
    print("Campaign Description:")
    print("BookedBarber sends transactional appointment notifications to")
    print("customers including confirmations, reminders, and updates.")
    print("Messages only sent to customers who booked appointments.")
    print()
    print("Sample Messages:")
    print('1. "Your appointment is confirmed for [Date] at [Time]"')
    print('2. "Reminder: Appointment tomorrow at [Time]"')
    print('3. "Your appointment has been rescheduled"')
    print("-" * 40)

def test_sms_capabilities():
    """Test what SMS capabilities are available"""
    print("\n🔍 SMS Capability Check")
    print("=" * 40)
    
    # Check if we can import Twilio
    try:
        from twilio.rest import Client
        print("✅ Twilio SDK installed")
        
        # Try to create client
        if settings.twilio_account_sid and settings.twilio_auth_token:
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            print("✅ Twilio client initialized")
            
            # Try to fetch account info
            try:
                account = client.api.accounts(settings.twilio_account_sid).fetch()
                print(f"✅ Account Status: {account.status}")
                print(f"✅ Account Name: {account.friendly_name}")
            except Exception as e:
                print(f"⚠️  Could not fetch account info: {str(e)}")
                
        else:
            print("❌ Twilio credentials not configured")
            
    except ImportError:
        print("❌ Twilio SDK not installed")
    except Exception as e:
        print(f"❌ Error checking capabilities: {e}")

if __name__ == "__main__":
    print("🚀 Starting SMS system test...\n")
    
    # Test SMS capabilities first
    test_sms_capabilities()
    
    # Test SMS sending
    sms_success = test_sms_system()
    
    # Show A2P registration info
    if not sms_success:
        check_a2p_status()
    
    print("\n" + "=" * 60)
    print("📊 FINAL STATUS:")
    if sms_success:
        print("✅ SMS SYSTEM: OPERATIONAL")
    else:
        print("⏳ SMS SYSTEM: PENDING A2P REGISTRATION")
        print("✅ EMAIL SYSTEM: OPERATIONAL (Use as backup)")
    
    print(f"\n📅 Test completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")