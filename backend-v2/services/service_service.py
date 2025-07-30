"""
Service Service for BookedBarber V2

Handles service-related business logic including listing, pricing,
and availability management for the public API.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

from models import Service, User
from utils.audit_logger_bypass import get_audit_logger
import logging

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class ServiceService:
    """Service class for service operations."""

    @staticmethod
    async def list_services(
        db: Session,
        barber_id: int,
        active_only: bool = True,
        category: Optional[str] = None
    ) -> List[Service]:
        """
        List services offered by a barber.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            active_only: Only return active services
            category: Filter by service category
            
        Returns:
            List of services
        """
        try:
            # Build base query
            query = db.query(Service).filter(Service.barber_id == barber_id)
            
            # Apply active filter
            if active_only:
                query = query.filter(Service.is_active == True)
            
            # Apply category filter
            if category:
                query = query.filter(Service.category == category)
            
            # Order by name
            services = query.order_by(Service.name.asc()).all()
            
            return services
            
        except Exception as e:
            logger.error(f"Failed to list services: {e}")
            raise

    @staticmethod
    async def get_service_with_pricing(
        db: Session,
        service_id: int,
        barber_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get service with detailed pricing information.
        
        Args:
            db: Database session
            service_id: ID of the service
            barber_id: ID of the barber (for security)
            
        Returns:
            Service data with pricing details or None if not found
        """
        try:
            service = db.query(Service).filter(
                and_(
                    Service.id == service_id,
                    Service.barber_id == barber_id
                )
            ).first()
            
            if not service:
                return None
            
            # Calculate pricing analytics (if needed)
            pricing_analytics = await ServiceService._calculate_service_analytics(
                db, service_id, barber_id
            )
            
            return {
                "service": service,
                "pricing_analytics": pricing_analytics,
                "bookings_this_month": pricing_analytics.get("bookings_this_month", 0),
                "revenue_this_month": pricing_analytics.get("revenue_this_month", 0),
                "average_rating": pricing_analytics.get("average_rating", 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get service with pricing: {e}")
            return None

    @staticmethod
    async def get_service_categories(
        db: Session,
        barber_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get available service categories for a barber.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            
        Returns:
            List of categories with counts
        """
        try:
            # Get categories with service counts
            categories = db.query(
                Service.category,
                func.count(Service.id).label('service_count')
            ).filter(
                and_(
                    Service.barber_id == barber_id,
                    Service.is_active == True
                )
            ).group_by(Service.category).all()
            
            return [
                {
                    "category": category,
                    "service_count": count
                }
                for category, count in categories
            ]
            
        except Exception as e:
            logger.error(f"Failed to get service categories: {e}")
            return []

    @staticmethod
    async def search_services(
        db: Session,
        barber_id: int,
        search_term: str,
        active_only: bool = True
    ) -> List[Service]:
        """
        Search services by name or description.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            search_term: Search term
            active_only: Only return active services
            
        Returns:
            List of matching services
        """
        try:
            query = db.query(Service).filter(Service.barber_id == barber_id)
            
            # Apply active filter
            if active_only:
                query = query.filter(Service.is_active == True)
            
            # Apply search filter
            search_filter = or_(
                Service.name.ilike(f"%{search_term}%"),
                Service.description.ilike(f"%{search_term}%")
            )
            query = query.filter(search_filter)
            
            return query.order_by(Service.name.asc()).all()
            
        except Exception as e:
            logger.error(f"Failed to search services: {e}")
            return []

    @staticmethod
    async def get_popular_services(
        db: Session,
        barber_id: int,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get most popular services based on booking frequency.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            limit: Maximum number of services to return
            
        Returns:
            List of popular services with booking counts
        """
        try:
            from models import Appointment
            
            # Query most booked services
            popular_services = db.query(
                Service,
                func.count(Appointment.id).label('booking_count')
            ).join(
                Appointment, Service.id == Appointment.service_id
            ).filter(
                and_(
                    Service.barber_id == barber_id,
                    Service.is_active == True,
                    Appointment.status.in_(['completed', 'confirmed'])
                )
            ).group_by(
                Service.id
            ).order_by(
                func.count(Appointment.id).desc()
            ).limit(limit).all()
            
            return [
                {
                    "service": service,
                    "booking_count": booking_count
                }
                for service, booking_count in popular_services
            ]
            
        except Exception as e:
            logger.error(f"Failed to get popular services: {e}")
            return []

    @staticmethod
    async def get_service_availability_requirements(
        db: Session,
        service_id: int,
        barber_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get service availability requirements and constraints.
        
        Args:
            db: Database session
            service_id: ID of the service
            barber_id: ID of the barber
            
        Returns:
            Service availability requirements or None if not found
        """
        try:
            service = db.query(Service).filter(
                and_(
                    Service.id == service_id,
                    Service.barber_id == barber_id
                )
            ).first()
            
            if not service:
                return None
            
            return {
                "service_id": service_id,
                "duration_minutes": service.duration_minutes,
                "requires_booking": getattr(service, 'requires_booking', True),
                "advance_booking_hours": getattr(service, 'advance_booking_hours', 24),
                "buffer_minutes_before": getattr(service, 'buffer_minutes_before', 0),
                "buffer_minutes_after": getattr(service, 'buffer_minutes_after', 0),
                "max_daily_bookings": getattr(service, 'max_daily_bookings', None),
                "allowed_days": getattr(service, 'allowed_days', None),
                "allowed_times": getattr(service, 'allowed_times', None)
            }
            
        except Exception as e:
            logger.error(f"Failed to get service availability requirements: {e}")
            return None

    @staticmethod
    async def validate_service_booking(
        db: Session,
        service_id: int,
        barber_id: int,
        appointment_datetime: datetime
    ) -> Dict[str, Any]:
        """
        Validate if a service can be booked at a specific time.
        
        Args:
            db: Database session
            service_id: ID of the service
            barber_id: ID of the barber
            appointment_datetime: Proposed appointment time
            
        Returns:
            Validation result with any constraints or errors
        """
        try:
            service = db.query(Service).filter(
                and_(
                    Service.id == service_id,
                    Service.barber_id == barber_id
                )
            ).first()
            
            if not service:
                return {
                    "valid": False,
                    "error": "Service not found"
                }
            
            validation_errors = []
            
            # Check if service is active
            if not service.is_active:
                validation_errors.append("Service is not currently available")
            
            # Check advance booking requirements
            advance_booking_hours = getattr(service, 'advance_booking_hours', 24)
            if appointment_datetime < datetime.utcnow().replace(microsecond=0) + timedelta(hours=advance_booking_hours):
                validation_errors.append(f"Service requires {advance_booking_hours} hours advance booking")
            
            # Check allowed days
            allowed_days = getattr(service, 'allowed_days', None)
            if allowed_days and appointment_datetime.strftime('%A').lower() not in [day.lower() for day in allowed_days]:
                validation_errors.append(f"Service is not available on {appointment_datetime.strftime('%A')}")
            
            # Check allowed times
            allowed_times = getattr(service, 'allowed_times', None)
            if allowed_times:
                appointment_time = appointment_datetime.time()
                time_allowed = any(
                    start_time <= appointment_time <= end_time
                    for start_time, end_time in allowed_times
                )
                if not time_allowed:
                    validation_errors.append("Service is not available at this time")
            
            # Check daily booking limits
            max_daily_bookings = getattr(service, 'max_daily_bookings', None)
            if max_daily_bookings:
                from models import Appointment
                
                daily_bookings = db.query(Appointment).filter(
                    and_(
                        Appointment.service_id == service_id,
                        Appointment.barber_id == barber_id,
                        func.date(Appointment.appointment_datetime) == appointment_datetime.date(),
                        Appointment.status.in_(['confirmed', 'completed'])
                    )
                ).count()
                
                if daily_bookings >= max_daily_bookings:
                    validation_errors.append(f"Daily booking limit ({max_daily_bookings}) reached for this service")
            
            return {
                "valid": len(validation_errors) == 0,
                "errors": validation_errors,
                "service_name": service.name,
                "duration_minutes": service.duration_minutes,
                "price": service.price
            }
            
        except Exception as e:
            logger.error(f"Failed to validate service booking: {e}")
            return {
                "valid": False,
                "error": f"Validation failed: {str(e)}"
            }

    @staticmethod
    async def _calculate_service_analytics(
        db: Session,
        service_id: int,
        barber_id: int
    ) -> Dict[str, Any]:
        """Calculate analytics for a service."""
        try:
            from models import Appointment
            from datetime import datetime, timedelta
            
            # Get appointments for this service in the last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            appointments = db.query(Appointment).filter(
                and_(
                    Appointment.service_id == service_id,
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_datetime >= thirty_days_ago
                )
            ).all()
            
            completed_appointments = [apt for apt in appointments if apt.status == "completed"]
            
            bookings_this_month = len(appointments)
            revenue_this_month = sum([apt.service.price for apt in completed_appointments if apt.service])
            
            # Calculate average rating (placeholder - would integrate with review system)
            average_rating = 4.5  # Default rating
            
            return {
                "bookings_this_month": bookings_this_month,
                "revenue_this_month": float(revenue_this_month),
                "average_rating": average_rating,
                "completion_rate": len(completed_appointments) / len(appointments) if appointments else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate service analytics: {e}")
            return {
                "bookings_this_month": 0,
                "revenue_this_month": 0,
                "average_rating": 0,
                "completion_rate": 0
            }