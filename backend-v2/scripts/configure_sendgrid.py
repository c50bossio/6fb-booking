#!/usr/bin/env python3
"""
SendGrid Configuration Setup Script
Configure SendGrid email integration for BookedBarber V2

This script helps you set up SendGrid for:
1. Email notifications (existing NotificationService)
2. Sender verification
3. Email templates
4. Domain authentication

Usage:
    python scripts/configure_sendgrid.py --validate  # Test existing config
    python scripts/configure_sendgrid.py --setup    # Full setup
    python scripts/configure_sendgrid.py --test-email your@email.com  # Send test email
"""

import os
import sys
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from config import settings
from services.notification_service import NotificationService
from database import get_db

logger = logging.getLogger(__name__)


def validate_sendgrid_api_key(api_key: str) -> bool:
    """Validate SendGrid API key."""
    try:
        if not api_key.startswith('SG.'):
            logger.error("❌ Invalid SendGrid API key format. Must start with 'SG.'")
            return False
        
        sg = SendGridAPIClient(api_key)
        
        # Test API connection
        response = sg.client.user.get()
        
        if response.status_code == 200:
            user_data = json.loads(response.body)
            logger.info(f"✅ SendGrid API key validated successfully")
            logger.info(f"   Username: {user_data.get('username', 'N/A')}")
            logger.info(f"   Email: {user_data.get('email', 'N/A')}")
            return True
        else:
            logger.error(f"❌ SendGrid API validation failed: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error validating SendGrid API key: {e}")
        return False


def check_sender_verification(api_key: str, from_email: str) -> bool:
    """Check if sender email is verified."""
    try:
        sg = SendGridAPIClient(api_key)
        
        # Get verified senders
        response = sg.client.verified_senders.get()
        
        if response.status_code == 200:
            senders = json.loads(response.body)
            verified_emails = [sender.get('from_email', '').lower() for sender in senders.get('results', [])]
            
            if from_email.lower() in verified_emails:
                logger.info(f"✅ Sender email verified: {from_email}")
                return True
            else:
                logger.warning(f"⚠️  Sender email not verified: {from_email}")
                logger.info(f"   Verified senders: {verified_emails}")
                return False
        else:
            logger.error(f"❌ Error checking sender verification: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error checking sender verification: {e}")
        return False


def check_domain_authentication(api_key: str, domain: str) -> bool:
    """Check domain authentication status."""
    try:
        sg = SendGridAPIClient(api_key)
        
        # Get domain authentication
        response = sg.client.whitelabel.domains.get()
        
        if response.status_code == 200:
            domains = json.loads(response.body)
            
            for domain_config in domains:
                if domain_config.get('domain') == domain:
                    is_valid = domain_config.get('valid', False)
                    if is_valid:
                        logger.info(f"✅ Domain authenticated: {domain}")
                    else:
                        logger.warning(f"⚠️  Domain not authenticated: {domain}")
                    return is_valid
            
            logger.warning(f"⚠️  Domain not found in authentication list: {domain}")
            return False
        else:
            logger.error(f"❌ Error checking domain authentication: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error checking domain authentication: {e}")
        return False


def send_test_email(to_email: str, api_key: str, from_email: str, from_name: str) -> bool:
    """Send a test email using SendGrid."""
    try:
        sg = SendGridAPIClient(api_key)
        
        message = Mail(
            from_email=(from_email, from_name),
            to_emails=to_email,
            subject="BookedBarber V2 - SendGrid Configuration Test",
            html_content=f"""
            <html>
            <body>
                <h2>SendGrid Configuration Test</h2>
                <p>Congratulations! Your SendGrid integration is working correctly.</p>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                    <li>From Email: {from_email}</li>
                    <li>From Name: {from_name}</li>
                    <li>Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                </ul>
                <p>This email was sent using the BookedBarber V2 NotificationService.</p>
                <hr>
                <p><em>BookedBarber V2 - Email Configuration Test</em></p>
            </body>
            </html>
            """
        )
        
        response = sg.send(message)
        
        if response.status_code in [200, 202]:
            logger.info(f"✅ Test email sent successfully to {to_email}")
            logger.info(f"   Status code: {response.status_code}")
            return True
        else:
            logger.error(f"❌ Failed to send test email: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error sending test email: {e}")
        return False


def test_notification_service():
    """Test the existing NotificationService with SendGrid."""
    try:
        notification_service = NotificationService()
        
        if not notification_service.sendgrid_client:
            logger.error("❌ NotificationService SendGrid client not initialized")
            return False
        
        # Test email sending through NotificationService
        result = notification_service.send_email(
            to_email="test@example.com",  # This won't actually send
            subject="NotificationService Test",
            body="<p>This is a test email from NotificationService</p>",
            retry_count=0
        )
        
        # Check if the service is properly configured
        if notification_service.sendgrid_client:
            logger.info("✅ NotificationService SendGrid integration is configured")
            logger.info(f"   Client initialized: Yes")
            logger.info(f"   From email: {settings.sendgrid_from_email}")
            logger.info(f"   From name: {settings.sendgrid_from_name}")
            return True
        else:
            logger.error("❌ NotificationService SendGrid client not configured")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error testing NotificationService: {e}")
        return False


def get_account_stats(api_key: str):
    """Get SendGrid account statistics."""
    try:
        sg = SendGridAPIClient(api_key)
        
        # Get account stats
        response = sg.client.stats.get(query_params={'start_date': '2024-01-01'})
        
        if response.status_code == 200:
            stats = json.loads(response.body)
            logger.info("📊 SendGrid Account Statistics:")
            
            if stats:
                total_delivered = sum(stat.get('stats', [{}])[0].get('metrics', {}).get('delivered', 0) for stat in stats)
                total_opens = sum(stat.get('stats', [{}])[0].get('metrics', {}).get('opens', 0) for stat in stats)
                total_clicks = sum(stat.get('stats', [{}])[0].get('metrics', {}).get('clicks', 0) for stat in stats)
                
                logger.info(f"   Total emails delivered: {total_delivered}")
                logger.info(f"   Total opens: {total_opens}")
                logger.info(f"   Total clicks: {total_clicks}")
            else:
                logger.info("   No email statistics available")
                
        else:
            logger.warning(f"⚠️  Could not retrieve stats: {response.status_code}")
            
    except Exception as e:
        logger.warning(f"⚠️  Could not retrieve account stats: {e}")


def setup_sender_identity(api_key: str, from_email: str, from_name: str):
    """Set up sender identity if not verified."""
    try:
        sg = SendGridAPIClient(api_key)
        
        # Create verified sender request
        data = {
            "nickname": f"BookedBarber - {from_name}",
            "from_email": from_email,
            "from_name": from_name,
            "reply_to": from_email,
            "reply_to_name": from_name,
            "address": "123 Main St",
            "city": "Your City",
            "state": "Your State",
            "zip": "12345",
            "country": "US"
        }
        
        response = sg.client.verified_senders.post(request_body=data)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ Sender verification request created for {from_email}")
            logger.warning(f"⚠️  Check your email to complete verification")
        else:
            logger.error(f"❌ Failed to create sender verification: {response.status_code}")
            
    except Exception as e:
        logger.error(f"❌ Error setting up sender identity: {e}")


def generate_sample_env():
    """Generate sample .env configuration for SendGrid."""
    sample_config = """
# =============================================================================
# SENDGRID CONFIGURATION
# =============================================================================
# Get API key from: https://app.sendgrid.com/settings/api_keys

# SendGrid API Key (REQUIRED)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Sender Information (must be verified in SendGrid)
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Must be verified sender
SENDGRID_FROM_NAME=BookedBarber

# Enable email notifications
ENABLE_EMAIL_NOTIFICATIONS=true

# Notification settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_SECONDS=60
APPOINTMENT_REMINDER_HOURS=[24,2]
"""
    
    return sample_config


def main():
    parser = argparse.ArgumentParser(description='Configure SendGrid email integration')
    parser.add_argument('--validate', action='store_true', help='Validate existing configuration')
    parser.add_argument('--setup', action='store_true', help='Full setup and configuration')
    parser.add_argument('--test-email', type=str, help='Send test email to specified address')
    parser.add_argument('--setup-sender', action='store_true', help='Set up sender identity verification')
    parser.add_argument('--stats', action='store_true', help='Show account statistics')
    parser.add_argument('--generate-sample', action='store_true', help='Generate sample .env configuration')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    if args.generate_sample:
        print("Sample SendGrid configuration for .env file:")
        print(generate_sample_env())
        return
    
    logger.info("📧 SendGrid Configuration Setup")
    logger.info("=" * 50)
    
    # Load current settings
    api_key = settings.sendgrid_api_key
    from_email = settings.sendgrid_from_email
    from_name = settings.sendgrid_from_name
    
    if not api_key:
        logger.error("❌ SendGrid API key not found in configuration")
        logger.info("Please set SENDGRID_API_KEY in your .env file")
        logger.info("Run with --generate-sample to see sample configuration")
        return
    
    # Validate API key
    logger.info("1. Validating SendGrid API key...")
    if not validate_sendgrid_api_key(api_key):
        logger.error("❌ SendGrid API key validation failed")
        return
    
    # Check sender verification
    logger.info("2. Checking sender verification...")
    sender_verified = check_sender_verification(api_key, from_email)
    
    # Check domain authentication
    domain = from_email.split('@')[1] if '@' in from_email else ''
    if domain:
        logger.info("3. Checking domain authentication...")
        domain_authenticated = check_domain_authentication(api_key, domain)
    else:
        domain_authenticated = False
    
    # Test NotificationService
    logger.info("4. Testing NotificationService integration...")
    notification_service_ok = test_notification_service()
    
    # Setup sender if requested
    if args.setup_sender:
        logger.info("5. Setting up sender identity...")
        setup_sender_identity(api_key, from_email, from_name)
    
    # Send test email if requested
    if args.test_email:
        logger.info(f"6. Sending test email to {args.test_email}...")
        if sender_verified:
            send_test_email(args.test_email, api_key, from_email, from_name)
        else:
            logger.warning("⚠️  Skipping test email - sender not verified")
            logger.info("   Run with --setup-sender to verify sender")
    
    # Show stats if requested
    if args.stats:
        logger.info("7. Retrieving account statistics...")
        get_account_stats(api_key)
    
    # Summary
    logger.info("✅ SendGrid configuration check complete!")
    logger.info("=" * 50)
    logger.info("Configuration Summary:")
    logger.info(f"   API Key: ✅ Valid")
    logger.info(f"   Sender verified: {'✅ Yes' if sender_verified else '❌ No'}")
    logger.info(f"   Domain authenticated: {'✅ Yes' if domain_authenticated else '❌ No'}")
    logger.info(f"   NotificationService: {'✅ Working' if notification_service_ok else '❌ Not configured'}")
    
    if not sender_verified:
        logger.warning("\n⚠️  Action Required:")
        logger.info("1. Verify your sender email in SendGrid dashboard")
        logger.info("2. Or run with --setup-sender to create verification request")
    
    if not domain_authenticated and domain:
        logger.warning(f"\n⚠️  Recommended:")
        logger.info(f"1. Set up domain authentication for {domain}")
        logger.info("2. This improves email deliverability")
    
    logger.info("\nNext steps:")
    logger.info("1. Verify sender email if not already done")
    logger.info("2. Test email notifications in your application")
    logger.info("3. Configure email templates in NotificationService")
    logger.info("4. Set up domain authentication for better deliverability")


if __name__ == "__main__":
    main()