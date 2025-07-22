"""
Optimized booking service with performance improvements
Uses the new database indexes for faster queries
"""

from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, select, text
from sqlalchemy.dialects import sqlite
import models
import logging
from services.redis_service import get_redis_client
import json

logger = logging.getLogger(__name__)

class OptimizedBookingService:
    """Optimized booking service with performance improvements"""
    
    def __init__(self, db: Session):
        self.db = db
        self.redis_client = get_redis_client()
        
    def get_barber_availability_optimized(
        self, 
        target_date: date, 
        barber_id: Optional[int] = None,
        duration_minutes: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get barber availability using optimized queries with new indexes
        Uses: idx_appointments_availability_lookup, idx_barber_profiles_active
        """
        start_of_day = datetime.combine(target_date, time(8, 0))
        end_of_day = datetime.combine(target_date, time(19, 0))
        
        # Use optimized query with proper indexes
        query = (
            self.db.query(models.Appointment)
            .filter(
                models.Appointment.start_time >= start_of_day,
                models.Appointment.start_time < end_of_day,
                models.Appointment.status.in_(['confirmed', 'checked_in'])
            )
        )
        
        if barber_id:
            # Use idx_appointments_availability_lookup (barber_id, start_time, status)
            query = query.filter(models.Appointment.barber_id == barber_id)
        
        # Execute optimized query
        existing_appointments = query.all()
        
        # Build lookup dictionary for O(1) availability checks
        appointment_lookup = {}
        for apt in existing_appointments:
            slot_time = apt.start_time.strftime('%H:%M')
            key = f"{apt.barber_id}:{slot_time}"
            appointment_lookup[key] = apt
        
        # Get active barbers using optimized query
        barber_query = (
            self.db.query(models.BarberProfile)
            .filter(models.BarberProfile.is_active == True)
        )
        
        if barber_id:
            barber_query = barber_query.filter(models.BarberProfile.user_id == barber_id)
        
        active_barbers = barber_query.all()
        
        # Generate availability slots efficiently
        slots = []
        current_time = start_of_day
        
        while current_time < end_of_day:
            for barber in active_barbers:
                slot_key = f"{barber.user_id}:{current_time.strftime('%H:%M')}"
                is_available = slot_key not in appointment_lookup
                
                slots.append({
                    'time': current_time,
                    'barber_id': barber.user_id,
                    'barber_name': barber.user.name or barber.user.email,
                    'available': is_available,
                    'duration': duration_minutes
                })
            
            current_time += timedelta(minutes=duration_minutes)
        
        return slots
    
    def get_user_booking_history_optimized(
        self, 
        user_id: int, 
        limit: int = 10,
        days_back: int = 90
    ) -> List[models.Appointment]:
        """
        Get user booking history using optimized query
        Uses: idx_appointments_user_history (user_id, start_time, status)
        """
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Optimized query using the new index
        appointments = (
            self.db.query(models.Appointment)
            .filter(
                models.Appointment.user_id == user_id,
                models.Appointment.start_time >= cutoff_date,
                models.Appointment.status.in_(['completed', 'confirmed'])
            )
            .order_by(models.Appointment.start_time.desc())
            .limit(limit)
            .all()
        )
        
        return appointments
    
    def check_slot_conflicts_optimized(
        self, 
        barber_id: int, 
        start_time: datetime, 
        duration_minutes: int
    ) -> List[models.Appointment]:
        """
        Check for appointment conflicts using optimized time range query
        Uses: idx_appointments_availability_lookup and idx_appointments_time_range
        """
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Optimized conflict detection query
        conflicts = (
            self.db.query(models.Appointment)
            .filter(
                models.Appointment.barber_id == barber_id,
                models.Appointment.status.in_(['confirmed', 'checked_in']),
                # Efficient overlap detection
                models.Appointment.start_time < end_time,
                func.datetime(
                    models.Appointment.start_time, 
                    '+' + func.cast(models.Appointment.duration_minutes, sqlite.TEXT) + ' minutes'
                ) > start_time
            )
            .all()
        )
        
        return conflicts
    
    def get_popular_time_slots_cached(
        self, 
        days_back: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get popular time slots with Redis caching
        """
        cache_key = f"popular_slots:{days_back}d"
        
        # Try cache first
        if self.redis_client:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                try:
                    return json.loads(cached_data)
                except json.JSONDecodeError:
                    pass
        
        # Query with optimized index usage
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Use raw SQL for performance
        result = self.db.execute(text("""
            SELECT 
                CAST(strftime('%H', start_time) AS INTEGER) as hour,
                COUNT(*) as booking_count,
                AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
            FROM appointments 
            WHERE start_time >= :cutoff_date
                AND status IN ('completed', 'confirmed')
            GROUP BY CAST(strftime('%H', start_time) AS INTEGER)
            ORDER BY booking_count DESC
            LIMIT 10
        """), {'cutoff_date': cutoff_date}).fetchall()
        
        popular_slots = [
            {
                'hour': row[0],
                'booking_count': row[1], 
                'completion_rate': round(row[2], 2),
                'time_display': f"{row[0]:02d}:00"
            }
            for row in result
        ]
        
        # Cache for 1 hour
        if self.redis_client:
            try:
                self.redis_client.setex(
                    cache_key, 
                    3600,  # 1 hour
                    json.dumps(popular_slots)
                )
            except Exception as e:
                logger.warning(f"Failed to cache popular slots: {e}")
        
        return popular_slots
    
    def create_appointment_optimized(
        self,
        user_id: int,
        barber_id: int,
        start_time: datetime,
        duration_minutes: int = 30,
        service_name: str = "Haircut",
        notes: Optional[str] = None
    ) -> models.Appointment:
        """
        Create appointment with optimized conflict checking
        """
        # Real-time conflict check using optimized query
        conflicts = self.check_slot_conflicts_optimized(barber_id, start_time, duration_minutes)
        
        if conflicts:
            raise ValueError(f"Appointment slot conflicts with existing booking: {conflicts[0].id}")
        
        # Create appointment
        appointment = models.Appointment(
            user_id=user_id,
            barber_id=barber_id,
            start_time=start_time,
            duration_minutes=duration_minutes,
            service_name=service_name,
            notes=notes,
            status='confirmed',
            created_at=datetime.now(),
            price=50.0  # Default price
        )
        
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        
        # Invalidate relevant caches
        if self.redis_client:
            # Invalidate availability cache for this date
            date_key = start_time.date().isoformat()
            pattern = f"availability:*:{date_key}:*"
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            except Exception as e:
                logger.warning(f"Failed to invalidate cache: {e}")
        
        return appointment
    
    def get_barber_earnings_optimized(
        self,
        barber_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get barber earnings using optimized payment queries
        Uses: idx_payments_status_date
        """
        start_datetime = datetime.combine(start_date, time.min)
        end_datetime = datetime.combine(end_date, time.max)
        
        # Optimized payment query
        payments = (
            self.db.query(models.Payment)
            .filter(
                models.Payment.barber_id == barber_id,
                models.Payment.status == 'succeeded',
                models.Payment.created_at >= start_datetime,
                models.Payment.created_at <= end_datetime
            )
            .all()
        )
        
        total_revenue = sum(p.amount for p in payments)
        commission_rate = 0.20  # 20% platform commission
        barber_earnings = total_revenue * (1 - commission_rate)
        
        return {
            'total_revenue': total_revenue,
            'barber_earnings': barber_earnings,
            'commission_rate': commission_rate,
            'transaction_count': len(payments),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
    
    def get_daily_stats_optimized(self, target_date: date) -> Dict[str, Any]:
        """
        Get daily statistics using optimized queries
        """
        start_of_day = datetime.combine(target_date, time.min)
        end_of_day = datetime.combine(target_date, time.max)
        
        # Use optimized queries with indexes
        total_appointments = (
            self.db.query(func.count(models.Appointment.id))
            .filter(
                func.date(models.Appointment.start_time) == target_date,
                models.Appointment.status.in_(['confirmed', 'completed'])
            )
            .scalar()
        )
        
        completed_appointments = (
            self.db.query(func.count(models.Appointment.id))
            .filter(
                func.date(models.Appointment.start_time) == target_date,
                models.Appointment.status == 'completed'
            )
            .scalar()
        )
        
        total_revenue = (
            self.db.query(func.sum(models.Payment.amount))
            .filter(
                models.Payment.status == 'succeeded',
                models.Payment.created_at >= start_of_day,
                models.Payment.created_at <= end_of_day
            )
            .scalar() or 0
        )
        
        return {
            'date': target_date.isoformat(),
            'total_appointments': total_appointments or 0,
            'completed_appointments': completed_appointments or 0,
            'completion_rate': round((completed_appointments or 0) / max(total_appointments or 1, 1) * 100, 1),
            'total_revenue': float(total_revenue),
            'average_appointment_value': round(float(total_revenue) / max(completed_appointments or 1, 1), 2)
        }

# Factory function for optimized booking service
def get_optimized_booking_service(db: Session) -> OptimizedBookingService:
    """Get an instance of the optimized booking service"""
    return OptimizedBookingService(db)

# Utility functions that use the optimized service
def create_booking(
    db: Session,
    user_id: int,
    barber_id: int,
    start_time: datetime,
    duration: int = 30,
    service_name: str = "Haircut",
    notes: Optional[str] = None,
    **kwargs
) -> models.Appointment:
    """
    Optimized booking creation function
    """
    service = get_optimized_booking_service(db)
    return service.create_appointment_optimized(
        user_id=user_id,
        barber_id=barber_id,
        start_time=start_time,
        duration_minutes=duration,
        service_name=service_name,
        notes=notes
    )

def get_real_time_availability(
    db: Session,
    target_date: date,
    barber_id: Optional[int] = None,
    duration: int = 30
) -> List[Dict[str, Any]]:
    """
    Get real-time availability using optimized queries
    """
    service = get_optimized_booking_service(db)
    return service.get_barber_availability_optimized(
        target_date=target_date,
        barber_id=barber_id,
        duration_minutes=duration
    )