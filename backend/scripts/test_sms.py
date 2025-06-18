#!/usr/bin/env python3
"""
Test script for SMS functionality
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from services.sms_service import SMSService
from core.config import settings


def test_sms_configuration():
    """Test if SMS is properly configured"""
    print("Testing SMS Configuration...")
    print("-" * 50)
    
    if not settings.sms_enabled:
        print("❌ SMS is not enabled. Please check your Twilio configuration.")
        return False
    
    print("✅ SMS Service is enabled")
    print(f"✅ Account SID: {settings.TWILIO_ACCOUNT_SID[:20]}...")
    print(f"✅ Phone Number: {settings.TWILIO_PHONE_NUMBER}")
    print("-" * 50)
    return True


def send_test_sms(to_number: str):
    """Send a test SMS"""
    sms_service = SMSService()
    
    message = "Test SMS from 6FB Platform! Your SMS integration is working correctly. 🎉"
    
    print(f"Sending test SMS to {to_number}...")
    
    try:
        result = sms_service.send_sms(
            to_number=to_number,
            message=message
        )
        
        if result:
            print("✅ SMS sent successfully!")
            print(f"Message SID: {result}")
        else:
            print("❌ Failed to send SMS")
            
    except Exception as e:
        print(f"❌ Error sending SMS: {str(e)}")


def main():
    """Main test function"""
    print("=" * 50)
    print("6FB Platform - SMS Test Script")
    print("=" * 50)
    print()
    
    # Test configuration
    if not test_sms_configuration():
        return
    
    print("\nNote: This is a toll-free number (866), which may have")
    print("different delivery characteristics than regular numbers.")
    print("Some carriers may filter toll-free SMS differently.")
    print()
    
    # Get phone number to test
    print("Enter the phone number to send a test SMS to")
    print("Format: +1XXXXXXXXXX (include country code)")
    to_number = input("Phone number: ").strip()
    
    if not to_number:
        print("❌ No phone number provided")
        return
    
    # Ensure proper formatting
    if not to_number.startswith('+'):
        # Assume US number if no country code
        if to_number.startswith('1'):
            to_number = f"+{to_number}"
        else:
            to_number = f"+1{to_number}"
    
    # Remove any formatting characters
    to_number = '+' + ''.join(filter(str.isdigit, to_number))
    
    print(f"\nFormatted number: {to_number}")
    confirm = input("Send test SMS? (y/n): ").lower()
    
    if confirm == 'y':
        send_test_sms(to_number)
    else:
        print("Test cancelled")
    
    print("\n" + "=" * 50)
    print("Test complete!")


if __name__ == "__main__":
    main()