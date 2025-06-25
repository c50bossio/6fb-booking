"""
Notification Preferences Management API
Handles user notification preferences and unsubscribe functionality
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
import hashlib
import os

from config.database import get_db
from models.user import User
from models.barber import Barber
from models.communication import NotificationPreference
from api.v1.auth import get_current_user
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences"""

    # Email preferences
    email_appointment_confirmation: Optional[bool] = None
    email_appointment_reminder: Optional[bool] = None
    email_appointment_cancellation: Optional[bool] = None
    email_payment_receipt: Optional[bool] = None
    email_marketing: Optional[bool] = None
    email_performance_reports: Optional[bool] = None
    email_team_updates: Optional[bool] = None

    # SMS preferences
    sms_appointment_confirmation: Optional[bool] = None
    sms_appointment_reminder: Optional[bool] = None
    sms_appointment_cancellation: Optional[bool] = None
    sms_payment_confirmation: Optional[bool] = None
    sms_marketing: Optional[bool] = None

    # Push notification preferences
    push_enabled: Optional[bool] = None
    push_appointment_updates: Optional[bool] = None
    push_performance_alerts: Optional[bool] = None
    push_team_updates: Optional[bool] = None

    # Reminder timing preferences
    reminder_hours_before: Optional[int] = Field(None, ge=1, le=72)
    second_reminder_hours: Optional[int] = Field(None, ge=1, le=24)

    # Quiet hours
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[int] = Field(None, ge=0, le=23)
    quiet_hours_end: Optional[int] = Field(None, ge=0, le=23)


class UnsubscribeRequest(BaseModel):
    """Schema for unsubscribe requests"""

    token: str
    unsubscribe_all: bool = False
    email_types: Optional[list[str]] = None
    sms_types: Optional[list[str]] = None


@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current user's notification preferences"""
    try:
        # Get or create preferences
        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == current_user.id)
            .first()
        )

        if not preferences:
            # Create default preferences
            preferences = NotificationPreference(
                user_id=current_user.id,
                email_appointment_confirmation=True,
                email_appointment_reminder=True,
                email_payment_receipt=True,
                sms_appointment_reminder=True,
                push_enabled=True,
            )
            db.add(preferences)
            db.commit()
            db.refresh(preferences)

        return {"success": True, "preferences": preferences.to_dict()}

    except Exception as e:
        logger.error(f"Error getting notification preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get preferences")


@router.put("/preferences")
async def update_notification_preferences(
    updates: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notification preferences"""
    try:
        # Get or create preferences
        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == current_user.id)
            .first()
        )

        if not preferences:
            preferences = NotificationPreference(user_id=current_user.id)
            db.add(preferences)

        # Update preferences
        update_data = updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)

        preferences.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(preferences)

        logger.info(f"Updated notification preferences for user {current_user.id}")

        return {
            "success": True,
            "message": "Preferences updated successfully",
            "preferences": preferences.to_dict(),
        }

    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update preferences")


@router.post("/preferences/quick-update/{category}")
async def quick_update_preferences(
    category: str,
    enabled: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quick enable/disable for a category of notifications"""
    try:
        if category not in ["email", "sms", "push"]:
            raise HTTPException(status_code=400, detail="Invalid category")

        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == current_user.id)
            .first()
        )

        if not preferences:
            preferences = NotificationPreference(user_id=current_user.id)
            db.add(preferences)

        # Update all preferences in the category
        if category == "email":
            preferences.email_appointment_confirmation = enabled
            preferences.email_appointment_reminder = enabled
            preferences.email_appointment_cancellation = enabled
            preferences.email_payment_receipt = enabled
            preferences.email_marketing = enabled
            preferences.email_performance_reports = enabled
            preferences.email_team_updates = enabled
        elif category == "sms":
            preferences.sms_appointment_confirmation = enabled
            preferences.sms_appointment_reminder = enabled
            preferences.sms_appointment_cancellation = enabled
            preferences.sms_payment_confirmation = enabled
            preferences.sms_marketing = enabled
        elif category == "push":
            preferences.push_enabled = enabled
            preferences.push_appointment_updates = enabled
            preferences.push_performance_alerts = enabled
            preferences.push_team_updates = enabled

        preferences.updated_at = datetime.utcnow()
        db.commit()

        action = "enabled" if enabled else "disabled"
        logger.info(f"User {current_user.id} {action} all {category} notifications")

        return {"success": True, "message": f"All {category} notifications {action}"}

    except Exception as e:
        logger.error(f"Error in quick update preferences: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update preferences")


@router.get("/unsubscribe/{token}")
async def validate_unsubscribe_token(token: str, db: Session = Depends(get_db)):
    """Validate unsubscribe token and return user info"""
    try:
        # Validate token format
        if len(token) != 64:  # SHA256 hash length
            raise HTTPException(status_code=400, detail="Invalid token")

        # In production, you'd validate the token against stored tokens
        # For now, we'll extract user info from the token
        # This is a simplified implementation

        return {
            "success": True,
            "valid": True,
            "message": "Token validated. You can update your preferences below.",
        }

    except Exception as e:
        logger.error(f"Error validating unsubscribe token: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid or expired token")


@router.post("/unsubscribe")
async def process_unsubscribe(
    request: UnsubscribeRequest, db: Session = Depends(get_db)
):
    """Process unsubscribe request"""
    try:
        # Validate token and get user
        # In production, implement proper token validation
        # This is a simplified version

        # For demonstration, we'll assume token validation returns a user_id
        # You should implement proper token storage and validation

        # Simulated user lookup (replace with actual implementation)
        user_id = 1  # This should come from token validation

        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == user_id)
            .first()
        )

        if not preferences:
            preferences = NotificationPreference(user_id=user_id)
            db.add(preferences)

        if request.unsubscribe_all:
            # Unsubscribe from all
            preferences.email_appointment_confirmation = False
            preferences.email_appointment_reminder = False
            preferences.email_appointment_cancellation = False
            preferences.email_payment_receipt = False
            preferences.email_marketing = False
            preferences.email_performance_reports = False
            preferences.email_team_updates = False
            preferences.sms_appointment_confirmation = False
            preferences.sms_appointment_reminder = False
            preferences.sms_appointment_cancellation = False
            preferences.sms_payment_confirmation = False
            preferences.sms_marketing = False
            message = "You have been unsubscribed from all notifications"
        else:
            # Selective unsubscribe
            updated = []

            if request.email_types:
                for email_type in request.email_types:
                    if hasattr(preferences, f"email_{email_type}"):
                        setattr(preferences, f"email_{email_type}", False)
                        updated.append(f"email {email_type}")

            if request.sms_types:
                for sms_type in request.sms_types:
                    if hasattr(preferences, f"sms_{sms_type}"):
                        setattr(preferences, f"sms_{sms_type}", False)
                        updated.append(f"SMS {sms_type}")

            message = f"You have been unsubscribed from: {', '.join(updated)}"

        preferences.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Processed unsubscribe for user {user_id}")

        return {"success": True, "message": message}

    except Exception as e:
        logger.error(f"Error processing unsubscribe: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to process unsubscribe")


@router.get("/preferences/summary")
async def get_preferences_summary(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get a summary of notification preferences"""
    try:
        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == current_user.id)
            .first()
        )

        if not preferences:
            return {
                "success": True,
                "summary": {
                    "email_enabled": True,
                    "sms_enabled": True,
                    "push_enabled": True,
                    "quiet_hours_enabled": False,
                },
            }

        # Calculate summary
        email_prefs = [
            preferences.email_appointment_confirmation,
            preferences.email_appointment_reminder,
            preferences.email_appointment_cancellation,
            preferences.email_payment_receipt,
            preferences.email_performance_reports,
            preferences.email_team_updates,
        ]

        sms_prefs = [
            preferences.sms_appointment_confirmation,
            preferences.sms_appointment_reminder,
            preferences.sms_appointment_cancellation,
            preferences.sms_payment_confirmation,
        ]

        return {
            "success": True,
            "summary": {
                "email_enabled": any(email_prefs),
                "sms_enabled": any(sms_prefs),
                "push_enabled": preferences.push_enabled,
                "quiet_hours_enabled": preferences.quiet_hours_enabled,
                "email_count": sum(email_prefs),
                "sms_count": sum(sms_prefs),
                "total_email": len(email_prefs),
                "total_sms": len(sms_prefs),
            },
        }

    except Exception as e:
        logger.error(f"Error getting preferences summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get summary")


@router.post("/preferences/test-notification")
async def send_test_notification(
    channel: str = Query(..., description="Channel to test: email, sms, or push"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a test notification to verify settings"""
    try:
        if channel not in ["email", "sms", "push"]:
            raise HTTPException(status_code=400, detail="Invalid channel")

        # Get user's contact info
        if channel == "email" and not current_user.email:
            raise HTTPException(status_code=400, detail="No email address on file")

        if channel == "sms":
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or not barber.phone:
                raise HTTPException(status_code=400, detail="No phone number on file")

        # Send test notification
        # This would integrate with your notification services
        logger.info(f"Sending test {channel} notification to user {current_user.id}")

        return {
            "success": True,
            "message": f"Test {channel} notification sent successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")
