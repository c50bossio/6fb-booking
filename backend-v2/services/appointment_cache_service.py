"""
Appointment Cache Service

Provides caching for appointment-related expensive operations like
availability calculations and slot generation.
"""

import json
import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session

from services.redis_service import cache_service
from utils.cache_decorators import cache_result, invalidate_pattern
from models import Appointment, BarberAvailability, User

logger = logging.getLogger(__name__)


class AppointmentCacheService:
    """
    Handles caching for appointment-related operations.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.slot_cache_ttl = 300  # 5 minutes for slot availability
        self.availability_cache_ttl = 3600  # 1 hour for barber availability
    
    def get_cached_availability_slots(
        self,
        barber_id: int,
        date: date,
        service_duration: int = 30
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached availability slots for a barber on a specific date.
        
        Args:
            barber_id: Barber user ID
            date: Date to check availability
            service_duration: Service duration in minutes
            
        Returns:
            List of available time slots or None if not cached
        """
        cache_key = f"availability:barber:{barber_id}:date:{date.isoformat()}:duration:{service_duration}"
        
        try:
            cached_data = cache_service.get(cache_key)
            if cached_data:
                logger.debug(f"Cache hit for availability slots: {cache_key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Error retrieving availability from cache: {e}")
        
        return None
    
    def cache_availability_slots(
        self,
        barber_id: int,
        date: date,
        service_duration: int,
        slots: List[Dict[str, Any]]
    ) -> bool:
        """
        Cache availability slots for a barber.
        
        Args:
            barber_id: Barber user ID
            date: Date of availability
            service_duration: Service duration in minutes
            slots: List of available time slots
            
        Returns:
            True if successfully cached
        """
        cache_key = f"availability:barber:{barber_id}:date:{date.isoformat()}:duration:{service_duration}"
        
        try:
            return cache_service.set(cache_key, slots, ttl=self.slot_cache_ttl)
        except Exception as e:
            logger.warning(f"Error caching availability slots: {e}")
            return False
    
    @cache_result(ttl=3600, prefix="barber_schedule")
    def get_barber_weekly_schedule(self, barber_id: int) -> Dict[str, Any]:
        """
        Get and cache barber's weekly availability schedule.
        
        Args:
            barber_id: Barber user ID
            
        Returns:
            Weekly schedule dictionary
        """
        schedule = {}
        
        # Get availability from database
        availabilities = self.db.query(BarberAvailability).filter(
            BarberAvailability.user_id == barber_id,
            BarberAvailability.is_available == True
        ).all()
        
        for availability in availabilities:
            day = availability.day_of_week
            if day not in schedule:
                schedule[day] = []
            
            schedule[day].append({
                "start_time": availability.start_time.isoformat(),
                "end_time": availability.end_time.isoformat(),
                "is_recurring": availability.is_recurring
            })
        
        return schedule
    
    def get_cached_booked_slots(
        self,
        barber_id: int,
        date: date
    ) -> Optional[Set[str]]:
        """
        Get cached booked slots for a barber on a specific date.
        
        Args:
            barber_id: Barber user ID
            date: Date to check
            
        Returns:
            Set of booked time strings (HH:MM format) or None if not cached
        """
        cache_key = f"booked_slots:barber:{barber_id}:date:{date.isoformat()}"
        
        try:
            cached_data = cache_service.get(cache_key)
            if cached_data:
                return set(cached_data)  # Convert list back to set
        except Exception as e:
            logger.warning(f"Error retrieving booked slots from cache: {e}")
        
        return None
    
    def cache_booked_slots(
        self,
        barber_id: int,
        date: date,
        booked_slots: Set[str]
    ) -> bool:
        """
        Cache booked slots for a barber.
        
        Args:
            barber_id: Barber user ID
            date: Date of bookings
            booked_slots: Set of booked time strings
            
        Returns:
            True if successfully cached
        """
        cache_key = f"booked_slots:barber:{barber_id}:date:{date.isoformat()}"
        
        try:
            # Convert set to list for JSON serialization
            return cache_service.set(
                cache_key,
                list(booked_slots),
                ttl=self.slot_cache_ttl
            )
        except Exception as e:
            logger.warning(f"Error caching booked slots: {e}")
            return False
    
    def invalidate_barber_availability_cache(self, barber_id: int) -> int:
        """
        Invalidate all availability cache for a barber.
        
        Args:
            barber_id: Barber user ID
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"availability:barber:{barber_id}:*",
            f"booked_slots:barber:{barber_id}:*",
            f"barber_schedule:*barber_id:{barber_id}*"
        ]
        
        total_invalidated = 0
        for pattern in patterns:
            total_invalidated += invalidate_pattern(pattern)
        
        logger.info(f"Invalidated {total_invalidated} availability cache keys for barber {barber_id}")
        return total_invalidated
    
    def invalidate_date_availability_cache(self, date: date) -> int:
        """
        Invalidate all availability cache for a specific date.
        
        Args:
            date: Date to invalidate
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"availability:*:date:{date.isoformat()}:*",
            f"booked_slots:*:date:{date.isoformat()}"
        ]
        
        total_invalidated = 0
        for pattern in patterns:
            total_invalidated += invalidate_pattern(pattern)
        
        logger.info(f"Invalidated {total_invalidated} availability cache keys for date {date}")
        return total_invalidated
    
    @cache_result(ttl=1800, prefix="appointment_stats")
    def get_appointment_statistics(
        self,
        barber_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get and cache appointment statistics for a barber.
        
        Args:
            barber_id: Barber user ID
            start_date: Start date for statistics
            end_date: End date for statistics
            
        Returns:
            Dictionary of appointment statistics
        """
        # Query appointments
        appointments = self.db.query(Appointment).filter(
            Appointment.barber_id == barber_id,
            Appointment.start_time >= datetime.combine(start_date, time.min),
            Appointment.start_time <= datetime.combine(end_date, time.max)
        ).all()
        
        # Calculate statistics
        total_appointments = len(appointments)
        completed = sum(1 for a in appointments if a.status == 'completed')
        cancelled = sum(1 for a in appointments if a.status == 'cancelled')
        no_shows = sum(1 for a in appointments if a.status == 'no_show')
        
        # Calculate utilization
        total_minutes = sum(a.duration_minutes for a in appointments if a.status == 'completed')
        working_days = (end_date - start_date).days + 1
        working_hours = working_days * 8  # Assuming 8-hour work days
        utilization_rate = (total_minutes / (working_hours * 60) * 100) if working_hours > 0 else 0
        
        return {
            "total_appointments": total_appointments,
            "completed": completed,
            "cancelled": cancelled,
            "no_shows": no_shows,
            "completion_rate": (completed / total_appointments * 100) if total_appointments > 0 else 0,
            "cancellation_rate": (cancelled / total_appointments * 100) if total_appointments > 0 else 0,
            "no_show_rate": (no_shows / total_appointments * 100) if total_appointments > 0 else 0,
            "total_working_minutes": total_minutes,
            "utilization_rate": round(utilization_rate, 2)
        }
    
    def warm_up_availability_cache(self, barber_id: int, days_ahead: int = 7):
        """
        Pre-populate availability cache for upcoming days.
        
        Args:
            barber_id: Barber user ID
            days_ahead: Number of days to cache ahead
        """
        logger.info(f"Warming up availability cache for barber {barber_id}")
        
        today = date.today()
        for i in range(days_ahead):
            check_date = today + timedelta(days=i)
            
            # Get booked slots (this will cache them)
            booked_slots = self._get_booked_slots_for_date(barber_id, check_date)
            self.cache_booked_slots(barber_id, check_date, booked_slots)
            
        logger.info(f"Availability cache warmed up for {days_ahead} days")
    
    def _get_booked_slots_for_date(self, barber_id: int, date: date) -> Set[str]:
        """
        Get booked time slots for a barber on a specific date.
        
        Args:
            barber_id: Barber user ID
            date: Date to check
            
        Returns:
            Set of booked time strings (HH:MM format)
        """
        start_datetime = datetime.combine(date, time.min)
        end_datetime = datetime.combine(date, time.max)
        
        appointments = self.db.query(Appointment).filter(
            Appointment.barber_id == barber_id,
            Appointment.start_time >= start_datetime,
            Appointment.start_time <= end_datetime,
            Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
        ).all()
        
        booked_slots = set()
        for appointment in appointments:
            # Add all time slots occupied by this appointment
            start_time = appointment.start_time.time()
            duration = appointment.duration_minutes
            
            for i in range(0, duration, 15):  # 15-minute slots
                slot_time = (datetime.combine(date, start_time) + timedelta(minutes=i)).time()
                booked_slots.add(slot_time.strftime("%H:%M"))
        
        return booked_slots