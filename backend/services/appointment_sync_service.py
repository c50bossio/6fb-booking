"""
Appointment Sync Service
Handles automatic syncing of appointments with external calendar services
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from config.database import get_db
from models.appointment import Appointment
from models.google_calendar_settings import GoogleCalendarSettings, GoogleCalendarSyncLog
from services.google_calendar_service import google_calendar_service

logger = logging.getLogger(__name__)


class AppointmentSyncService:
    """
    Service for automatically syncing appointments with external calendar services
    """

    def __init__(self):
        self.google_calendar = google_calendar_service

    def sync_appointment_on_create(self, appointment: Appointment, db: Session) -> bool:
        """
        Sync appointment when it's first created
        """
        try:
            # Check if barber has Google Calendar connected and auto-sync enabled
            settings = self._get_barber_calendar_settings(appointment.barber_id, db)
            if not settings or not settings.is_connected or not settings.sync_on_create:
                logger.debug(f"Skipping sync for appointment {appointment.id} - not configured")
                return True

            # Check sync filters
            if not self._should_sync_appointment(appointment, settings):
                logger.debug(f"Skipping sync for appointment {appointment.id} - filtered out")
                return True

            # Sync to Google Calendar
            event_id = self.google_calendar.sync_appointment(appointment, "create")
            
            if event_id:
                # Update appointment with Google Calendar event ID
                appointment.google_calendar_event_id = event_id
                
                # Log successful sync
                self._log_sync_operation(
                    appointment.barber_id,
                    appointment.id,
                    "create",
                    "to_google",
                    "success",
                    event_id,
                    db
                )
                
                logger.info(f"Successfully synced appointment {appointment.id} to Google Calendar")
                return True
            else:
                # Log failed sync
                self._log_sync_operation(
                    appointment.barber_id,
                    appointment.id,
                    "create",
                    "to_google",
                    "failed",
                    None,
                    db,
                    "Failed to create calendar event"
                )
                
                logger.warning(f"Failed to sync appointment {appointment.id} to Google Calendar")
                return False

        except Exception as e:
            logger.error(f"Error syncing appointment {appointment.id} on create: {str(e)}")
            
            # Log error
            self._log_sync_operation(
                appointment.barber_id,
                appointment.id,
                "create",
                "to_google",
                "failed",
                None,
                db,
                str(e)
            )
            
            return False

    def sync_appointment_on_update(self, appointment: Appointment, db: Session) -> bool:
        """
        Sync appointment when it's updated
        """
        try:
            # Check if barber has Google Calendar connected and auto-sync enabled
            settings = self._get_barber_calendar_settings(appointment.barber_id, db)
            if not settings or not settings.is_connected or not settings.sync_on_update:
                logger.debug(f"Skipping update sync for appointment {appointment.id} - not configured")
                return True

            # Check sync filters
            if not self._should_sync_appointment(appointment, settings):
                # If appointment was previously synced but now filtered out, delete from calendar
                if appointment.google_calendar_event_id:
                    return self.sync_appointment_on_delete(appointment, db)
                return True

            # Sync to Google Calendar
            if appointment.google_calendar_event_id:
                # Update existing event
                event_id = self.google_calendar.sync_appointment(appointment, "update")
                operation = "update"
            else:
                # Create new event (in case it wasn't synced before)
                event_id = self.google_calendar.sync_appointment(appointment, "create")
                operation = "create"
                if event_id:
                    appointment.google_calendar_event_id = event_id
            
            if event_id:
                # Log successful sync
                self._log_sync_operation(
                    appointment.barber_id,
                    appointment.id,
                    operation,
                    "to_google",
                    "success",
                    event_id,
                    db
                )
                
                logger.info(f"Successfully synced appointment {appointment.id} update to Google Calendar")
                return True
            else:
                # Log failed sync
                self._log_sync_operation(
                    appointment.barber_id,
                    appointment.id,
                    operation,
                    "to_google",
                    "failed",
                    appointment.google_calendar_event_id,
                    db,
                    "Failed to update calendar event"
                )
                
                logger.warning(f"Failed to sync appointment {appointment.id} update to Google Calendar")
                return False

        except Exception as e:
            logger.error(f"Error syncing appointment {appointment.id} on update: {str(e)}")
            
            # Log error
            self._log_sync_operation(
                appointment.barber_id,
                appointment.id,
                "update",
                "to_google",
                "failed",
                appointment.google_calendar_event_id,
                db,
                str(e)
            )
            
            return False

    def sync_appointment_on_delete(self, appointment: Appointment, db: Session) -> bool:
        """
        Sync appointment when it's deleted or cancelled
        """
        try:
            # Check if barber has Google Calendar connected and delete sync enabled
            settings = self._get_barber_calendar_settings(appointment.barber_id, db)
            if not settings or not settings.is_connected or not settings.sync_on_delete:
                logger.debug(f"Skipping delete sync for appointment {appointment.id} - not configured")
                return True

            # Only delete if we have a Google Calendar event ID
            if not appointment.google_calendar_event_id:
                logger.debug(f"No Google Calendar event to delete for appointment {appointment.id}")
                return True

            # Delete from Google Calendar
            success = self.google_calendar.delete_calendar_event(
                appointment.barber_id,
                appointment.google_calendar_event_id
            )
            
            if success:
                # Clear the event ID
                appointment.google_calendar_event_id = None
                
                # Log successful sync
                self._log_sync_operation(
                    appointment.barber_id,
                    appointment.id,
                    "delete",
                    "to_google",
                    "success",
                    None,
                    db
                )
                
                logger.info(f"Successfully deleted appointment {appointment.id} from Google Calendar")
                return True
            else:
                # Log failed sync
                self._log_sync_operation(
                    appointment.barber_id,
                    appointment.id,
                    "delete",
                    "to_google",
                    "failed",
                    appointment.google_calendar_event_id,
                    db,
                    "Failed to delete calendar event"
                )
                
                logger.warning(f"Failed to delete appointment {appointment.id} from Google Calendar")
                return False

        except Exception as e:
            logger.error(f"Error syncing appointment {appointment.id} on delete: {str(e)}")
            
            # Log error
            self._log_sync_operation(
                appointment.barber_id,
                appointment.id,
                "delete",
                "to_google",
                "failed",
                appointment.google_calendar_event_id,
                db,
                str(e)
            )
            
            return False

    def _get_barber_calendar_settings(self, barber_id: int, db: Session) -> Optional[GoogleCalendarSettings]:
        """
        Get calendar settings for a barber
        """
        return db.query(GoogleCalendarSettings).filter(
            GoogleCalendarSettings.barber_id == barber_id
        ).first()

    def _should_sync_appointment(self, appointment: Appointment, settings: GoogleCalendarSettings) -> bool:
        """
        Check if appointment should be synced based on settings
        """
        # Check auto sync is enabled
        if not settings.auto_sync_enabled:
            return False

        # Check sync filters
        if settings.sync_all_appointments:
            return True
        
        if settings.sync_only_confirmed and appointment.status in ['confirmed', 'completed']:
            return True
        
        if settings.sync_only_paid and appointment.payment_status == 'paid':
            return True
        
        # If specific filters are enabled but none match, don't sync
        if settings.sync_only_confirmed or settings.sync_only_paid:
            return False
        
        # Default to sync if no specific filters
        return True

    def _log_sync_operation(
        self,
        barber_id: int,
        appointment_id: int,
        operation: str,
        direction: str,
        status: str,
        google_event_id: Optional[str],
        db: Session,
        error_message: Optional[str] = None
    ):
        """
        Log sync operation to database
        """
        try:
            sync_log = GoogleCalendarSyncLog(
                barber_id=barber_id,
                appointment_id=appointment_id,
                operation=operation,
                direction=direction,
                status=status,
                google_event_id=google_event_id,
                error_message=error_message
            )
            db.add(sync_log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log sync operation: {str(e)}")
            db.rollback()

    def bulk_sync_appointments(self, barber_id: int, db: Session) -> Dict[str, Any]:
        """
        Bulk sync all appointments for a barber
        """
        try:
            # Get barber settings
            settings = self._get_barber_calendar_settings(barber_id, db)
            if not settings or not settings.is_connected:
                return {
                    "success": False,
                    "message": "Google Calendar not connected",
                    "synced_count": 0,
                    "failed_count": 0,
                    "errors": []
                }

            # Get all future appointments for barber
            appointments = db.query(Appointment).filter(
                Appointment.barber_id == barber_id,
                Appointment.status.in_(["scheduled", "confirmed"]),
                Appointment.appointment_date >= datetime.now().date()
            ).all()

            synced_count = 0
            failed_count = 0
            errors = []

            for appointment in appointments:
                try:
                    if not self._should_sync_appointment(appointment, settings):
                        continue

                    if appointment.google_calendar_event_id:
                        # Update existing
                        event_id = self.google_calendar.sync_appointment(appointment, "update")
                        operation = "update"
                    else:
                        # Create new
                        event_id = self.google_calendar.sync_appointment(appointment, "create")
                        operation = "create"
                        if event_id:
                            appointment.google_calendar_event_id = event_id

                    if event_id:
                        synced_count += 1
                        self._log_sync_operation(
                            barber_id,
                            appointment.id,
                            operation,
                            "to_google",
                            "success",
                            event_id,
                            db
                        )
                    else:
                        failed_count += 1
                        error_msg = f"Failed to sync appointment {appointment.id}"
                        errors.append(error_msg)
                        self._log_sync_operation(
                            barber_id,
                            appointment.id,
                            operation,
                            "to_google",
                            "failed",
                            None,
                            db,
                            error_msg
                        )

                except Exception as e:
                    failed_count += 1
                    error_msg = f"Error syncing appointment {appointment.id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)

            # Update last sync date
            settings.last_sync_date = datetime.utcnow()
            db.commit()

            return {
                "success": failed_count == 0,
                "message": f"Bulk sync completed. {synced_count} synced, {failed_count} failed.",
                "synced_count": synced_count,
                "failed_count": failed_count,
                "errors": errors[:10]  # Limit error messages
            }

        except Exception as e:
            error_msg = f"Bulk sync failed: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "message": error_msg,
                "synced_count": 0,
                "failed_count": 0,
                "errors": [error_msg]
            }


# Global instance
appointment_sync_service = AppointmentSyncService()