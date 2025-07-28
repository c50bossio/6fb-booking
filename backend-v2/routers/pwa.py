"""
PWA (Progressive Web App) Router
Handles push notifications, service worker registration, and offline sync
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import asyncio
from pydantic import BaseModel

from dependencies import get_db, get_current_user
from models import User
from utils.auth import verify_token
from utils.push_notifications import (
    PushNotificationManager,
    NotificationData,
    send_push_notification
)
from utils.offline_sync import OfflineSyncManager
from utils.analytics import track_event

router = APIRouter(prefix="/api/v2/pwa", tags=["PWA"])

# Pydantic models for request/response

class PushSubscriptionData(BaseModel):
    endpoint: str
    keys: Dict[str, str]  # p256dh and auth keys
    expirationTime: Optional[int] = None

class NotificationRequest(BaseModel):
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    tag: Optional[str] = None
    url: Optional[str] = None
    requireInteraction: Optional[bool] = False
    actions: Optional[List[Dict[str, str]]] = None
    data: Optional[Dict[str, Any]] = None

class OfflineActionRequest(BaseModel):
    type: str  # 'create', 'update', 'delete'
    entity_type: str  # 'appointment', 'client', etc.
    entity_id: str
    data: Dict[str, Any]
    timestamp: datetime

class SyncRequest(BaseModel):
    actions: List[OfflineActionRequest]
    device_id: Optional[str] = None
    last_sync: Optional[datetime] = None

# Push notification endpoints

@router.post("/push-subscription")
async def subscribe_to_push(
    subscription: PushSubscriptionData,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Register a push notification subscription for the current user
    """
    try:
        push_manager = PushNotificationManager(db)
        
        # Store subscription in database
        result = await push_manager.store_subscription(
            user_id=user.id,
            subscription_data={
                "endpoint": subscription.endpoint,
                "keys": subscription.keys,
                "expiration_time": subscription.expirationTime
            }
        )
        
        # Track analytics
        track_event(
            event_name="push_subscription_created",
            user_id=user.id,
            properties={
                "subscription_id": result.id,
                "browser": "unknown"  # Could be extracted from User-Agent
            }
        )
        
        return {
            "success": True,
            "subscription_id": result.id,
            "message": "Push notifications enabled successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register push subscription: {str(e)}"
        )

@router.delete("/push-subscription")
async def unsubscribe_from_push(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove push notification subscription for the current user
    """
    try:
        push_manager = PushNotificationManager(db)
        
        # Remove subscription from database
        removed_count = await push_manager.remove_subscription(user_id=user.id)
        
        # Track analytics
        track_event(
            event_name="push_subscription_removed",
            user_id=user.id,
            properties={
                "removed_count": removed_count
            }
        )
        
        return {
            "success": True,
            "message": f"Removed {removed_count} push subscription(s)"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove push subscription: {str(e)}"
        )

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    Get the VAPID public key for push notification subscription
    """
    push_manager = PushNotificationManager()
    return {
        "publicKey": push_manager.get_vapid_public_key()
    }

@router.post("/send-notification")
async def send_notification(
    notification: NotificationRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a push notification to the current user (for testing)
    """
    try:
        push_manager = PushNotificationManager(db)
        
        # Create notification data
        notification_data = NotificationData(
            title=notification.title,
            body=notification.body,
            icon=notification.icon or "/icon?size=192",
            badge=notification.badge or "/icon?size=96",
            tag=notification.tag or "general",
            url=notification.url,
            requireInteraction=notification.requireInteraction,
            actions=notification.actions or [],
            data=notification.data or {}
        )
        
        # Send notification in background
        background_tasks.add_task(
            send_push_notification,
            user_id=user.id,
            notification_data=notification_data
        )
        
        return {
            "success": True,
            "message": "Notification queued for delivery"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send notification: {str(e)}"
        )

# Offline sync endpoints

@router.post("/sync")
async def sync_offline_data(
    sync_request: SyncRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync offline data from PWA to server
    """
    try:
        sync_manager = OfflineSyncManager(db)
        
        results = {
            "synced": [],
            "failed": [],
            "conflicts": []
        }
        
        for action in sync_request.actions:
            try:
                result = await sync_manager.process_offline_action(
                    user_id=user.id,
                    action_type=action.type,
                    entity_type=action.entity_type,
                    entity_id=action.entity_id,
                    data=action.data,
                    timestamp=action.timestamp
                )
                
                if result.success:
                    results["synced"].append({
                        "action_id": f"{action.entity_type}_{action.entity_id}",
                        "server_id": result.server_id
                    })
                elif result.conflict:
                    results["conflicts"].append({
                        "action_id": f"{action.entity_type}_{action.entity_id}",
                        "conflict_reason": result.conflict_reason,
                        "server_data": result.server_data
                    })
                else:
                    results["failed"].append({
                        "action_id": f"{action.entity_type}_{action.entity_id}",
                        "error": result.error_message
                    })
                    
            except Exception as e:
                results["failed"].append({
                    "action_id": f"{action.entity_type}_{action.entity_id}",
                    "error": str(e)
                })
        
        # Track sync analytics
        track_event(
            event_name="offline_sync_completed",
            user_id=user.id,
            properties={
                "total_actions": len(sync_request.actions),
                "synced_count": len(results["synced"]),
                "failed_count": len(results["failed"]),
                "conflicts_count": len(results["conflicts"]),
                "device_id": sync_request.device_id
            }
        )
        
        return {
            "success": True,
            "results": results,
            "sync_timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync offline data: {str(e)}"
        )

@router.get("/sync-status")
async def get_sync_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get sync status and any pending server-side changes
    """
    try:
        sync_manager = OfflineSyncManager(db)
        
        # Get latest data for user
        sync_status = await sync_manager.get_sync_status(user_id=user.id)
        
        return {
            "last_sync": sync_status.last_sync.isoformat() if sync_status.last_sync else None,
            "pending_changes": sync_status.pending_changes,
            "has_conflicts": sync_status.has_conflicts,
            "server_timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get sync status: {str(e)}"
        )

# PWA management endpoints

@router.get("/health")
async def get_pwa_health(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get PWA health status and metrics
    """
    try:
        push_manager = PushNotificationManager(db)
        sync_manager = OfflineSyncManager(db)
        
        # Check push notification status
        has_push_subscription = await push_manager.has_active_subscription(user.id)
        
        # Check sync status
        sync_status = await sync_manager.get_sync_status(user.id)
        
        # Get analytics data
        analytics_data = await get_pwa_analytics(user.id, db)
        
        return {
            "push_notifications": {
                "enabled": has_push_subscription,
                "last_notification": None  # Could track this
            },
            "offline_sync": {
                "last_sync": sync_status.last_sync.isoformat() if sync_status.last_sync else None,
                "pending_actions": sync_status.pending_changes,
                "has_conflicts": sync_status.has_conflicts
            },
            "analytics": analytics_data,
            "service_worker": {
                "version": "6.0.0",
                "cache_version": "bb-v6.0.0"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get PWA health: {str(e)}"
        )

@router.post("/analytics/track")
async def track_pwa_analytics(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track PWA usage analytics
    """
    try:
        data = await request.json()
        
        # Track the event
        track_event(
            event_name=data.get("event_name", "pwa_interaction"),
            user_id=user.id,
            properties={
                **data.get("properties", {}),
                "user_agent": request.headers.get("user-agent"),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        return {"success": True}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to track analytics: {str(e)}"
        )

# Notification templates for common barber scenarios

@router.post("/notifications/appointment-reminder")
async def send_appointment_reminder(
    appointment_id: str,
    background_tasks: BackgroundTasks,
    minutes_before: int = 15,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Schedule an appointment reminder notification
    """
    try:
        # Get appointment details
        # This would typically query your appointments table
        # appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        
        notification_data = NotificationData(
            title="⏰ Appointment Reminder",
            body=f"You have an appointment in {minutes_before} minutes",
            tag="appointment_reminder",
            requireInteraction=True,
            url=f"/calendar?appointment={appointment_id}",
            actions=[
                {"action": "view_appointment", "title": "View Details"},
                {"action": "mark_arrived", "title": "Client Arrived"}
            ],
            data={"appointment_id": appointment_id}
        )
        
        # Schedule notification
        background_tasks.add_task(
            send_push_notification,
            user_id=user.id,
            notification_data=notification_data
        )
        
        return {
            "success": True,
            "message": f"Reminder scheduled for {minutes_before} minutes before appointment"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to schedule reminder: {str(e)}"
        )

@router.post("/notifications/revenue-milestone")
async def send_revenue_milestone(
    amount: float,
    period: str,  # 'daily', 'weekly', 'monthly'
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send Six Figure Barber revenue milestone notification
    """
    try:
        milestone_messages = {
            "daily": "🎯 Daily revenue goal achieved!",
            "weekly": "🚀 Weekly revenue milestone reached!",
            "monthly": "💰 Monthly revenue target hit!",
            "yearly": "🏆 Six Figure Barber goal achieved!"
        }
        
        notification_data = NotificationData(
            title=milestone_messages.get(period, "💰 Revenue Milestone"),
            body=f"Congratulations! You've earned ${amount:,.2f} {period}",
            tag="revenue_milestone",
            requireInteraction=True,
            url="/analytics?tab=revenue",
            actions=[
                {"action": "view_analytics", "title": "View Analytics"},
                {"action": "share_success", "title": "Share Success"}
            ],
            data={"amount": amount, "period": period}
        )
        
        background_tasks.add_task(
            send_push_notification,
            user_id=user.id,
            notification_data=notification_data
        )
        
        return {
            "success": True,
            "message": f"Revenue milestone notification sent for ${amount:,.2f} {period}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send milestone notification: {str(e)}"
        )

# Helper functions

async def get_pwa_analytics(user_id: str, db: Session) -> Dict[str, Any]:
    """
    Get PWA-specific analytics data
    """
    # This would query your analytics tables
    return {
        "total_push_notifications": 0,
        "offline_sessions": 0,
        "sync_frequency": "daily",
        "cache_hit_rate": 0.95
    }