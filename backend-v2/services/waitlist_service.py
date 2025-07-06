from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
import logging

from models.cancellation import WaitlistEntry
from models import Appointment, User, Service, Client
from services.booking_service import create_booking
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

# Helper function for UTC datetime
def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class WaitlistService:
    """Service for managing appointment waitlists"""
    
    @staticmethod
    def add_to_waitlist(
        db: Session,
        user_id: int,
        service_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        location_id: Optional[int] = None,
        preferred_date: Optional[datetime] = None,
        earliest_acceptable_date: Optional[datetime] = None,
        latest_acceptable_date: Optional[datetime] = None,
        preferred_time_start: Optional[str] = None,
        preferred_time_end: Optional[str] = None,
        flexible_on_barber: bool = True,
        flexible_on_time: bool = True,
        flexible_on_date: bool = False,
        notify_via_sms: bool = True,
        notify_via_email: bool = True,
        auto_book_if_available: bool = False,
        expires_in_days: Optional[int] = 30
    ) -> WaitlistEntry:
        """Add a user to the waitlist"""
        
        # Find or create client record
        from services.booking_service import find_or_create_client_for_user
        client_id = find_or_create_client_for_user(db, user_id)
        
        # Check for existing active entry
        existing_entry = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.user_id == user_id,
                WaitlistEntry.service_id == service_id,
                WaitlistEntry.barber_id == barber_id,
                WaitlistEntry.is_active == True
            )
        ).first()
        
        if existing_entry:
            # Update existing entry instead of creating duplicate
            existing_entry.preferred_date = preferred_date
            existing_entry.earliest_acceptable_date = earliest_acceptable_date
            existing_entry.latest_acceptable_date = latest_acceptable_date
            existing_entry.flexible_on_barber = flexible_on_barber
            existing_entry.flexible_on_time = flexible_on_time
            existing_entry.flexible_on_date = flexible_on_date
            existing_entry.notify_via_sms = notify_via_sms
            existing_entry.notify_via_email = notify_via_email
            existing_entry.auto_book_if_available = auto_book_if_available
            existing_entry.updated_at = utcnow()
            
            if expires_in_days:
                existing_entry.expires_at = utcnow() + timedelta(days=expires_in_days)
            
            db.commit()
            db.refresh(existing_entry)
            
            logger.info(f"Updated existing waitlist entry {existing_entry.id} for user {user_id}")
            return existing_entry
        
        # Parse time strings if provided
        preferred_time_start_obj = None
        preferred_time_end_obj = None
        
        if preferred_time_start:
            hour, minute = map(int, preferred_time_start.split(':'))
            preferred_time_start_obj = datetime.min.time().replace(hour=hour, minute=minute)
        
        if preferred_time_end:
            hour, minute = map(int, preferred_time_end.split(':'))
            preferred_time_end_obj = datetime.min.time().replace(hour=hour, minute=minute)
        
        # Set expiration date
        expires_at = None
        if expires_in_days:
            expires_at = utcnow() + timedelta(days=expires_in_days)
        
        # Calculate priority score
        priority_score = WaitlistService._calculate_priority_score(
            user_id, service_id, preferred_date, flexible_on_date, flexible_on_time, flexible_on_barber
        )
        
        # Create waitlist entry
        entry = WaitlistEntry(
            user_id=user_id,
            client_id=client_id,
            service_id=service_id,
            barber_id=barber_id,
            location_id=location_id,
            preferred_date=preferred_date,
            earliest_acceptable_date=earliest_acceptable_date,
            latest_acceptable_date=latest_acceptable_date,
            preferred_time_start=preferred_time_start_obj,
            preferred_time_end=preferred_time_end_obj,
            flexible_on_barber=flexible_on_barber,
            flexible_on_time=flexible_on_time,
            flexible_on_date=flexible_on_date,
            notify_via_sms=notify_via_sms,
            notify_via_email=notify_via_email,
            auto_book_if_available=auto_book_if_available,
            priority_score=priority_score,
            expires_at=expires_at
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        logger.info(f"Added user {user_id} to waitlist (entry ID: {entry.id})")
        
        # Check if there are immediately available slots
        if auto_book_if_available:
            WaitlistService._try_auto_book(db, entry)
        
        return entry
    
    @staticmethod
    def notify_waitlist_for_slot(
        db: Session,
        appointment: Appointment,
        notification_hours: int = 2
    ) -> List[WaitlistEntry]:
        """Notify waitlist members about an available slot"""
        
        # Find matching waitlist entries
        query = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.is_active == True,
                WaitlistEntry.current_offer_appointment_id.is_(None)  # Not already offered another slot
            )
        )
        
        # Filter by service
        if appointment.service_id:
            query = query.filter(
                or_(
                    WaitlistEntry.service_id == appointment.service_id,
                    WaitlistEntry.service_id.is_(None)
                )
            )
        
        # Filter by barber
        if appointment.barber_id:
            query = query.filter(
                or_(
                    WaitlistEntry.barber_id == appointment.barber_id,
                    WaitlistEntry.flexible_on_barber == True
                )
            )
        
        # Filter by location
        if appointment.location_id:
            query = query.filter(
                or_(
                    WaitlistEntry.location_id == appointment.location_id,
                    WaitlistEntry.location_id.is_(None)
                )
            )
        
        # Filter by date preferences
        appointment_date = appointment.start_time.date()
        query = query.filter(
            or_(
                and_(
                    WaitlistEntry.earliest_acceptable_date <= appointment_date,
                    WaitlistEntry.latest_acceptable_date >= appointment_date
                ),
                WaitlistEntry.flexible_on_date == True,
                WaitlistEntry.earliest_acceptable_date.is_(None)
            )
        )
        
        # Filter by time preferences
        appointment_time = appointment.start_time.time()
        query = query.filter(
            or_(
                and_(
                    WaitlistEntry.preferred_time_start <= appointment_time,
                    WaitlistEntry.preferred_time_end >= appointment_time
                ),
                WaitlistEntry.flexible_on_time == True,
                WaitlistEntry.preferred_time_start.is_(None)
            )
        )
        
        # Order by priority score and creation time
        waitlist_entries = query.order_by(
            desc(WaitlistEntry.priority_score),
            WaitlistEntry.created_at
        ).limit(5).all()  # Notify top 5 candidates
        
        notified_entries = []
        
        for entry in waitlist_entries:
            try:
                # Set offer details
                entry.current_offer_appointment_id = appointment.id
                entry.offer_expires_at = utcnow() + timedelta(hours=notification_hours)
                entry.times_notified += 1
                entry.last_notified_at = utcnow()
                
                # Send notification
                WaitlistService._send_waitlist_notification(db, entry, appointment)
                
                notified_entries.append(entry)
                
                logger.info(f"Notified waitlist entry {entry.id} about appointment {appointment.id}")
                
                # If auto-book is enabled, try to book immediately
                if entry.auto_book_if_available:
                    try:
                        WaitlistService.accept_waitlist_offer(db, entry.id, entry.user_id)
                        break  # Slot filled, no need to notify others
                    except Exception as e:
                        logger.error(f"Failed auto-booking for waitlist entry {entry.id}: {e}")
                        # Continue to notify other entries
                
            except Exception as e:
                logger.error(f"Failed to notify waitlist entry {entry.id}: {e}")
                continue
        
        if notified_entries:
            db.commit()
        
        return notified_entries
    
    @staticmethod
    def accept_waitlist_offer(
        db: Session,
        waitlist_entry_id: int,
        user_id: int
    ) -> Appointment:
        """Accept a waitlist offer and book the appointment"""
        
        # Get waitlist entry
        entry = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.id == waitlist_entry_id,
                WaitlistEntry.user_id == user_id,
                WaitlistEntry.is_active == True
            )
        ).first()
        
        if not entry:
            raise ValueError("Waitlist entry not found or not accessible")
        
        if not entry.current_offer_appointment_id:
            raise ValueError("No current offer available")
        
        if entry.offer_expires_at and entry.offer_expires_at < utcnow():
            # Clear expired offer
            entry.current_offer_appointment_id = None
            entry.offer_expires_at = None
            db.commit()
            raise ValueError("Offer has expired")
        
        # Get the offered appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == entry.current_offer_appointment_id
        ).first()
        
        if not appointment:
            raise ValueError("Offered appointment not found")
        
        if appointment.user_id is not None:
            raise ValueError("Appointment slot is no longer available")
        
        # Book the appointment
        try:
            # Update appointment with user details
            appointment.user_id = user_id
            appointment.client_id = entry.client_id
            appointment.status = "confirmed"
            
            # Mark waitlist entry as fulfilled
            entry.is_active = False
            entry.fulfilled_at = utcnow()
            entry.fulfilled_appointment_id = appointment.id
            entry.current_offer_appointment_id = None
            entry.offer_expires_at = None
            
            db.commit()
            db.refresh(appointment)
            
            # Cancel offers to other waitlist members for this slot
            WaitlistService._cancel_competing_offers(db, appointment.id, entry.id)
            
            # Send booking confirmation
            WaitlistService._send_booking_confirmation(db, entry, appointment)
            
            logger.info(f"Waitlist entry {entry.id} accepted offer and booked appointment {appointment.id}")
            return appointment
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to accept waitlist offer: {e}")
            raise
    
    @staticmethod
    def decline_waitlist_offer(
        db: Session,
        waitlist_entry_id: int,
        user_id: int
    ) -> bool:
        """Decline a waitlist offer"""
        
        entry = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.id == waitlist_entry_id,
                WaitlistEntry.user_id == user_id,
                WaitlistEntry.is_active == True
            )
        ).first()
        
        if not entry:
            return False
        
        if not entry.current_offer_appointment_id:
            return False
        
        # Add to declined list
        declined_ids = entry.declined_appointment_ids or []
        if entry.current_offer_appointment_id not in declined_ids:
            declined_ids.append(entry.current_offer_appointment_id)
            entry.declined_appointment_ids = declined_ids
        
        # Clear current offer
        offered_appointment_id = entry.current_offer_appointment_id
        entry.current_offer_appointment_id = None
        entry.offer_expires_at = None
        
        db.commit()
        
        # Notify next person on waitlist
        appointment = db.query(Appointment).filter(
            Appointment.id == offered_appointment_id
        ).first()
        
        if appointment and appointment.user_id is None:
            WaitlistService.notify_waitlist_for_slot(db, appointment)
        
        logger.info(f"Waitlist entry {entry.id} declined offer for appointment {offered_appointment_id}")
        return True
    
    @staticmethod
    def remove_from_waitlist(
        db: Session,
        waitlist_entry_id: int,
        user_id: int
    ) -> bool:
        """Remove a user from the waitlist"""
        
        entry = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.id == waitlist_entry_id,
                WaitlistEntry.user_id == user_id
            )
        ).first()
        
        if not entry:
            return False
        
        entry.is_active = False
        
        # If there's a current offer, clear it so others can be notified
        if entry.current_offer_appointment_id:
            offered_appointment_id = entry.current_offer_appointment_id
            entry.current_offer_appointment_id = None
            entry.offer_expires_at = None
            
            # Notify next person
            appointment = db.query(Appointment).filter(
                Appointment.id == offered_appointment_id
            ).first()
            
            if appointment and appointment.user_id is None:
                WaitlistService.notify_waitlist_for_slot(db, appointment)
        
        db.commit()
        
        logger.info(f"Removed waitlist entry {entry.id} for user {user_id}")
        return True
    
    @staticmethod
    def cleanup_expired_offers(db: Session) -> int:
        """Clean up expired waitlist offers"""
        
        expired_entries = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.is_active == True,
                WaitlistEntry.offer_expires_at.isnot(None),
                WaitlistEntry.offer_expires_at < utcnow()
            )
        ).all()
        
        count = 0
        for entry in expired_entries:
            # Clear expired offer
            offered_appointment_id = entry.current_offer_appointment_id
            entry.current_offer_appointment_id = None
            entry.offer_expires_at = None
            
            # Check if appointment is still available and notify others
            if offered_appointment_id:
                appointment = db.query(Appointment).filter(
                    Appointment.id == offered_appointment_id
                ).first()
                
                if appointment and appointment.user_id is None:
                    WaitlistService.notify_waitlist_for_slot(db, appointment)
            
            count += 1
        
        if count > 0:
            db.commit()
            logger.info(f"Cleaned up {count} expired waitlist offers")
        
        return count
    
    @staticmethod
    def cleanup_expired_entries(db: Session) -> int:
        """Clean up expired waitlist entries"""
        
        expired_entries = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.is_active == True,
                WaitlistEntry.expires_at.isnot(None),
                WaitlistEntry.expires_at < utcnow()
            )
        ).all()
        
        for entry in expired_entries:
            entry.is_active = False
        
        count = len(expired_entries)
        if count > 0:
            db.commit()
            logger.info(f"Deactivated {count} expired waitlist entries")
        
        return count
    
    @staticmethod
    def _calculate_priority_score(
        user_id: int,
        service_id: Optional[int],
        preferred_date: Optional[datetime],
        flexible_on_date: bool,
        flexible_on_time: bool,
        flexible_on_barber: bool
    ) -> int:
        """Calculate priority score for waitlist entry"""
        
        score = 100  # Base score
        
        # Higher score for more flexibility
        if flexible_on_date:
            score += 30
        if flexible_on_time:
            score += 20
        if flexible_on_barber:
            score += 10
        
        # Higher score for sooner preferred dates
        if preferred_date:
            days_ahead = (preferred_date.date() - datetime.now().date()).days
            if days_ahead <= 7:
                score += 50
            elif days_ahead <= 14:
                score += 30
            elif days_ahead <= 30:
                score += 10
        
        # Could add loyalty factors, VIP status, etc.
        
        return score
    
    @staticmethod
    def _try_auto_book(db: Session, entry: WaitlistEntry):
        """Try to automatically book available slots for auto-book entries"""
        
        # This would require checking current availability
        # For now, just log that auto-booking was requested
        logger.info(f"Auto-booking requested for waitlist entry {entry.id}")
    
    @staticmethod
    def _send_waitlist_notification(db: Session, entry: WaitlistEntry, appointment: Appointment):
        """Send notification to waitlist member about available slot"""
        
        if not notification_service:
            logger.warning("Notification service not available")
            return
        
        user = entry.user
        appointment_time = appointment.start_time.strftime("%B %d, %Y at %I:%M %p")
        
        context = {
            "client_name": user.name,
            "appointment_time": appointment_time,
            "service_name": appointment.service_name,
            "offer_expires_at": entry.offer_expires_at.strftime("%I:%M %p") if entry.offer_expires_at else "soon",
            "accept_url": f"https://bookedbarber.com/waitlist/{entry.id}/accept",
            "decline_url": f"https://bookedbarber.com/waitlist/{entry.id}/decline"
        }
        
        # Send email notification
        if entry.notify_via_email:
            notification_service.queue_notification(
                db=db,
                user=user,
                template_name="waitlist_slot_available",
                context=context,
                appointment_id=appointment.id
            )
        
        # Send SMS notification
        if entry.notify_via_sms and user.phone:
            notification_service.send_sms(
                phone=user.phone,
                message=f"Great news! A {appointment.service_name} slot is available on {appointment_time}. "
                       f"Accept: {context['accept_url']} (expires at {context['offer_expires_at']})"
            )
    
    @staticmethod
    def _send_booking_confirmation(db: Session, entry: WaitlistEntry, appointment: Appointment):
        """Send booking confirmation for waitlist appointment"""
        
        if not notification_service:
            logger.warning("Notification service not available")
            return
        
        user = entry.user
        appointment_time = appointment.start_time.strftime("%B %d, %Y at %I:%M %p")
        
        context = {
            "client_name": user.name,
            "appointment_time": appointment_time,
            "service_name": appointment.service_name,
            "business_name": "BookedBarber",
            "business_phone": "(555) 123-4567"
        }
        
        notification_service.queue_notification(
            db=db,
            user=user,
            template_name="waitlist_booking_confirmed",
            context=context,
            appointment_id=appointment.id
        )
    
    @staticmethod
    def _cancel_competing_offers(db: Session, appointment_id: int, accepted_entry_id: int):
        """Cancel offers to other waitlist members for the same slot"""
        
        competing_entries = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.current_offer_appointment_id == appointment_id,
                WaitlistEntry.id != accepted_entry_id
            )
        ).all()
        
        for entry in competing_entries:
            entry.current_offer_appointment_id = None
            entry.offer_expires_at = None
        
        if competing_entries:
            db.commit()
            logger.info(f"Cancelled {len(competing_entries)} competing offers for appointment {appointment_id}")