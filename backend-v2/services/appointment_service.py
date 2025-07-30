"""
Appointment Service for BookedBarber V2

Handles appointment-related business logic including creation, updates,
availability checking, and conflict resolution.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, time, timedelta
from decimal import Decimal

from models import Appointment, Client, Service, User, BarberAvailability
from utils.audit_logger_bypass import get_audit_logger
import logging

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class AppointmentService:
    """Service class for appointment operations."""

    @staticmethod
    async def create_appointment(
        db: Session,
        barber_id: int,
        client_id: int,
        service_id: int,
        appointment_datetime: datetime,
        duration_minutes: Optional[int] = None,
        notes: Optional[str] = None,
        created_via: str = "api",
        api_key_id: Optional[int] = None
    ) -> Appointment:
        """
        Create a new appointment with validation and conflict checking.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            client_id: ID of the client
            service_id: ID of the service
            appointment_datetime: Appointment date and time
            duration_minutes: Duration override (uses service default if None)
            notes: Optional appointment notes
            created_via: Source of creation (api, public_api, etc.)
            api_key_id: API key ID if created via API
            
        Returns:
            Created appointment
            
        Raises:
            ValueError: If validation fails or conflicts exist
        """
        try:
            # Validate barber exists
            barber = db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber with ID {barber_id} not found")
            
            # Validate client exists
            client = db.query(Client).filter(Client.id == client_id).first()
            if not client:
                raise ValueError(f"Client with ID {client_id} not found")
            
            # Validate service exists and belongs to barber
            service = db.query(Service).filter(
                and_(Service.id == service_id, Service.barber_id == barber_id)
            ).first()
            if not service:
                raise ValueError(f"Service with ID {service_id} not found for barber {barber_id}")
            
            # Use service duration if not provided
            if duration_minutes is None:
                duration_minutes = service.duration_minutes
            
            # Calculate end time
            end_datetime = appointment_datetime + timedelta(minutes=duration_minutes)
            
            # Check for conflicts
            conflicts = await AppointmentService._check_conflicts(
                db=db,
                barber_id=barber_id,
                start_datetime=appointment_datetime,
                end_datetime=end_datetime,
                exclude_appointment_id=None
            )
            
            if conflicts:
                conflict_times = [f"{c.appointment_datetime.strftime('%Y-%m-%d %H:%M')}" for c in conflicts]
                raise ValueError(f"Appointment conflicts with existing appointments: {', '.join(conflict_times)}")
            
            # Check barber availability
            is_available = await AppointmentService._check_barber_availability(
                db=db,
                barber_id=barber_id,
                appointment_datetime=appointment_datetime,
                duration_minutes=duration_minutes
            )
            
            if not is_available:
                raise ValueError(f"Barber is not available at {appointment_datetime.strftime('%Y-%m-%d %H:%M')}")
            
            # Create appointment
            appointment = Appointment(
                barber_id=barber_id,
                client_id=client_id,
                service_id=service_id,
                appointment_datetime=appointment_datetime,
                duration_minutes=duration_minutes,
                status="confirmed",
                notes=notes,
                created_at=datetime.utcnow()
            )
            
            db.add(appointment)
            db.commit()
            db.refresh(appointment)
            
            # Log appointment creation
            audit_logger.log_business_event(
                "appointment_created",
                details={
                    "appointment_id": appointment.id,
                    "barber_id": barber_id,
                    "client_id": client_id,
                    "service_id": service_id,
                    "appointment_datetime": appointment_datetime.isoformat(),
                    "duration_minutes": duration_minutes,
                    "created_via": created_via,
                    "api_key_id": api_key_id
                }
            )
            
            return appointment
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create appointment: {e}")
            raise

    @staticmethod
    async def list_appointments(
        db: Session,
        filters: Dict[str, Any],
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Appointment], int]:
        """
        List appointments with filtering and pagination.
        
        Args:
            db: Database session
            filters: Dictionary of filters to apply
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            Tuple of (appointments, total_count)
        """
        try:
            # Build base query
            query = db.query(Appointment)
            
            # Apply filters
            if filters.get("barber_id"):
                query = query.filter(Appointment.barber_id == filters["barber_id"])
            
            if filters.get("client_id"):
                query = query.filter(Appointment.client_id == filters["client_id"])
            
            if filters.get("service_id"):
                query = query.filter(Appointment.service_id == filters["service_id"])
            
            if filters.get("status"):
                query = query.filter(Appointment.status == filters["status"])
            
            if filters.get("start_date"):
                query = query.filter(
                    func.date(Appointment.appointment_datetime) >= filters["start_date"]
                )
            
            if filters.get("end_date"):
                query = query.filter(
                    func.date(Appointment.appointment_datetime) <= filters["end_date"]
                )
            
            # Get total count
            total_count = query.count()
            
            # Apply pagination and ordering
            appointments = query.order_by(
                Appointment.appointment_datetime.desc()
            ).offset(offset).limit(limit).all()
            
            return appointments, total_count
            
        except Exception as e:
            logger.error(f"Failed to list appointments: {e}")
            raise

    @staticmethod
    async def update_appointment(
        db: Session,
        appointment: Appointment,
        update_data: Dict[str, Any],
        updated_via: str = "api",
        api_key_id: Optional[int] = None
    ) -> Appointment:
        """
        Update an existing appointment with validation.
        
        Args:
            db: Database session
            appointment: Appointment to update
            update_data: Dictionary of fields to update
            updated_via: Source of update
            api_key_id: API key ID if updated via API
            
        Returns:
            Updated appointment
            
        Raises:
            ValueError: If validation fails
        """
        try:
            # Validate status transitions
            current_status = appointment.status
            new_status = update_data.get("status")
            
            if new_status and not AppointmentService._is_valid_status_transition(current_status, new_status):
                raise ValueError(f"Invalid status transition from {current_status} to {new_status}")
            
            # Check for conflicts if datetime is being updated
            if "appointment_datetime" in update_data:
                new_datetime = update_data["appointment_datetime"]
                duration = update_data.get("duration_minutes", appointment.duration_minutes)
                end_datetime = new_datetime + timedelta(minutes=duration)
                
                conflicts = await AppointmentService._check_conflicts(
                    db=db,
                    barber_id=appointment.barber_id,
                    start_datetime=new_datetime,
                    end_datetime=end_datetime,
                    exclude_appointment_id=appointment.id
                )
                
                if conflicts:
                    conflict_times = [f"{c.appointment_datetime.strftime('%Y-%m-%d %H:%M')}" for c in conflicts]
                    raise ValueError(f"Updated time conflicts with existing appointments: {', '.join(conflict_times)}")
            
            # Apply updates
            for field, value in update_data.items():
                if hasattr(appointment, field):
                    setattr(appointment, field, value)
            
            appointment.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(appointment)
            
            # Log appointment update
            audit_logger.log_business_event(
                "appointment_updated",
                details={
                    "appointment_id": appointment.id,
                    "update_data": update_data,
                    "updated_via": updated_via,
                    "api_key_id": api_key_id
                }
            )
            
            return appointment
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update appointment: {e}")
            raise

    @staticmethod
    async def cancel_appointment(
        db: Session,
        appointment: Appointment,
        reason: Optional[str] = None,
        cancelled_via: str = "api",
        api_key_id: Optional[int] = None
    ) -> Appointment:
        """
        Cancel an appointment.
        
        Args:
            db: Database session
            appointment: Appointment to cancel
            reason: Cancellation reason
            cancelled_via: Source of cancellation
            api_key_id: API key ID if cancelled via API
            
        Returns:
            Cancelled appointment
        """
        try:
            # Check if appointment can be cancelled
            if appointment.status in ["completed", "cancelled"]:
                raise ValueError(f"Cannot cancel appointment with status {appointment.status}")
            
            # Update appointment status
            appointment.status = "cancelled"
            appointment.cancelled_at = datetime.utcnow()
            appointment.cancellation_reason = reason
            appointment.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(appointment)
            
            # Log appointment cancellation
            audit_logger.log_business_event(
                "appointment_cancelled",
                details={
                    "appointment_id": appointment.id,
                    "reason": reason,
                    "cancelled_via": cancelled_via,
                    "api_key_id": api_key_id
                }
            )
            
            return appointment
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to cancel appointment: {e}")
            raise

    @staticmethod
    async def check_availability(
        db: Session,
        barber_id: int,
        date: date,
        service_id: Optional[int] = None,
        duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Check availability for a specific date.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            date: Date to check
            service_id: Optional service ID for duration
            duration_minutes: Duration override
            
        Returns:
            Availability information
        """
        try:
            # Get barber
            barber = db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber with ID {barber_id} not found")
            
            # Get service duration if provided
            if service_id and not duration_minutes:
                service = db.query(Service).filter(Service.id == service_id).first()
                if service:
                    duration_minutes = service.duration_minutes
            
            if not duration_minutes:
                duration_minutes = 60  # Default duration
            
            # Get barber's working hours for the date
            working_hours = await AppointmentService._get_working_hours(db, barber_id, date)
            
            if not working_hours:
                return {
                    "date": date,
                    "barber_id": barber_id,
                    "barber_name": barber.name,
                    "available_slots": [],
                    "total_slots": 0,
                    "available_count": 0,
                    "working_hours": {}
                }
            
            # Generate time slots
            available_slots = await AppointmentService._generate_available_slots(
                db=db,
                barber_id=barber_id,
                date=date,
                working_hours=working_hours,
                duration_minutes=duration_minutes
            )
            
            return {
                "date": date,
                "barber_id": barber_id,
                "barber_name": barber.name,
                "available_slots": available_slots,
                "total_slots": len([slot for slot in available_slots]),
                "available_count": len([slot for slot in available_slots if slot["available"]]),
                "working_hours": working_hours
            }
            
        except Exception as e:
            logger.error(f"Failed to check availability: {e}")
            raise

    @staticmethod
    async def _check_conflicts(
        db: Session,
        barber_id: int,
        start_datetime: datetime,
        end_datetime: datetime,
        exclude_appointment_id: Optional[int] = None
    ) -> List[Appointment]:
        """Check for appointment conflicts."""
        query = db.query(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.status.in_(["confirmed", "in_progress"]),
                or_(
                    # Existing appointment starts during new appointment
                    and_(
                        Appointment.appointment_datetime >= start_datetime,
                        Appointment.appointment_datetime < end_datetime
                    ),
                    # Existing appointment ends during new appointment
                    and_(
                        func.datetime(
                            Appointment.appointment_datetime,
                            '+' + func.cast(Appointment.duration_minutes, str) + ' minutes'
                        ) > start_datetime,
                        func.datetime(
                            Appointment.appointment_datetime,
                            '+' + func.cast(Appointment.duration_minutes, str) + ' minutes'
                        ) <= end_datetime
                    ),
                    # New appointment is completely within existing appointment
                    and_(
                        Appointment.appointment_datetime <= start_datetime,
                        func.datetime(
                            Appointment.appointment_datetime,
                            '+' + func.cast(Appointment.duration_minutes, str) + ' minutes'
                        ) >= end_datetime
                    )
                )
            )
        )
        
        if exclude_appointment_id:
            query = query.filter(Appointment.id != exclude_appointment_id)
        
        return query.all()

    @staticmethod
    async def _check_barber_availability(
        db: Session,
        barber_id: int,
        appointment_datetime: datetime,
        duration_minutes: int
    ) -> bool:
        """Check if barber is available at the specified time."""
        # Get working hours for the date
        date_check = appointment_datetime.date()
        working_hours = await AppointmentService._get_working_hours(db, barber_id, date_check)
        
        if not working_hours:
            return False
        
        # Check if appointment time falls within working hours
        appointment_time = appointment_datetime.time()
        end_time = (appointment_datetime + timedelta(minutes=duration_minutes)).time()
        
        day_name = appointment_datetime.strftime('%A').lower()
        day_hours = working_hours.get(day_name)
        
        if not day_hours or not day_hours.get('is_working', False):
            return False
        
        start_time_str = day_hours.get('start_time')
        end_time_str = day_hours.get('end_time')
        
        if not start_time_str or not end_time_str:
            return False
        
        try:
            work_start = datetime.strptime(start_time_str, '%H:%M').time()
            work_end = datetime.strptime(end_time_str, '%H:%M').time()
            
            return (appointment_time >= work_start and 
                    end_time <= work_end)
        except ValueError:
            return False

    @staticmethod
    async def _get_working_hours(db: Session, barber_id: int, date: date) -> Dict[str, Any]:
        """Get barber's working hours for a specific date."""
        # This is a simplified implementation
        # In a real system, you would check BarberAvailability table
        # For now, return default working hours
        return {
            'monday': {'is_working': True, 'start_time': '09:00', 'end_time': '17:00'},
            'tuesday': {'is_working': True, 'start_time': '09:00', 'end_time': '17:00'},
            'wednesday': {'is_working': True, 'start_time': '09:00', 'end_time': '17:00'},
            'thursday': {'is_working': True, 'start_time': '09:00', 'end_time': '17:00'},
            'friday': {'is_working': True, 'start_time': '09:00', 'end_time': '17:00'},
            'saturday': {'is_working': True, 'start_time': '10:00', 'end_time': '16:00'},
            'sunday': {'is_working': False, 'start_time': None, 'end_time': None}
        }

    @staticmethod
    async def _generate_available_slots(
        db: Session,
        barber_id: int,
        date: date,
        working_hours: Dict[str, Any],
        duration_minutes: int
    ) -> List[Dict[str, Any]]:
        """Generate available time slots for a date."""
        day_name = date.strftime('%A').lower()
        day_hours = working_hours.get(day_name)
        
        if not day_hours or not day_hours.get('is_working', False):
            return []
        
        try:
            start_time_str = day_hours.get('start_time')
            end_time_str = day_hours.get('end_time')
            
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
            
            # Generate slots every 30 minutes
            slots = []
            current_datetime = datetime.combine(date, start_time)
            end_datetime = datetime.combine(date, end_time)
            
            while current_datetime + timedelta(minutes=duration_minutes) <= end_datetime:
                slot_end = current_datetime + timedelta(minutes=duration_minutes)
                
                # Check if this slot conflicts with existing appointments
                conflicts = await AppointmentService._check_conflicts(
                    db=db,
                    barber_id=barber_id,
                    start_datetime=current_datetime,
                    end_datetime=slot_end
                )
                
                slots.append({
                    "start_time": current_datetime.time(),
                    "end_time": slot_end.time(),
                    "available": len(conflicts) == 0,
                    "reason": "Booked" if conflicts else None
                })
                
                current_datetime += timedelta(minutes=30)  # 30-minute intervals
            
            return slots
            
        except (ValueError, TypeError):
            return []

    @staticmethod
    def _is_valid_status_transition(current_status: str, new_status: str) -> bool:
        """Check if status transition is valid."""
        valid_transitions = {
            "pending": ["confirmed", "cancelled"],
            "confirmed": ["in_progress", "completed", "cancelled", "no_show"],
            "in_progress": ["completed", "cancelled"],
            "completed": [],  # No transitions from completed
            "cancelled": [],  # No transitions from cancelled
            "no_show": ["confirmed"]  # Can reschedule no-shows
        }
        
        return new_status in valid_transitions.get(current_status, [])