"""
Google Calendar OAuth Integration Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from typing import Optional
import logging

from config.database import get_db
from models.user import User
from models.barber import Barber
from services.google_calendar_service import google_calendar_service
from services.rbac_service import RBACService, Permission
from api.v1.auth import get_current_user
from utils.logging import log_user_action

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/connect")
async def connect_google_calendar(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Start Google Calendar OAuth flow for the current barber
    """
    try:
        # Get barber profile
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(
                status_code=404,
                detail="Barber profile not found. Only barbers can connect Google Calendar.",
            )

        # Generate authorization URL
        auth_url = google_calendar_service.get_authorization_url(
            barber_id=barber.id, state=str(barber.id)
        )

        # Log the action
        log_user_action(
            action="google_calendar_oauth_initiated",
            user_id=current_user.id,
            details={"barber_id": barber.id},
        )

        return {"authorization_url": auth_url}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting Google Calendar OAuth: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to start Google Calendar connection"
        )


@router.get("/callback")
async def google_calendar_oauth_callback(
    code: str = Query(..., description="OAuth authorization code"),
    state: Optional[str] = Query(None, description="OAuth state parameter"),
    error: Optional[str] = Query(None, description="OAuth error"),
    db: Session = Depends(get_db),
):
    """
    Handle Google Calendar OAuth callback
    """
    try:
        if error:
            logger.warning(f"Google Calendar OAuth error: {error}")
            return HTMLResponse(
                content="""
                <html>
                    <head><title>Calendar Connection Failed</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                        <h1 style="color: #dc3545;">Connection Failed</h1>
                        <p>There was an error connecting your Google Calendar:</p>
                        <p style="color: #6c757d; font-style: italic;">{}</p>
                        <p><a href="/dashboard" style="color: #007bff;">Return to Dashboard</a></p>
                    </body>
                </html>
                """.format(
                    error
                ),
                status_code=400,
            )

        if not state:
            raise HTTPException(status_code=400, detail="Missing state parameter")

        try:
            barber_id = int(state)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid state parameter")

        # Verify barber exists
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")

        # Handle OAuth callback
        success = google_calendar_service.handle_oauth_callback(barber_id, code)

        if success:
            # Log successful connection
            log_user_action(
                action="google_calendar_connected",
                user_id=barber.user_id,
                details={"barber_id": barber_id},
            )

            return HTMLResponse(
                content="""
                <html>
                    <head><title>Calendar Connected Successfully</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                        <h1 style="color: #28a745;">Google Calendar Connected!</h1>
                        <p>Your Google Calendar has been successfully connected.</p>
                        <p>Appointments will now be automatically synced to your calendar.</p>
                        <p><a href="/dashboard" style="color: #007bff;">Return to Dashboard</a></p>
                        <script>
                            // Auto-close after 3 seconds
                            setTimeout(function() {
                                window.close();
                            }, 3000);
                        </script>
                    </body>
                </html>
                """,
                status_code=200,
            )
        else:
            return HTMLResponse(
                content="""
                <html>
                    <head><title>Calendar Connection Failed</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                        <h1 style="color: #dc3545;">Connection Failed</h1>
                        <p>There was an error connecting your Google Calendar.</p>
                        <p>Please try again or contact support if the problem persists.</p>
                        <p><a href="/dashboard" style="color: #007bff;">Return to Dashboard</a></p>
                    </body>
                </html>
                """,
                status_code=400,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Google Calendar OAuth callback: {str(e)}")
        return HTMLResponse(
            content="""
            <html>
                <head><title>Calendar Connection Error</title></head>
                <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                    <h1 style="color: #dc3545;">Connection Error</h1>
                    <p>An unexpected error occurred while connecting your Google Calendar.</p>
                    <p>Please try again later or contact support.</p>
                    <p><a href="/dashboard" style="color: #007bff;">Return to Dashboard</a></p>
                </body>
            </html>
            """,
            status_code=500,
        )


@router.get("/status")
async def get_google_calendar_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get Google Calendar connection status for the current barber
    """
    try:
        # Get barber profile
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Get connection status
        status = google_calendar_service.get_connection_status(barber.id)

        return {"barber_id": barber.id, "google_calendar": status}

    except Exception as e:
        logger.error(f"Error getting Google Calendar status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get calendar status")


@router.post("/disconnect")
async def disconnect_google_calendar(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Disconnect Google Calendar for the current barber
    """
    try:
        # Get barber profile
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Disconnect
        success = google_calendar_service.disconnect(barber.id)

        if success:
            # Log disconnection
            log_user_action(
                action="google_calendar_disconnected",
                user_id=current_user.id,
                details={"barber_id": barber.id},
            )

            return {"message": "Google Calendar disconnected successfully"}
        else:
            raise HTTPException(
                status_code=500, detail="Failed to disconnect Google Calendar"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting Google Calendar: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to disconnect calendar")


@router.get("/events")
async def get_google_calendar_events(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Google Calendar events for the current barber
    """
    try:
        # Get barber profile
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber profile not found")

        # Check if calendar is connected
        if not google_calendar_service.is_connected(barber.id):
            raise HTTPException(status_code=400, detail="Google Calendar not connected")

        # Parse dates
        from datetime import datetime

        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
            )

        # Get events
        events = google_calendar_service.get_calendar_events(
            barber_id=barber.id, start_date=start_dt, end_date=end_dt
        )

        return {
            "barber_id": barber.id,
            "start_date": start_date,
            "end_date": end_date,
            "events": events,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Google Calendar events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get calendar events")


@router.post("/sync-appointment/{appointment_id}")
async def sync_appointment_to_google_calendar(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually sync a specific appointment to Google Calendar
    """
    try:
        # Get appointment
        from models.appointment import Appointment

        appointment = (
            db.query(Appointment).filter(Appointment.id == appointment_id).first()
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        # Check permissions
        rbac = RBACService(db)
        if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
            if rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
                barber = (
                    db.query(Barber).filter(Barber.user_id == current_user.id).first()
                )
                if not barber or appointment.barber_id != barber.id:
                    raise HTTPException(
                        status_code=403, detail="Can only sync own appointments"
                    )
            else:
                raise HTTPException(
                    status_code=403, detail="No permission to sync appointments"
                )

        # Sync appointment
        event_id = google_calendar_service.sync_appointment(
            appointment, action="create"
        )

        if event_id:
            # Update appointment with Google Calendar event ID
            appointment.google_calendar_event_id = event_id
            db.commit()

            return {
                "message": "Appointment synced to Google Calendar successfully",
                "appointment_id": appointment_id,
                "google_calendar_event_id": event_id,
            }
        else:
            raise HTTPException(
                status_code=400, detail="Failed to sync appointment to Google Calendar"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error syncing appointment {appointment_id} to Google Calendar: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Failed to sync appointment")
