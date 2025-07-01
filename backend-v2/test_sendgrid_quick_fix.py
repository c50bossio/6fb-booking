#!/usr/bin/env python3
"""
Quick SendGrid Test with Verified Sender
Tests email sending using the already verified sender
"""

import os
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from config import settings

def test_with_verified_sender():
    """Test email sending with the verified sender"""
    
    # Use the already verified sender
    verified_email = "support@em3014.6fbmentorship.com"
    verified_name = "BookedBarber"
    
    print("🧪 SENDGRID QUICK TEST")
    print("=" * 50)
    print(f"Using verified sender: {verified_email}")
    print(f"API Key: {settings.sendgrid_api_key[:20]}...")
    print()
    
    # Initialize SendGrid client
    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        print("✓ SendGrid client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize SendGrid: {e}")
        return False
    
    # Get test email
    test_email = input("Enter your email address to receive test email: ").strip()
    if not test_email or '@' not in test_email:
        print("❌ Invalid email address")
        return False
    
    print(f"\n📧 Sending test email to: {test_email}")
    print("⏳ Please wait...")
    
    try:
        # Create test email
        message = Mail(
            from_email=(verified_email, verified_name),
            to_emails=test_email,
            subject='✅ BookedBarber Email Test - SUCCESS!',
            html_content=f'''
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #0066cc; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .success {{ background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .info {{ background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 BookedBarber Email Test</h1>
                    </div>
                    <div class="content">
                        <div class="success">
                            <h2>🎉 SUCCESS!</h2>
                            <p>Your SendGrid email configuration is working correctly!</p>
                        </div>
                        
                        <h3>📊 Test Details:</h3>
                        <div class="info">
                            <strong>Timestamp:</strong> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}<br>
                            <strong>From:</strong> {verified_name} &lt;{verified_email}&gt;<br>
                            <strong>To:</strong> {test_email}<br>
                            <strong>Service:</strong> SendGrid API<br>
                            <strong>System:</strong> BookedBarber Notification System
                        </div>
                        
                        <h3>✅ What this means:</h3>
                        <ul>
                            <li>Your SendGrid API key is valid and working</li>
                            <li>The verified sender email is properly configured</li>
                            <li>Your notification system can send emails</li>
                            <li>Email delivery is functioning correctly</li>
                        </ul>
                        
                        <h3>🔧 Next Steps:</h3>
                        <ol>
                            <li>Update your config to use this verified sender</li>
                            <li>Test appointment notifications</li>
                            <li>Monitor email delivery in production</li>
                        </ol>
                        
                        <div class="info">
                            <p><strong>Note:</strong> This email was sent as a test of your booking notification system. 
                            If you weren't expecting this email, please contact your system administrator.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            '''
        )
        
        # Send email
        response = sg.send(message)
        
        if response.status_code in [200, 202]:
            print(f"✅ SUCCESS! Email sent successfully")
            print(f"📬 Status Code: {response.status_code}")
            print(f"📧 Check your inbox: {test_email}")
            print()
            print("🔧 TO FIX YOUR CONFIG:")
            print("Update your environment variables to:")
            print(f"SENDGRID_FROM_EMAIL={verified_email}")
            print(f"SENDGRID_FROM_NAME={verified_name}")
            print()
            print("Or create a .env file with:")
            print(f"SENDGRID_FROM_EMAIL={verified_email}")
            print(f"SENDGRID_FROM_NAME={verified_name}")
            return True
        else:
            print(f"❌ Email send failed")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.body}")
            return False
            
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error sending email: {error_str}")
        
        if '403' in error_str:
            print("\n🔍 403 Forbidden Error Analysis:")
            print("This could mean:")
            print("1. Sender verification issue (but we're using verified sender)")
            print("2. API key permissions (though key has mail.send scope)")
            print("3. Account suspension or limits")
            print("4. Domain reputation issues")
        
        return False

def show_alternative_solutions():
    """Show alternative solutions if test fails"""
    print("\n" + "="*60)
    print("🔄 ALTERNATIVE SOLUTIONS")
    print("="*60)
    
    print("\n1. 📧 GMAIL SMTP (Free Alternative)")
    print("-" * 40)
    print("If SendGrid continues having issues, use Gmail SMTP:")
    print("• Create Gmail App Password: https://myaccount.google.com/apppasswords")
    print("• Update config to use SMTP instead of SendGrid")
    print("• More reliable for small volumes")
    
    print("\n2. 🔄 Try Different SendGrid Sender")
    print("-" * 40)
    print("Add c50bossio@gmail.com as verified sender:")
    print("• Go to: https://app.sendgrid.com/settings/sender_auth")
    print("• Click 'Verify a Single Sender'")
    print("• Add c50bossio@gmail.com")
    print("• Check ALL Gmail folders for verification email")
    
    print("\n3. 🌐 Domain Authentication")
    print("-" * 40)
    print("Set up domain authentication (bypasses single sender verification):")
    print("• Go to: https://app.sendgrid.com/settings/sender_auth")
    print("• Click 'Authenticate Your Domain'")
    print("• Follow DNS setup instructions")
    
    print("\n4. 📞 Contact SendGrid Support")
    print("-" * 40)
    print("If all else fails:")
    print("• https://support.sendgrid.com")
    print("• Create ticket: 'Cannot verify sender email'")
    print("• Include: account email, verification attempts")

if __name__ == "__main__":
    print("🚀 Starting SendGrid Quick Fix Test...\n")
    
    success = test_with_verified_sender()
    
    if not success:
        show_alternative_solutions()
    
    print(f"\n📋 Test completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")