#!/usr/bin/env python3
"""
Comprehensive SMS and Email Notification Testing Script

This script tests the complete notification system including:
1. SendGrid email sending
2. Twilio SMS sending  
3. Notification queue processing
4. Template rendering
5. Error handling and retries

Usage:
    python test_notifications_comprehensive.py

Requirements:
    - Valid SendGrid API key configured
    - Valid Twilio credentials configured
    - Test recipient email and phone number
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from database import get_db
from services.notification_service import notification_service
from models import User, NotificationTemplate, NotificationQueue, NotificationStatus
from config import settings

# Test Configuration
TEST_EMAIL = "dev@bookedbarber.com"  # Change to your test email
TEST_PHONE = "+1234567890"  # Change to your test phone number

class NotificationTester:
    def __init__(self):
        self.db = next(get_db())
        self.results = []
        self.test_user = None
        
    def log_result(self, test_name: str, success: bool, details: str = "", error: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "error": error
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        if error:
            print(f"    Error: {error}")
        print()

    def setup_test_user(self) -> User:
        """Create or get test user"""
        test_user = self.db.query(User).filter(User.email == TEST_EMAIL).first()
        
        if not test_user:
            test_user = User(
                email=TEST_EMAIL,
                name="Test User",
                phone=TEST_PHONE,
                hashed_password="dummy_hash",
                is_active=True,
                role="CLIENT"
            )
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)
        
        self.test_user = test_user
        return test_user

    def create_test_templates(self):
        """Create test notification templates"""
        templates_data = [
            {
                "name": "test_email_template",
                "template_type": "email",
                "subject": "Test Email - {{test_subject}}",
                "body": """
                <html>
                <body>
                    <h2>Test Email Notification</h2>
                    <p>Hello {{user_name}},</p>
                    <p>This is a test email from BookedBarber V2 notification system.</p>
                    <p>Test details:</p>
                    <ul>
                        <li>User: {{user_name}}</li>
                        <li>Email: {{user_email}}</li>
                        <li>Timestamp: {{timestamp}}</li>
                        <li>Test ID: {{test_id}}</li>
                    </ul>
                    <p>If you received this email, the notification system is working correctly!</p>
                    <br>
                    <p>Best regards,<br>BookedBarber V2 Team</p>
                </body>
                </html>
                """,
                "is_active": True
            },
            {
                "name": "test_sms_template",
                "template_type": "sms",
                "subject": None,
                "body": "🧪 Test SMS from BookedBarber V2! Hello {{user_name}}, this message confirms SMS notifications are working. Test ID: {{test_id}}. Timestamp: {{timestamp}}",
                "is_active": True
            }
        ]
        
        for template_data in templates_data:
            existing = self.db.query(NotificationTemplate).filter(
                NotificationTemplate.name == template_data["name"]
            ).first()
            
            if existing:
                # Update existing template
                for key, value in template_data.items():
                    setattr(existing, key, value)
            else:
                # Create new template
                template = NotificationTemplate(**template_data)
                self.db.add(template)
        
        self.db.commit()

    def test_configuration_status(self):
        """Test notification service configuration"""
        try:
            # Check SendGrid configuration
            sendgrid_configured = notification_service.sendgrid_client is not None
            sendgrid_details = f"API Key configured: {bool(settings.sendgrid_api_key and settings.sendgrid_api_key != '')}"
            
            # Check Twilio configuration  
            twilio_configured = notification_service.twilio_client is not None
            twilio_details = f"Credentials configured: {bool(settings.twilio_account_sid and settings.twilio_auth_token)}"
            
            # Overall status
            overall_success = sendgrid_configured and twilio_configured
            
            self.log_result(
                "Configuration Status",
                overall_success,
                f"SendGrid: {sendgrid_configured}, Twilio: {twilio_configured}",
                "" if overall_success else "Missing provider configuration"
            )
            
            # Individual provider tests
            self.log_result("SendGrid Configuration", sendgrid_configured, sendgrid_details)
            self.log_result("Twilio Configuration", twilio_configured, twilio_details)
            
        except Exception as e:
            self.log_result("Configuration Status", False, "", str(e))

    def test_direct_email_sending(self):
        """Test direct email sending via SendGrid"""
        if not notification_service.sendgrid_client:
            self.log_result("Direct Email Send", False, "", "SendGrid not configured")
            return
            
        try:
            result = notification_service.send_email(
                to_email=TEST_EMAIL,
                subject="🧪 Direct Email Test - BookedBarber V2",
                body=f"""
                <html>
                <body>
                    <h2>Direct Email Test</h2>
                    <p>This email was sent directly through the notification service.</p>
                    <p>Timestamp: {datetime.now().isoformat()}</p>
                    <p>Test Type: Direct SendGrid API call</p>
                    <p>✅ If you see this, email notifications are working!</p>
                </body>
                </html>
                """
            )
            
            success = result.get("success", False)
            details = f"Status Code: {result.get('status_code', 'N/A')}, Message ID: {result.get('message_id', 'N/A')}"
            error = result.get("error", "")
            
            self.log_result("Direct Email Send", success, details, error)
            
        except Exception as e:
            self.log_result("Direct Email Send", False, "", str(e))

    def test_direct_sms_sending(self):
        """Test direct SMS sending via Twilio"""
        if not notification_service.twilio_client:
            self.log_result("Direct SMS Send", False, "", "Twilio not configured")
            return
            
        try:
            test_message = f"🧪 Direct SMS Test from BookedBarber V2! Timestamp: {datetime.now().strftime('%H:%M:%S')}. If you received this, SMS is working! 📱"
            
            result = notification_service.send_sms(
                to_phone=TEST_PHONE,
                body=test_message
            )
            
            success = result.get("success", False)
            details = f"Message SID: {result.get('message_sid', 'N/A')}, Status: {result.get('status', 'N/A')}"
            error = result.get("error", "")
            
            self.log_result("Direct SMS Send", success, details, error)
            
        except Exception as e:
            self.log_result("Direct SMS Send", False, "", str(e))

    def test_template_rendering(self):
        """Test notification template rendering"""
        try:
            # Get email template
            email_template = self.db.query(NotificationTemplate).filter(
                NotificationTemplate.name == "test_email_template"
            ).first()
            
            if not email_template:
                raise Exception("Test email template not found")
            
            # Test context
            context = {
                "user_name": self.test_user.name,
                "user_email": self.test_user.email,
                "test_subject": "Template Rendering Test",
                "timestamp": datetime.now().isoformat(),
                "test_id": "TEMPLATE_001"
            }
            
            # Render template
            rendered = notification_service.render_template(email_template, context, self.db)
            
            # Validate rendering
            has_subject = "subject" in rendered and "Template Rendering Test" in rendered["subject"]
            has_body = "body" in rendered and self.test_user.name in rendered["body"]
            has_timestamp = "body" in rendered and datetime.now().strftime("%Y-%m-%d") in rendered["body"]
            
            success = has_subject and has_body and has_timestamp
            details = f"Subject rendered: {has_subject}, Body rendered: {has_body}, Variables substituted: {has_timestamp}"
            
            self.log_result("Template Rendering", success, details)
            
        except Exception as e:
            self.log_result("Template Rendering", False, "", str(e))

    def test_notification_queuing(self):
        """Test notification queuing system"""
        try:
            test_id = f"QUEUE_{datetime.now().strftime('%H%M%S')}"
            
            # Queue notifications
            context = {
                "user_name": self.test_user.name,
                "user_email": self.test_user.email,
                "test_subject": "Queue Test",
                "timestamp": datetime.now().isoformat(),
                "test_id": test_id
            }
            
            queued_notifications = notification_service.queue_notification(
                db=self.db,
                user=self.test_user,
                template_name="test_email_template",
                context=context
            )
            
            # Verify queuing
            email_queued = any(n.notification_type == "email" for n in queued_notifications)
            sms_queued = any(n.notification_type == "sms" for n in queued_notifications)
            
            success = len(queued_notifications) > 0
            details = f"Queued: {len(queued_notifications)} notifications (Email: {email_queued}, SMS: {sms_queued})"
            
            self.log_result("Notification Queuing", success, details)
            
            return queued_notifications
            
        except Exception as e:
            self.log_result("Notification Queuing", False, "", str(e))
            return []

    def test_queue_processing(self):
        """Test notification queue processing"""
        try:
            # Process the queue
            result = notification_service.process_notification_queue(self.db, batch_size=10)
            
            processed = result.get("processed", 0)
            successful = result.get("successful", 0)
            failed = result.get("failed", 0)
            
            success = processed > 0 and successful > 0
            details = f"Processed: {processed}, Successful: {successful}, Failed: {failed}"
            
            self.log_result("Queue Processing", success, details)
            
        except Exception as e:
            self.log_result("Queue Processing", False, "", str(e))

    def test_notification_history(self):
        """Test notification history retrieval"""
        try:
            history = notification_service.get_notification_history(
                db=self.db,
                user_id=self.test_user.id,
                limit=10
            )
            
            success = len(history) > 0
            details = f"Found {len(history)} notifications in history"
            
            # Show recent notification statuses
            if history:
                recent_statuses = [n.status.value if hasattr(n.status, 'value') else str(n.status) for n in history[:3]]
                details += f", Recent statuses: {recent_statuses}"
            
            self.log_result("Notification History", success, details)
            
        except Exception as e:
            self.log_result("Notification History", False, "", str(e))

    def test_notification_statistics(self):
        """Test notification statistics"""
        try:
            stats = notification_service.get_notification_stats(self.db, days=1)
            
            success = "email" in stats and "sms" in stats
            details = f"Email stats available: {'email' in stats}, SMS stats available: {'sms' in stats}"
            
            if success:
                email_sent = stats["email"].get("sent", 0)
                sms_sent = stats["sms"].get("sent", 0)
                details += f", Recent activity: {email_sent} emails, {sms_sent} SMS"
            
            self.log_result("Notification Statistics", success, details)
            
        except Exception as e:
            self.log_result("Notification Statistics", False, "", str(e))

    def test_ai_enhanced_notifications(self):
        """Test AI-enhanced notification features"""
        try:
            # Import AI-enhanced notification service
            from services.enhanced_notification_service import EnhancedNotificationService
            
            ai_service = EnhancedNotificationService()
            
            # Test AI message generation
            test_context = {
                "user_name": self.test_user.name,
                "appointment_type": "haircut",
                "appointment_time": "2:00 PM",
                "barber_name": "Test Barber"
            }
            
            # Generate AI-enhanced reminder
            ai_message = ai_service.generate_personalized_reminder(
                user_id=self.test_user.id,
                context=test_context,
                db=self.db
            )
            
            success = ai_message and len(ai_message) > 0
            details = f"AI message generated: {success}, Length: {len(ai_message) if ai_message else 0} characters"
            
            self.log_result("AI Enhanced Notifications", success, details)
            
        except ImportError:
            self.log_result("AI Enhanced Notifications", False, "", "AI notification service not available")
        except Exception as e:
            self.log_result("AI Enhanced Notifications", False, "", str(e))

    def run_comprehensive_test(self):
        """Run all notification tests"""
        print("🧪 Starting Comprehensive Notification System Test")
        print("=" * 60)
        print()
        
        # Setup
        print("🔧 Setting up test environment...")
        self.setup_test_user()
        self.create_test_templates()
        print(f"📧 Test email: {TEST_EMAIL}")
        print(f"📱 Test phone: {TEST_PHONE}")
        print()
        
        # Run tests
        print("🧪 Running tests...")
        print()
        
        self.test_configuration_status()
        self.test_template_rendering()
        self.test_direct_email_sending()
        self.test_direct_sms_sending()
        self.test_notification_queuing()
        self.test_queue_processing()
        self.test_notification_history()
        self.test_notification_statistics()
        self.test_ai_enhanced_notifications()
        
        # Summary
        print("📊 Test Summary")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        # Failed tests details
        if failed_tests > 0:
            print("❌ Failed Tests:")
            for result in self.results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['error']}")
            print()
        
        # Provider status
        sendgrid_working = any(r["success"] for r in self.results if "Email" in r["test"])
        twilio_working = any(r["success"] for r in self.results if "SMS" in r["test"])
        
        print("🔌 Provider Status:")
        print(f"  📧 SendGrid Email: {'✅ Working' if sendgrid_working else '❌ Issues detected'}")
        print(f"  📱 Twilio SMS: {'✅ Working' if twilio_working else '❌ Issues detected'}")
        print()
        
        # Recommendations
        print("💡 Recommendations:")
        if not sendgrid_working:
            print("  - Check SendGrid API key and from email configuration")
            print("  - Verify SendGrid account status and email verification")
        if not twilio_working:
            print("  - Check Twilio account SID, auth token, and phone number")
            print("  - Verify Twilio account balance and phone number verification")
        if sendgrid_working and twilio_working:
            print("  ✅ Notification system is fully operational!")
            print("  - Consider setting up monitoring for production")
            print("  - Review notification templates for optimization")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": (passed_tests/total_tests)*100,
            "sendgrid_working": sendgrid_working,
            "twilio_working": twilio_working,
            "results": self.results
        }

def main():
    """Main function to run notification tests"""
    try:
        tester = NotificationTester()
        results = tester.run_comprehensive_test()
        
        # Save detailed results
        with open("notification_test_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"📄 Detailed results saved to: notification_test_results.json")
        
        # Exit with appropriate code
        if results["failed"] == 0:
            print("🎉 All tests passed! Notification system is ready for production.")
            sys.exit(0)
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"💥 Critical error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()