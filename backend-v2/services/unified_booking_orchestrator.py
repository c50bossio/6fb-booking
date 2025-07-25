"""
Unified Booking Orchestrator Service

This service consolidates all booking-related functionality from multiple services:
- booking_service.py (core booking logic)
- guest_booking_service.py (guest booking functionality)
- booking_cache_service.py (caching layer)
- booking_intelligence_service.py (AI-powered booking insights)
- booking_rules_service.py (business rules validation)

Provides a single, unified interface for all booking operations while maintaining
backward compatibility with existing API endpoints.
"""

from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

# Models
from models import Appointment
from models.guest_booking import GuestBooking

# Schemas
from schemas_new.guest_booking import (
    GuestBookingCreate,
    PublicAvailabilityResponse,
    PublicServiceInfo,
    PublicBarberInfo
)

# Core services (to be gradually replaced)
from services.booking_service import SERVICES
from services.guest_booking_service import GuestBookingService
from services.booking_intelligence_service import BookingIntelligenceService
from services.notification_service import notification_service

# Utilities
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class BookingOrchestrator:
    """
    Unified booking service that orchestrates all booking-related operations.
    
    This class acts as a facade pattern, providing a single interface for:
    - Core booking operations (create, update, cancel)
    - Guest booking functionality
    - Availability checking and slot generation
    - Business rules validation
    - AI-powered booking intelligence
    - Caching and performance optimization
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.guest_service = GuestBookingService()
        self.intelligence_service = BookingIntelligenceService()
        
    # ==========================================
    # AVAILABILITY & SLOT MANAGEMENT
    # ==========================================
    
    @cache_result(ttl=300)  # Cache for 5 minutes
    def get_available_slots(
        self, 
        target_date: date, 
        user_timezone: Optional[str] = None,
        include_next_available: bool = True,
        barber_id: Optional[int] = None,
        service_duration: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get all available booking slots for a given date.
        
        Consolidates functionality from booking_service.py and adds caching.
        """
        try:
            # Import here to avoid circular imports
            from services.booking_service import get_available_slots, get_available_slots_with_barber_availability
            
            if barber_id:
                return get_available_slots_with_barber_availability(
                    self.db, target_date, user_timezone, barber_id, service_duration
                )
            else:
                return get_available_slots(self.db, target_date, user_timezone, include_next_available)
                
        except Exception as e:
            logger.error(f"Error getting available slots: {str(e)}")
            return {
                "date": target_date.isoformat(),
                "slots": [],
                "next_available": None,
                "business_hours": {},
                "error": "Unable to fetch availability"
            }
    
    def get_next_available_slot(
        self, 
        start_date: date, 
        user_timezone: Optional[str] = None,
        max_days_ahead: int = 7,
        barber_id: Optional[int] = None
    ) -> Optional[datetime]:
        """Find the next available booking slot from a given start date."""
        try:
            from services.booking_service import get_next_available_slot
            return get_next_available_slot(self.db, start_date, user_timezone, max_days_ahead)
        except Exception as e:
            logger.error(f"Error finding next available slot: {str(e)}")
            return None
    
    # ==========================================
    # CORE BOOKING OPERATIONS
    # ==========================================
    
    def create_booking(
        self,
        user_id: int,
        service_name: str,
        appointment_datetime: datetime,
        client_name: Optional[str] = None,
        client_email: Optional[str] = None,
        client_phone: Optional[str] = None,
        notes: Optional[str] = None,
        barber_id: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new booking for authenticated users.
        
        Consolidates create_booking from booking_service.py with enhanced validation.
        """
        try:
            # Validate business rules first
            validation_result = self._validate_booking_request(
                service_name, appointment_datetime, barber_id
            )
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": validation_result["error"],
                    "appointment": None
                }
            
            # Import and use original create_booking function
            from services.booking_service import create_booking
            
            result = create_booking(
                self.db,
                user_id=user_id,
                service_name=service_name,
                appointment_datetime=appointment_datetime,
                client_name=client_name,
                client_email=client_email,
                client_phone=client_phone,
                notes=notes,
                barber_id=barber_id,
                **kwargs
            )
            
            # Add AI-powered follow-up recommendations if booking successful
            if result.get("success") and result.get("appointment"):
                try:
                    recommendations = self.intelligence_service.generate_smart_booking_recommendations(
                        self.db, result["appointment"].id
                    )
                    result["ai_recommendations"] = recommendations
                except Exception as ai_error:
                    logger.warning(f"AI recommendations failed: {str(ai_error)}")
                    # Don't fail the booking if AI fails
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            return {
                "success": False,
                "error": "Failed to create booking",
                "appointment": None
            }
    
    def create_guest_booking(
        self,
        booking_data: GuestBookingCreate,
        organization_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a booking for guest users (no account required).
        
        Uses GuestBookingService with additional orchestration.
        """
        try:
            # Validate the booking request
            validation_result = self._validate_guest_booking_request(booking_data)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": validation_result["error"],
                    "booking": None
                }
            
            # Create the guest booking
            result = self.guest_service.create_guest_booking(self.db, booking_data, organization_id)
            
            # Add intelligent follow-up scheduling
            if result.get("success") and result.get("booking"):
                try:
                    self._schedule_guest_follow_ups(result["booking"])
                except Exception as followup_error:
                    logger.warning(f"Guest follow-up scheduling failed: {str(followup_error)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating guest booking: {str(e)}")
            return {
                "success": False,
                "error": "Failed to create guest booking",
                "booking": None
            }
    
    def cancel_booking(
        self,
        booking_id: int,
        user_id: Optional[int] = None,
        is_guest: bool = False,
        cancellation_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cancel a booking (both user and guest bookings).
        
        Unified cancellation logic with proper notifications.
        """
        try:
            if is_guest:
                return self.guest_service.cancel_guest_booking(
                    self.db, booking_id, cancellation_reason
                )
            else:
                # Handle regular user booking cancellation
                appointment = self.db.query(Appointment).filter(
                    Appointment.id == booking_id
                ).first()
                
                if not appointment:
                    return {"success": False, "error": "Booking not found"}
                
                if user_id and appointment.user_id != user_id:
                    return {"success": False, "error": "Unauthorized to cancel this booking"}
                
                # Update appointment status
                appointment.status = "cancelled"
                appointment.cancellation_reason = cancellation_reason
                appointment.cancelled_at = datetime.utcnow()
                
                self.db.commit()
                
                # Send cancellation notifications
                try:
                    notification_service.send_cancellation_notification(appointment)
                except Exception as notification_error:
                    logger.warning(f"Cancellation notification failed: {str(notification_error)}")
                
                return {
                    "success": True,
                    "message": "Booking cancelled successfully",
                    "appointment": appointment
                }
                
        except Exception as e:
            logger.error(f"Error cancelling booking: {str(e)}")
            return {
                "success": False,
                "error": "Failed to cancel booking"
            }
    
    # ==========================================
    # ORGANIZATION & PUBLIC BOOKING
    # ==========================================
    
    @cache_result(ttl=600)  # Cache for 10 minutes
    def get_organization_availability(
        self,
        organization_id: int,
        target_date: date,
        service_id: Optional[int] = None,
        barber_id: Optional[int] = None
    ) -> PublicAvailabilityResponse:
        """Get public availability for organization booking pages."""
        try:
            return self.guest_service.get_organization_availability(
                self.db, organization_id, target_date, service_id, barber_id
            )
        except Exception as e:
            logger.error(f"Error getting organization availability: {str(e)}")
            return PublicAvailabilityResponse(
                date=target_date,
                slots=[],
                services=[],
                barbers=[],
                business_hours={},
                timezone="UTC"
            )
    
    @cache_result(ttl=1800)  # Cache for 30 minutes
    def get_organization_services(self, organization_id: int) -> List[PublicServiceInfo]:
        """Get public service information for organization."""
        try:
            return self.guest_service.get_organization_services(self.db, organization_id)
        except Exception as e:
            logger.error(f"Error getting organization services: {str(e)}")
            return []
    
    @cache_result(ttl=1800)  # Cache for 30 minutes  
    def get_organization_barbers(self, organization_id: int) -> List[PublicBarberInfo]:
        """Get public barber information for organization."""
        try:
            return self.guest_service.get_organization_barbers(self.db, organization_id)
        except Exception as e:
            logger.error(f"Error getting organization barbers: {str(e)}")
            return []
    
    # ==========================================
    # BOOKING INTELLIGENCE & AI
    # ==========================================
    
    def get_booking_recommendations(
        self,
        user_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        client_history_days: int = 90
    ) -> Dict[str, Any]:
        """Get AI-powered booking recommendations."""
        try:
            if appointment_id:
                return self.intelligence_service.generate_smart_booking_recommendations(
                    self.db, appointment_id
                )
            else:
                # Generate general recommendations for user
                return {
                    "recommendations": [],
                    "message": "Appointment ID required for specific recommendations"
                }
        except Exception as e:
            logger.error(f"Error generating booking recommendations: {str(e)}")
            return {"recommendations": [], "error": "Failed to generate recommendations"}
    
    def get_follow_up_actions(self, appointment_id: int) -> List[Dict[str, Any]]:
        """Get automated follow-up actions for an appointment."""
        try:
            return self.intelligence_service.generate_automated_follow_up_actions(
                self.db, appointment_id
            )
        except Exception as e:
            logger.error(f"Error generating follow-up actions: {str(e)}")
            return []
    
    # ==========================================
    # BOOKING LOOKUP & MANAGEMENT
    # ==========================================
    
    def lookup_booking(
        self,
        booking_reference: str,
        email: Optional[str] = None,
        phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Look up a booking by reference (supports both user and guest bookings).
        """
        try:
            # Try guest booking lookup first
            guest_result = self.guest_service.lookup_guest_booking(
                self.db, booking_reference, email, phone
            )
            
            if guest_result.get("success"):
                return guest_result
            
            # Try regular appointment lookup
            appointment = self.db.query(Appointment).filter(
                or_(
                    Appointment.id == booking_reference,
                    Appointment.confirmation_code == booking_reference
                )
            ).first()
            
            if appointment:
                return {
                    "success": True,
                    "booking_type": "user",
                    "appointment": appointment,
                    "can_modify": True
                }
            
            return {
                "success": False,
                "error": "Booking not found"
            }
            
        except Exception as e:
            logger.error(f"Error looking up booking: {str(e)}")
            return {
                "success": False,
                "error": "Failed to lookup booking"
            }
    
    # ==========================================
    # BUSINESS RULES & VALIDATION
    # ==========================================
    
    def _validate_booking_request(
        self,
        service_name: str,
        appointment_datetime: datetime,
        barber_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Validate booking request against business rules."""
        try:
            # Check if service exists
            if service_name not in SERVICES:
                return {
                    "valid": False,
                    "error": f"Service '{service_name}' is not available"
                }
            
            # Check if appointment is in the future
            if appointment_datetime <= datetime.utcnow():
                return {
                    "valid": False,
                    "error": "Appointment must be scheduled for a future time"
                }
            
            # Check business hours (simplified validation)
            hour = appointment_datetime.hour
            if hour < 9 or hour > 17:  # Basic 9-5 business hours
                return {
                    "valid": False,
                    "error": "Appointment must be during business hours (9 AM - 5 PM)"
                }
            
            # Check for conflicts (simplified check)
            existing_appointment = self.db.query(Appointment).filter(
                and_(
                    Appointment.appointment_datetime == appointment_datetime,
                    Appointment.status.in_(["confirmed", "pending"])
                )
            ).first()
            
            if existing_appointment:
                return {
                    "valid": False,
                    "error": "This time slot is already booked"
                }
            
            return {"valid": True, "error": None}
            
        except Exception as e:
            logger.error(f"Error validating booking request: {str(e)}")
            return {
                "valid": False,
                "error": "Failed to validate booking request"
            }
    
    def _validate_guest_booking_request(self, booking_data: GuestBookingCreate) -> Dict[str, Any]:
        """Validate guest booking request."""
        try:
            # Basic validation
            if not booking_data.client_name or len(booking_data.client_name.strip()) < 2:
                return {
                    "valid": False,
                    "error": "Client name is required (minimum 2 characters)"
                }
            
            if not booking_data.client_email and not booking_data.client_phone:
                return {
                    "valid": False,
                    "error": "Either email or phone number is required"
                }
            
            # Validate appointment time
            if booking_data.appointment_datetime <= datetime.utcnow():
                return {
                    "valid": False,
                    "error": "Appointment must be scheduled for a future time"
                }
            
            return {"valid": True, "error": None}
            
        except Exception as e:
            logger.error(f"Error validating guest booking request: {str(e)}")
            return {
                "valid": False,
                "error": "Failed to validate guest booking request"
            }
    
    def _schedule_guest_follow_ups(self, guest_booking: GuestBooking):
        """Schedule intelligent follow-up actions for guest bookings."""
        try:
            # Schedule confirmation reminder 24 hours before
            reminder_time = guest_booking.appointment_datetime - timedelta(hours=24)
            
            if reminder_time > datetime.utcnow():
                # In a real implementation, this would schedule a background task
                logger.info(f"Scheduled reminder for guest booking {guest_booking.id} at {reminder_time}")
            
            # Schedule follow-up email 2 hours after appointment
            followup_time = guest_booking.appointment_datetime + timedelta(hours=2)
            logger.info(f"Scheduled follow-up for guest booking {guest_booking.id} at {followup_time}")
            
        except Exception as e:
            logger.error(f"Error scheduling guest follow-ups: {str(e)}")

# ==========================================
# FACTORY FUNCTION
# ==========================================

def get_booking_orchestrator(db: Session) -> BookingOrchestrator:
    """Factory function to get BookingOrchestrator instance."""
    return BookingOrchestrator(db)

# ==========================================
# BACKWARD COMPATIBILITY FUNCTIONS
# ==========================================

def get_available_slots_unified(db: Session, target_date: date, **kwargs) -> Dict[str, Any]:
    """Backward compatible function for existing code."""
    orchestrator = get_booking_orchestrator(db)
    return orchestrator.get_available_slots(target_date, **kwargs)

def create_booking_unified(db: Session, **kwargs) -> Dict[str, Any]:
    """Backward compatible function for existing code."""
    orchestrator = get_booking_orchestrator(db)
    return orchestrator.create_booking(**kwargs)

def create_guest_booking_unified(db: Session, booking_data: GuestBookingCreate, **kwargs) -> Dict[str, Any]:
    """Backward compatible function for existing code."""
    orchestrator = get_booking_orchestrator(db)
    return orchestrator.create_guest_booking(booking_data, **kwargs)