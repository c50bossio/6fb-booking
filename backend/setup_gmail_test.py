#!/usr/bin/env python3
"""
Gmail SMTP Setup Helper for c50bossio@gmail.com
Quick setup to test email delivery while SendGrid is being configured
"""

import asyncio
import smtplib
import getpass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


def test_gmail_connection(gmail_password):
    """Test Gmail SMTP connection with provided password"""
    try:
        print("🔍 Testing Gmail SMTP connection...")

        # Test connection
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login("c50bossio@gmail.com", gmail_password)
        server.quit()

        print("✅ Gmail SMTP connection successful!")
        return True

    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication failed - check your app password")
        print(
            "💡 Make sure you're using an App Password, not your regular Gmail password"
        )
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


def send_test_email(gmail_password):
    """Send a test email using Gmail SMTP"""
    try:
        print("📤 Sending test email to c50bossio@gmail.com...")

        # Create test email
        subject = "🎉 Six Figure Barber Email Test - SUCCESS!"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a, #333); padding: 40px; border-radius: 15px; border: 2px solid #e74c3c;">
                <h1 style="color: #e74c3c; text-align: center; margin-bottom: 30px;">🎉 Six Figure Barber</h1>
                <h2 style="color: #fff; text-align: center;">Email System Test Successful!</h2>
                <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Hello Carlos,
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Great news! The Six Figure Barber email system is now working and can send emails to your Gmail account.
                </p>
                <div style="background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 30px 0;">
                    <h3 style="margin: 0;">📧 Email Delivery Status: ✅ WORKING</h3>
                    <p style="margin: 10px 0 0 0;">Test sent at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                <div style="background: #333; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h4 style="color: #e74c3c; margin-top: 0;">What's Next:</h4>
                    <ul style="color: #ccc; line-height: 1.8;">
                        <li>✅ Test Valentine's Day promotional emails</li>
                        <li>✅ Test Father's Day promotional emails</li>
                        <li>🔧 Set up SendGrid for production</li>
                        <li>🎯 Launch holiday email campaigns</li>
                    </ul>
                </div>
                <p style="font-size: 14px; color: #ccc; text-align: center; margin-top: 30px;">
                    Six Figure Barber | Company-Level Email Service<br>
                    Ready for franchise-wide deployment
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Six Figure Barber Email System Test - SUCCESS!

        Hello Carlos,

        Great news! The Six Figure Barber email system is now working and can send emails to your Gmail account.

        Email Delivery Status: WORKING ✅
        Test sent at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

        What's Next:
        ✅ Test Valentine's Day promotional emails
        ✅ Test Father's Day promotional emails
        🔧 Set up SendGrid for production
        🎯 Launch holiday email campaigns

        Six Figure Barber | Company-Level Email Service
        Ready for franchise-wide deployment
        """

        # Create and send email
        message = MIMEMultipart("alternative")
        message["From"] = "c50bossio@gmail.com"
        message["To"] = "c50bossio@gmail.com"
        message["Subject"] = subject

        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")

        message.attach(text_part)
        message.attach(html_part)

        # Send via SMTP
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login("c50bossio@gmail.com", gmail_password)
        server.sendmail(
            "c50bossio@gmail.com", "c50bossio@gmail.com", message.as_string()
        )
        server.quit()

        print("🎉 Test email sent successfully!")
        print("📧 Check your c50bossio@gmail.com inbox")
        return True

    except Exception as e:
        print(f"❌ Failed to send test email: {e}")
        return False


def update_env_file(gmail_password):
    """Update .env file with Gmail app password"""
    try:
        # Read current .env file
        with open(".env", "r") as f:
            lines = f.readlines()

        # Update SMTP_PASSWORD line
        updated_lines = []
        found_smtp_password = False

        for line in lines:
            if line.startswith("SMTP_PASSWORD="):
                updated_lines.append(f"SMTP_PASSWORD={gmail_password}\n")
                found_smtp_password = True
            else:
                updated_lines.append(line)

        # If SMTP_PASSWORD not found, add it
        if not found_smtp_password:
            updated_lines.append(f"SMTP_PASSWORD={gmail_password}\n")

        # Write updated .env file
        with open(".env", "w") as f:
            f.writelines(updated_lines)

        print("✅ .env file updated with Gmail app password")
        return True

    except Exception as e:
        print(f"❌ Failed to update .env file: {e}")
        return False


def show_app_password_instructions():
    """Show instructions for creating Gmail app password"""
    print("\n📋 GMAIL APP PASSWORD SETUP INSTRUCTIONS")
    print("=" * 60)
    print("To send emails from c50bossio@gmail.com, you need an App Password:")
    print()
    print("1. 🔐 Enable 2-Factor Authentication:")
    print("   → Go to https://myaccount.google.com/security")
    print("   → Click '2-Step Verification' and set it up")
    print()
    print("2. 📱 Generate App Password:")
    print("   → Go to https://myaccount.google.com/apppasswords")
    print("   → Select 'Mail' as the app")
    print("   → Copy the 16-character password (no spaces)")
    print()
    print("3. ✅ Test with this script:")
    print("   → Run this script again")
    print("   → Enter the app password when prompted")
    print()
    print("🎯 Alternative: Set up SendGrid for production use")
    print("   → See SENDGRID_SETUP_GUIDE_6FB.md")


def main():
    """Main setup function"""
    print("=" * 60)
    print("📧 Gmail SMTP Setup for Six Figure Barber")
    print("=" * 60)
    print("🎯 Testing email delivery to c50bossio@gmail.com")
    print()

    # Ask for Gmail app password
    print("🔑 Please enter your Gmail App Password for c50bossio@gmail.com")
    print(
        "💡 This is NOT your regular Gmail password - it's a 16-character app password"
    )
    print("📋 If you don't have one yet, press Enter for setup instructions")
    print()

    gmail_password = getpass.getpass(
        "Gmail App Password (or press Enter for instructions): "
    ).strip()

    if not gmail_password:
        show_app_password_instructions()
        return

    # Test connection
    if test_gmail_connection(gmail_password):
        # Send test email
        if send_test_email(gmail_password):
            # Update .env file
            if update_env_file(gmail_password):
                print("\n🎉 SUCCESS! Gmail SMTP is now configured and working!")
                print("📧 Check c50bossio@gmail.com for the test email")
                print("🚀 You can now run: python test_email_delivery_carlos.py")
                print(
                    "🎯 Or test holiday campaigns: python send_test_email_to_carlos.py"
                )
            else:
                print("\n⚠️ Email sent but failed to save password to .env file")
                print("💡 You may need to enter the password again next time")
        else:
            print("\n❌ Failed to send test email")
    else:
        print("\n❌ Gmail SMTP connection failed")
        show_app_password_instructions()


if __name__ == "__main__":
    main()
