#!/usr/bin/env python3
"""
Check SMS Message Status in Twilio
"""

import sys
import os
from datetime import datetime
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from twilio.rest import Client
from config import settings

def check_message_status(message_sid):
    """Check the status of a specific SMS message"""
    
    print(f"🔍 Checking SMS Status for: {message_sid}")
    print("=" * 60)
    
    try:
        # Initialize Twilio client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Fetch message details
        message = client.messages(message_sid).fetch()
        
        print(f"📱 Message Details:")
        print(f"   Status: {message.status}")
        print(f"   To: {message.to}")
        print(f"   From: {message.from_}")
        print(f"   Date Sent: {message.date_sent}")
        print(f"   Price: {message.price} {message.price_unit if message.price else 'N/A'}")
        print(f"   Error Code: {message.error_code or 'None'}")
        print(f"   Error Message: {message.error_message or 'None'}")
        
        # Check for specific statuses
        if message.status == "delivered":
            print("\n✅ SMS DELIVERED SUCCESSFULLY!")
        elif message.status == "sent":
            print("\n📤 SMS SENT - Awaiting delivery confirmation")
        elif message.status == "failed":
            print(f"\n❌ SMS FAILED TO DELIVER")
            if message.error_code == 30034:
                print("\n⚠️  ERROR 30034: A2P 10DLC REGISTRATION REQUIRED")
                print("   US carriers blocked this message because your number")
                print("   is not registered for business messaging.")
        elif message.status == "undelivered":
            print(f"\n❌ SMS UNDELIVERED")
            if message.error_code:
                print(f"   Error: {message.error_message}")
                
        return message
        
    except Exception as e:
        print(f"❌ Error checking message status: {e}")
        return None

def check_recent_messages():
    """Check status of recent SMS messages"""
    print("\n📊 Recent SMS Messages (Last 5)")
    print("=" * 60)
    
    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Get recent messages
        messages = client.messages.list(limit=5)
        
        for i, msg in enumerate(messages, 1):
            print(f"\n{i}. Message {msg.sid}")
            print(f"   Status: {msg.status}")
            print(f"   To: {msg.to}")
            print(f"   Sent: {msg.date_sent}")
            print(f"   Error: {msg.error_code or 'None'}")
            
            if msg.error_code == 30034:
                print("   ⚠️  A2P 10DLC registration required")
                
    except Exception as e:
        print(f"❌ Error fetching recent messages: {e}")

def main():
    """Main function"""
    # Check the most recent test message
    message_sid = "SM2be8fd88454d88d511d21ab5ba6321ab"
    
    print("🚀 Checking SMS delivery status...\n")
    
    # Check specific message
    message = check_message_status(message_sid)
    
    # Wait a moment for delivery status to update
    if message and message.status in ["queued", "sent"]:
        print("\n⏳ Waiting 5 seconds for delivery status update...")
        time.sleep(5)
        print("\n🔄 Rechecking status...")
        check_message_status(message_sid)
    
    # Check recent messages
    check_recent_messages()
    
    print("\n" + "=" * 60)
    print("📋 SMS DELIVERY SUMMARY:")
    if message:
        if message.error_code == 30034:
            print("⚠️  SMS sent but blocked by carriers - A2P registration required")
            print("✅ EMAIL notifications are working as backup")
        elif message.status == "delivered":
            print("✅ SMS system is fully operational!")
        else:
            print(f"📊 Current status: {message.status}")

if __name__ == "__main__":
    main()