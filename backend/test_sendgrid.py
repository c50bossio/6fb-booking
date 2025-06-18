import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from database import SessionLocal
from services.email_service import email_service
from core.config import settings

def test_sendgrid():
    """Test SendGrid email configuration"""
    print("=== SendGrid Configuration Test ===\n")
    
    # Check configuration
    print("📧 Email Configuration:")
    print(f"  - Email enabled: {settings.email_enabled}")
    print(f"  - SMTP Host: {settings.SMTP_HOST}")
    print(f"  - SMTP Port: {settings.SMTP_PORT}")
    print(f"  - SMTP Username: {settings.SMTP_USERNAME}")
    print(f"  - From Address: {settings.EMAIL_FROM_ADDRESS}")
    print(f"  - From Name: {settings.EMAIL_FROM_NAME}")
    
    if not settings.email_enabled:
        print("\n❌ Email is not configured. Please check your .env file.")
        print("\nRequired variables:")
        print("  - SMTP_HOST")
        print("  - SMTP_USERNAME")
        print("  - SMTP_PASSWORD")
        return
    
    # Test connection
    print("\n🔌 Testing SMTP Connection...")
    try:
        server = email_service._get_smtp_connection()
        server.quit()
        print("✅ Successfully connected to SendGrid SMTP")
    except Exception as e:
        print(f"❌ Failed to connect: {str(e)}")
        return
    
    # Send test email
    test_email = input("\n📬 Enter email address to send test to: ")
    
    db = SessionLocal()
    try:
        print(f"\n📤 Sending test email to {test_email}...")
        
        # Test 1: Welcome email
        success = email_service.send_welcome_email(
            db=db,
            to_email=test_email,
            user_data={
                "name": "Test User",
                "email": test_email,
                "created_at": datetime.now()
            }
        )
        
        if success:
            print("✅ Welcome email sent successfully!")
        else:
            print("❌ Failed to send welcome email")
            return
        
        # Test 2: Appointment confirmation
        print("\n📤 Sending appointment confirmation...")
        success = email_service.send_appointment_confirmation(
            db=db,
            to_email=test_email,
            appointment_data={
                "id": "test-123",
                "service_name": "Premium Haircut",
                "date": "Tomorrow",
                "time": "2:00 PM",
                "barber_name": "John Doe",
                "location": "Main Street Barbershop",
                "price": 45.00
            }
        )
        
        if success:
            print("✅ Appointment confirmation sent successfully!")
        else:
            print("❌ Failed to send appointment confirmation")
        
        print(f"\n✨ All tests completed! Check {test_email} for the test emails.")
        print("\n📊 You can view email statistics in your SendGrid dashboard:")
        print("   https://app.sendgrid.com/statistics")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    test_sendgrid()