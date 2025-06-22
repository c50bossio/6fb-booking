#!/usr/bin/env python3
"""
Seed script to create sample notifications for testing
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models.notification import Notification, NotificationType, NotificationPriority
from models.user import User
import json

def create_sample_notifications():
    """Create sample notifications for testing"""
    db = SessionLocal()
    
    try:
        # Get the first user (demo user should exist)
        user = db.query(User).first()
        if not user:
            print("No users found. Please create a user first.")
            return
        
        print(f"Creating sample notifications for user: {user.email}")
        
        # Clear existing notifications
        db.query(Notification).filter(Notification.user_id == user.id).delete()
        
        # Sample notifications
        notifications = [
            {
                "type": NotificationType.APPOINTMENT,
                "priority": NotificationPriority.HIGH,
                "title": "Upcoming Appointment",
                "message": "You have an appointment with John Smith in 30 minutes",
                "data": {
                    "appointment_id": 1,
                    "client_name": "John Smith",
                    "service": "Haircut & Beard Trim",
                    "time": "10:00 AM"
                },
                "action_url": "/dashboard/appointments/1"
            },
            {
                "type": NotificationType.PERFORMANCE_ALERT,
                "priority": NotificationPriority.MEDIUM,
                "title": "6FB Score Alert",
                "message": "Your 6FB score has increased by 15 points this week!",
                "data": {
                    "metric_type": "6fb_score",
                    "current_value": 85,
                    "previous_value": 70,
                    "trend": "increasing"
                },
                "action_url": "/analytics"
            },
            {
                "type": NotificationType.ACHIEVEMENT,
                "priority": NotificationPriority.HIGH,
                "title": "Revenue Milestone Achieved! 🎉",
                "message": "Congratulations! You've reached $3,000 in monthly revenue!",
                "data": {
                    "milestone_type": "monthly_revenue",
                    "amount": 3000,
                    "period": "this month"
                },
                "action_url": "/analytics"
            },
            {
                "type": NotificationType.TEAM_UPDATE,
                "priority": NotificationPriority.MEDIUM,
                "title": "Team Update: New Barber",
                "message": "Welcome Sarah Mitchell to the team! She starts Monday.",
                "data": {
                    "barber_name": "Sarah Mitchell",
                    "start_date": "2024-06-24",
                    "specialty": "Modern cuts and styling"
                },
                "action_url": "/barbers"
            },
            {
                "type": NotificationType.REVENUE,
                "priority": NotificationPriority.MEDIUM,
                "title": "Weekly Payout Ready",
                "message": "Your weekly payout of $1,200 has been processed",
                "data": {
                    "amount": 1200,
                    "payout_date": "2024-06-21",
                    "method": "Stripe"
                },
                "action_url": "/barber-payments"
            },
            {
                "type": NotificationType.TRAINING,
                "priority": NotificationPriority.LOW,
                "title": "New Training Module Available",
                "message": "Complete the 'Advanced Fading Techniques' module to earn 10 points",
                "data": {
                    "module_name": "Advanced Fading Techniques",
                    "points": 10,
                    "duration": "45 minutes"
                },
                "action_url": "/training"
            },
            {
                "type": NotificationType.CLIENT,
                "priority": NotificationPriority.MEDIUM,
                "title": "Client Feedback",
                "message": "Marcus left a 5-star review for your service!",
                "data": {
                    "client_name": "Marcus Thompson",
                    "rating": 5,
                    "review": "Excellent haircut as always!"
                },
                "action_url": "/clients"
            },
            {
                "type": NotificationType.SYSTEM,
                "priority": NotificationPriority.LOW,
                "title": "System Maintenance",
                "message": "Scheduled maintenance will occur tonight from 2-4 AM EST",
                "data": {
                    "maintenance_type": "routine",
                    "start_time": "2024-06-23T02:00:00Z",
                    "end_time": "2024-06-23T04:00:00Z"
                }
            }
        ]
        
        # Create notifications with varying timestamps
        for i, notif_data in enumerate(notifications):
            # Spread notifications over the last few days
            created_time = datetime.utcnow() - timedelta(hours=i * 3)
            
            notification = Notification(
                user_id=user.id,
                type=notif_data["type"],
                priority=notif_data["priority"],
                title=notif_data["title"],
                message=notif_data["message"],
                data=notif_data["data"],
                action_url=notif_data.get("action_url"),
                is_read=i > 3,  # Mark first few as unread
                read_at=created_time + timedelta(hours=1) if i > 3 else None,
                created_at=created_time
            )
            
            db.add(notification)
        
        db.commit()
        print(f"Created {len(notifications)} sample notifications")
        
        # Show unread count
        unread_count = db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.is_read == False
        ).count()
        print(f"Unread notifications: {unread_count}")
        
    except Exception as e:
        print(f"Error creating notifications: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding sample notifications...")
    create_sample_notifications()
    print("Done!")