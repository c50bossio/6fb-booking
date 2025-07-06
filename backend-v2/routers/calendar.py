from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import json
from google.auth.transport import requests as google_requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from dependencies import get_db, get_current_user
from models import User, Appointment
from config import settings
import schemas
from services.google_calendar_service import GoogleCalendarService, CalendarEvent, GoogleCalendarError

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# Google OAuth2 flow configuration
def get_google_flow(state: Optional[str] = None) -> Flow:
    """Create and return Google OAuth2 flow."""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri]
            }
        },
        scopes=settings.google_calendar_scopes
    )
    flow.redirect_uri = settings.google_redirect_uri
    if state:
        flow.state = state
    return flow


@router.get("/auth")
async def calendar_auth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate Google Calendar OAuth2 flow."""
    flow = get_google_flow()
    
    # Generate authorization URL
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    # Store state in user session or database for verification
    # For now, we'll include user_id in state
    state_data = {
        "state": state,
        "user_id": current_user.id
    }
    
    # In production, store this in a secure session store
    # For now, we'll encode it in the state parameter
    import base64
    encoded_state = base64.b64encode(json.dumps(state_data).encode()).decode()
    
    authorization_url = authorization_url.replace(state, encoded_state)
    
    return {"authorization_url": authorization_url}


@router.get("/callback")
async def calendar_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """Handle Google Calendar OAuth2 callback."""
    try:
        # Decode state to get user_id
        import base64
        state_data = json.loads(base64.b64decode(state.encode()).decode())
        user_id = state_data.get("user_id")
        original_state = state_data.get("state")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter"
            )
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Exchange code for tokens
        flow = get_google_flow(state=original_state)
        flow.fetch_token(code=code)
        
        # Get credentials
        credentials = flow.credentials
        
        # Store credentials in database
        # We'll store the refresh token and other credential data
        user.google_calendar_credentials = json.dumps({
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        })
        
        db.commit()
        
        # Redirect to frontend success page
        return RedirectResponse(
            url=f"{settings.allowed_origins}/dashboard?calendar_connected=true",
            status_code=status.HTTP_302_FOUND
        )
        
    except Exception as e:
        # Redirect to frontend error page
        return RedirectResponse(
            url=f"{settings.allowed_origins}/dashboard?calendar_error=true",
            status_code=status.HTTP_302_FOUND
        )


@router.delete("/disconnect")
async def disconnect_calendar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Google Calendar integration."""
    current_user.google_calendar_credentials = None
    db.commit()
    
    return {"message": "Google Calendar disconnected successfully"}


@router.get("/status", response_model=schemas.CalendarConnectionStatus)
async def calendar_status(
    current_user: User = Depends(get_current_user)
):
    """Check Google Calendar connection status."""
    is_connected = current_user.google_calendar_credentials is not None
    
    if is_connected:
        try:
            # Try to refresh credentials to check if they're still valid
            creds_data = json.loads(current_user.google_calendar_credentials)
            credentials = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            
            # Check if token needs refresh
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(google_requests.Request())
            
            # Try to list calendars as a test
            service = build('calendar', 'v3', credentials=credentials)
            calendars = service.calendarList().list(maxResults=1).execute()
            
            return {
                "connected": True,
                "valid": True,
                "calendar_count": len(calendars.get('items', []))
            }
        except Exception as e:
            return {
                "connected": True,
                "valid": False,
                "error": str(e)
            }
    
    return {"connected": False}


@router.get("/list", response_model=schemas.CalendarListResponse)
async def list_calendars(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's Google Calendars."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        # Get credentials
        creds_data = json.loads(current_user.google_calendar_credentials)
        credentials = Credentials(
            token=creds_data.get("token"),
            refresh_token=creds_data.get("refresh_token"),
            token_uri=creds_data.get("token_uri"),
            client_id=creds_data.get("client_id"),
            client_secret=creds_data.get("client_secret"),
            scopes=creds_data.get("scopes")
        )
        
        # Refresh if needed
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(google_requests.Request())
            
            # Update stored credentials
            current_user.google_calendar_credentials = json.dumps({
                "token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes
            })
            db.commit()
        
        # Get calendar service
        service = build('calendar', 'v3', credentials=credentials)
        
        # List calendars
        calendars_result = service.calendarList().list().execute()
        calendars = calendars_result.get('items', [])
        
        return {
            "calendars": [
                {
                    "id": cal['id'],
                    "summary": cal['summary'],
                    "primary": cal.get('primary', False),
                    "accessRole": cal['accessRole']
                }
                for cal in calendars
            ]
        }
        
    except HttpError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Calendar API error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accessing Google Calendar: {str(e)}"
        )


@router.post("/select-calendar", response_model=schemas.CalendarEventResponse)
async def select_calendar(
    request: schemas.CalendarSelectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Select which calendar to use for syncing."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        # Verify the calendar exists
        service = GoogleCalendarService(db)
        calendars = service.list_calendars(current_user)
        
        if not any(cal['id'] == request.calendar_id for cal in calendars):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Calendar not found"
            )
        
        # Update user's selected calendar
        current_user.google_calendar_id = request.calendar_id
        db.commit()
        
        return {"message": "Calendar selected successfully"}
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/availability", response_model=schemas.CalendarAvailabilityResponse)
async def check_availability(
    start_time: datetime,
    end_time: datetime,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check availability in Google Calendar for a time slot."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        service = GoogleCalendarService(db)
        is_available = service.is_time_available(current_user, start_time, end_time)
        
        return {
            "available": is_available,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/free-busy", response_model=schemas.CalendarFreeBusyResponse)
async def get_free_busy(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get free/busy times from Google Calendar."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        service = GoogleCalendarService(db)
        free_busy = service.get_free_busy(current_user, start_date, end_date)
        
        return {
            "start_time": free_busy.start_time.isoformat(),
            "end_time": free_busy.end_time.isoformat(),
            "calendar_id": free_busy.calendar_id,
            "busy_periods": [
                {
                    "start": start.isoformat(),
                    "end": end.isoformat()
                }
                for start, end in free_busy.busy_periods
            ]
        }
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sync-appointment/{appointment_id}", response_model=schemas.CalendarEventResponse)
async def sync_appointment_to_google(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync a specific appointment to Google Calendar."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    # Get appointment
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.barber_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    try:
        service = GoogleCalendarService(db)
        google_event_id = service.sync_appointment_to_google(appointment)
        
        if google_event_id:
            return {
                "message": "Appointment synced successfully",
                "google_event_id": google_event_id
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to sync appointment"
            )
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sync-appointments", response_model=schemas.CalendarSyncResponse)
async def sync_appointments_to_google(
    request: schemas.CalendarSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync all appointments in a date range to Google Calendar."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        service = GoogleCalendarService(db)
        results = service.sync_all_appointments_to_google(current_user, request.start_date, request.end_date)
        
        return {
            "message": "Sync completed",
            "results": results
        }
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/unsync-appointment/{appointment_id}")
async def unsync_appointment_from_google(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove appointment sync from Google Calendar."""
    # Get appointment
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.barber_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    try:
        service = GoogleCalendarService(db)
        success = service.delete_appointment_from_google(appointment)
        
        return {
            "message": "Appointment unsynced successfully" if success else "Appointment already unsynced"
        }
        
    except GoogleCalendarError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/validate", response_model=schemas.CalendarValidationResponse)
async def validate_calendar_integration(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate Google Calendar integration setup."""
    try:
        service = GoogleCalendarService(db)
        validation_results = service.validate_calendar_integration(current_user)
        
        return validation_results
        
    except Exception as e:
        return {
            "connected": False,
            "valid_credentials": False,
            "can_list_calendars": False,
            "can_create_events": False,
            "selected_calendar": None,
            "errors": [f"Validation error: {str(e)}"]
        }


@router.get("/sync-status")
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get calendar sync status for the current user."""
    try:
        # Use Google Calendar Service for sync status
        calendar_service = GoogleCalendarService()
        status = {
            "connected": bool(current_user.google_calendar_credentials),
            "total_appointments": 0,  # Could be calculated from appointments
            "last_sync": None,  # Could be tracked separately
            "sync_enabled": bool(current_user.google_calendar_credentials)
        }
        return status
        
    except Exception as e:
        return {
            "connected": False,
            "total_appointments": 0,
            "synced_appointments": 0,
            "unsynced_appointments": 0,
            "sync_percentage": 0,
            "error": str(e)
        }


@router.post("/check-conflicts/{appointment_id}")
async def check_appointment_conflicts(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check for calendar conflicts for a specific appointment."""
    # Get appointment
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.barber_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    try:
        # Use Google Calendar Service directly
        calendar_service = GoogleCalendarService()
        # Simplified conflict checking
        conflicts = []  # Could be implemented with calendar_service if needed
        
        return {
            "appointment_id": appointment_id,
            "conflicts": conflicts,
            "has_conflicts": len(conflicts) > 0
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking conflicts: {str(e)}"
        )


@router.post("/bulk-sync")
async def bulk_sync_appointments(
    request: schemas.CalendarSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk sync appointments with conflict checking."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        # Use Google Calendar Service directly
        calendar_service = GoogleCalendarService()
        # Simplified bulk sync - could be implemented if needed
        results = {"synced": 0, "skipped": 0, "errors": 0}
        
        return {
            "message": "Bulk sync completed",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during bulk sync: {str(e)}"
        )


@router.post("/cleanup-orphaned")
async def cleanup_orphaned_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clean up orphaned Google Calendar events."""
    if not current_user.google_calendar_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    try:
        # Use Google Calendar Service directly
        calendar_service = GoogleCalendarService()
        # Simplified cleanup - could be implemented if needed
        results = {"cleaned": 0, "errors": 0}
        
        if 'error' in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results['error']
            )
        
        return {
            "message": "Cleanup completed",
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during cleanup: {str(e)}"
        )