"""
Wrapper module that enhances the existing booking service with double-booking prevention.

This module monkey-patches the existing booking service to use the enhanced
versions with double-booking prevention while maintaining backward compatibility.
"""

import logging
from typing import Dict, Any, Optional
from datetime import date

# Import original booking service
import services.booking_service as original_booking_service

# Import enhanced functions
from services.booking_service_enhanced import (
    create_booking_with_double_booking_prevention,
    update_booking_with_concurrency_control,
    BookingConflictError,
    ConcurrencyError
)

logger = logging.getLogger(__name__)


def enhanced_create_booking(
    db,
    user_id: int,
    booking_date: date,
    booking_time: str,
    service: str,
    user_timezone: Optional[str] = None,
    client_id: Optional[int] = None,
    notes: Optional[str] = None,
    barber_id: Optional[int] = None,
    buffer_time_before: int = 0,
    buffer_time_after: int = 0
):
    """
    Enhanced version of create_booking with double-booking prevention.
    
    This maintains the same interface as the original function but adds
    robust concurrency control and conflict detection.
    """
    try:
        # Generate idempotency key based on request parameters
        import hashlib
        import json
        
        request_data = {
            'user_id': user_id,
            'booking_date': booking_date.isoformat(),
            'booking_time': booking_time,
            'service': service,
            'barber_id': barber_id,
            'timestamp': str(date.today())  # Daily uniqueness
        }
        
        idempotency_key = f"booking_{hashlib.md5(json.dumps(request_data, sort_keys=True).encode()).hexdigest()}"
        
        # Use enhanced creation with double-booking prevention
        return create_booking_with_double_booking_prevention(
            db=db,
            user_id=user_id,
            booking_date=booking_date,
            booking_time=booking_time,
            service=service,
            user_timezone=user_timezone,
            client_id=client_id,
            notes=notes,
            barber_id=barber_id,
            buffer_time_before=buffer_time_before,
            buffer_time_after=buffer_time_after,
            idempotency_key=idempotency_key
        )
        
    except BookingConflictError as e:
        # Convert to ValueError for backward compatibility
        raise ValueError(str(e))
    except Exception as e:
        logger.error(f"Error in enhanced create_booking: {str(e)}")
        raise


def enhanced_update_booking(
    db,
    booking_id: int,
    user_id: int,
    update_data: Dict[str, Any]
):
    """
    Enhanced version of update_booking with concurrency control.
    
    This maintains the same interface as the original function but adds
    optimistic concurrency control to prevent lost updates.
    """
    try:
        # First, get the current version
        booking = db.query(models.Appointment).filter(
            models.Appointment.id == booking_id,
            models.Appointment.user_id == user_id
        ).first()
        
        if not booking:
            return None
        
        current_version = getattr(booking, 'version', None)
        
        # Use enhanced update with concurrency control
        return update_booking_with_concurrency_control(
            db=db,
            booking_id=booking_id,
            user_id=user_id,
            update_data=update_data,
            expected_version=current_version
        )
        
    except BookingConflictError as e:
        # Convert to ValueError for backward compatibility
        raise ValueError(str(e))
    except ConcurrencyError as e:
        # Retry once on concurrency error
        logger.warning(f"Concurrency conflict detected, retrying update: {str(e)}")
        
        # Refresh and retry
        db.rollback()
        booking = db.query(models.Appointment).filter(
            models.Appointment.id == booking_id,
            models.Appointment.user_id == user_id
        ).first()
        
        if not booking:
            return None
            
        try:
            return update_booking_with_concurrency_control(
                db=db,
                booking_id=booking_id,
                user_id=user_id,
                update_data=update_data,
                expected_version=booking.version
            )
        except (BookingConflictError, ConcurrencyError) as e2:
            raise ValueError(f"Update failed after retry: {str(e2)}")
            
    except Exception as e:
        logger.error(f"Error in enhanced update_booking: {str(e)}")
        raise


def apply_double_booking_prevention():
    """
    Apply double-booking prevention by replacing the original functions
    with enhanced versions.
    
    This should be called during application startup.
    """
    logger.info("Applying double-booking prevention enhancements to booking service")
    
    # Store original functions as backup
    original_booking_service._original_create_booking = original_booking_service.create_booking
    original_booking_service._original_update_booking = original_booking_service.update_booking
    
    # Replace with enhanced versions
    original_booking_service.create_booking = enhanced_create_booking
    original_booking_service.update_booking = enhanced_update_booking
    
    logger.info("Double-booking prevention enhancements applied successfully")


def remove_double_booking_prevention():
    """
    Remove double-booking prevention by restoring original functions.
    
    This can be used for testing or to disable the enhancements.
    """
    logger.info("Removing double-booking prevention enhancements")
    
    if hasattr(original_booking_service, '_original_create_booking'):
        original_booking_service.create_booking = original_booking_service._original_create_booking
        delattr(original_booking_service, '_original_create_booking')
    
    if hasattr(original_booking_service, '_original_update_booking'):
        original_booking_service.update_booking = original_booking_service._original_update_booking
        delattr(original_booking_service, '_original_update_booking')
    
    logger.info("Double-booking prevention enhancements removed")


# Configuration function for easy integration
def configure_booking_service(enable_double_booking_prevention: bool = True):
    """
    Configure the booking service with or without double-booking prevention.
    
    Args:
        enable_double_booking_prevention: Whether to enable the enhanced features
    """
    if enable_double_booking_prevention:
        apply_double_booking_prevention()
    else:
        remove_double_booking_prevention()


# Import necessary models
import models