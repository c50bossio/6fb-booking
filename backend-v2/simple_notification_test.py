#!/usr/bin/env python3
"""
Simplified notification test that doesn't rely on complex user models
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime, timedelta
from database import SessionLocal
from services.notification_service import notification_service
from models import NotificationTemplate, NotificationQueue, NotificationStatus
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_basic_notification_functionality():
    """Test basic notification functionality without complex models"""
    db = SessionLocal()
    
    try:
        print("🚀 Testing Basic Notification Functionality...")
        print("="*50)
        
        # 1. Check if templates exist
        print("1. Checking notification templates...")
        templates = db.query(NotificationTemplate).all()
        print(f"   Found {len(templates)} templates:")
        for template in templates:
            print(f"   - {template.name} ({template.template_type})")
        
        if not templates:
            print("   ❌ No templates found! Run populate_notification_templates.py first")
            return False
        
        # 2. Test template rendering
        print("\n2. Testing template rendering...")
        email_template = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == "appointment_confirmation",
            NotificationTemplate.template_type == "email"
        ).first()
        
        if email_template:
            # Test context
            context = {
                "client_name": "John Doe",
                "service_name": "Haircut",
                "appointment_date": "January 15, 2025",
                "appointment_time": "2:30 PM",
                "duration": 30,
                "price": 50.00,
                "barber_name": "Mike",
                "business_name": "BookedBarber",
                "business_address": "123 Main St, City",
                "business_phone": "(555) 123-4567",
                "current_year": 2025,
                "appointment_id": 123
            }
            
            try:
                rendered = notification_service.render_template(email_template, context, db)
                print(f"   ✅ Email template rendered successfully")
                print(f"   Subject: {rendered.get('subject', 'No subject')}")
                print(f"   Body length: {len(rendered.get('body', ''))} characters")
                
                # Check for key elements in the rendered template
                body = rendered.get('body', '')
                if "John Doe" in body and "Haircut" in body:
                    print("   ✅ Template variables substituted correctly")
                else:
                    print("   ⚠️ Template variables may not be substituting correctly")
                    
            except Exception as e:
                print(f"   ❌ Template rendering failed: {e}")
                return False
        
        # 3. Test SMS template
        sms_template = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == "appointment_confirmation",
            NotificationTemplate.template_type == "sms"
        ).first()
        
        if sms_template:
            try:
                rendered = notification_service.render_template(sms_template, context, db)
                print(f"   ✅ SMS template rendered successfully")
                print(f"   Body length: {len(rendered.get('body', ''))} characters")
                print(f"   SMS preview: {rendered.get('body', '')[:100]}...")
            except Exception as e:
                print(f"   ❌ SMS template rendering failed: {e}")
                return False
        
        # 4. Test notification service initialization
        print("\n3. Testing notification service configuration...")
        sendgrid_configured = bool(notification_service.sendgrid_client)
        twilio_configured = bool(notification_service.twilio_client)
        
        print(f"   SendGrid: {'✅ Configured' if sendgrid_configured else '❌ Not configured'}")
        print(f"   Twilio: {'✅ Configured' if twilio_configured else '❌ Not configured'}")
        
        if not sendgrid_configured and not twilio_configured:
            print("   ⚠️ Warning: No notification services configured. Notifications will be queued but not sent.")
        
        # 5. Test queue processing (just checking the method exists and runs)
        print("\n4. Testing notification queue processing...")
        try:
            result = notification_service.process_notification_queue(db=db, batch_size=10)
            print(f"   ✅ Queue processing completed: {result}")
        except Exception as e:
            print(f"   ❌ Queue processing failed: {e}")
            return False
        
        # 6. Test statistics
        print("\n5. Testing notification statistics...")
        try:
            stats = notification_service.get_notification_stats(db=db, days=1)
            print(f"   ✅ Statistics retrieved: {stats}")
        except Exception as e:
            print(f"   ❌ Statistics retrieval failed: {e}")
            return False
        
        print("\n✅ Basic notification functionality test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.close()

def test_notification_queue_operations():
    """Test notification queue operations"""
    print("\n📋 Testing Notification Queue Operations...")
    print("="*50)
    
    db = SessionLocal()
    try:
        # Check current queue status
        pending_count = db.query(NotificationQueue).filter(
            NotificationQueue.status == NotificationStatus.PENDING
        ).count()
        
        sent_count = db.query(NotificationQueue).filter(
            NotificationQueue.status == NotificationStatus.SENT
        ).count()
        
        failed_count = db.query(NotificationQueue).filter(
            NotificationQueue.status == NotificationStatus.FAILED
        ).count()
        
        print(f"   Current queue status:")
        print(f"   - Pending: {pending_count}")
        print(f"   - Sent: {sent_count}")
        print(f"   - Failed: {failed_count}")
        print(f"   - Total: {pending_count + sent_count + failed_count}")
        
        # Test queue cleanup
        print("\n   Testing queue cleanup...")
        cleanup_count = notification_service.cleanup_old_notifications if hasattr(notification_service, 'cleanup_old_notifications') else None
        if cleanup_count:
            try:
                # This would normally clean up old records, but we'll just report it exists
                print("   ✅ Queue cleanup method is available")
            except Exception as e:
                print(f"   ⚠️ Queue cleanup failed: {e}")
        else:
            print("   ℹ️ Queue cleanup method not implemented yet")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Queue operations test failed: {e}")
        return False
        
    finally:
        db.close()

def main():
    """Main test function"""
    print("🧪 Simplified Notification System Test")
    print("=" * 50)
    
    # Test basic functionality
    basic_test_passed = test_basic_notification_functionality()
    
    # Test queue operations
    queue_test_passed = test_notification_queue_operations()
    
    print("\n📊 Test Results Summary:")
    print("=" * 30)
    print(f"Basic Functionality: {'✅ PASSED' if basic_test_passed else '❌ FAILED'}")
    print(f"Queue Operations: {'✅ PASSED' if queue_test_passed else '❌ FAILED'}")
    
    if basic_test_passed and queue_test_passed:
        print("\n🎉 Core notification system is functional!")
        print("\nNext steps:")
        print("1. Fix database migrations to enable full user functionality")
        print("2. Start the notification processor: python workers/simple_notification_processor.py")
        print("3. Test with actual bookings once user models are working")
    else:
        print("\n⚠️ Some core functionality is not working correctly.")
    
    return basic_test_passed and queue_test_passed

if __name__ == "__main__":
    main()