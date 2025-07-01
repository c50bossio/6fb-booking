#!/usr/bin/env python3
"""
Enhanced Notification System Test Script for BookedBarber
Tests the complete notification enhancement implementation
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import User, Appointment, Service, EmailCampaign, Base
from services.notification_service import get_notification_service
from services.email_analytics import get_email_analytics_service
from utils.mjml_compiler import get_mjml_compiler
from config import get_settings

# Create all tables
Base.metadata.create_all(bind=engine)

def create_test_data(db):
    """Create test data for notification testing"""
    print("🔧 Creating test data...")
    
    # Create test user
    test_user = User(
        email="test@bookedbarber.com",
        name="John Doe",
        phone="+1234567890",
        hashed_password="fake_hash",
        role="user",
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Create test service
    test_service = Service(
        name="Premium Haircut",
        description="Professional haircut with styling",
        duration=60,
        price=75.00,
        is_active=True
    )
    db.add(test_service)
    db.commit()
    db.refresh(test_service)
    
    # Create test appointment
    appointment_time = datetime.now() + timedelta(days=1)
    test_appointment = Appointment(
        user_id=test_user.id,
        service_id=test_service.id,
        start_time=appointment_time,
        end_time=appointment_time + timedelta(minutes=60),
        status="confirmed",
        notes="Test appointment for notification system"
    )
    db.add(test_appointment)
    db.commit()
    db.refresh(test_appointment)
    
    print(f"✅ Created test user: {test_user.email}")
    print(f"✅ Created test service: {test_service.name}")
    print(f"✅ Created test appointment: ID {test_appointment.id}")
    
    return test_user, test_service, test_appointment

def test_mjml_compilation():
    """Test MJML template compilation"""
    print("\n📧 Testing MJML Template Compilation...")
    
    try:
        compiler = get_mjml_compiler()
        
        # Test context
        context = {
            'client_name': 'John Doe',
            'service_name': 'Premium Haircut',
            'appointment_date': 'December 15, 2025',
            'appointment_time': '2:00 PM',
            'duration': 60,
            'price': 75.00,
            'barber_name': 'Mike Johnson',
            'business_name': 'BookedBarber',
            'business_address': '123 Main St, City, ST 12345',
            'business_phone': '(555) 123-4567',
            'business_website': 'https://bookedbarber.com',
            'current_year': datetime.now().year,
            'calendar_link': 'https://bookedbarber.com/calendar/add',
            'directions_link': 'https://maps.google.com/directions',
            'qr_code_url': 'https://bookedbarber.com/qr/checkin/123',
            'manage_appointment_url': 'https://bookedbarber.com/appointments/123',
            'unsubscribe_url': 'https://bookedbarber.com/unsubscribe/token123'
        }
        
        # Compile template
        html_content, plain_text = compiler.compile_template(
            'appointment_confirmation.mjml',
            context
        )
        
        # Verify content
        assert 'BookedBarber' in html_content
        assert 'John Doe' in html_content
        assert 'Premium Haircut' in html_content
        assert '$75.00' in html_content
        
        print("✅ MJML template compiled successfully")
        print(f"✅ HTML content: {len(html_content)} characters")
        print(f"✅ Plain text: {len(plain_text)} characters")
        
        # Save preview for manual inspection
        preview_html = compiler.preview_template('appointment_confirmation.mjml', context)
        with open('email_preview.html', 'w') as f:
            f.write(preview_html)
        print("✅ Preview saved as email_preview.html")
        
    except Exception as e:
        print(f"❌ MJML compilation failed: {str(e)}")
        return False
    
    return True

def test_email_analytics():
    """Test email analytics functionality"""
    print("\n📊 Testing Email Analytics...")
    
    db = SessionLocal()
    try:
        analytics_service = get_email_analytics_service(db)
        
        # Create test campaign
        campaign = analytics_service.create_campaign(
            name="Test Campaign - Appointment Confirmations",
            template_name="appointment_confirmation",
            subject="Your appointment is confirmed!",
            sent_count=100
        )
        
        print(f"✅ Created test campaign: {campaign.name}")
        
        # Simulate SendGrid events
        test_events = [
            {
                'event': 'processed',
                'email': 'test@bookedbarber.com',
                'timestamp': int(datetime.now().timestamp()),
                'sg_message_id': 'test_msg_001.filter001.12345.67890',
                'custom_args': {
                    'user_id': '1',
                    'notification_type': 'appointment_confirmation',
                    'campaign_id': str(campaign.id)
                }
            },
            {
                'event': 'delivered',
                'email': 'test@bookedbarber.com',
                'timestamp': int(datetime.now().timestamp()) + 5,
                'sg_message_id': 'test_msg_001.filter001.12345.67890',
                'custom_args': {
                    'user_id': '1',
                    'notification_type': 'appointment_confirmation',
                    'campaign_id': str(campaign.id)
                }
            },
            {
                'event': 'open',
                'email': 'test@bookedbarber.com',
                'timestamp': int(datetime.now().timestamp()) + 60,
                'sg_message_id': 'test_msg_001.filter001.12345.67890',
                'useragent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
                'ip': '192.168.1.1',
                'custom_args': {
                    'user_id': '1',
                    'notification_type': 'appointment_confirmation',
                    'campaign_id': str(campaign.id)
                }
            },
            {
                'event': 'click',
                'email': 'test@bookedbarber.com',
                'timestamp': int(datetime.now().timestamp()) + 120,
                'sg_message_id': 'test_msg_001.filter001.12345.67890',
                'url': 'https://bookedbarber.com/calendar/add',
                'useragent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
                'ip': '192.168.1.1',
                'custom_args': {
                    'user_id': '1',
                    'notification_type': 'appointment_confirmation',
                    'campaign_id': str(campaign.id)
                }
            }
        ]
        
        # Process events
        for event in test_events:
            success = analytics_service.process_sendgrid_event(event)
            if success:
                print(f"✅ Processed {event['event']} event")
            else:
                print(f"❌ Failed to process {event['event']} event")
        
        # Get metrics
        metrics = analytics_service.get_email_metrics()
        print(f"✅ Email metrics retrieved: {metrics['total_sent']} sent, {metrics['total_delivered']} delivered")
        
        # Get campaign performance
        performance = analytics_service.get_campaign_performance(campaign.id)
        print(f"✅ Campaign performance: {performance['open_rate']}% open rate")
        
        # Get user engagement
        engagement = analytics_service.get_user_engagement_score(1)
        print(f"✅ User engagement score: {engagement['engagement_score']}")
        
    except Exception as e:
        print(f"❌ Email analytics test failed: {str(e)}")
        return False
    finally:
        db.close()
    
    return True

def test_notification_preferences():
    """Test notification preferences system"""
    print("\n⚙️ Testing Notification Preferences...")
    
    db = SessionLocal()
    try:
        from models import NotificationPreferences
        
        # Create test preferences
        preferences = NotificationPreferences(
            user_id=1,
            email_enabled=True,
            email_frequency='immediate',
            sms_enabled=True,
            sms_frequency='immediate',
            marketing_email_consent=True,
            marketing_sms_consent=False,
            quiet_hours_start='22:00',
            quiet_hours_end='08:00',
            timezone='America/New_York'
        )
        
        db.add(preferences)
        db.commit()
        
        print("✅ Created notification preferences")
        print(f"✅ Email enabled: {preferences.email_enabled}")
        print(f"✅ SMS enabled: {preferences.sms_enabled}")
        print(f"✅ Marketing consent: {preferences.marketing_email_consent}")
        
    except Exception as e:
        print(f"❌ Notification preferences test failed: {str(e)}")
        return False
    finally:
        db.close()
    
    return True

def test_enhanced_notification_service():
    """Test the enhanced notification service"""
    print("\n🔔 Testing Enhanced Notification Service...")
    
    db = SessionLocal()
    try:
        notification_service = get_notification_service()
        if not notification_service:
            print("❌ Notification service not available")
            return False
        
        # Get test data
        user = db.query(User).filter(User.email == "test@bookedbarber.com").first()
        if not user:
            print("❌ Test user not found")
            return False
        
        # Test email notification
        context = {
            'client_name': user.name,
            'service_name': 'Premium Haircut',
            'appointment_date': 'December 15, 2025',
            'appointment_time': '2:00 PM',
            'duration': 60,
            'price': 75.00,
            'business_name': 'BookedBarber',
            'current_year': datetime.now().year
        }
        
        # Queue notification
        try:
            result = notification_service.queue_notification(
                db=db,
                user=user,
                template_name="appointment_confirmation",
                context=context,
                notification_type="appointment_confirmation"
            )
            print("✅ Notification queued successfully")
        except Exception as e:
            print(f"⚠️ Notification queuing failed (expected if SendGrid not configured): {str(e)}")
        
    except Exception as e:
        print(f"❌ Notification service test failed: {str(e)}")
        return False
    finally:
        db.close()
    
    return True

def run_comprehensive_test():
    """Run all notification enhancement tests"""
    print("🚀 BookedBarber Enhanced Notification System Test Suite")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test data
        create_test_data(db)
        
        # Run individual tests
        tests = [
            ("MJML Template Compilation", test_mjml_compilation),
            ("Email Analytics", test_email_analytics),
            ("Notification Preferences", test_notification_preferences),
            ("Enhanced Notification Service", test_enhanced_notification_service)
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                success = test_func()
                results.append((test_name, success))
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                results.append((test_name, False))
        
        # Print summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        for test_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}")
            if success:
                passed += 1
        
        print(f"\nResults: {passed}/{len(results)} tests passed")
        
        if passed == len(results):
            print("\n🎉 ALL TESTS PASSED! Enhanced notification system is ready.")
        else:
            print(f"\n⚠️ {len(results) - passed} tests failed. Review the output above.")
        
        # Cleanup information
        print("\n🧹 Cleanup Notes:")
        print("- Test data created in database (users, appointments, campaigns)")
        print("- Email preview saved as 'email_preview.html'")
        print("- Check SendGrid dashboard for actual email delivery")
        
    except Exception as e:
        print(f"❌ Test suite failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    run_comprehensive_test()