"""
Real-time availability API for mobile-first booking experience.
Supports the mobile calendar optimizations with live availability updates.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import asyncio
import redis
import json
import logging

from database import get_db
from models import User, Appointment, BarberProfile, Service
from utils.auth import get_current_user, get_current_user_optional
from services.redis_service import get_redis_client
from services import booking_service
from services.optimized_booking_service import get_optimized_booking_service
from utils.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/realtime-availability", tags=["real-time-availability"])

# Response models for mobile-optimized experience
class AvailabilitySlot(BaseModel):
    time: datetime
    date: datetime
    barber_id: int
    barber_name: str
    barber_avatar: Optional[str] = None
    duration: int = 30
    available: bool
    price: float
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    is_popular: bool = False
    next_available: Optional[datetime] = None
    popularity_score: Optional[int] = None

class RealTimeAvailabilityResponse(BaseModel):
    date: datetime
    total_slots: int
    available_slots: int
    slots: List[AvailabilitySlot]
    last_updated: datetime
    next_update: datetime
    cache_status: str

class QuickRebookOption(BaseModel):
    appointment_id: int
    original_date: datetime
    service_name: str
    barber_name: str
    duration: int
    price: float
    can_rebook: bool
    suggested_slots: List[AvailabilitySlot]
    reason: Optional[str] = None

class MobileBookingStats(BaseModel):
    """Statistics for mobile booking optimization"""
    peak_hours: List[int]  # Hours with highest booking activity
    average_booking_time: int  # Minutes from search to booking
    popular_services: List[Dict[str, Any]]
    recommended_times: List[datetime]
    user_preferences: Dict[str, Any]

# Cache configuration for real-time updates
AVAILABILITY_CACHE_TTL = 30  # 30 seconds for real-time feel
BARBER_CACHE_TTL = 300      # 5 minutes for barber info
STATS_CACHE_TTL = 3600      # 1 hour for booking stats

@router.get("/slots", response_model=RealTimeAvailabilityResponse)
@limiter.limit("120/minute")  # Higher limit for real-time API
async def get_real_time_availability(
    request: Request,
    date: datetime = Query(..., description="Date to get availability for"),
    barber_id: Optional[int] = Query(None, description="Specific barber ID"),
    service_id: Optional[int] = Query(None, description="Specific service ID"),
    duration: int = Query(30, description="Appointment duration in minutes"),
    location_id: Optional[int] = Query(None, description="Location ID"),
    include_popular: bool = Query(True, description="Include popularity indicators"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get real-time availability with mobile optimizations.
    
    Features:
    - Real-time slot availability (30-second cache)
    - Popularity indicators based on booking patterns
    - Smart next-available suggestions
    - Mobile-optimized response format
    """
    try:
        redis_client = get_redis_client()
        cache_key = f"availability:slots:{date.date()}:{barber_id}:{service_id}:{duration}"
        
        # Check cache first for real-time performance
        if redis_client:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                try:
                    cached_response = json.loads(cached_data)
                    cached_response['cache_status'] = 'hit'
                    return RealTimeAvailabilityResponse(**cached_response)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid cached data for key: {cache_key}")

        # Use optimized booking service for better performance
        optimized_service = get_optimized_booking_service(db)
        
        # Get availability using optimized queries
        raw_slots = optimized_service.get_barber_availability_optimized(
            target_date=date.date(),
            barber_id=barber_id,
            duration_minutes=duration
        )
        
        # Transform to API response format
        slots = []
        for raw_slot in raw_slots:
            # Get service info if specified
            service_name = None
            price = 50.0  # Default price
            if service_id:
                service = db.query(Service).filter(Service.id == service_id).first()
                if service:
                    service_name = service.name
                    price = float(service.price or 50.0)
            
            # Calculate popularity if requested
            is_popular = False
            popularity_score = None
            if include_popular and current_user:
                popularity_score = await calculate_slot_popularity(
                    db, raw_slot['barber_id'], raw_slot['time'].time(), date.weekday()
                )
                is_popular = popularity_score and popularity_score > 7
            
            # Find next available slot if this one is taken
            next_available = None
            if not raw_slot['available']:
                next_available = find_next_available_slot(
                    raw_slot['barber_id'], raw_slot['time'], 
                    datetime.combine(date.date(), time(19, 0)), {}
                )
            
            slot = AvailabilitySlot(
                time=raw_slot['time'],
                date=date,
                barber_id=raw_slot['barber_id'],
                barber_name=raw_slot['barber_name'],
                barber_avatar=None,
                duration=duration,
                available=raw_slot['available'],
                price=price,
                service_id=service_id,
                service_name=service_name,
                is_popular=is_popular,
                next_available=next_available,
                popularity_score=popularity_score
            )
            slots.append(slot)
        
        # Calculate response metadata
        total_slots = len(slots)
        available_slots = sum(1 for slot in slots if slot.available)
        last_updated = datetime.utcnow()
        next_update = last_updated + timedelta(seconds=AVAILABILITY_CACHE_TTL)
        
        response_data = {
            "date": date,
            "total_slots": total_slots,
            "available_slots": available_slots,
            "slots": [slot.dict() for slot in slots],
            "last_updated": last_updated.isoformat(),
            "next_update": next_update.isoformat(),
            "cache_status": "miss"
        }
        
        # Cache the response for real-time performance
        if redis_client:
            try:
                redis_client.setex(
                    cache_key,
                    AVAILABILITY_CACHE_TTL,
                    json.dumps(response_data, default=str)
                )
            except Exception as e:
                logger.warning(f"Failed to cache availability data: {e}")
        
        return RealTimeAvailabilityResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error getting real-time availability: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve availability data"
        )

@router.get("/quick-rebook", response_model=List[QuickRebookOption])
@limiter.limit("30/minute")
async def get_quick_rebook_options(
    request: Request,
    limit: int = Query(5, description="Number of recent appointments to check"),
    days_ahead: int = Query(14, description="How many days ahead to suggest slots"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get one-click rebooking options based on user's appointment history.
    
    This addresses the mobile-first requirement for quick rebooking that's
    critical in barbershop booking (high repeat customer rate).
    """
    try:
        # Get user's recent appointments
        recent_appointments = db.query(Appointment).filter(
            and_(
                Appointment.user_id == current_user.id,
                Appointment.status.in_(['completed', 'confirmed']),
                Appointment.start_time >= datetime.utcnow() - timedelta(days=90)  # Last 90 days
            )
        ).order_by(Appointment.start_time.desc()).limit(limit).all()
        
        rebook_options = []
        
        for appointment in recent_appointments:
            # Check if this appointment type can be rebooked
            can_rebook = True
            reason = None
            
            # Get barber availability
            barber = db.query(BarberProfile).filter(BarberProfile.id == appointment.barber_id).first()
            if not barber or not barber.is_active:
                can_rebook = False
                reason = "Barber no longer available"
            
            # Get suggested slots for the next 2 weeks
            suggested_slots = []
            if can_rebook:
                suggested_slots = await get_suggested_slots_for_rebook(
                    db, appointment, days_ahead
                )
                if not suggested_slots:
                    can_rebook = False
                    reason = "No available slots in the next 2 weeks"
            
            rebook_option = QuickRebookOption(
                appointment_id=appointment.id,
                original_date=appointment.start_time,
                service_name=appointment.service_name or "Haircut",
                barber_name=barber.user.name if barber else "Unknown",
                duration=appointment.duration or 30,
                price=float(appointment.price or 50.0),
                can_rebook=can_rebook,
                suggested_slots=suggested_slots,
                reason=reason
            )
            rebook_options.append(rebook_option)
        
        return rebook_options
        
    except Exception as e:
        logger.error(f"Error getting quick rebook options: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve rebook options"
        )

@router.post("/book-slot")
@limiter.limit("10/minute")
async def book_real_time_slot(
    request: Request,
    barber_id: int,
    start_time: datetime,
    duration: int = 30,
    service_id: Optional[int] = None,
    notes: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Book a slot with real-time conflict checking and optimistic locking.
    
    This endpoint supports the mobile booking flow with immediate feedback.
    """
    try:
        # Real-time availability check
        is_still_available = await check_slot_still_available(
            db, barber_id, start_time, duration
        )
        
        if not is_still_available:
            raise HTTPException(
                status_code=409,
                detail="This slot is no longer available. Please select another time."
            )
        
        # Use optimized booking service for better performance
        optimized_service = get_optimized_booking_service(db)
        
        appointment = optimized_service.create_appointment_optimized(
            user_id=current_user.id,
            barber_id=barber_id,
            start_time=start_time,
            duration_minutes=duration,
            service_name="Haircut",  # Default service
            notes=notes
        )
        
        # Invalidate availability cache
        background_tasks.add_task(invalidate_availability_cache, start_time.date())
        
        # Send real-time notification
        background_tasks.add_task(
            send_real_time_booking_notification,
            appointment.id,
            barber_id,
            current_user.id
        )
        
        return {
            "success": True,
            "appointment_id": appointment.id,
            "confirmation_number": f"BB{appointment.id:06d}",
            "message": "Appointment booked successfully!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error booking real-time slot: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to book appointment"
        )

@router.get("/mobile-stats", response_model=MobileBookingStats)
@limiter.limit("20/minute")
async def get_mobile_booking_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get mobile-optimized booking statistics for smart suggestions.
    
    This supports the intelligent booking recommendations based on
    barbershop patterns and user preferences.
    """
    try:
        redis_client = get_redis_client()
        cache_key = f"mobile_stats:{current_user.id if current_user else 'anonymous'}"
        
        # Check cache
        if redis_client:
            cached_stats = redis_client.get(cache_key)
            if cached_stats:
                return MobileBookingStats(**json.loads(cached_stats))
        
        # Calculate peak hours (most booked times)
        peak_hours_query = text("""
            SELECT EXTRACT(hour FROM start_time) as hour, COUNT(*) as count
            FROM appointments 
            WHERE start_time >= NOW() - INTERVAL '30 days'
            AND status IN ('completed', 'confirmed')
            GROUP BY EXTRACT(hour FROM start_time)
            ORDER BY count DESC
            LIMIT 5
        """)
        
        peak_hours_result = db.execute(peak_hours_query).fetchall()
        peak_hours = [int(row[0]) for row in peak_hours_result]
        
        # Calculate average booking time (simulated for now)
        average_booking_time = 4  # 4 minutes average
        
        # Get popular services
        popular_services_query = text("""
            SELECT service_name, COUNT(*) as bookings, AVG(price) as avg_price
            FROM appointments 
            WHERE start_time >= NOW() - INTERVAL '30 days'
            AND service_name IS NOT NULL
            GROUP BY service_name
            ORDER BY bookings DESC
            LIMIT 5
        """)
        
        popular_services_result = db.execute(popular_services_query).fetchall()
        popular_services = [
            {
                "name": row[0],
                "bookings": row[1],
                "average_price": float(row[2]) if row[2] else 50.0
            }
            for row in popular_services_result
        ]
        
        # Generate recommended times based on user history or general patterns
        recommended_times = []
        if current_user:
            # User-specific recommendations
            user_appointments = db.query(Appointment).filter(
                and_(
                    Appointment.user_id == current_user.id,
                    Appointment.start_time >= datetime.utcnow() - timedelta(days=90)
                )
            ).all()
            
            if user_appointments:
                # Find user's preferred time patterns
                preferred_hours = {}
                for apt in user_appointments:
                    hour = apt.start_time.hour
                    preferred_hours[hour] = preferred_hours.get(hour, 0) + 1
                
                # Generate recommendations for next week
                most_preferred_hour = max(preferred_hours, key=preferred_hours.get)
                for days_ahead in [1, 3, 7]:  # Tomorrow, 3 days, 1 week
                    rec_time = datetime.utcnow().replace(
                        hour=most_preferred_hour, minute=0, second=0, microsecond=0
                    ) + timedelta(days=days_ahead)
                    recommended_times.append(rec_time)
        else:
            # General recommendations for non-logged-in users
            for days_ahead in [1, 2, 3]:
                for hour in peak_hours[:2]:  # Top 2 peak hours
                    rec_time = datetime.utcnow().replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    ) + timedelta(days=days_ahead)
                    recommended_times.append(rec_time)
        
        # User preferences
        user_preferences = {}
        if current_user:
            user_preferences = {
                "preferred_barbers": [],  # Could be calculated from history
                "preferred_times": peak_hours[:3],
                "average_frequency": 28,  # Days between appointments
                "preferred_services": [s["name"] for s in popular_services[:3]]
            }
        
        stats = MobileBookingStats(
            peak_hours=peak_hours,
            average_booking_time=average_booking_time,
            popular_services=popular_services,
            recommended_times=recommended_times[:5],  # Limit to 5
            user_preferences=user_preferences
        )
        
        # Cache the results
        if redis_client:
            try:
                redis_client.setex(
                    cache_key,
                    STATS_CACHE_TTL,
                    json.dumps(stats.dict(), default=str)
                )
            except Exception as e:
                logger.warning(f"Failed to cache mobile stats: {e}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting mobile booking stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve booking statistics"
        )

# Helper functions
async def calculate_slot_popularity(
    db: Session, barber_id: int, slot_time: time, weekday: int
) -> Optional[int]:
    """Calculate popularity score (1-10) for a specific time slot."""
    try:
        # Count bookings for this slot time in the last 30 days
        popularity_query = text("""
            SELECT COUNT(*) as bookings
            FROM appointments 
            WHERE barber_id = :barber_id
            AND EXTRACT(dow FROM start_time) = :weekday
            AND start_time::time BETWEEN :start_time AND :end_time
            AND start_time >= NOW() - INTERVAL '30 days'
            AND status IN ('completed', 'confirmed')
        """)
        
        start_time = slot_time
        end_time = (datetime.combine(datetime.today(), slot_time) + timedelta(minutes=30)).time()
        
        result = db.execute(popularity_query, {
            "barber_id": barber_id,
            "weekday": weekday,
            "start_time": start_time,
            "end_time": end_time
        }).fetchone()
        
        bookings = result[0] if result else 0
        
        # Convert to 1-10 scale (5+ bookings in 30 days = popular)
        return min(10, max(1, bookings * 2))
        
    except Exception as e:
        logger.warning(f"Error calculating slot popularity: {e}")
        return None

def find_next_available_slot(
    barber_id: int, 
    current_time: datetime, 
    end_time: datetime, 
    appointment_lookup: Dict[str, Any]
) -> Optional[datetime]:
    """Find the next available slot for a barber."""
    next_time = current_time + timedelta(minutes=30)
    
    while next_time < end_time:
        slot_key = f"{barber_id}:{next_time.strftime('%H:%M')}"
        if slot_key not in appointment_lookup:
            return next_time
        next_time += timedelta(minutes=30)
    
    return None

async def get_suggested_slots_for_rebook(
    db: Session, original_appointment: Appointment, days_ahead: int
) -> List[AvailabilitySlot]:
    """Get suggested slots for rebooking based on original appointment."""
    try:
        # Look for similar time slots with same barber
        original_time = original_appointment.start_time.time()
        suggested_slots = []
        
        # Check next 14 days
        for day_offset in range(1, days_ahead + 1):
            check_date = datetime.utcnow().date() + timedelta(days=day_offset)
            check_datetime = datetime.combine(check_date, original_time)
            
            # Simple availability check (would be more sophisticated in production)
            existing = db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == original_appointment.barber_id,
                    Appointment.start_time == check_datetime,
                    Appointment.status.in_(['confirmed', 'checked_in'])
                )
            ).first()
            
            if not existing:
                barber = db.query(BarberProfile).filter(BarberProfile.id == original_appointment.barber_id).first()
                if barber:
                    slot = AvailabilitySlot(
                        time=check_datetime,
                        date=check_datetime,
                        barber_id=barber.id,
                        barber_name=barber.user.name or barber.user.email,
                        duration=original_appointment.duration or 30,
                        available=True,
                        price=float(original_appointment.price or 50.0),
                        service_name=original_appointment.service_name
                    )
                    suggested_slots.append(slot)
                    
                    if len(suggested_slots) >= 3:  # Limit to 3 suggestions
                        break
        
        return suggested_slots
        
    except Exception as e:
        logger.warning(f"Error getting suggested rebook slots: {e}")
        return []

async def check_slot_still_available(
    db: Session, barber_id: int, start_time: datetime, duration: int
) -> bool:
    """Check if a slot is still available in real-time."""
    end_time = start_time + timedelta(minutes=duration)
    
    # Check for overlapping appointments
    overlapping = db.query(Appointment).filter(
        and_(
            Appointment.barber_id == barber_id,
            Appointment.status.in_(['confirmed', 'checked_in']),
            or_(
                and_(
                    Appointment.start_time <= start_time,
                    Appointment.end_time > start_time
                ),
                and_(
                    Appointment.start_time < end_time,
                    Appointment.end_time >= end_time
                ),
                and_(
                    Appointment.start_time >= start_time,
                    Appointment.end_time <= end_time
                )
            )
        )
    ).first()
    
    return overlapping is None

async def invalidate_availability_cache(date):
    """Invalidate availability cache for a specific date."""
    redis_client = get_redis_client()
    if redis_client:
        pattern = f"availability:slots:{date}:*"
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)

async def send_real_time_booking_notification(appointment_id: int, barber_id: int, user_id: int):
    """Send real-time booking notifications (placeholder for websocket/push notifications)."""
    # This would integrate with websocket notifications or push notification service
    logger.info(f"Sending real-time booking notification for appointment {appointment_id}")
    pass