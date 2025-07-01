#!/usr/bin/env python3
"""
SendGrid Email Verification Troubleshooting Script
Diagnoses and provides solutions for SendGrid email verification issues
"""

import os
import sys
import time
import json
import requests
from datetime import datetime
from config import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


class SendGridTroubleshooter:
    def __init__(self):
        self.api_key = settings.sendgrid_api_key
        self.from_email = settings.sendgrid_from_email
        self.from_name = settings.sendgrid_from_name
        self.sg_client = SendGridAPIClient(self.api_key) if self.api_key else None
        
    def print_header(self, title):
        """Print formatted section header"""
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")
    
    def print_step(self, step_num, description):
        """Print formatted step"""
        print(f"\n📋 STEP {step_num}: {description}")
        print("-" * 50)
    
    def check_configuration(self):
        """Check SendGrid configuration"""
        self.print_header("SENDGRID CONFIGURATION CHECK")
        
        config_issues = []
        
        print(f"API Key: {'✓ SET' if self.api_key else '❌ NOT SET'}")
        if not self.api_key:
            config_issues.append("API key not configured")
        
        print(f"From Email: {self.from_email}")
        if not self.from_email or '@' not in self.from_email:
            config_issues.append("Invalid from email")
            
        print(f"From Name: {self.from_name}")
        
        if config_issues:
            print(f"\n❌ Configuration Issues Found:")
            for issue in config_issues:
                print(f"   • {issue}")
            return False
        else:
            print(f"\n✓ Configuration appears correct")
            return True
    
    def test_api_connection(self):
        """Test API connection and permissions"""
        self.print_header("API CONNECTION TEST")
        
        if not self.sg_client:
            print("❌ Cannot test - SendGrid client not initialized")
            return False
        
        try:
            # Test with a minimal request to check API key validity
            print("Testing API key validity...")
            
            # Use the API key info endpoint
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # Test API key permissions
            response = requests.get(
                'https://api.sendgrid.com/v3/scopes',
                headers=headers
            )
            
            if response.status_code == 200:
                scopes = response.json()
                print("✓ API key is valid")
                print(f"✓ API key has {len(scopes)} permission scopes")
                
                # Check if mail.send permission exists
                if 'mail.send' in scopes:
                    print("✓ Has mail.send permission")
                else:
                    print("❌ Missing mail.send permission")
                    print("   → Create a new API key with 'Mail Send' permission")
                
                return True
            elif response.status_code == 401:
                print("❌ 401 Unauthorized - Invalid API key")
                return False
            elif response.status_code == 403:
                print("❌ 403 Forbidden - API key lacks required permissions")
                return False
            else:
                print(f"❌ Unexpected response: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing API connection: {str(e)}")
            return False
    
    def check_sender_verification(self):
        """Check sender verification status"""
        self.print_header("SENDER VERIFICATION STATUS")
        
        if not self.sg_client:
            print("❌ Cannot check - SendGrid client not initialized")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # Check verified senders
            print("Checking verified senders...")
            response = requests.get(
                'https://api.sendgrid.com/v3/verified_senders',
                headers=headers
            )
            
            if response.status_code == 200:
                verified_senders = response.json()
                print(f"Found {len(verified_senders)} verified senders:")
                
                current_sender_verified = False
                for sender in verified_senders:
                    status = "✓ VERIFIED" if sender.get('verified') else "❌ PENDING"
                    print(f"   • {sender.get('from_email', 'Unknown')} - {status}")
                    
                    if sender.get('from_email') == self.from_email and sender.get('verified'):
                        current_sender_verified = True
                
                if not current_sender_verified:
                    print(f"\n❌ Current sender ({self.from_email}) is NOT verified")
                    return False
                else:
                    print(f"\n✓ Current sender ({self.from_email}) is verified")
                    return True
            else:
                print(f"❌ Failed to check verified senders: {response.status_code}")
                if response.status_code == 403:
                    print("   → API key may lack sender verification permissions")
                return False
                
        except Exception as e:
            print(f"❌ Error checking sender verification: {str(e)}")
            return False
    
    def test_email_send(self):
        """Test sending an email"""
        self.print_header("EMAIL SEND TEST")
        
        if not self.sg_client:
            print("❌ Cannot test - SendGrid client not initialized")
            return False
        
        test_email = input(f"\nEnter test email address (or press Enter to skip): ").strip()
        if not test_email:
            print("Skipping email send test")
            return None
        
        try:
            print(f"Attempting to send test email to {test_email}...")
            
            message = Mail(
                from_email=(self.from_email, self.from_name),
                to_emails=test_email,
                subject='SendGrid Test Email - BookedBarber System',
                html_content='''
                <h2>SendGrid Test Email</h2>
                <p>This is a test email from your BookedBarber notification system.</p>
                <p>If you receive this email, your SendGrid configuration is working correctly!</p>
                <p><strong>Timestamp:</strong> {timestamp}</p>
                <hr>
                <p><em>This is an automated test email.</em></p>
                '''.format(timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )
            
            response = self.sg_client.send(message)
            
            if response.status_code in [200, 202]:
                print(f"✓ Email sent successfully! Status code: {response.status_code}")
                print(f"✓ Check {test_email} for the test email")
                return True
            else:
                print(f"❌ Email send failed with status: {response.status_code}")
                print(f"Response: {response.body}")
                return False
                
        except Exception as e:
            error_str = str(e)
            print(f"❌ Error sending test email: {error_str}")
            
            if '403' in error_str or 'Forbidden' in error_str:
                print("   → This is typically due to unverified sender")
            elif '401' in error_str:
                print("   → Invalid API key or permissions")
            
            return False
    
    def provide_solutions(self):
        """Provide step-by-step solutions"""
        self.print_header("TROUBLESHOOTING SOLUTIONS")
        
        print("\n🔧 SOLUTION 1: Check Gmail Filters & Delivery")
        print("-" * 40)
        print("Gmail may be blocking or filtering SendGrid verification emails:")
        print("• Check ALL Gmail folders: Inbox, Spam, Social, Promotions, Updates")
        print("• Search Gmail for: from:noreply@sendgrid.com")
        print("• Search Gmail for: subject:verify")
        print("• Check Gmail's 'All Mail' folder")
        print("• Look for emails from the past 24-48 hours")
        
        print("\n🔧 SOLUTION 2: Resend Verification Email")
        print("-" * 40)
        print("1. Go to SendGrid Dashboard: https://app.sendgrid.com")
        print("2. Navigate to Settings → Sender Authentication")
        print("3. Find your sender and click 'Resend Verification'")
        print("4. Wait 5-10 minutes and check all email folders")
        
        print("\n🔧 SOLUTION 3: Try Alternative Email Address")
        print("-" * 40)
        print("Gmail sometimes has strict filtering. Try:")
        print("• Use a different email service (Outlook, Yahoo, etc.)")
        print("• Use a business email domain if available")
        print("• Create a temporary email at temp-mail.org for testing")
        
        print("\n🔧 SOLUTION 4: Domain Authentication (Recommended)")
        print("-" * 40)
        print("Instead of single sender verification, set up domain authentication:")
        print("1. Go to Settings → Sender Authentication")
        print("2. Click 'Authenticate Your Domain'")
        print("3. Follow DNS setup instructions")
        print("4. Domain authentication bypasses sender verification")
        
        print("\n🔧 SOLUTION 5: Contact SendGrid Support")
        print("-" * 40)
        print("If verification emails still don't arrive:")
        print("1. Go to https://support.sendgrid.com")
        print("2. Create a support ticket")
        print("3. Mention: 'Verification email not received for Gmail'")
        print("4. Include your sender email and timestamp of attempts")
        
        print("\n🔧 SOLUTION 6: Alternative Email Services")
        print("-" * 40)
        print("If SendGrid continues to have issues, consider:")
        print("• Mailgun (similar pricing, reliable)")
        print("• Amazon SES (very low cost)")
        print("• Postmark (excellent deliverability)")
        print("• SMTP with Gmail App Passwords (free, limited)")
    
    def run_diagnosis(self):
        """Run complete diagnosis"""
        print("🔍 SendGrid Email Verification Troubleshooting")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Step 1: Check configuration
        self.print_step(1, "Checking Configuration")
        config_ok = self.check_configuration()
        
        if not config_ok:
            print("\n❌ Configuration issues found. Please fix before proceeding.")
            return
        
        # Step 2: Test API connection
        self.print_step(2, "Testing API Connection")
        api_ok = self.test_api_connection()
        
        if not api_ok:
            print("\n❌ API connection issues found.")
            self.provide_solutions()
            return
        
        # Step 3: Check sender verification
        self.print_step(3, "Checking Sender Verification")
        sender_ok = self.check_sender_verification()
        
        # Step 4: Test email sending (optional)
        self.print_step(4, "Testing Email Send (Optional)")
        send_ok = self.test_email_send()
        
        # Step 5: Provide solutions
        self.print_step(5, "Solutions & Next Steps")
        
        if sender_ok and send_ok:
            print("✅ All tests passed! Your SendGrid is configured correctly.")
        elif not sender_ok:
            print("❌ Sender verification is the main issue.")
            self.provide_solutions()
        else:
            print("❌ Issues found. See solutions below.")
            self.provide_solutions()
        
        # Final summary
        self.print_header("SUMMARY & NEXT STEPS")
        
        if not sender_ok:
            print("🎯 PRIMARY ISSUE: Sender verification")
            print("\n📧 IMMEDIATE ACTION NEEDED:")
            print("1. Check ALL Gmail folders for verification email")
            print("2. Search Gmail for: from:noreply@sendgrid.com")
            print("3. If not found, resend verification in SendGrid dashboard")
            print("4. Consider using a different email service for verification")
            print("5. Or set up domain authentication instead")
        
        print(f"\n📞 Need help? Contact: support@sendgrid.com")
        print(f"🔗 SendGrid Status: https://status.sendgrid.com")


def main():
    """Main function"""
    troubleshooter = SendGridTroubleshooter()
    troubleshooter.run_diagnosis()


if __name__ == "__main__":
    main()