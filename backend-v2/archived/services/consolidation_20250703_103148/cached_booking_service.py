"""
Cached booking service that integrates Redis caching with the existing booking service.
This service wraps the existing booking_service with caching and invalidation logic.
"""

import logging
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import models

from services.booking_cache_service import booking_cache
from services.cache_invalidation_service import cache_invalidation_manager
from services import booking_service, barber_availability_service

logger = logging.getLogger(__name__)

class CachedBookingService:
    """Booking service with Redis caching integration."""
    
    def __init__(self):
        self.cache = booking_cache
        self.invalidation = cache_invalidation_manager
    
    def get_booking_settings(self, db: Session) -> models.BookingSettings:
        """Get booking settings with caching."""
        # Try cache first
        cached_settings = self.cache.get_cached_booking_settings()
        
        if cached_settings:
            # Convert cached data back to model-like object
            settings = models.BookingSettings()
            for key, value in cached_settings.items():
                if hasattr(settings, key) and key not in ['cached_at', 'cache_ttl']:
                    if key in ['business_start_time', 'business_end_time']:
                        # Handle time objects
                        if isinstance(value, str):
                            value = datetime.strptime(value, "%H:%M:%S").time()
                    setattr(settings, key, value)
            return settings
        
        # Fallback to database
        settings = booking_service.get_booking_settings(db)
        
        # Cache the settings
        if settings:
            settings_data = {
                'business_id': settings.business_id,
                'business_start_time': settings.business_start_time.strftime("%H:%M:%S"),
                'business_end_time': settings.business_end_time.strftime("%H:%M:%S"),
                'business_timezone': settings.business_timezone,
                'slot_duration_minutes': settings.slot_duration_minutes,
                'min_lead_time_minutes': settings.min_lead_time_minutes,
                'max_advance_days': settings.max_advance_days,
                'show_soonest_available': settings.show_soonest_available
            }
            self.cache.cache_booking_settings(settings_data)
        
        return settings
    
    def get_available_slots(self, db: Session, target_date: date, 
                          user_timezone: Optional[str] = None, 
                          include_next_available: bool = True) -> Dict[str, Any]:
        """Get available time slots with caching."""
        # Try cache first
        cached_slots = self.cache.get_cached_available_slots(target_date, user_timezone)
        
        if cached_slots:
            logger.debug(f"Cache hit for available slots: {target_date}")
            # Remove cache metadata for response
            response_data = {k: v for k, v in cached_slots.items() 
                           if k not in ['cached_at', 'cache_ttl']}
            return response_data
        
        # Fallback to database
        logger.debug(f"Cache miss for available slots: {target_date}, querying database")
        slots_data = booking_service.get_available_slots(
            db, target_date, user_timezone, include_next_available
        )
        
        # Cache the result
        if slots_data:
            self.cache.cache_available_slots(target_date, slots_data, user_timezone)
        
        return slots_data
    
    def get_available_slots_with_barber_availability(
        self, db: Session, target_date: date, barber_id: Optional[int] = None, 
        service_id: Optional[int] = None, user_timezone: Optional[str] = None, 
        include_next_available: bool = True
    ) -> Dict[str, Any]:
        """Get available time slots considering barber availability with caching."""
        # Try cache first for barber-specific slots
        if barber_id:
            cached_slots = self.cache.get_cached_available_slots(
                target_date, user_timezone, barber_id
            )
            
            if cached_slots:
                logger.debug(f"Cache hit for barber {barber_id} slots: {target_date}")
                response_data = {k: v for k, v in cached_slots.items() 
                               if k not in ['cached_at', 'cache_ttl']}
                return response_data
        
        # Fallback to database
        logger.debug(f"Cache miss for barber {barber_id} slots: {target_date}, querying database")
        slots_data = booking_service.get_available_slots_with_barber_availability(
            db, target_date, barber_id, service_id, user_timezone, include_next_available
        )
        
        # Cache the result
        if slots_data and barber_id:
            self.cache.cache_available_slots(target_date, slots_data, user_timezone, barber_id)
        
        return slots_data
    
    def get_next_available_slot(self, db: Session, start_date: date, 
                              user_timezone: Optional[str] = None, 
                              max_days_ahead: int = 7) -> Optional[datetime]:
        """Find the next available slot with caching."""
        # Try cache first
        cached_next = self.cache.get_cached_next_available(start_date, user_timezone)
        
        if cached_next:
            logger.debug(f"Cache hit for next available: {start_date}")
            # Parse the cached datetime
            if 'datetime' in cached_next:
                return datetime.fromisoformat(cached_next['datetime'])
        
        # Fallback to database
        logger.debug(f"Cache miss for next available: {start_date}, querying database")
        next_slot = booking_service.get_next_available_slot(
            db, start_date, user_timezone, max_days_ahead
        )
        
        # Cache the result
        if next_slot:
            next_data = {
                'date': next_slot.date().isoformat(),
                'time': next_slot.strftime("%H:%M"),
                'datetime': next_slot.isoformat()
            }
            self.cache.cache_next_available(start_date, next_data, user_timezone)
        
        return next_slot
    
    def get_cached_barber_availability(self, db: Session, barber_id: int, 
                                     day_of_week: int) -> List[Any]:
        """Get barber availability with caching."""
        # Try cache first
        cached_availability = self.cache.get_cached_barber_availability(barber_id, day_of_week)
        
        if cached_availability:
            logger.debug(f"Cache hit for barber {barber_id} availability: day {day_of_week}")
            # Convert cached data back to model-like objects
            availability_list = []
            for av_data in cached_availability.get('availability', []):
                # Create a simple object with the availability data
                av_obj = type('BarberAvailability', (), {
                    'start_time': datetime.strptime(av_data['start_time'], "%H:%M:%S").time(),
                    'end_time': datetime.strptime(av_data['end_time'], "%H:%M:%S").time(),
                    'is_available': av_data['is_available']
                })()
                availability_list.append(av_obj)
            return availability_list
        
        # Fallback to database
        logger.debug(f"Cache miss for barber {barber_id} availability: day {day_of_week}")
        availability = barber_availability_service.get_barber_availability(db, barber_id, day_of_week)
        
        # Cache the result
        if availability:
            availability_data = [
                {
                    'start_time': av.start_time.strftime("%H:%M:%S"),
                    'end_time': av.end_time.strftime("%H:%M:%S"),
                    'is_available': av.is_available
                }
                for av in availability
            ]
            self.cache.cache_barber_availability(barber_id, availability_data, day_of_week)
        
        return availability
    
    def create_booking(self, db: Session, user_id: int, booking_date: date, 
                      booking_time: str, service: str, user_timezone: Optional[str] = None,
                      client_id: Optional[int] = None, notes: Optional[str] = None,
                      barber_id: Optional[int] = None, buffer_time_before: int = 0,
                      buffer_time_after: int = 0) -> models.Appointment:
        """Create a new booking and invalidate related cache."""
        # Create the booking using the original service
        appointment = booking_service.create_booking(
            db, user_id, booking_date, booking_time, service, user_timezone,
            client_id, notes, barber_id, buffer_time_before, buffer_time_after
        )
        
        # Invalidate related cache
        if appointment:
            self.invalidation.invalidate_appointment_created(booking_date, appointment.barber_id)
            logger.info(f"Invalidated cache after creating appointment {appointment.id}")
        
        return appointment
    
    def create_guest_booking(self, db: Session, booking_date: date, booking_time: str,
                           service: str, guest_info: Dict[str, Any], 
                           user_timezone: Optional[str] = None,
                           notes: Optional[str] = None) -> Dict[str, Any]:
        """Create a guest booking and invalidate related cache."""
        # Create the booking using the original service
        booking_data = booking_service.create_guest_booking(
            db, booking_date, booking_time, service, guest_info, user_timezone, notes
        )
        
        # Get the appointment to find barber_id
        if 'id' in booking_data:
            appointment = db.query(models.Appointment).filter(
                models.Appointment.id == booking_data['id']
            ).first()
            
            if appointment:
                self.invalidation.invalidate_appointment_created(booking_date, appointment.barber_id)
                logger.info(f"Invalidated cache after creating guest appointment {appointment.id}")
        
        return booking_data
    
    def update_booking(self, db: Session, booking_id: int, user_id: int,
                      update_data: Dict[str, Any]) -> Optional[models.Appointment]:
        """Update an existing booking and invalidate related cache."""
        # Get the current booking to track changes
        old_booking = booking_service.get_booking_by_id(db, booking_id, user_id)
        
        if not old_booking:
            return None
        
        old_date = old_booking.start_time.date()
        old_barber_id = old_booking.barber_id
        
        # Update the booking using the original service
        updated_booking = booking_service.update_booking(db, booking_id, user_id, update_data)
        
        # Invalidate related cache
        if updated_booking:
            new_date = updated_booking.start_time.date()
            new_barber_id = updated_booking.barber_id
            
            self.invalidation.invalidate_appointment_updated(
                old_date, new_date, old_barber_id, new_barber_id
            )
            logger.info(f"Invalidated cache after updating appointment {updated_booking.id}")
        
        return updated_booking
    
    def cancel_booking(self, db: Session, booking_id: int, user_id: int) -> Optional[models.Appointment]:
        """Cancel a booking and invalidate related cache."""
        # Get the booking first to determine what to invalidate
        booking = booking_service.get_booking_by_id(db, booking_id, user_id)
        
        if not booking:
            return None
        
        booking_date = booking.start_time.date()
        barber_id = booking.barber_id
        
        # Cancel the booking using the original service
        cancelled_booking = booking_service.cancel_booking(db, booking_id, user_id)
        
        # Invalidate related cache
        if cancelled_booking:
            self.invalidation.invalidate_appointment_cancelled(booking_date, barber_id)
            logger.info(f"Invalidated cache after cancelling appointment {cancelled_booking.id}")
        
        return cancelled_booking
    
    def reschedule_booking(self, db: Session, booking_id: int, user_id: int,
                          new_date: date, new_time: str, 
                          user_timezone: Optional[str] = None) -> Optional[models.Appointment]:
        """Reschedule a booking and invalidate related cache."""
        # Get the current booking to track changes
        old_booking = booking_service.get_booking_by_id(db, booking_id, user_id)
        
        if not old_booking:
            return None
        
        old_date = old_booking.start_time.date()
        old_barber_id = old_booking.barber_id
        
        # Reschedule using the original service
        rescheduled_booking = booking_service.reschedule_booking(
            db, booking_id, user_id, new_date, new_time, user_timezone
        )
        
        # Invalidate related cache
        if rescheduled_booking:
            new_barber_id = rescheduled_booking.barber_id
            
            self.invalidation.invalidate_appointment_updated(
                old_date, new_date, old_barber_id, new_barber_id
            )
            logger.info(f"Invalidated cache after rescheduling appointment {rescheduled_booking.id}")
        
        return rescheduled_booking
    
    # Read-only operations that can benefit from caching
    def get_user_bookings(self, db: Session, user_id: int, skip: int = 0, 
                         limit: int = 100, status: Optional[str] = None) -> List[models.Appointment]:
        """Get user bookings (delegated to original service, no caching needed for now)."""
        return booking_service.get_user_bookings(db, user_id, skip, limit, status)
    
    def count_user_bookings(self, db: Session, user_id: int, 
                           status: Optional[str] = None) -> int:
        """Count user bookings (delegated to original service)."""
        return booking_service.count_user_bookings(db, user_id, status)
    
    def get_booking_by_id(self, db: Session, booking_id: int, user_id: int) -> Optional[models.Appointment]:
        """Get booking by ID (delegated to original service)."""
        return booking_service.get_booking_by_id(db, booking_id, user_id)
    
    def get_all_bookings(self, db: Session, skip: int = 0, limit: int = 100,
                        status: Optional[str] = None, date_from: Optional[date] = None,
                        date_to: Optional[date] = None, 
                        barber_id: Optional[int] = None) -> List[models.Appointment]:
        """Get all bookings (delegated to original service)."""
        return booking_service.get_all_bookings(
            db, skip, limit, status, date_from, date_to, barber_id
        )
    
    def count_all_bookings(self, db: Session, status: Optional[str] = None,
                          date_from: Optional[date] = None, date_to: Optional[date] = None,
                          barber_id: Optional[int] = None) -> int:
        """Count all bookings (delegated to original service)."""
        return booking_service.count_all_bookings(db, status, date_from, date_to, barber_id)
    
    # Cache management operations
    def warm_up_cache_for_date_range(self, db: Session, start_date: date, 
                                   end_date: date, barber_ids: Optional[List[int]] = None) -> Dict[str, int]:
        """Warm up cache for a date range."""
        dates = []
        current_date = start_date
        while current_date <= end_date:
            dates.append(current_date)
            current_date += timedelta(days=1)
        
        return self.cache.warm_up_cache(db, dates, barber_ids)
    
    def invalidate_cache_for_barber(self, barber_id: int) -> int:
        """Invalidate all cache for a specific barber."""
        return self.invalidation.invalidate_barber_availability(barber_id)
    
    def invalidate_cache_for_date_range(self, start_date: date, end_date: date) -> int:
        """Invalidate cache for a date range."""
        return self.invalidation.invalidate_date_range(start_date, end_date)
    
    def get_cache_health(self) -> Dict[str, Any]:
        """Get cache health and statistics."""
        return {
            "cache_available": self.cache.is_available(),
            "cache_stats": self.cache.get_cache_stats(),
            "redis_connection": self.cache.cache.redis_manager.is_available()
        }
    
    def preload_common_data(self, db: Session) -> Dict[str, Any]:
        """Preload commonly accessed data into cache."""
        results = {
            "booking_settings": False,
            "business_hours": False,
            "errors": []
        }
        
        try:
            # Preload booking settings
            settings = self.get_booking_settings(db)
            results["booking_settings"] = True
            
            # Preload business hours
            business_hours_data = {
                "start_time": settings.business_start_time.strftime("%H:%M:%S"),
                "end_time": settings.business_end_time.strftime("%H:%M:%S"),
                "timezone": settings.business_timezone
            }
            if self.cache.cache_business_hours(business_hours_data):
                results["business_hours"] = True
            
        except Exception as e:
            logger.error(f"Failed to preload common data: {e}")
            results["errors"].append(str(e))
        
        return results

# Global cached booking service instance
cached_booking_service = CachedBookingService()