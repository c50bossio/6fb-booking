"""
Google Calendar Integration Router for BookedBarber V2
Enhanced router that integrates GoogleCalendarSettings and provides V1 feature parity
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from dependencies import get_current_user
from services.google_calendar_service import GoogleCalendarService
from services.google_calendar_webhook_service import GoogleCalendarWebhookService
from models import User, Appointment, GoogleCalendarSettings, GoogleCalendarSyncLog, GoogleCalendarWebhookSubscription
import logging
import os
import json
from google_auth_oauthlib.flow import Flow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/calendar", tags=["Google Calendar"])

def get_google_flow(state: Optional[str] = None) -> Flow:
    """Create and return Google OAuth2 flow."""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback")]
            }
        },
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback")
    if state:
        flow.state = state
    return flow

# Pydantic models for API requests/responses
class GoogleCalendarConnectionStatus(BaseModel):
    connected: bool
    status: str
    message: str
    google_email: Optional[str] = None
    last_sync_date: Optional[datetime] = None
    calendar_id: Optional[str] = None

class GoogleCalendarSettingsSchema(BaseModel):
    auto_sync_enabled: bool = True
    sync_on_create: bool = True
    sync_on_update: bool = True
    sync_on_delete: bool = True
    sync_all_appointments: bool = True
    sync_only_confirmed: bool = False
    sync_only_paid: bool = False
    include_client_email: bool = True
    include_client_phone: bool = True
    include_service_price: bool = False
    include_notes: bool = True
    enable_reminders: bool = True
    reminder_email_minutes: int = 1440  # 24 hours
    reminder_popup_minutes: int = 15
    event_visibility: str = "private"
    show_client_name: bool = True
    show_service_details: bool = True
    timezone: str = "America/New_York"

class SyncResponse(BaseModel):
    success: bool
    message: str
    synced_count: int = 0
    failed_count: int = 0
    errors: List[str] = []

class CalendarEvent(BaseModel):
    id: str
    summary: str
    description: Optional[str]
    start: datetime
    end: datetime
    attendees: List[str] = []

@router.get("/connect")
async def connect_google_calendar(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Initiate Google Calendar OAuth connection
    Returns authorization URL for user to grant permissions
    """
    try:
        flow = get_google_flow()
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        # Store state with user_id for verification
        import base64
        state_data = {
            "state": state,
            "user_id": current_user.id
        }
        encoded_state = base64.b64encode(json.dumps(state_data).encode()).decode()
        authorization_url = authorization_url.replace(state, encoded_state)

        return {
            "authorization_url": authorization_url,
            "state": encoded_state,
            "message": "Visit the authorization URL to connect your Google Calendar",
        }

    except Exception as e:
        logger.error(f"Error initiating Google Calendar connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/oauth/callback")
async def google_calendar_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Handle Google OAuth callback
    """
    try:
        if error:
            logger.warning(f"OAuth error: {error}")
            frontend_url = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")[0]
            return RedirectResponse(
                url=f"{frontend_url}/dashboard/settings?google_calendar_error={error}"
            )

        # Decode state to get user_id
        import base64
        state_data = json.loads(base64.b64decode(state.encode()).decode())
        user_id = state_data.get("user_id")
        original_state = state_data.get("state")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid state parameter")

        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Exchange code for tokens
        flow = get_google_flow(state=original_state)
        flow.fetch_token(code=code)
        
        # Get credentials
        credentials = flow.credentials
        
        # Store credentials in database (V2 pattern)
        user.google_calendar_credentials = json.dumps({
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        })
        
        success = True

        if success:
            # Update or create settings record
            settings_record = (
                db.query(GoogleCalendarSettings)
                .filter(GoogleCalendarSettings.user_id == user_id)
                .first()
            )

            if not settings_record:
                settings_record = GoogleCalendarSettings(
                    user_id=user_id,
                    is_connected=True,
                    connection_date=datetime.utcnow(),
                )
                db.add(settings_record)
            else:
                settings_record.is_connected = True
                settings_record.connection_date = datetime.utcnow()
                settings_record.error_count = 0
                settings_record.last_error = None

            db.commit()

            frontend_url = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")[0]
            return RedirectResponse(
                url=f"{frontend_url}/dashboard/settings?google_calendar_connected=true"
            )
        else:
            frontend_url = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")[0]
            return RedirectResponse(
                url=f"{frontend_url}/dashboard/settings?google_calendar_error=connection_failed"
            )

    except Exception as e:
        logger.error(f"Error handling OAuth callback: {str(e)}")
        frontend_url = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")[0]
        return RedirectResponse(
            url=f"{frontend_url}/dashboard/settings?google_calendar_error=callback_error"
        )

@router.get("/status", response_model=GoogleCalendarConnectionStatus)
async def get_connection_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get Google Calendar connection status for current user
    """
    try:
        # Check if user has Google Calendar credentials
        connected = bool(current_user.google_calendar_credentials)
        
        if not connected:
            status = {
                "connected": False,
                "status": "not_connected",
                "message": "Google Calendar not connected",
            }
        else:
            # Try to validate credentials with Google Calendar service
            try:
                calendar_service = GoogleCalendarService(db)
                credentials = calendar_service.get_user_credentials(current_user)
                if credentials and credentials.valid:
                    status = {
                        "connected": True,
                        "status": "active",
                        "message": "Google Calendar connected and active",
                    }
                elif credentials and credentials.expired:
                    status = {
                        "connected": True,
                        "status": "expired",
                        "message": "Google Calendar credentials expired but can be refreshed",
                    }
                else:
                    status = {
                        "connected": False,
                        "status": "invalid_credentials",
                        "message": "Google Calendar credentials are invalid",
                    }
            except Exception:
                status = {
                    "connected": False,
                    "status": "error",
                    "message": "Error validating Google Calendar connection",
                }

        # Get additional details from database
        settings_record = (
            db.query(GoogleCalendarSettings)
            .filter(GoogleCalendarSettings.user_id == current_user.id)
            .first()
        )

        response = GoogleCalendarConnectionStatus(**status)

        if settings_record:
            response.google_email = settings_record.google_email
            response.last_sync_date = settings_record.last_sync_date
            response.calendar_id = settings_record.calendar_id

        return response

    except Exception as e:
        logger.error(f"Error getting connection status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/disconnect")
async def disconnect_google_calendar(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Disconnect Google Calendar for current user
    """
    try:
        # Clear credentials from user record
        current_user.google_calendar_credentials = None
        current_user.google_calendar_id = None
        
        # Update database record
        settings_record = (
            db.query(GoogleCalendarSettings)
            .filter(GoogleCalendarSettings.user_id == current_user.id)
            .first()
        )

        if settings_record:
            settings_record.is_connected = False
            settings_record.google_email = None
            settings_record.calendar_id = "primary"

        db.commit()

        return {
            "success": True,
            "message": "Google Calendar disconnected successfully",
        }

    except Exception as e:
        logger.error(f"Error disconnecting Google Calendar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings", response_model=GoogleCalendarSettingsSchema)
async def get_calendar_settings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get Google Calendar sync settings for current user
    """
    try:
        # Get settings from database
        settings_record = (
            db.query(GoogleCalendarSettings)
            .filter(GoogleCalendarSettings.user_id == current_user.id)
            .first()
        )

        if not settings_record:
            # Return default settings
            return GoogleCalendarSettingsSchema()

        return GoogleCalendarSettingsSchema(
            auto_sync_enabled=settings_record.auto_sync_enabled,
            sync_on_create=settings_record.sync_on_create,
            sync_on_update=settings_record.sync_on_update,
            sync_on_delete=settings_record.sync_on_delete,
            sync_all_appointments=settings_record.sync_all_appointments,
            sync_only_confirmed=settings_record.sync_only_confirmed,
            sync_only_paid=settings_record.sync_only_paid,
            include_client_email=settings_record.include_client_email,
            include_client_phone=settings_record.include_client_phone,
            include_service_price=settings_record.include_service_price,
            include_notes=settings_record.include_notes,
            enable_reminders=settings_record.enable_reminders,
            reminder_email_minutes=settings_record.reminder_email_minutes,
            reminder_popup_minutes=settings_record.reminder_popup_minutes,
            event_visibility=settings_record.event_visibility,
            show_client_name=settings_record.show_client_name,
            show_service_details=settings_record.show_service_details,
            timezone=settings_record.timezone,
        )

    except Exception as e:
        logger.error(f"Error getting calendar settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings")
async def update_calendar_settings(
    settings_update: GoogleCalendarSettingsSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update Google Calendar sync settings for current user
    """
    try:
        # Get or create settings record
        settings_record = (
            db.query(GoogleCalendarSettings)
            .filter(GoogleCalendarSettings.user_id == current_user.id)
            .first()
        )

        if not settings_record:
            settings_record = GoogleCalendarSettings(user_id=current_user.id)
            db.add(settings_record)

        # Update settings
        for field, value in settings_update.dict().items():
            setattr(settings_record, field, value)

        settings_record.updated_at = datetime.utcnow()
        db.commit()

        return {"success": True, "message": "Settings updated successfully"}

    except Exception as e:
        logger.error(f"Error updating calendar settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync", response_model=SyncResponse)
async def manual_sync(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Manually trigger sync of all appointments to Google Calendar
    """
    try:
        # Check if connected
        if not current_user.google_calendar_credentials:
            raise HTTPException(status_code=400, detail="Google Calendar not connected")

        # Initialize Google Calendar service
        calendar_service = GoogleCalendarService(db)

        # Get user's appointments for bulk sync (V2 uses user_id for barber appointments)
        appointments = (
            db.query(Appointment)
            .filter(Appointment.user_id == current_user.id)
            .filter(Appointment.status != "cancelled")
            .all()
        )

        synced_count = 0
        failed_count = 0
        errors = []

        for appointment in appointments:
            try:
                # Use V2 sync method
                event_id = calendar_service.sync_appointment_to_google(appointment)
                
                if event_id:
                    synced_count += 1
                    
                    # Log successful sync
                    sync_log = GoogleCalendarSyncLog(
                        user_id=current_user.id,
                        appointment_id=appointment.id,
                        operation="create",
                        direction="to_google",
                        status="success",
                        google_event_id=event_id,
                        google_calendar_id="primary"
                    )
                    db.add(sync_log)
                else:
                    failed_count += 1
                    error_msg = f"Failed to sync appointment {appointment.id}"
                    errors.append(error_msg)
                    
                    # Log failed sync
                    sync_log = GoogleCalendarSyncLog(
                        user_id=current_user.id,
                        appointment_id=appointment.id,
                        operation="create",
                        direction="to_google",
                        status="failed",
                        error_message=error_msg,
                        google_calendar_id="primary"
                    )
                    db.add(sync_log)
                    
            except Exception as e:
                failed_count += 1
                error_msg = f"Error syncing appointment {appointment.id}: {str(e)}"
                errors.append(error_msg)
                
                # Log failed sync
                sync_log = GoogleCalendarSyncLog(
                    user_id=current_user.id,
                    appointment_id=appointment.id,
                    operation="create",
                    direction="to_google",
                    status="failed",
                    error_message=error_msg,
                    google_calendar_id="primary"
                )
                db.add(sync_log)

        # Update last sync date
        settings_record = (
            db.query(GoogleCalendarSettings)
            .filter(GoogleCalendarSettings.user_id == current_user.id)
            .first()
        )
        if settings_record:
            settings_record.last_sync_date = datetime.utcnow()

        db.commit()

        return SyncResponse(
            success=failed_count == 0,
            message=f"Synced {synced_count} appointments successfully" + 
                   (f", {failed_count} failed" if failed_count > 0 else ""),
            synced_count=synced_count,
            failed_count=failed_count,
            errors=errors[:10]  # Limit errors to first 10
        )

    except Exception as e:
        logger.error(f"Error during manual sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events", response_model=List[CalendarEvent])
async def get_calendar_events(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Google Calendar events for date range
    """
    try:
        # Check if connected
        if not current_user.google_calendar_credentials:
            raise HTTPException(status_code=400, detail="Google Calendar not connected")

        # Initialize Google Calendar service and get events
        calendar_service = GoogleCalendarService(db)
        service = calendar_service.get_calendar_service(current_user)
        
        # Get events from Google Calendar API
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=start_date.isoformat() + "Z",
                timeMax=end_date.isoformat() + "Z",
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        events = events_result.get("items", [])

        # Convert to response format
        calendar_events = []
        for event in events:
            start_time = event.get("start", {})
            end_time = event.get("end", {})

            # Parse datetime
            start_dt = None
            end_dt = None

            if "dateTime" in start_time:
                start_dt = datetime.fromisoformat(
                    start_time["dateTime"].replace("Z", "+00:00")
                )
            elif "date" in start_time:
                start_dt = datetime.fromisoformat(start_time["date"])

            if "dateTime" in end_time:
                end_dt = datetime.fromisoformat(
                    end_time["dateTime"].replace("Z", "+00:00")
                )
            elif "date" in end_time:
                end_dt = datetime.fromisoformat(end_time["date"])

            if start_dt and end_dt:
                attendees = [
                    attendee.get("email", "") for attendee in event.get("attendees", [])
                ]

                calendar_events.append(
                    CalendarEvent(
                        id=event["id"],
                        summary=event.get("summary", ""),
                        description=event.get("description", ""),
                        start=start_dt,
                        end=end_dt,
                        attendees=attendees,
                    )
                )

        return calendar_events

    except Exception as e:
        logger.error(f"Error getting calendar events: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync-logs")
async def get_sync_logs(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Google Calendar sync logs for current user
    """
    try:
        # Get sync logs
        logs = (
            db.query(GoogleCalendarSyncLog)
            .filter(GoogleCalendarSyncLog.user_id == current_user.id)
            .order_by(GoogleCalendarSyncLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "logs": [
                {
                    "id": log.id,
                    "appointment_id": log.appointment_id,
                    "operation": log.operation,
                    "direction": log.direction,
                    "status": log.status,
                    "google_event_id": log.google_event_id,
                    "error_message": log.error_message,
                    "created_at": log.created_at,
                    "retry_count": log.retry_count,
                }
                for log in logs
            ]
        }

    except Exception as e:
        logger.error(f"Error getting sync logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/real-time-sync/enable")
async def enable_real_time_sync(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Enable real-time synchronization with Google Calendar using webhooks.
    Creates webhook subscriptions for immediate event notifications.
    """
    try:
        # Check if connected
        if not current_user.google_calendar_credentials:
            raise HTTPException(status_code=400, detail="Google Calendar not connected")

        # Initialize webhook service
        webhook_service = GoogleCalendarWebhookService(db)
        
        # Enable real-time sync through calendar service
        calendar_service = GoogleCalendarService(db)
        success = calendar_service.enable_real_time_sync(current_user)
        
        if success:
            return {
                "success": True,
                "message": "Real-time synchronization enabled successfully",
                "webhook_enabled": True
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to enable real-time sync")

    except Exception as e:
        logger.error(f"Error enabling real-time sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/real-time-sync/disable")
async def disable_real_time_sync(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Disable real-time synchronization with Google Calendar.
    Removes webhook subscriptions to stop immediate notifications.
    """
    try:
        # Initialize calendar service
        calendar_service = GoogleCalendarService(db)
        success = calendar_service.disable_real_time_sync(current_user)
        
        return {
            "success": success,
            "message": "Real-time synchronization disabled" if success else "Failed to disable real-time sync",
            "webhook_enabled": False
        }

    except Exception as e:
        logger.error(f"Error disabling real-time sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/real-time-sync/status")
async def get_real_time_sync_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get real-time synchronization status and webhook information.
    """
    try:
        # Get sync status from calendar service
        calendar_service = GoogleCalendarService(db)
        sync_status = calendar_service.get_sync_status(current_user)
        
        # Get webhook subscriptions
        webhook_subscriptions = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.user_id == current_user.id,
            GoogleCalendarWebhookSubscription.is_active == True
        ).all()
        
        webhook_details = []
        for sub in webhook_subscriptions:
            webhook_details.append({
                "id": sub.id,
                "calendar_id": sub.google_calendar_id,
                "expiration_time": sub.expiration_time,
                "expires_soon": sub.expires_soon,
                "notification_count": sub.notification_count,
                "last_notification": sub.last_notification_received,
                "error_count": sub.error_count,
                "last_error": sub.last_error
            })
        
        return {
            "real_time_enabled": sync_status["real_time_enabled"],
            "active_subscriptions": sync_status["active_subscriptions"],
            "recent_syncs": sync_status["recent_syncs"],
            "recent_errors": sync_status["recent_errors"],
            "error_rate": sync_status["error_rate"],
            "webhook_subscriptions": webhook_details
        }

    except Exception as e:
        logger.error(f"Error getting real-time sync status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhooks/renew")
async def renew_webhook_subscriptions(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Manually renew expiring webhook subscriptions.
    Useful for maintenance or when automatic renewal fails.
    """
    try:
        webhook_service = GoogleCalendarWebhookService(db)
        
        # Get expiring subscriptions for this user
        expiring_subscriptions = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.user_id == current_user.id,
            GoogleCalendarWebhookSubscription.is_active == True,
            GoogleCalendarWebhookSubscription.expires_soon == True
        ).all()
        
        renewed_count = 0
        failed_count = 0
        
        for subscription in expiring_subscriptions:
            try:
                if webhook_service.renew_subscription(subscription):
                    renewed_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Error renewing subscription {subscription.id}: {str(e)}")
                failed_count += 1
        
        return {
            "success": failed_count == 0,
            "message": f"Renewed {renewed_count} subscriptions" + 
                      (f", {failed_count} failed" if failed_count > 0 else ""),
            "renewed_count": renewed_count,
            "failed_count": failed_count
        }

    except Exception as e:
        logger.error(f"Error renewing webhook subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/health")
async def get_sync_health(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get comprehensive health status of Google Calendar integration.
    Includes connection status, sync performance, and webhook health.
    """
    try:
        calendar_service = GoogleCalendarService(db)
        
        # Get connection status
        connection_status = await get_connection_status(current_user, db)
        
        # Get sync status
        sync_status = calendar_service.get_sync_status(current_user)
        
        # Get recent sync performance
        recent_sync_logs = (
            db.query(GoogleCalendarSyncLog)
            .filter(GoogleCalendarSyncLog.user_id == current_user.id)
            .filter(GoogleCalendarSyncLog.created_at >= datetime.utcnow() - timedelta(hours=24))
            .order_by(GoogleCalendarSyncLog.created_at.desc())
            .limit(10)
            .all()
        )
        
        # Calculate health score
        health_score = 100
        issues = []
        
        if not connection_status.connected:
            health_score -= 50
            issues.append("Google Calendar not connected")
        
        if sync_status["error_rate"] > 0.1:  # More than 10% error rate
            health_score -= 30
            issues.append(f"High error rate: {sync_status['error_rate']:.1%}")
        
        if not sync_status["real_time_enabled"]:
            health_score -= 20
            issues.append("Real-time sync disabled")
        
        # Check for expiring subscriptions
        expiring_subs = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.user_id == current_user.id,
            GoogleCalendarWebhookSubscription.is_active == True,
            GoogleCalendarWebhookSubscription.expires_soon == True
        ).count()
        
        if expiring_subs > 0:
            health_score -= 10
            issues.append(f"{expiring_subs} webhook subscriptions expiring soon")
        
        health_status = "excellent" if health_score >= 90 else \
                       "good" if health_score >= 70 else \
                       "fair" if health_score >= 50 else "poor"
        
        return {
            "health_score": max(0, health_score),
            "health_status": health_status,
            "connection_status": connection_status.dict(),
            "sync_status": sync_status,
            "recent_syncs": len(recent_sync_logs),
            "issues": issues,
            "recommendations": _get_health_recommendations(health_score, issues)
        }

    except Exception as e:
        logger.error(f"Error getting sync health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def _get_health_recommendations(health_score: int, issues: List[str]) -> List[str]:
    """Generate recommendations based on health issues."""
    recommendations = []
    
    if health_score < 50:
        recommendations.append("Consider reconnecting Google Calendar for better sync reliability")
    
    if "High error rate" in str(issues):
        recommendations.append("Check your Google Calendar permissions and network connectivity")
    
    if "Real-time sync disabled" in str(issues):
        recommendations.append("Enable real-time sync for immediate calendar updates")
    
    if "webhook subscriptions expiring" in str(issues):
        recommendations.append("Renew webhook subscriptions to maintain real-time sync")
    
    if not recommendations:
        recommendations.append("Your Google Calendar integration is working optimally!")
    
    return recommendations