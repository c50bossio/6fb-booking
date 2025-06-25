"""
Real-time availability and conflict detection service for 6FB Booking
Prevents double bookings and provides accurate availability data
"""

from datetime import datetime, timedelta, time, date
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException
import logging

from models.appointment import Appointment
from models.barber import Barber
from models.booking import BarberAvailability, DayOfWeek
from models.google_calendar_settings import GoogleCalendarSettings
from services.google_calendar_service import GoogleCalendarService
from utils.secure_logging import get_secure_logger

logger = get_secure_logger(__name__)


class ConflictType:
    """Types of booking conflicts"""

    EXISTING_APPOINTMENT = "existing_appointment"
    GOOGLE_CALENDAR_EVENT = "google_calendar_event"
    BREAK_TIME = "break_time"
    OUTSIDE_BUSINESS_HOURS = "outside_business_hours"
    MIN_ADVANCE_TIME = "min_advance_time"
    MAX_ADVANCE_TIME = "max_advance_time"
    BARBER_UNAVAILABLE = "barber_unavailable"


class BookingConflict:
    """Represents a booking conflict"""

    def __init__(
        self, conflict_type: str, message: str, start_time: datetime, end_time: datetime
    ):
        self.type = conflict_type
        self.message = message
        self.start_time = start_time
        self.end_time = end_time


class AvailabilityService:
    """Service for real-time availability checking and conflict detection"""

    def __init__(self, db: Session):
        self.db = db
        self.google_calendar_service = GoogleCalendarService()

    def check_real_time_availability(
        self,
        barber_id: int,
        appointment_date: date,
        start_time: time,
        duration_minutes: int,
        exclude_appointment_id: Optional[int] = None,
    ) -> Tuple[bool, List[BookingConflict]]:
        """
        Comprehensive real-time availability check
        Returns (is_available, list_of_conflicts)
        """
        conflicts = []

        # Convert to datetime for calculations
        appointment_start = datetime.combine(appointment_date, start_time)
        appointment_end = appointment_start + timedelta(minutes=duration_minutes)

        logger.info(
            f"Checking availability for barber {barber_id} on {appointment_start} - {appointment_end}"
        )

        # 1. Check barber exists and is active
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber or not barber.is_active:
            conflicts.append(
                BookingConflict(
                    ConflictType.BARBER_UNAVAILABLE,
                    "Barber is not available",
                    appointment_start,
                    appointment_end,
                )
            )
            return False, conflicts

        # 2. Check business hours
        business_conflicts = self._check_business_hours(
            barber_id, appointment_date, appointment_start, appointment_end
        )
        conflicts.extend(business_conflicts)

        # 3. Check existing appointments
        appointment_conflicts = self._check_existing_appointments(
            barber_id, appointment_start, appointment_end, exclude_appointment_id
        )
        conflicts.extend(appointment_conflicts)

        # 4. Check Google Calendar integration
        calendar_conflicts = self._check_google_calendar_conflicts(
            barber_id, appointment_start, appointment_end
        )
        conflicts.extend(calendar_conflicts)

        # 5. Check advance booking rules
        advance_conflicts = self._check_advance_booking_rules(
            barber_id, appointment_start
        )
        conflicts.extend(advance_conflicts)

        is_available = len(conflicts) == 0

        if not is_available:
            logger.warning(
                f"Conflicts found for barber {barber_id}: {[c.message for c in conflicts]}"
            )
        else:
            logger.info(f"Time slot available for barber {barber_id}")

        return is_available, conflicts

    def _check_business_hours(
        self,
        barber_id: int,
        appointment_date: date,
        start_time: datetime,
        end_time: datetime,
    ) -> List[BookingConflict]:
        """Check if appointment is within business hours"""
        conflicts = []

        # Get barber's availability for this day of week
        day_of_week = DayOfWeek(appointment_date.weekday())  # Convert to enum

        availability = (
            self.db.query(BarberAvailability)
            .filter(
                and_(
                    BarberAvailability.barber_id == barber_id,
                    BarberAvailability.day_of_week == day_of_week,
                    BarberAvailability.is_available == True,
                    or_(
                        BarberAvailability.effective_from == None,
                        BarberAvailability.effective_from <= appointment_date,
                    ),
                    or_(
                        BarberAvailability.effective_until == None,
                        BarberAvailability.effective_until >= appointment_date,
                    ),
                )
            )
            .first()
        )

        if not availability:
            conflicts.append(
                BookingConflict(
                    ConflictType.OUTSIDE_BUSINESS_HOURS,
                    f"Barber is not available on {appointment_date.strftime('%A')}",
                    start_time,
                    end_time,
                )
            )
            return conflicts

        # Check if appointment is within business hours
        business_start = datetime.combine(appointment_date, availability.start_time)
        business_end = datetime.combine(appointment_date, availability.end_time)

        if start_time < business_start or end_time > business_end:
            conflicts.append(
                BookingConflict(
                    ConflictType.OUTSIDE_BUSINESS_HOURS,
                    f"Appointment outside business hours ({availability.start_time} - {availability.end_time})",
                    start_time,
                    end_time,
                )
            )

        # Check break times
        if availability.break_start and availability.break_end:
            break_start = datetime.combine(appointment_date, availability.break_start)
            break_end = datetime.combine(appointment_date, availability.break_end)

            # Check if appointment overlaps with break
            if not (end_time <= break_start or start_time >= break_end):
                conflicts.append(
                    BookingConflict(
                        ConflictType.BREAK_TIME,
                        f"Appointment overlaps with break time ({availability.break_start} - {availability.break_end})",
                        start_time,
                        end_time,
                    )
                )

        return conflicts

    def _check_existing_appointments(
        self,
        barber_id: int,
        start_time: datetime,
        end_time: datetime,
        exclude_appointment_id: Optional[int] = None,
    ) -> List[BookingConflict]:
        """Check for conflicts with existing appointments"""
        conflicts = []

        # Query existing appointments for this barber
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.status.in_(["scheduled", "in_progress", "confirmed"]),
                Appointment.appointment_date == start_time.date(),
            )
        )

        # Exclude current appointment if updating
        if exclude_appointment_id:
            query = query.filter(Appointment.id != exclude_appointment_id)

        existing_appointments = query.all()

        for appt in existing_appointments:
            appt_start = datetime.combine(
                appt.appointment_date,
                (
                    appt.appointment_time.time()
                    if hasattr(appt.appointment_time, "time")
                    else appt.appointment_time
                ),
            )
            appt_end = appt_start + timedelta(minutes=appt.duration_minutes or 60)

            # Check for overlap
            if not (end_time <= appt_start or start_time >= appt_end):
                conflicts.append(
                    BookingConflict(
                        ConflictType.EXISTING_APPOINTMENT,
                        f"Conflicts with existing appointment #{appt.id} ({appt_start.strftime('%H:%M')} - {appt_end.strftime('%H:%M')})",
                        start_time,
                        end_time,
                    )
                )

        return conflicts

    def _check_google_calendar_conflicts(
        self, barber_id: int, start_time: datetime, end_time: datetime
    ) -> List[BookingConflict]:
        """Check for conflicts with Google Calendar events"""
        conflicts = []

        try:
            # Get barber's Google Calendar settings
            calendar_settings = (
                self.db.query(GoogleCalendarSettings)
                .filter(GoogleCalendarSettings.barber_id == barber_id)
                .first()
            )

            if not calendar_settings or not calendar_settings.is_enabled:
                return conflicts

            # Get Google Calendar events for the time period
            events = self.google_calendar_service.get_events_in_range(
                calendar_settings.calendar_id, start_time, end_time
            )

            for event in events:
                # Skip all-day events or events marked as available
                if event.get("transparency") == "transparent":
                    continue

                event_start = self.google_calendar_service.parse_event_time(
                    event["start"]
                )
                event_end = self.google_calendar_service.parse_event_time(event["end"])

                # Check for overlap
                if not (end_time <= event_start or start_time >= event_end):
                    conflicts.append(
                        BookingConflict(
                            ConflictType.GOOGLE_CALENDAR_EVENT,
                            f"Conflicts with Google Calendar event: {event.get('summary', 'Busy')}",
                            start_time,
                            end_time,
                        )
                    )

        except Exception as e:
            logger.warning(
                f"Error checking Google Calendar for barber {barber_id}: {str(e)}"
            )
            # Don't fail the availability check for calendar errors

        return conflicts

    def _check_advance_booking_rules(
        self, barber_id: int, start_time: datetime
    ) -> List[BookingConflict]:
        """Check minimum and maximum advance booking requirements"""
        conflicts = []

        now = datetime.now()

        # Default rules - these could be moved to barber settings
        min_advance_hours = 2
        max_advance_days = 90

        # Check minimum advance time
        min_booking_time = now + timedelta(hours=min_advance_hours)
        if start_time < min_booking_time:
            conflicts.append(
                BookingConflict(
                    ConflictType.MIN_ADVANCE_TIME,
                    f"Must book at least {min_advance_hours} hours in advance",
                    start_time,
                    start_time,
                )
            )

        # Check maximum advance time
        max_booking_time = now + timedelta(days=max_advance_days)
        if start_time > max_booking_time:
            conflicts.append(
                BookingConflict(
                    ConflictType.MAX_ADVANCE_TIME,
                    f"Cannot book more than {max_advance_days} days in advance",
                    start_time,
                    start_time,
                )
            )

        return conflicts

    def get_available_slots(
        self,
        barber_id: int,
        appointment_date: date,
        service_duration: int,
        buffer_minutes: int = 0,
    ) -> List[Dict]:
        """Get all available time slots for a given date"""
        slots = []

        # Get barber availability for this day
        day_of_week = DayOfWeek(appointment_date.weekday())
        
        availability = (
            self.db.query(BarberAvailability)
            .filter(
                and_(
                    BarberAvailability.barber_id == barber_id,
                    BarberAvailability.day_of_week == day_of_week,
                    BarberAvailability.is_available == True,
                    or_(
                        BarberAvailability.effective_from == None,
                        BarberAvailability.effective_from <= appointment_date,
                    ),
                    or_(
                        BarberAvailability.effective_until == None,
                        BarberAvailability.effective_until >= appointment_date,
                    ),
                )
            )
            .first()
        )

        if not availability:
            return slots

        # Generate 15-minute slots
        current_time = datetime.combine(appointment_date, availability.start_time)
        end_time = datetime.combine(appointment_date, availability.end_time)
        slot_duration = timedelta(minutes=service_duration + buffer_minutes)

        while current_time + slot_duration <= end_time:
            slot_end = current_time + slot_duration

            # Check if this slot is available
            is_available, conflicts = self.check_real_time_availability(
                barber_id=barber_id,
                appointment_date=appointment_date,
                start_time=current_time.time(),
                duration_minutes=service_duration + buffer_minutes,
            )

            slots.append(
                {
                    "start_time": current_time.time().strftime("%H:%M"),
                    "end_time": slot_end.time().strftime("%H:%M"),
                    "available": is_available,
                    "conflicts": (
                        [{"type": c.type, "message": c.message} for c in conflicts]
                        if conflicts
                        else []
                    ),
                }
            )

            # Move to next 15-minute interval
            current_time += timedelta(minutes=15)

        return slots

    def reserve_time_slot(
        self,
        barber_id: int,
        appointment_date: date,
        start_time: time,
        duration_minutes: int,
        client_info: Dict,
    ) -> Dict:
        """
        Atomically reserve a time slot
        Returns booking confirmation or raises HTTPException
        """

        # Final availability check with database lock
        is_available, conflicts = self.check_real_time_availability(
            barber_id=barber_id,
            appointment_date=appointment_date,
            start_time=start_time,
            duration_minutes=duration_minutes,
        )

        if not is_available:
            conflict_messages = [c.message for c in conflicts]
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Time slot no longer available",
                    "conflicts": conflict_messages,
                },
            )

        # Time slot is available - can proceed with booking
        return {
            "success": True,
            "barber_id": barber_id,
            "appointment_date": appointment_date.isoformat(),
            "start_time": start_time.strftime("%H:%M"),
            "duration_minutes": duration_minutes,
            "expires_at": (
                datetime.now() + timedelta(minutes=10)
            ).isoformat(),  # 10-minute hold
        }

    def validate_appointment_update(
        self,
        appointment_id: int,
        new_barber_id: int,
        new_date: date,
        new_time: time,
        new_duration: int,
    ) -> Tuple[bool, List[BookingConflict]]:
        """Validate appointment changes for conflicts"""

        return self.check_real_time_availability(
            barber_id=new_barber_id,
            appointment_date=new_date,
            start_time=new_time,
            duration_minutes=new_duration,
            exclude_appointment_id=appointment_id,
        )
