#!/usr/bin/env python3
"""
BookedBarber V2 - Background Jobs Demo
Demonstrates how to queue and process background tasks
"""

import sys
import time
from datetime import datetime

# Add current directory to path
sys.path.append('.')

try:
    from services.background_tasks.notification_tasks import (
        send_email_notification,
        send_sms_notification,
        send_appointment_reminder,
        send_bulk_notifications,
        send_welcome_email
    )
    from services.celery_app import celery_app
    from db import SessionLocal
    from models import User
    from config import settings
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend-v2 directory")
    sys.exit(1)

def demo_basic_notifications():
    """Demo basic email and SMS notifications"""
    print("📧 Demo: Basic Notifications")
    print("-" * 40)
    
    # Demo email notification
    print("1. Queuing email notification...")
    email_task = send_email_notification.delay(
        recipient_email="demo@bookedbarber.com",
        subject="Test Email from BookedBarber",
        content="This is a test email sent via Celery background task!",
        template_name="test_email",
        template_data={
            "user_name": "Demo User",
            "business_name": settings.app_name,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    print(f"   ✅ Email task queued: {email_task.id}")
    
    # Demo SMS notification
    print("2. Queuing SMS notification...")
    sms_task = send_sms_notification.delay(
        phone_number="+1234567890",  # Demo number
        message="Test SMS from BookedBarber V2 background system! 🚀"
    )
    print(f"   ✅ SMS task queued: {sms_task.id}")
    
    return [email_task, sms_task]

def demo_appointment_reminders():
    """Demo appointment reminder system"""
    print("\n⏰ Demo: Appointment Reminders")
    print("-" * 40)
    
    try:
        db = SessionLocal()
        
        # Find a recent appointment for demo
        appointment = db.query(Appointment).order_by(
            Appointment.created_at.desc()
        ).first()
        
        if appointment:
            print(f"1. Found appointment ID {appointment.id} for reminder demo")
            
            # Queue appointment reminder
            reminder_task = send_appointment_reminder.delay(
                appointment_id=appointment.id,
                reminder_type="demo"
            )
            print(f"   ✅ Reminder task queued: {reminder_task.id}")
            
            db.close()
            return [reminder_task]
        else:
            print("   ⚠️  No appointments found for reminder demo")
            db.close()
            return []
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []

def demo_bulk_notifications():
    """Demo bulk notification system"""
    print("\n📢 Demo: Bulk Notifications")
    print("-" * 40)
    
    # Demo bulk notifications
    notification_batch = [
        {
            'type': 'email',
            'recipient': 'user1@demo.com',
            'subject': 'Bulk Email Test 1',
            'content': 'This is bulk email #1',
            'template_name': 'bulk_notification',
            'template_data': {'user_id': 1, 'message': 'Welcome to our service!'}
        },
        {
            'type': 'email', 
            'recipient': 'user2@demo.com',
            'subject': 'Bulk Email Test 2',
            'content': 'This is bulk email #2',
            'template_name': 'bulk_notification',
            'template_data': {'user_id': 2, 'message': 'Thanks for signing up!'}
        },
        {
            'type': 'sms',
            'recipient': '+1234567891',
            'content': 'Bulk SMS test message 📱'
        }
    ]
    
    print(f"1. Queuing {len(notification_batch)} bulk notifications...")
    bulk_task = send_bulk_notifications.delay(notification_batch)
    print(f"   ✅ Bulk task queued: {bulk_task.id}")
    
    return [bulk_task]

def demo_welcome_email():
    """Demo welcome email for new users"""
    print("\n👋 Demo: Welcome Email")
    print("-" * 40)
    
    try:
        db = SessionLocal()
        
        # Find a user for demo
        user = db.query(User).order_by(User.created_at.desc()).first()
        
        if user:
            print(f"1. Found user {user.email} for welcome email demo")
            
            # Queue welcome email
            welcome_task = send_welcome_email.delay(user_id=user.id)
            print(f"   ✅ Welcome email task queued: {welcome_task.id}")
            
            db.close()
            return [welcome_task]
        else:
            print("   ⚠️  No users found for welcome email demo")
            db.close()
            return []
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []

def monitor_task_progress(tasks, timeout=30):
    """Monitor the progress of demo tasks"""
    print(f"\n🔍 Monitoring Task Progress (timeout: {timeout}s)")
    print("-" * 40)
    
    start_time = time.time()
    completed_tasks = []
    
    while tasks and (time.time() - start_time) < timeout:
        for task in tasks[:]:  # Create a copy to iterate over
            try:
                if task.ready():
                    result = task.get(propagate=False)
                    status = "✅ SUCCESS" if task.successful() else "❌ FAILED"
                    print(f"   {status} {task.id[:8]}...")
                    
                    if task.successful():
                        if isinstance(result, dict):
                            if 'status' in result:
                                print(f"      Status: {result['status']}")
                            if 'recipient' in result:
                                print(f"      Recipient: {result['recipient']}")
                    else:
                        print(f"      Error: {result}")
                    
                    completed_tasks.append(task)
                    tasks.remove(task)
                    
            except Exception as e:
                print(f"   ❌ ERROR {task.id[:8]}... - {e}")
                tasks.remove(task)
        
        if tasks:
            time.sleep(1)
    
    # Report on remaining tasks
    if tasks:
        print(f"\n⏳ {len(tasks)} tasks still pending after {timeout}s timeout:")
        for task in tasks:
            print(f"   ⏸️  {task.id[:8]}... - {task.state}")
    
    print(f"\n📊 Summary: {len(completed_tasks)} completed, {len(tasks)} pending")

def check_worker_status():
    """Check if Celery workers are running"""
    print("🔍 Checking Worker Status")
    print("-" * 40)
    
    try:
        # Check worker availability
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        
        if active_workers:
            print(f"✅ Found {len(active_workers)} active workers:")
            for worker_name, tasks in active_workers.items():
                print(f"   - {worker_name}: {len(tasks)} active tasks")
        else:
            print("❌ No active workers found!")
            print("\n💡 To start workers, run:")
            print("   ./start-background-services.sh")
            return False
        
        # Test basic connectivity
        ping_result = inspect.ping()
        if ping_result:
            print("✅ Workers responding to ping")
        else:
            print("❌ Workers not responding to ping")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Error checking worker status: {e}")
        print("\n💡 Make sure Redis and Celery workers are running:")
        print("   ./start-background-services.sh")
        return False

def main():
    print("🚀 BookedBarber V2 - Background Jobs Demo")
    print("=" * 60)
    print(f"📅 Demo Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()
    
    # Check if workers are running
    if not check_worker_status():
        print("\n🛑 Cannot run demo without active workers. Exiting.")
        return
    
    print("\n" + "=" * 60)
    
    # Run demos
    all_tasks = []
    
    # Basic notifications
    tasks = demo_basic_notifications()
    all_tasks.extend(tasks)
    
    # Appointment reminders
    tasks = demo_appointment_reminders()
    all_tasks.extend(tasks)
    
    # Bulk notifications
    tasks = demo_bulk_notifications()
    all_tasks.extend(tasks)
    
    # Welcome email
    tasks = demo_welcome_email()
    all_tasks.extend(tasks)
    
    # Monitor progress
    if all_tasks:
        monitor_task_progress(all_tasks, timeout=45)
    else:
        print("\n⚠️  No tasks were queued")
    
    print("\n" + "=" * 60)
    print("🎉 Demo Complete!")
    print("\n💡 Useful Commands:")
    print("   ./monitor-background-jobs.py          # Check system status")
    print("   ./monitor-background-jobs.py --watch  # Real-time monitoring")
    print("   ./stop-background-services.sh         # Stop all workers")

if __name__ == '__main__':
    main()