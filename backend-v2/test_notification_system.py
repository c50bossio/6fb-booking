#!/usr/bin/env python3
"""
Test script for the notification system
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime, timedelta
from database import SessionLocal
from services.notification_service import notification_service
from models import User, NotificationTemplate, NotificationQueue, NotificationStatus
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_notification_service():
    """Test the notification service functionality"""
    db = SessionLocal()
    
    try:
        print("🚀 Testing Notification System...")
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
            
        # 2. Check if we have at least one user
        print("\n2. Checking for test user...")
        test_user = db.query(User).filter(User.email.like('%test%')).first()
        if not test_user:
            test_user = db.query(User).first()
        
        if not test_user:
            print("   ❌ No users found! Create a test user first")
            return False
            
        print(f"   Using test user: {test_user.name} ({test_user.email})")
        
        # 3. Test queuing a notification
        print("\n3. Testing notification queuing...")
        context = {
            "client_name": test_user.name,
            "service_name": "Test Service",
            "appointment_date": datetime.now().strftime("%B %d, %Y"),
            "appointment_time": datetime.now().strftime("%I:%M %p"),
            "duration": 30,
            "price": 50.00,
            "barber_name": "Test Barber",
            "business_name": "BookedBarber Test",
            "business_address": "123 Test St, Test City",
            "business_phone": "(555) 123-4567",
            "current_year": datetime.now().year,
            "appointment_id": 999
        }
        
        # Queue a test notification
        notifications = notification_service.queue_notification(
            db=db,
            user=test_user,
            template_name="appointment_confirmation",
            context=context
        )
        
        print(f"   Queued {len(notifications)} notifications")
        for notification in notifications:
            print(f"   - {notification.notification_type}: {notification.template_name}")
        
        # 4. Check queued notifications
        print("\n4. Checking notification queue...")
        pending_notifications = db.query(NotificationQueue).filter(
            NotificationQueue.status == NotificationStatus.PENDING
        ).all()
        
        print(f"   Found {len(pending_notifications)} pending notifications")
        
        # 5. Test notification processing
        print("\n5. Testing notification processing...")
        
        # Check credentials first
        print("   Checking credentials...")
        sendgrid_configured = bool(notification_service.sendgrid_client)
        twilio_configured = bool(notification_service.twilio_client)
        
        print(f"   SendGrid: {'✅ Configured' if sendgrid_configured else '❌ Not configured'}")
        print(f"   Twilio: {'✅ Configured' if twilio_configured else '❌ Not configured'}")
        
        if not sendgrid_configured and not twilio_configured:
            print("   ⚠️  No notification services configured. Notifications will fail but queue properly.")
        
        # Process notifications
        result = notification_service.process_notification_queue(db=db, batch_size=10)
        print(f"   Processing result: {result}")
        
        # 6. Check notification statistics
        print("\n6. Getting notification statistics...")
        stats = notification_service.get_notification_stats(db=db, days=1)
        print(f"   Stats: {stats}")
        
        # 7. Test template rendering
        print("\n7. Testing template rendering...")
        email_template = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == "appointment_confirmation",
            NotificationTemplate.template_type == "email"
        ).first()
        
        if email_template:
            rendered = notification_service.render_template(email_template, context, db)
            print(f"   Email template rendered successfully (subject: {rendered.get('subject', 'No subject')})")
            print(f"   Body length: {len(rendered.get('body', ''))} characters")
        
        sms_template = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == "appointment_confirmation",
            NotificationTemplate.template_type == "sms"
        ).first()
        
        if sms_template:
            rendered = notification_service.render_template(sms_template, context, db)
            print(f"   SMS template rendered successfully")
            print(f"   Body length: {len(rendered.get('body', ''))} characters")
            print(f"   SMS preview: {rendered.get('body', '')[:100]}...")
        
        print("\n✅ Notification system test completed successfully!")
        print("="*50)
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.close()

def test_appointment_reminders():
    """Test appointment reminder functionality"""
    db = SessionLocal()
    
    try:
        print("\n📅 Testing Appointment Reminder System...")
        print("="*50)
        
        # Create a test appointment for tomorrow
        from models import Appointment, Client
        from services.booking_service import get_booking_settings
        
        # Get a test user
        test_user = db.query(User).first()
        if not test_user:
            print("❌ No users found for reminder test")
            return False
        
        # Create a test appointment 23 hours from now (should trigger 24h reminder)
        future_time = datetime.utcnow() + timedelta(hours=23)
        
        test_appointment = Appointment(
            user_id=test_user.id,
            barber_id=test_user.id,  # Use same user as barber for test
            service_name="Test Reminder Service",
            start_time=future_time,
            duration_minutes=30,
            price=50.00,
            status="scheduled"
        )
        
        db.add(test_appointment)
        db.commit()
        db.refresh(test_appointment)
        
        print(f"   Created test appointment {test_appointment.id} for {future_time}")
        
        # Test reminder scheduling
        print("   Testing reminder scheduling...")
        notification_service.schedule_appointment_reminders(db, test_appointment)
        
        # Check if reminders were queued
        reminder_notifications = db.query(NotificationQueue).filter(
            NotificationQueue.appointment_id == test_appointment.id,
            NotificationQueue.template_name == "appointment_reminder"
        ).all()
        
        print(f"   Queued {len(reminder_notifications)} reminder notifications")
        for reminder in reminder_notifications:
            print(f"   - {reminder.notification_type} scheduled for {reminder.scheduled_for}")
        
        # Clean up test appointment
        db.delete(test_appointment)
        db.commit()
        
        print("✅ Appointment reminder test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Reminder test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.close()

def main():
    """Main test function"""
    print("🧪 BookedBarber Notification System Test Suite")
    print("=" * 60)
    
    # Test basic notification functionality
    basic_test_passed = test_notification_service()
    
    # Test appointment reminders
    reminder_test_passed = test_appointment_reminders()
    
    print("\n📊 Test Results Summary:")
    print("=" * 30)
    print(f"Basic Notification System: {'✅ PASSED' if basic_test_passed else '❌ FAILED'}")
    print(f"Appointment Reminders: {'✅ PASSED' if reminder_test_passed else '❌ FAILED'}")
    
    if basic_test_passed and reminder_test_passed:
        print("\n🎉 All tests passed! Notification system is ready to use.")
        print("\nNext steps:")
        print("1. Start the notification processor: python workers/simple_notification_processor.py")
        print("2. Create a booking to test real notifications")
        print("3. Monitor notification_processor.log for processing activity")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues before using the notification system.")
    
    return basic_test_passed and reminder_test_passed

if __name__ == "__main__":
    main()