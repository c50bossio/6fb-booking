"""
Google Calendar Integration API Endpoints
Handles OAuth flow, sync operations, and settings management
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config.database import get_db
from config.settings import get_settings
from services.google_calendar_service import google_calendar_service
from services.appointment_sync_service import appointment_sync_service
from models.barber import Barber
from models.google_calendar_settings import GoogleCalendarSettings, GoogleCalendarSyncLog
from models.appointment import Appointment
from api.v1.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/google-calendar", tags=["Google Calendar"])
settings = get_settings()


# Pydantic models for API requests/responses
class GoogleCalendarConnectionStatus(BaseModel):
    connected: bool
    status: str
    message: str
    google_email: Optional[str] = None
    last_sync_date: Optional[datetime] = None
    calendar_id: Optional[str] = None


class GoogleCalendarSettings(BaseModel):
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
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate Google Calendar OAuth connection
    Returns authorization URL for user to grant permissions
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Generate OAuth authorization URL
        auth_url = google_calendar_service.get_authorization_url(
            barber.id, state=f"barber_{barber.id}"
        )

        return {
            "authorization_url": auth_url,
            "state": f"barber_{barber.id}",
            "message": "Visit the authorization URL to connect your Google Calendar"
        }

    except Exception as e:
        logger.error(f"Error initiating Google Calendar connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/callback")
async def google_calendar_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback
    """
    try:
        if error:
            logger.warning(f"OAuth error: {error}")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/dashboard/settings?google_calendar_error={error}"
            )

        # Extract barber ID from state
        if not state.startswith("barber_"):
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        barber_id = int(state.replace("barber_", ""))
        
        # Handle OAuth callback
        success = google_calendar_service.handle_oauth_callback(barber_id, code)
        
        if success:
            # Update or create settings record
            settings_record = db.query(GoogleCalendarSettings).filter(
                GoogleCalendarSettings.barber_id == barber_id
            ).first()
            
            if not settings_record:
                settings_record = GoogleCalendarSettings(
                    barber_id=barber_id,
                    is_connected=True,
                    connection_date=datetime.utcnow()
                )
                db.add(settings_record)
            else:
                settings_record.is_connected = True
                settings_record.connection_date = datetime.utcnow()
                settings_record.error_count = 0
                settings_record.last_error = None
            
            db.commit()
            
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/dashboard/settings?google_calendar_connected=true"
            )
        else:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/dashboard/settings?google_calendar_error=connection_failed"
            )

    except Exception as e:
        logger.error(f"Error handling OAuth callback: {str(e)}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/settings?google_calendar_error=callback_error"
        )


@router.get("/status", response_model=GoogleCalendarConnectionStatus)
async def get_connection_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Google Calendar connection status for current barber
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Get connection status from service
        status = google_calendar_service.get_connection_status(barber.id)
        
        # Get additional details from database
        settings_record = db.query(GoogleCalendarSettings).filter(
            GoogleCalendarSettings.barber_id == barber.id
        ).first()
        
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
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect Google Calendar for current barber
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Disconnect from service
        success = google_calendar_service.disconnect(barber.id)
        
        if success:
            # Update database record
            settings_record = db.query(GoogleCalendarSettings).filter(
                GoogleCalendarSettings.barber_id == barber.id
            ).first()
            
            if settings_record:
                settings_record.is_connected = False
                settings_record.google_email = None
                settings_record.calendar_id = "primary"
                db.commit()
            
            return {"success": True, "message": "Google Calendar disconnected successfully"}
        else:
            return {"success": False, "message": "Failed to disconnect Google Calendar"}

    except Exception as e:
        logger.error(f"Error disconnecting Google Calendar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings", response_model=GoogleCalendarSettings)
async def get_calendar_settings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Google Calendar sync settings for current barber
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Get settings from database
        settings_record = db.query(GoogleCalendarSettings).filter(
            GoogleCalendarSettings.barber_id == barber.id
        ).first()
        
        if not settings_record:
            # Return default settings
            return GoogleCalendarSettings()
        
        return GoogleCalendarSettings(
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
            timezone=settings_record.timezone
        )

    except Exception as e:
        logger.error(f"Error getting calendar settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_calendar_settings(
    settings_update: GoogleCalendarSettings,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update Google Calendar sync settings for current barber
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Get or create settings record
        settings_record = db.query(GoogleCalendarSettings).filter(
            GoogleCalendarSettings.barber_id == barber.id
        ).first()
        
        if not settings_record:
            settings_record = GoogleCalendarSettings(barber_id=barber.id)
            db.add(settings_record)
        
        # Update settings
        for field, value in settings_update.dict().items():
            setattr(settings_record, field, value)
        
        db.commit()
        
        return {"success": True, "message": "Settings updated successfully"}

    except Exception as e:
        logger.error(f"Error updating calendar settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync", response_model=SyncResponse)
async def manual_sync(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger sync of all appointments to Google Calendar
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Use the enhanced sync service for bulk sync
        result = appointment_sync_service.bulk_sync_appointments(barber.id, db)
        
        return SyncResponse(**result)

    except Exception as e:
        logger.error(f"Error during manual sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events", response_model=List[CalendarEvent])
async def get_calendar_events(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Google Calendar events for date range
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Check if connected
        if not google_calendar_service.is_connected(barber.id):
            raise HTTPException(status_code=400, detail="Google Calendar not connected")

        # Get events from Google Calendar
        events = google_calendar_service.get_calendar_events(barber.id, start_date, end_date)
        
        # Convert to response format
        calendar_events = []
        for event in events:
            start_time = event.get("start", {})
            end_time = event.get("end", {})
            
            # Parse datetime
            start_dt = None
            end_dt = None
            
            if "dateTime" in start_time:
                start_dt = datetime.fromisoformat(start_time["dateTime"].replace("Z", "+00:00"))
            elif "date" in start_time:
                start_dt = datetime.fromisoformat(start_time["date"])
                
            if "dateTime" in end_time:
                end_dt = datetime.fromisoformat(end_time["dateTime"].replace("Z", "+00:00"))
            elif "date" in end_time:
                end_dt = datetime.fromisoformat(end_time["date"])
            
            if start_dt and end_dt:
                attendees = [
                    attendee.get("email", "") 
                    for attendee in event.get("attendees", [])
                ]
                
                calendar_events.append(CalendarEvent(
                    id=event["id"],
                    summary=event.get("summary", ""),
                    description=event.get("description", ""),
                    start=start_dt,
                    end=end_dt,
                    attendees=attendees
                ))
        
        return calendar_events

    except Exception as e:
        logger.error(f"Error getting calendar events: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync-logs")
async def get_sync_logs(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Google Calendar sync logs for current barber
    """
    try:
        # Get barber from current user
        barber = db.query(Barber).filter(Barber.user_id == current_user["sub"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Get sync logs
        logs = db.query(GoogleCalendarSyncLog).filter(
            GoogleCalendarSyncLog.barber_id == barber.id
        ).order_by(GoogleCalendarSyncLog.created_at.desc()).offset(offset).limit(limit).all()

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
                    "retry_count": log.retry_count
                }
                for log in logs
            ]
        }

    except Exception as e:
        logger.error(f"Error getting sync logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))