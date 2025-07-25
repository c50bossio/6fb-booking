"""Service for handling guest bookings and public booking page functionality."""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import secrets
import logging

from models import User, Service, Organization, Appointment
from models.guest_booking import GuestBooking
from services.booking_service import get_available_slots_with_barber_availability
from services.notification_service import notification_service
from schemas_new.guest_booking import (
    GuestBookingCreate,
    PublicAvailabilityResponse,
    PublicAvailabilitySlot,
    PublicServiceInfo,
    PublicBarberInfo
)

logger = logging.getLogger(__name__)


class GuestBookingService:
    """Service for managing guest bookings."""
    
    @staticmethod
    def generate_confirmation_code() -> str:
        """Generate a unique confirmation code."""
        # Generate 8-character alphanumeric code
        # Use more bytes to ensure we get enough characters after removing special chars
        while True:
            code = secrets.token_urlsafe(8).upper().replace('_', '').replace('-', '')
            if len(code) >= 8:
                return code[:8]
    
    @staticmethod
    def get_organization_availability(
        db: Session,
        organization: Organization,
        target_date: date,
        service_id: Optional[int] = None,
        barber_id: Optional[int] = None
    ) -> PublicAvailabilityResponse:
        """Get availability for an organization on a specific date."""
        
        # Get available slots using existing booking service
        slots_data = get_available_slots_with_barber_availability(
            db=db,
            target_date=target_date,
            barber_id=barber_id,
            service_id=service_id,
            user_timezone=organization.timezone,
            include_next_available=True
        )
        
        # Convert to public availability format
        public_slots = []
        
        # If barber_id is specified, use slots directly
        if barber_id:
            for slot in slots_data.get('slots', []):
                if slot['available']:
                    # Parse time to create full datetime
                    hour, minute = map(int, slot['time'].split(':'))
                    slot_datetime = datetime.combine(target_date, datetime.min.time())
                    slot_datetime = slot_datetime.replace(hour=hour, minute=minute)
                    
                    # Get barber info
                    barber = db.query(User).filter(User.id == barber_id).first()
                    
                    public_slot = PublicAvailabilitySlot(
                        time=slot['time'],
                        datetime=slot_datetime,
                        available=True,
                        duration_minutes=slot.get('duration', 30),
                        barber_id=barber_id,
                        barber_name=barber.name if barber else None
                    )
                    public_slots.append(public_slot)
        else:
            # Get all barbers in organization and their availability
            if 'barber_slots' in slots_data:
                for barber_data in slots_data['barber_slots']:
                    barber_id = barber_data['barber_id']
                    barber_name = barber_data['barber_name']
                    
                    for slot in barber_data['slots']:
                        if slot['available']:
                            hour, minute = map(int, slot['time'].split(':'))
                            slot_datetime = datetime.combine(target_date, datetime.min.time())
                            slot_datetime = slot_datetime.replace(hour=hour, minute=minute)
                            
                            public_slot = PublicAvailabilitySlot(
                                time=slot['time'],
                                datetime=slot_datetime,
                                available=True,
                                duration_minutes=slot.get('duration', 30),
                                barber_id=barber_id,
                                barber_name=barber_name
                            )
                            public_slots.append(public_slot)
        
        return PublicAvailabilityResponse(
            date=target_date.isoformat(),
            organization_id=organization.id,
            timezone=organization.timezone,
            slots=public_slots,
            next_available_date=slots_data.get('next_available_date')
        )
    
    @staticmethod
    def get_organization_services(
        db: Session,
        organization: Organization,
        active_only: bool = True
    ) -> List[PublicServiceInfo]:
        """Get services offered by an organization."""
        
        # Get all barbers in the organization
        from models import User
        from models.organization import UserOrganization
        
        barber_ids = db.query(User.id).join(
            UserOrganization,
            User.id == UserOrganization.user_id
        ).filter(
            UserOrganization.organization_id == organization.id,
            User.is_active == True,
            User.unified_role.in_(["barber", "shop_owner", "individual_barber"])
        ).all()
        barber_ids = [b[0] for b in barber_ids]
        
        if not barber_ids:
            return []
        
        # Get services from those barbers
        query = db.query(Service).filter(
            Service.user_id.in_(barber_ids)
        )
        
        if active_only:
            query = query.filter(Service.is_active == True)
        
        services = query.all()
        
        # Convert to public format
        public_services = []
        for service in services:
            public_services.append(PublicServiceInfo(
                id=service.id,
                name=service.name,
                description=service.description,
                duration=service.duration,
                price=service.price,
                is_active=service.is_active
            ))
        
        return public_services
    
    @staticmethod
    def get_organization_barbers(
        db: Session,
        organization: Organization
    ) -> List[PublicBarberInfo]:
        """Get barbers in an organization."""
        
        # Get all active barbers in the organization
        from models import User
        from models.organization import UserOrganization
        
        barbers = db.query(User).join(
            UserOrganization,
            User.id == UserOrganization.user_id
        ).filter(
            UserOrganization.organization_id == organization.id,
            User.is_active == True,
            User.unified_role.in_(["barber", "shop_owner", "individual_barber"])
        ).all()
        
        public_barbers = []
        for barber in barbers:
            # TODO: Add review ratings when review system is integrated
            public_barbers.append(PublicBarberInfo(
                id=barber.id,
                name=barber.name or barber.email.split('@')[0].title(),
                bio=None,  # TODO: Add bio field to barber profile
                photo_url=None,  # TODO: Add photo support
                specialties=None,  # TODO: Add specialties
                rating=None,
                review_count=0
            ))
        
        return public_barbers
    
    @staticmethod
    def create_guest_booking(
        db: Session,
        organization: Organization,
        booking_data: GuestBookingCreate,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> GuestBooking:
        """Create a new guest booking."""
        
        # Validate service exists and belongs to organization
        service = db.query(Service).filter(
            Service.id == booking_data.service_id,
            Service.is_active == True
        ).first()
        
        if not service:
            raise ValueError("Invalid service selected")
        
        # If no barber specified, try to find default or single barber
        barber_id = booking_data.barber_id
        if not barber_id:
            # Get barbers in organization
            from models import User
            from models.organization import UserOrganization
            
            barbers = db.query(User).join(
                UserOrganization,
                User.id == UserOrganization.user_id
            ).filter(
                UserOrganization.organization_id == organization.id,
                User.is_active == True,
                User.unified_role.in_(["barber", "shop_owner", "individual_barber"])
            ).all()
            
            if len(barbers) == 1:
                barber_id = barbers[0].id
            elif len(barbers) == 0:
                raise ValueError("No barbers available in this organization")
            else:
                raise ValueError("Please select a barber")
        
        # Validate barber belongs to organization
        from models import User
        from models.organization import UserOrganization
        
        barber = db.query(User).join(
            UserOrganization,
            User.id == UserOrganization.user_id
        ).filter(
            User.id == barber_id,
            UserOrganization.organization_id == organization.id,
            User.is_active == True
        ).first()
        
        if not barber:
            raise ValueError("Invalid barber selected")
        
        # Check availability
        # TODO: Implement availability check using booking service
        
        # Create guest booking
        guest_booking = GuestBooking(
            guest_name=booking_data.guest_name,
            guest_email=booking_data.guest_email,
            guest_phone=booking_data.guest_phone,
            organization_id=organization.id,
            barber_id=barber_id,
            service_id=service.id,
            appointment_datetime=booking_data.appointment_datetime,
            appointment_timezone=booking_data.appointment_timezone,
            duration_minutes=service.duration,
            service_price=service.price,
            status="pending",
            confirmation_code=GuestBookingService.generate_confirmation_code(),
            notes=booking_data.notes,
            marketing_consent=booking_data.marketing_consent,
            reminder_preference=booking_data.reminder_preference,
            referral_source=booking_data.referral_source,
            booking_page_url=booking_data.booking_page_url,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        db.add(guest_booking)
        db.commit()
        db.refresh(guest_booking)
        
        # Create actual appointment record
        appointment = Appointment(
            user_id=None,  # Guest booking - no user account
            barber_id=barber_id,
            service_id=service.id,
            datetime=booking_data.appointment_datetime,
            status="scheduled",
            notes=f"Guest Booking - {guest_booking.guest_name}\nEmail: {guest_booking.guest_email}\nPhone: {guest_booking.guest_phone}\n\n{booking_data.notes or ''}",
            user_timezone=booking_data.appointment_timezone,
            barber_timezone=organization.timezone
        )
        
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        
        # Update guest booking with appointment ID
        guest_booking.converted_to_appointment_id = appointment.id
        db.commit()
        
        # Send confirmation email
        try:
            GuestBookingService._send_confirmation_email(db, guest_booking)
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {e}")
        
        return guest_booking
    
    @staticmethod
    def _send_confirmation_email(db: Session, guest_booking: GuestBooking):
        """Send confirmation email for guest booking."""
        
        # Build email content
        organization = guest_booking.organization
        barber = guest_booking.barber
        service = guest_booking.service
        
        # Format appointment time in user's timezone
        from pytz import timezone as pytz_timezone
        user_tz = pytz_timezone(guest_booking.appointment_timezone)
        appointment_local = guest_booking.appointment_datetime.replace(tzinfo=pytz_timezone('UTC'))
        appointment_local = appointment_local.astimezone(user_tz)
        
        subject = f"Booking Confirmation - {organization.name}"
        
        html_content = f"""
        <h2>Booking Confirmation</h2>
        <p>Hi {guest_booking.guest_name},</p>
        <p>Your appointment has been confirmed!</p>
        
        <h3>Appointment Details:</h3>
        <ul>
            <li><strong>Confirmation Code:</strong> {guest_booking.confirmation_code}</li>
            <li><strong>Date & Time:</strong> {appointment_local.strftime('%A, %B %d, %Y at %I:%M %p')}</li>
            <li><strong>Service:</strong> {service.name}</li>
            <li><strong>Duration:</strong> {service.duration} minutes</li>
            <li><strong>Price:</strong> ${service.price:.2f}</li>
            <li><strong>Barber:</strong> {barber.name or 'Staff'}</li>
            <li><strong>Location:</strong> {organization.name}</li>
        </ul>
        
        <p>To manage your booking, use your confirmation code: <strong>{guest_booking.confirmation_code}</strong></p>
        
        <p>We look forward to seeing you!</p>
        <p>- {organization.name} Team</p>
        """
        
        # Send email via notification service
        if hasattr(notification_service, 'send_email'):
            notification_service.send_email(
                to_email=guest_booking.guest_email,
                subject=subject,
                html_content=html_content,
                from_name=organization.name
            )
    
    @staticmethod
    def lookup_guest_booking(
        db: Session,
        confirmation_code: str,
        email_or_phone: str
    ) -> Optional[GuestBooking]:
        """Look up a guest booking by confirmation code and email/phone."""
        
        # Clean inputs
        confirmation_code = confirmation_code.upper().strip()
        email_or_phone = email_or_phone.lower().strip()
        
        # Try to find by confirmation code and email or phone
        booking = db.query(GuestBooking).filter(
            GuestBooking.confirmation_code == confirmation_code,
            or_(
                func.lower(GuestBooking.guest_email) == email_or_phone,
                GuestBooking.guest_phone == email_or_phone
            )
        ).first()
        
        return booking
    
    @staticmethod
    def cancel_guest_booking(
        db: Session,
        guest_booking: GuestBooking,
        reason: Optional[str] = None
    ) -> GuestBooking:
        """Cancel a guest booking."""
        
        if guest_booking.status == "cancelled":
            raise ValueError("Booking is already cancelled")
        
        if guest_booking.status == "completed":
            raise ValueError("Cannot cancel completed booking")
        
        # Update status
        guest_booking.status = "cancelled"
        
        # Cancel the associated appointment if it exists
        if guest_booking.converted_to_appointment_id:
            appointment = db.query(Appointment).filter(
                Appointment.id == guest_booking.converted_to_appointment_id
            ).first()
            if appointment:
                appointment.status = "cancelled"
        
        # TODO: Handle refunds if payment was made
        
        db.commit()
        db.refresh(guest_booking)
        
        # Send cancellation notification
        try:
            GuestBookingService._send_cancellation_email(db, guest_booking, reason)
        except Exception as e:
            logger.error(f"Failed to send cancellation email: {e}")
        
        return guest_booking
    
    @staticmethod
    def _send_cancellation_email(
        db: Session,
        guest_booking: GuestBooking,
        reason: Optional[str] = None
    ):
        """Send cancellation email for guest booking."""
        
        organization = guest_booking.organization
        service = guest_booking.service
        
        subject = f"Booking Cancelled - {organization.name}"
        
        html_content = f"""
        <h2>Booking Cancelled</h2>
        <p>Hi {guest_booking.guest_name},</p>
        <p>Your appointment has been cancelled.</p>
        
        <h3>Cancelled Appointment:</h3>
        <ul>
            <li><strong>Confirmation Code:</strong> {guest_booking.confirmation_code}</li>
            <li><strong>Service:</strong> {service.name}</li>
            <li><strong>Original Date:</strong> {guest_booking.appointment_datetime.strftime('%A, %B %d, %Y')}</li>
        </ul>
        
        {f'<p><strong>Reason:</strong> {reason}</p>' if reason else ''}
        
        <p>If you'd like to rebook, please visit our booking page.</p>
        
        <p>- {organization.name} Team</p>
        """
        
        # Send email via notification service
        if hasattr(notification_service, 'send_email'):
            notification_service.send_email(
                to_email=guest_booking.guest_email,
                subject=subject,
                html_content=html_content,
                from_name=organization.name
            )
    
    @staticmethod
    def convert_to_user_booking(
        db: Session,
        guest_booking: GuestBooking,
        user: User
    ) -> Dict[str, Any]:
        """Convert a guest booking to a regular user booking."""
        
        # Update the appointment with user ID
        if guest_booking.converted_to_appointment_id:
            appointment = db.query(Appointment).filter(
                Appointment.id == guest_booking.converted_to_appointment_id
            ).first()
            if appointment:
                appointment.user_id = user.id
        
        # Update guest booking with conversion info
        guest_booking.converted_to_user_id = user.id
        guest_booking.conversion_date = datetime.utcnow()
        
        db.commit()
        
        return {
            "appointment": appointment,
            "guest_booking": guest_booking
        }


# Create singleton instance
guestBookingService = GuestBookingService()