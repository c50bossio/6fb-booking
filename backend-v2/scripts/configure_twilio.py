#!/usr/bin/env python3
"""
Twilio SMS Configuration Setup Script
Configure Twilio SMS integration for BookedBarber V2

This script helps you set up Twilio for:
1. SMS notifications (existing NotificationService)
2. Phone number verification
3. SMS webhooks for two-way communication
4. Message status tracking

Usage:
    python scripts/configure_twilio.py --validate  # Test existing config
    python scripts/configure_twilio.py --setup     # Full setup
    python scripts/configure_twilio.py --test-sms +1234567890  # Send test SMS
"""

import os
import sys
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime, timedelta

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException
from config import settings
from services.notification_service import NotificationService
from database import get_db

logger = logging.getLogger(__name__)


def validate_twilio_credentials(account_sid: str, auth_token: str) -> bool:
    """Validate Twilio credentials."""
    try:
        if not account_sid.startswith('AC'):
            logger.error("❌ Invalid Twilio Account SID format. Must start with 'AC'")
            return False
        
        if len(auth_token) != 32:
            logger.error("❌ Invalid Twilio Auth Token format. Must be 32 characters")
            return False
        
        client = TwilioClient(account_sid, auth_token)
        
        # Test API connection by fetching account info
        account = client.api.accounts(account_sid).fetch()
        
        logger.info(f"✅ Twilio credentials validated successfully")
        logger.info(f"   Account SID: {account_sid}")
        logger.info(f"   Account name: {account.friendly_name}")
        logger.info(f"   Account status: {account.status}")
        
        return True
        
    except TwilioRestException as e:
        logger.error(f"❌ Twilio authentication failed: {e.msg} (Code: {e.code})")
        return False
    except Exception as e:
        logger.error(f"❌ Error validating Twilio credentials: {e}")
        return False


def validate_phone_number(account_sid: str, auth_token: str, phone_number: str) -> bool:
    """Validate Twilio phone number."""
    try:
        client = TwilioClient(account_sid, auth_token)
        
        # Remove any formatting and ensure +1 prefix for US numbers
        clean_number = ''.join(filter(str.isdigit, phone_number))
        if len(clean_number) == 10:
            formatted_number = f"+1{clean_number}"
        elif len(clean_number) == 11 and clean_number.startswith('1'):
            formatted_number = f"+{clean_number}"
        else:
            formatted_number = phone_number
        
        # Get incoming phone numbers
        phone_numbers = client.incoming_phone_numbers.list()
        
        # Check if the phone number belongs to this account
        number_found = False
        for number in phone_numbers:
            if number.phone_number == formatted_number:
                number_found = True
                logger.info(f"✅ Phone number verified: {formatted_number}")
                logger.info(f"   Friendly name: {number.friendly_name}")
                logger.info(f"   SMS capable: {number.capabilities.get('sms', False)}")
                logger.info(f"   Voice capable: {number.capabilities.get('voice', False)}")
                break
        
        if not number_found:
            logger.error(f"❌ Phone number not found in account: {formatted_number}")
            logger.info("   Available numbers:")
            for number in phone_numbers[:5]:  # Show first 5 numbers
                logger.info(f"     {number.phone_number} ({number.friendly_name})")
            return False
        
        return True
        
    except TwilioRestException as e:
        logger.error(f"❌ Error validating phone number: {e.msg} (Code: {e.code})")
        return False
    except Exception as e:
        logger.error(f"❌ Error validating phone number: {e}")
        return False


def send_test_sms(to_phone: str, account_sid: str, auth_token: str, from_phone: str) -> bool:
    """Send a test SMS using Twilio."""
    try:
        client = TwilioClient(account_sid, auth_token)
        
        # Format phone numbers
        def format_phone(phone):
            clean = ''.join(filter(str.isdigit, phone))
            if len(clean) == 10:
                return f"+1{clean}"
            elif len(clean) == 11 and clean.startswith('1'):
                return f"+{clean}"
            else:
                return phone
        
        formatted_to = format_phone(to_phone)
        formatted_from = format_phone(from_phone)
        
        message_body = f"""BookedBarber V2 - Twilio Configuration Test

Your SMS integration is working correctly!

From: {formatted_from}
To: {formatted_to}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This message was sent using the NotificationService.

- BookedBarber V2 Team"""
        
        message = client.messages.create(
            body=message_body,
            from_=formatted_from,
            to=formatted_to
        )
        
        logger.info(f"✅ Test SMS sent successfully")
        logger.info(f"   Message SID: {message.sid}")
        logger.info(f"   From: {formatted_from}")
        logger.info(f"   To: {formatted_to}")
        logger.info(f"   Status: {message.status}")
        
        return True
        
    except TwilioRestException as e:
        logger.error(f"❌ Failed to send test SMS: {e.msg} (Code: {e.code})")
        return False
    except Exception as e:
        logger.error(f"❌ Error sending test SMS: {e}")
        return False


def test_notification_service():
    """Test the existing NotificationService with Twilio."""
    try:
        notification_service = NotificationService()
        
        if not notification_service.twilio_client:
            logger.error("❌ NotificationService Twilio client not initialized")
            return False
        
        logger.info("✅ NotificationService Twilio integration is configured")
        logger.info(f"   Client initialized: Yes")
        logger.info(f"   From phone: {settings.twilio_phone_number}")
        
        # Test SMS formatting
        test_phone = "+1234567890"
        formatted = notification_service._format_phone_number(test_phone)
        logger.info(f"   Phone formatting test: {test_phone} -> {formatted}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error testing NotificationService: {e}")
        return False


def get_account_usage(account_sid: str, auth_token: str):
    """Get Twilio account usage statistics."""
    try:
        client = TwilioClient(account_sid, auth_token)
        
        # Get usage for the last 30 days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        usage_records = client.usage.records.list(
            category='sms',
            start_date=start_date,
            end_date=end_date
        )
        
        if usage_records:
            total_usage = sum(float(record.usage) for record in usage_records)
            total_cost = sum(float(record.price) for record in usage_records)
            
            logger.info("📊 Twilio Account Usage (Last 30 days):")
            logger.info(f"   SMS messages sent: {int(total_usage)}")
            logger.info(f"   Total cost: ${total_cost:.2f}")
        else:
            logger.info("📊 No SMS usage in the last 30 days")
            
        # Get account balance
        balance = client.balance.fetch()
        logger.info(f"   Account balance: ${balance.balance}")
        logger.info(f"   Currency: {balance.currency}")
            
    except TwilioRestException as e:
        logger.warning(f"⚠️  Could not retrieve usage: {e.msg}")
    except Exception as e:
        logger.warning(f"⚠️  Could not retrieve usage: {e}")


def setup_webhook_url(account_sid: str, auth_token: str, phone_number: str, webhook_url: str):
    """Set up webhook URL for incoming SMS."""
    try:
        client = TwilioClient(account_sid, auth_token)
        
        # Format phone number
        clean_number = ''.join(filter(str.isdigit, phone_number))
        if len(clean_number) == 10:
            formatted_number = f"+1{clean_number}"
        elif len(clean_number) == 11 and clean_number.startswith('1'):
            formatted_number = f"+{clean_number}"
        else:
            formatted_number = phone_number
        
        # Get the phone number resource
        phone_numbers = client.incoming_phone_numbers.list(phone_number=formatted_number)
        
        if not phone_numbers:
            logger.error(f"❌ Phone number not found: {formatted_number}")
            return False
        
        phone_number_resource = phone_numbers[0]
        
        # Update webhook URL
        phone_number_resource.update(sms_url=webhook_url)
        
        logger.info(f"✅ Webhook URL configured for {formatted_number}")
        logger.info(f"   SMS URL: {webhook_url}")
        
        return True
        
    except TwilioRestException as e:
        logger.error(f"❌ Error setting up webhook: {e.msg} (Code: {e.code})")
        return False
    except Exception as e:
        logger.error(f"❌ Error setting up webhook: {e}")
        return False


def check_webhook_configuration(account_sid: str, auth_token: str, phone_number: str):
    """Check current webhook configuration."""
    try:
        client = TwilioClient(account_sid, auth_token)
        
        # Format phone number
        clean_number = ''.join(filter(str.isdigit, phone_number))
        if len(clean_number) == 10:
            formatted_number = f"+1{clean_number}"
        elif len(clean_number) == 11 and clean_number.startswith('1'):
            formatted_number = f"+{clean_number}"
        else:
            formatted_number = phone_number
        
        phone_numbers = client.incoming_phone_numbers.list(phone_number=formatted_number)
        
        if phone_numbers:
            phone = phone_numbers[0]
            logger.info(f"📞 Webhook configuration for {formatted_number}:")
            logger.info(f"   SMS URL: {phone.sms_url or 'Not configured'}")
            logger.info(f"   SMS Method: {phone.sms_method}")
            logger.info(f"   Voice URL: {phone.voice_url or 'Not configured'}")
            return True
        else:
            logger.error(f"❌ Phone number not found: {formatted_number}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error checking webhook configuration: {e}")
        return False


def generate_sample_env():
    """Generate sample .env configuration for Twilio."""
    sample_config = """
# =============================================================================
# TWILIO SMS CONFIGURATION
# =============================================================================
# Get credentials from: https://console.twilio.com

# Twilio Credentials (REQUIRED)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890  # Your verified Twilio phone number

# Enable SMS notifications
ENABLE_SMS_NOTIFICATIONS=true

# Notification settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_SECONDS=60
APPOINTMENT_REMINDER_HOURS=[24,2]
"""
    
    return sample_config


def main():
    parser = argparse.ArgumentParser(description='Configure Twilio SMS integration')
    parser.add_argument('--validate', action='store_true', help='Validate existing configuration')
    parser.add_argument('--setup', action='store_true', help='Full setup and configuration')
    parser.add_argument('--test-sms', type=str, help='Send test SMS to specified phone number')
    parser.add_argument('--webhook-url', type=str, help='Set webhook URL for incoming SMS')
    parser.add_argument('--check-webhook', action='store_true', help='Check current webhook configuration')
    parser.add_argument('--usage', action='store_true', help='Show account usage statistics')
    parser.add_argument('--generate-sample', action='store_true', help='Generate sample .env configuration')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    if args.generate_sample:
        print("Sample Twilio configuration for .env file:")
        print(generate_sample_env())
        return
    
    logger.info("📱 Twilio SMS Configuration Setup")
    logger.info("=" * 50)
    
    # Load current settings
    account_sid = settings.twilio_account_sid
    auth_token = settings.twilio_auth_token
    phone_number = settings.twilio_phone_number
    
    if not account_sid or not auth_token:
        logger.error("❌ Twilio credentials not found in configuration")
        logger.info("Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file")
        logger.info("Run with --generate-sample to see sample configuration")
        return
    
    # Validate credentials
    logger.info("1. Validating Twilio credentials...")
    if not validate_twilio_credentials(account_sid, auth_token):
        logger.error("❌ Twilio credential validation failed")
        return
    
    # Validate phone number
    phone_validated = False
    if phone_number:
        logger.info("2. Validating Twilio phone number...")
        phone_validated = validate_phone_number(account_sid, auth_token, phone_number)
    else:
        logger.warning("⚠️  Twilio phone number not configured")
        logger.info("   Set TWILIO_PHONE_NUMBER in your .env file")
    
    # Test NotificationService
    logger.info("3. Testing NotificationService integration...")
    notification_service_ok = test_notification_service()
    
    # Check webhook configuration if requested
    if args.check_webhook and phone_number:
        logger.info("4. Checking webhook configuration...")
        check_webhook_configuration(account_sid, auth_token, phone_number)
    
    # Set up webhook if requested
    if args.webhook_url and phone_number:
        logger.info("5. Setting up webhook URL...")
        setup_webhook_url(account_sid, auth_token, phone_number, args.webhook_url)
    
    # Send test SMS if requested
    if args.test_sms and phone_number:
        logger.info(f"6. Sending test SMS to {args.test_sms}...")
        if phone_validated:
            send_test_sms(args.test_sms, account_sid, auth_token, phone_number)
        else:
            logger.warning("⚠️  Skipping test SMS - phone number not validated")
    
    # Show usage statistics if requested
    if args.usage:
        logger.info("7. Retrieving account usage...")
        get_account_usage(account_sid, auth_token)
    
    # Summary
    logger.info("✅ Twilio configuration check complete!")
    logger.info("=" * 50)
    logger.info("Configuration Summary:")
    logger.info(f"   Credentials: ✅ Valid")
    logger.info(f"   Phone number: {'✅ Valid' if phone_validated else '❌ Not configured/invalid'}")
    logger.info(f"   NotificationService: {'✅ Working' if notification_service_ok else '❌ Not configured'}")
    
    if not phone_number:
        logger.warning("\n⚠️  Action Required:")
        logger.info("1. Set TWILIO_PHONE_NUMBER in your .env file")
        logger.info("2. Purchase a phone number in Twilio console if needed")
    
    if not phone_validated and phone_number:
        logger.warning("\n⚠️  Phone Number Issue:")
        logger.info("1. Verify the phone number belongs to your Twilio account")
        logger.info("2. Check the phone number format (+1234567890)")
    
    logger.info("\nNext steps:")
    logger.info("1. Configure webhook URL for two-way SMS (optional)")
    logger.info("2. Test SMS notifications in your application")
    logger.info("3. Configure SMS templates in NotificationService")
    logger.info("4. Set up SMS unsubscribe handling")


if __name__ == "__main__":
    main()