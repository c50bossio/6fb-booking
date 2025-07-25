"""
Enhanced appointments router with comprehensive validation.

This module demonstrates how to use the booking validation system
in API endpoints to ensure data integrity and provide clear feedback.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, time

from db import get_db
from dependencies_v2 import require_user
from models import User, Appointment, Service
from schemas_new.booking_validation import (
    EnhancedAppointmentCreate,
    AppointmentUpdate,
    BulkAvailabilityCheck,
    get_user_friendly_error
)
from validators.booking_validators import BookingValidator
from services.booking_service import BookingService
from utils.logging_config import setup_logger

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments-enhanced"])
logger = setup_logger(__name__)


@router.post("/", response_model=dict)
async def create_appointment_with_validation(
    appointment_data: EnhancedAppointmentCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Create a new appointment with comprehensive validation.
    
    This endpoint demonstrates:
    - Input validation and sanitization
    - Business rule enforcement
    - Clear error messaging
    - Proper logging
    """
    try:
        # Log the request
        logger.info(f"User {current_user.id} creating appointment for {appointment_data.date}")
        
        # Get booking configuration
        booking_settings = db.query(BookingSettings).filter_by(
            business_id=current_user.business_id
        ).first()
        
        if not booking_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking settings not configured for this business"
            )
        
        # Configure validator with business settings
        validator_config = {
            'business_start_time': time.fromisoformat(booking_settings.business_start_time),
            'business_end_time': time.fromisoformat(booking_settings.business_end_time),
            'min_advance_minutes': booking_settings.min_lead_time_minutes,
            'max_advance_days': booking_settings.max_advance_days,
            'same_day_cutoff': time.fromisoformat(booking_settings.same_day_cutoff_time) if booking_settings.same_day_cutoff_time else None,
            'slot_duration_minutes': booking_settings.slot_duration_minutes,
            'timezone': current_user.timezone or 'UTC'
        }
        
        # Initialize validator
        validator = BookingValidator(db, validator_config)
        
        # Prepare validation data
        appointment_time = time.fromisoformat(appointment_data.time)
        validation_data = {
            'date': appointment_data.date,
            'time': appointment_time,
            'duration_minutes': appointment_data.duration_minutes or 30,
            'barber_id': appointment_data.barber_id,
            'client_id': appointment_data.client_id,
            'timezone': appointment_data.timezone
        }
        
        # Add service data if available
        if appointment_data.service_id:
            service = db.query(Service).filter_by(id=appointment_data.service_id).first()
            if service:
                validation_data['service_data'] = {
                    'requires_consultation': service.booking_rules.get('requires_consultation', False),
                    'requires_patch_test': service.booking_rules.get('requires_patch_test', False),
                    'patch_test_hours': service.booking_rules.get('patch_test_hours', 48)
                }
        
        # Run validation
        is_valid, errors = validator.validate_booking(validation_data)
        
        if not is_valid:
            # Convert technical errors to user-friendly messages
            user_errors = [get_user_friendly_error(error) for error in errors]
            
            logger.warning(f"Validation failed for user {current_user.id}: {errors}")
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Unable to create appointment",
                    "errors": user_errors
                }
            )
        
        # Create appointment using booking service
        booking_service = BookingService(db)
        
        # Prepare appointment data
        appointment = booking_service.create_appointment(
            user_id=current_user.id,
            service_id=appointment_data.service_id,
            service_name=appointment_data.service_name,
            barber_id=appointment_data.barber_id,
            client_id=appointment_data.client_id,
            appointment_date=appointment_data.date,
            appointment_time=appointment_time,
            duration_minutes=appointment_data.duration_minutes,
            price=appointment_data.price,
            notes=appointment_data.notes,
            buffer_time_before=appointment_data.buffer_time_before,
            buffer_time_after=appointment_data.buffer_time_after
        )
        
        logger.info(f"Successfully created appointment {appointment.id} for user {current_user.id}")
        
        return {
            "message": "Appointment created successfully",
            "appointment": {
                "id": appointment.id,
                "date": appointment.start_time.date().isoformat(),
                "time": appointment.start_time.time().strftime("%H:%M"),
                "service": appointment.service_name,
                "barber_id": appointment.barber_id,
                "status": appointment.status,
                "confirmation_code": f"APT{appointment.id:06d}"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating appointment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the appointment"
        )


@router.put("/{appointment_id}", response_model=dict)
async def update_appointment_with_validation(
    appointment_id: int,
    update_data: AppointmentUpdate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Update an existing appointment with validation."""
    try:
        # Get existing appointment
        appointment = db.query(Appointment).filter_by(
            id=appointment_id,
            user_id=current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if appointment can be modified
        if appointment.status in ["completed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify {appointment.status} appointments"
            )
        
        # Get booking settings
        booking_settings = db.query(BookingSettings).filter_by(
            business_id=current_user.business_id
        ).first()
        
        # Prepare updated data for validation
        updated_date = update_data.date or appointment.start_time.date()
        updated_time = time.fromisoformat(update_data.time) if update_data.time else appointment.start_time.time()
        updated_duration = update_data.duration_minutes or appointment.duration_minutes
        
        validator_config = {
            'business_start_time': time.fromisoformat(booking_settings.business_start_time),
            'business_end_time': time.fromisoformat(booking_settings.business_end_time),
            'min_advance_minutes': booking_settings.min_lead_time_minutes,
            'max_advance_days': booking_settings.max_advance_days,
            'slot_duration_minutes': booking_settings.slot_duration_minutes,
            'timezone': current_user.timezone or 'UTC'
        }
        
        validator = BookingValidator(db, validator_config)
        
        validation_data = {
            'date': updated_date,
            'time': updated_time,
            'duration_minutes': updated_duration,
            'barber_id': update_data.barber_id or appointment.barber_id,
            'client_id': appointment.client_id,
            'timezone': current_user.timezone
        }
        
        # Validate the update
        is_valid, errors = validator.validate_booking(validation_data)
        
        if not is_valid:
            user_errors = [get_user_friendly_error(error) for error in errors]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Unable to update appointment",
                    "errors": user_errors
                }
            )
        
        # Apply updates
        if update_data.date or update_data.time:
            appointment.start_time = datetime.combine(updated_date, updated_time)
        
        if update_data.duration_minutes:
            appointment.duration_minutes = update_data.duration_minutes
        
        if update_data.service_id:
            appointment.service_id = update_data.service_id
        
        if update_data.service_name:
            appointment.service_name = update_data.service_name
        
        if update_data.barber_id:
            appointment.barber_id = update_data.barber_id
        
        if update_data.notes is not None:
            appointment.notes = update_data.notes
        
        if update_data.status:
            appointment.status = update_data.status
        
        # Increment version for optimistic locking
        appointment.version += 1
        
        db.commit()
        db.refresh(appointment)
        
        logger.info(f"Successfully updated appointment {appointment_id}")
        
        return {
            "message": "Appointment updated successfully",
            "appointment": {
                "id": appointment.id,
                "date": appointment.start_time.date().isoformat(),
                "time": appointment.start_time.time().strftime("%H:%M"),
                "service": appointment.service_name,
                "status": appointment.status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating appointment {appointment_id}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the appointment"
        )


@router.post("/validate", response_model=dict)
async def validate_appointment_data(
    appointment_data: EnhancedAppointmentCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Validate appointment data without creating an appointment.
    
    Useful for real-time validation in the UI.
    """
    try:
        # Get booking settings
        booking_settings = db.query(BookingSettings).filter_by(
            business_id=current_user.business_id
        ).first()
        
        if not booking_settings:
            return {
                "valid": False,
                "errors": ["Booking settings not configured"]
            }
        
        # Configure and run validator
        validator_config = {
            'business_start_time': time.fromisoformat(booking_settings.business_start_time),
            'business_end_time': time.fromisoformat(booking_settings.business_end_time),
            'min_advance_minutes': booking_settings.min_lead_time_minutes,
            'max_advance_days': booking_settings.max_advance_days,
            'slot_duration_minutes': booking_settings.slot_duration_minutes,
            'timezone': appointment_data.timezone or current_user.timezone or 'UTC'
        }
        
        validator = BookingValidator(db, validator_config)
        
        appointment_time = time.fromisoformat(appointment_data.time)
        validation_data = {
            'date': appointment_data.date,
            'time': appointment_time,
            'duration_minutes': appointment_data.duration_minutes or 30,
            'barber_id': appointment_data.barber_id,
            'client_id': appointment_data.client_id,
            'timezone': appointment_data.timezone
        }
        
        is_valid, errors = validator.validate_booking(validation_data)
        
        return {
            "valid": is_valid,
            "errors": [get_user_friendly_error(error) for error in errors] if not is_valid else []
        }
        
    except Exception as e:
        logger.error(f"Error validating appointment: {str(e)}", exc_info=True)
        return {
            "valid": False,
            "errors": ["Unable to validate appointment data"]
        }


@router.post("/check-availability", response_model=dict)
async def check_bulk_availability(
    availability_request: BulkAvailabilityCheck,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Check availability for multiple dates.
    
    Useful for showing available dates in a calendar view.
    """
    try:
        booking_service = BookingService(db)
        availability = {}
        
        for check_date in availability_request.dates:
            # Get available slots for each date
            slots = booking_service.get_available_slots(
                date=check_date,
                service_id=availability_request.service_id,
                barber_id=availability_request.barber_id,
                timezone=availability_request.timezone
            )
            
            availability[check_date.isoformat()] = {
                "has_availability": len(slots) > 0,
                "available_slots": len(slots),
                "first_available": slots[0]['time'] if slots else None,
                "last_available": slots[-1]['time'] if slots else None
            }
        
        return {
            "dates": availability,
            "timezone": availability_request.timezone
        }
        
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to check availability"
        )


# Include this router in your main.py:
# app.include_router(appointments_enhanced.router)