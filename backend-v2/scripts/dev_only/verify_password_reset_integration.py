#!/usr/bin/env python3
"""
Verify password reset integration with notification system
"""
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

def check_sendgrid_config():
    """Check if SendGrid is properly configured"""
    print("\n🔍 Checking SendGrid Configuration")
    print("=" * 50)
    
    from config import settings
    
    sendgrid_key = getattr(settings, 'sendgrid_api_key', None) or os.getenv('SENDGRID_API_KEY')
    from_email = getattr(settings, 'sendgrid_from_email', None) or os.getenv('SENDGRID_FROM_EMAIL')
    
    if sendgrid_key and sendgrid_key != 'your-sendgrid-api-key':
        print(f"✅ SendGrid API Key: Configured (ends with ...{sendgrid_key[-4:]})")
    else:
        print("⚠️  SendGrid API Key: Not configured (will use console output)")
    
    if from_email and from_email != 'noreply@example.com':
        print(f"✅ SendGrid From Email: {from_email}")
    else:
        print("⚠️  SendGrid From Email: Not configured")
    
    return bool(sendgrid_key and sendgrid_key != 'your-sendgrid-api-key')

def check_email_templates():
    """Check if email templates exist"""
    print("\n📧 Checking Email Templates")
    print("=" * 50)
    
    template_dir = Path(__file__).parent / "templates" / "notifications"
    
    templates = [
        ("password_reset.html", "HTML template"),
        ("password_reset.txt", "Text template")
    ]
    
    all_exist = True
    for filename, description in templates:
        template_path = template_dir / filename
        if template_path.exists():
            print(f"✅ {description}: {template_path}")
            # Show first few lines
            with open(template_path, 'r') as f:
                lines = f.readlines()[:5]
                preview = ''.join(lines).strip()
                if len(preview) > 100:
                    preview = preview[:100] + "..."
                print(f"   Preview: {preview}")
        else:
            print(f"❌ {description}: NOT FOUND at {template_path}")
            all_exist = False
    
    return all_exist

def test_notification_service():
    """Test notification service initialization"""
    print("\n🔔 Testing Notification Service")
    print("=" * 50)
    
    try:
        from services.notification_service import NotificationService
        
        service = NotificationService()
        
        if service.sendgrid_client:
            print("✅ SendGrid client initialized")
        else:
            print("⚠️  SendGrid client not initialized (will use console output)")
        
        # Check if send_email method exists
        if hasattr(service, 'send_email'):
            print("✅ send_email method available")
        else:
            print("❌ send_email method not found")
        
        return True
    except Exception as e:
        print(f"❌ Error initializing notification service: {e}")
        return False

def test_password_reset_function():
    """Test password reset helper function"""
    print("\n🔐 Testing Password Reset Function")
    print("=" * 50)
    
    try:
        from utils.password_reset import send_reset_email
        
        print("✅ send_reset_email function imported successfully")
        
        # Test with dummy data (won't actually send)
        test_email = "test@example.com"
        test_token = "test-token-12345"
        test_name = "Test User"
        
        print(f"\n📨 Attempting to send test email to: {test_email}")
        print("   (Check console output below)")
        print("-" * 50)
        
        # This will either send via SendGrid or print to console
        send_reset_email(test_email, test_token, test_name)
        
        print("-" * 50)
        print("✅ Password reset email function executed successfully")
        
        return True
    except Exception as e:
        print(f"❌ Error testing password reset: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_database_model():
    """Verify PasswordResetToken model exists"""
    print("\n💾 Verifying Database Model")
    print("=" * 50)
    
    try:
        import models
        
        if hasattr(models, 'PasswordResetToken'):
            print("✅ PasswordResetToken model exists")
            
            # Check required fields
            token_model = models.PasswordResetToken
            required_fields = ['id', 'user_id', 'token', 'expires_at', 'used']
            
            for field in required_fields:
                if hasattr(token_model, field):
                    print(f"   ✅ Field '{field}' exists")
                else:
                    print(f"   ❌ Field '{field}' missing")
        else:
            print("❌ PasswordResetToken model not found")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error checking database model: {e}")
        return False

def main():
    print("🚀 6FB Password Reset Integration Verification")
    print("=" * 60)
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run all checks
    results = {
        "SendGrid Config": check_sendgrid_config(),
        "Email Templates": check_email_templates(),
        "Database Model": verify_database_model(),
        "Notification Service": test_notification_service(),
        "Password Reset Function": test_password_reset_function()
    }
    
    # Summary
    print("\n📊 Summary")
    print("=" * 50)
    
    all_passed = True
    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{check}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✨ All checks passed! Password reset is fully integrated.")
        print("\n📝 Notes:")
        print("- If SendGrid is not configured, emails will print to console")
        print("- This is acceptable for development/testing")
        print("- For production, configure SENDGRID_API_KEY and SENDGRID_FROM_EMAIL")
    else:
        print("⚠️  Some checks failed. Review the output above for details.")
    
    print("\n🔗 Frontend URLs:")
    print("- Forgot Password: http://localhost:3000/forgot-password")
    print("- Reset Password: http://localhost:3000/reset-password?token=YOUR_TOKEN")
    
    print("\n🧪 To test the full flow:")
    print("1. Start backend: cd backend-v2 && uvicorn main:app --reload")
    print("2. Start frontend: cd frontend-v2 && npm run dev")
    print("3. Visit forgot password page and request a reset")
    print("4. Check console for reset link (or email if SendGrid configured)")
    print("5. Use the link to reset your password")

if __name__ == "__main__":
    main()