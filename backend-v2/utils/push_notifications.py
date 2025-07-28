"""
Push Notifications Utility
VAPID-based push notification system for BookedBarber PWA
"""

import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import os

# Third-party imports
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    print("Warning: pywebpush not installed. Push notifications will be disabled.")

from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Internal imports
from models import User

Base = declarative_base()

@dataclass
class NotificationData:
    """Data structure for push notifications"""
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    tag: Optional[str] = None
    url: Optional[str] = None
    requireInteraction: Optional[bool] = False
    actions: Optional[List[Dict[str, str]]] = None
    data: Optional[Dict[str, Any]] = None

class PushSubscription(Base):
    """Database model for push subscriptions"""
    __tablename__ = "push_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    endpoint = Column(Text, nullable=False)
    p256dh_key = Column(Text, nullable=False)
    auth_key = Column(Text, nullable=False)
    expiration_time = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    device_info = Column(Text, nullable=True)  # JSON string with device details

class NotificationLog(Base):
    """Database model for notification delivery tracking"""
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    subscription_id = Column(Integer, nullable=False)
    notification_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    tag = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, sent, failed, expired
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PushNotificationManager:
    """Manager class for push notifications"""
    
    def __init__(self, db: Session = None):
        self.db = db
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        self.vapid_email = os.getenv("VAPID_EMAIL", "admin@bookedbarber.com")
        
        if not WEBPUSH_AVAILABLE:
            print("Push notifications disabled: pywebpush not available")
        
        if not self.vapid_private_key or not self.vapid_public_key:
            print("Warning: VAPID keys not configured. Push notifications may not work.")
    
    def get_vapid_public_key(self) -> str:
        """Get the VAPID public key for client subscription"""
        return self.vapid_public_key or self._generate_vapid_keys()
    
    async def store_subscription(
        self, 
        user_id: str, 
        subscription_data: Dict[str, Any]
    ) -> PushSubscription:
        """Store a push subscription in the database"""
        
        # Remove any existing subscriptions for this user and endpoint
        existing = self.db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == subscription_data["endpoint"]
        ).first()
        
        if existing:
            # Update existing subscription
            existing.p256dh_key = subscription_data["keys"]["p256dh"]
            existing.auth_key = subscription_data["keys"]["auth"]
            existing.expiration_time = subscription_data.get("expiration_time")
            existing.updated_at = datetime.utcnow()
            existing.is_active = True
            self.db.commit()
            return existing
        
        # Create new subscription
        subscription = PushSubscription(
            user_id=user_id,
            endpoint=subscription_data["endpoint"],
            p256dh_key=subscription_data["keys"]["p256dh"],
            auth_key=subscription_data["keys"]["auth"],
            expiration_time=subscription_data.get("expiration_time")
        )
        
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription
    
    async def remove_subscription(self, user_id: str) -> int:
        """Remove all push subscriptions for a user"""
        
        count = self.db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id
        ).update({"is_active": False})
        
        self.db.commit()
        return count
    
    async def has_active_subscription(self, user_id: str) -> bool:
        """Check if user has any active push subscriptions"""
        
        subscription = self.db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == True
        ).first()
        
        return subscription is not None
    
    async def get_user_subscriptions(self, user_id: str) -> List[PushSubscription]:
        """Get all active subscriptions for a user"""
        
        return self.db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == True
        ).all()
    
    async def send_notification(
        self, 
        user_id: str, 
        notification_data: NotificationData
    ) -> Dict[str, Any]:
        """Send push notification to all user's devices"""
        
        if not WEBPUSH_AVAILABLE:
            return {"success": False, "error": "Push notifications not available"}
        
        subscriptions = await self.get_user_subscriptions(user_id)
        
        if not subscriptions:
            return {"success": False, "error": "No active subscriptions found"}
        
        results = []
        
        for subscription in subscriptions:
            try:
                result = await self._send_to_subscription(subscription, notification_data)
                results.append(result)
                
                # Log notification attempt
                await self._log_notification(
                    user_id=user_id,
                    subscription_id=subscription.id,
                    notification_data=notification_data,
                    status="sent" if result["success"] else "failed",
                    error_message=result.get("error")
                )
                
            except Exception as e:
                error_result = {"success": False, "error": str(e)}
                results.append(error_result)
                
                await self._log_notification(
                    user_id=user_id,
                    subscription_id=subscription.id,
                    notification_data=notification_data,
                    status="failed",
                    error_message=str(e)
                )
        
        successful_sends = sum(1 for r in results if r["success"])
        
        return {
            "success": successful_sends > 0,
            "total_subscriptions": len(subscriptions),
            "successful_sends": successful_sends,
            "results": results
        }
    
    async def _send_to_subscription(
        self, 
        subscription: PushSubscription, 
        notification_data: NotificationData
    ) -> Dict[str, Any]:
        """Send notification to a specific subscription"""
        
        try:
            # Prepare subscription info for webpush
            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh_key,
                    "auth": subscription.auth_key
                }
            }
            
            # Prepare notification payload
            payload = {
                "title": notification_data.title,
                "body": notification_data.body,
                "icon": notification_data.icon or "/icon?size=192",
                "badge": notification_data.badge or "/icon?size=96",
                "tag": notification_data.tag or "general",
                "requireInteraction": notification_data.requireInteraction or False,
                "data": {
                    **(notification_data.data or {}),
                    "url": notification_data.url,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            if notification_data.actions:
                payload["actions"] = notification_data.actions
            
            # Send the notification
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    "sub": f"mailto:{self.vapid_email}",
                    "exp": int((datetime.utcnow() + timedelta(hours=12)).timestamp())
                }
            )
            
            return {"success": True}
            
        except WebPushException as e:
            error_msg = f"WebPush error: {e}"
            
            # Handle specific error cases
            if e.response and e.response.status_code == 410:
                # Subscription is no longer valid, deactivate it
                subscription.is_active = False
                self.db.commit()
                error_msg = "Subscription expired and deactivated"
            
            return {"success": False, "error": error_msg}
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _log_notification(
        self,
        user_id: str,
        subscription_id: int,
        notification_data: NotificationData,
        status: str,
        error_message: Optional[str] = None
    ):
        """Log notification delivery attempt"""
        
        log_entry = NotificationLog(
            user_id=user_id,
            subscription_id=subscription_id,
            notification_id=notification_data.tag or f"notif_{datetime.utcnow().timestamp()}",
            title=notification_data.title,
            body=notification_data.body,
            tag=notification_data.tag,
            status=status,
            error_message=error_message,
            sent_at=datetime.utcnow() if status == "sent" else None
        )
        
        self.db.add(log_entry)
        self.db.commit()
    
    def _generate_vapid_keys(self) -> str:
        """Generate VAPID keys if not configured (development only)"""
        try:
            from py_vapid import Vapid
            vapid = Vapid()
            vapid.generate_keys()
            
            print("Generated VAPID keys for development:")
            print(f"Private Key: {vapid.private_key.save_key()}")
            print(f"Public Key: {vapid.public_key.save_key()}")
            
            return vapid.public_key.save_key()
        except ImportError:
            print("py_vapid not available for key generation")
            return "BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8rxr6CrTjWXbTI5cU0J7DVtBWNhA5IkBxEuKkr4nJfpQRn5E8Q"

# Notification templates for common barber scenarios

class BarberNotificationTemplates:
    """Pre-defined notification templates for barber workflow"""
    
    @staticmethod
    def appointment_reminder(client_name: str, service: str, time: str, appointment_id: str) -> NotificationData:
        return NotificationData(
            title="⏰ Appointment Reminder",
            body=f"{client_name} - {service} at {time}",
            tag="appointment_reminder",
            requireInteraction=True,
            url=f"/calendar?appointment={appointment_id}",
            actions=[
                {"action": "view_details", "title": "View Details"},
                {"action": "mark_arrived", "title": "Client Arrived"}
            ],
            data={"appointment_id": appointment_id, "client_name": client_name}
        )
    
    @staticmethod
    def client_arrived(client_name: str, appointment_id: str) -> NotificationData:
        return NotificationData(
            title="👋 Client Arrived",
            body=f"{client_name} has checked in and is ready",
            tag="client_arrived",
            url=f"/calendar?appointment={appointment_id}",
            actions=[
                {"action": "start_service", "title": "Start Service"},
                {"action": "view_notes", "title": "View Notes"}
            ],
            data={"appointment_id": appointment_id, "client_name": client_name}
        )
    
    @staticmethod
    def payment_received(client_name: str, amount: float, method: str) -> NotificationData:
        return NotificationData(
            title="💰 Payment Received",
            body=f"${amount:.2f} from {client_name} via {method}",
            tag="payment_received",
            url="/payments",
            data={"amount": amount, "client_name": client_name, "method": method}
        )
    
    @staticmethod
    def daily_goal_achieved(amount: float, goal: float) -> NotificationData:
        return NotificationData(
            title="🎯 Daily Goal Achieved!",
            body=f"Congratulations! You've reached your daily goal of ${goal:,.2f}",
            tag="daily_goal",
            requireInteraction=True,
            url="/analytics?celebration=daily",
            actions=[
                {"action": "view_progress", "title": "View Progress"},
                {"action": "set_stretch_goal", "title": "Set Stretch Goal"}
            ],
            data={"amount": amount, "goal": goal, "period": "daily"}
        )
    
    @staticmethod
    def schedule_conflict(conflict_time: str, clients: List[str]) -> NotificationData:
        return NotificationData(
            title="⚠️ Schedule Conflict",
            body=f"Double booking at {conflict_time}. Immediate action required.",
            tag="schedule_conflict",
            requireInteraction=True,
            url="/calendar?view=conflicts",
            actions=[
                {"action": "resolve_conflict", "title": "Resolve Now"},
                {"action": "contact_clients", "title": "Contact Clients"}
            ],
            data={"conflict_time": conflict_time, "clients": clients}
        )
    
    @staticmethod
    def break_reminder(next_client: str, minutes: int) -> NotificationData:
        return NotificationData(
            title="☕ Break Time",
            body=f"Take a {minutes}-minute break before {next_client}",
            tag="break_reminder",
            url="/my-schedule",
            actions=[
                {"action": "extend_break", "title": "Extend Break"},
                {"action": "prep_station", "title": "Prep Station"}
            ],
            data={"next_client": next_client, "break_minutes": minutes}
        )
    
    @staticmethod
    def inventory_low(product: str, remaining: int, threshold: int) -> NotificationData:
        return NotificationData(
            title="📦 Low Inventory Alert",
            body=f"{product} is running low ({remaining} remaining)",
            tag="inventory_alert",
            url="/inventory?filter=low-stock",
            actions=[
                {"action": "reorder_now", "title": "Reorder Now"},
                {"action": "find_alternative", "title": "Find Alternative"}
            ],
            data={"product": product, "remaining": remaining, "threshold": threshold}
        )
    
    @staticmethod
    def client_birthday(client_name: str, client_id: str) -> NotificationData:
        return NotificationData(
            title="🎂 Client Birthday",
            body=f"It's {client_name}'s birthday today!",
            tag="client_birthday",
            url=f"/clients/{client_id}",
            actions=[
                {"action": "send_wishes", "title": "Send Birthday Wishes"},
                {"action": "offer_special", "title": "Offer Birthday Special"}
            ],
            data={"client_name": client_name, "client_id": client_id}
        )

# Convenience function for sending notifications
async def send_push_notification(
    user_id: str, 
    notification_data: NotificationData,
    db: Session = None
) -> Dict[str, Any]:
    """
    Convenience function to send a push notification
    """
    if not db:
        # You would typically get this from your app's dependency injection
        raise ValueError("Database session required")
    
    manager = PushNotificationManager(db)
    return await manager.send_notification(user_id, notification_data)

# Scheduled notification tasks
class NotificationScheduler:
    """Handles scheduled and recurring notifications"""
    
    def __init__(self, db: Session):
        self.db = db
        self.manager = PushNotificationManager(db)
    
    async def schedule_appointment_reminders(self):
        """Schedule reminders for upcoming appointments"""
        # This would query your appointments table for upcoming appointments
        # and schedule notifications accordingly
        pass
    
    async def send_daily_summaries(self):
        """Send end-of-day performance summaries"""
        # Query analytics data and send daily summary notifications
        pass
    
    async def check_revenue_milestones(self):
        """Check and notify about revenue milestones"""
        # Calculate daily/weekly/monthly revenue and send milestone notifications
        pass