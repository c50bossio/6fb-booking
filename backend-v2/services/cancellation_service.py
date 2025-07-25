from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
import logging

from models.cancellation import (
    CancellationPolicy, AppointmentCancellation, WaitlistEntry, 
    CancellationPolicyHistory, CancellationReason, RefundType
)
from models import Appointment, Payment, Refund
from services.payment_service import PaymentService
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

# Helper function for UTC datetime
def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class CancellationPolicyService:
    """Service for managing cancellation policies and processing cancellations"""
    
    @staticmethod
    def create_policy(
        db: Session,
        name: str,
        description: Optional[str] = None,
        service_id: Optional[int] = None,
        location_id: Optional[int] = None,
        immediate_cancellation_hours: int = 0,
        short_notice_hours: int = 24,
        advance_notice_hours: int = 48,
        immediate_refund_percentage: float = 0.0,
        short_notice_refund_percentage: float = 0.5,
        advance_refund_percentage: float = 1.0,
        immediate_cancellation_fee: float = 0.0,
        short_notice_cancellation_fee: float = 0.0,
        advance_cancellation_fee: float = 0.0,
        no_show_fee: float = 0.0,
        no_show_refund_percentage: float = 0.0,
        created_by_id: Optional[int] = None,
        **kwargs
    ) -> CancellationPolicy:
        """Create a new cancellation policy"""
        
        # Validate percentages
        for percentage in [immediate_refund_percentage, short_notice_refund_percentage, 
                          advance_refund_percentage, no_show_refund_percentage]:
            if not 0.0 <= percentage <= 1.0:
                raise ValueError("Refund percentages must be between 0.0 and 1.0")
        
        # Validate hour progression
        if not (immediate_cancellation_hours <= short_notice_hours <= advance_notice_hours):
            raise ValueError("Hour thresholds must be in ascending order")
        
        policy = CancellationPolicy(
            name=name,
            description=description,
            service_id=service_id,
            location_id=location_id,
            immediate_cancellation_hours=immediate_cancellation_hours,
            short_notice_hours=short_notice_hours,
            advance_notice_hours=advance_notice_hours,
            immediate_refund_percentage=immediate_refund_percentage,
            short_notice_refund_percentage=short_notice_refund_percentage,
            advance_refund_percentage=advance_refund_percentage,
            immediate_cancellation_fee=immediate_cancellation_fee,
            short_notice_cancellation_fee=short_notice_cancellation_fee,
            advance_cancellation_fee=advance_cancellation_fee,
            no_show_fee=no_show_fee,
            no_show_refund_percentage=no_show_refund_percentage,
            created_by_id=created_by_id,
            **kwargs
        )
        
        db.add(policy)
        db.commit()
        db.refresh(policy)
        
        # Log policy creation
        CancellationPolicyService._log_policy_change(
            db, policy.id, created_by_id, "Policy created", None, policy.__dict__
        )
        
        logger.info(f"Created cancellation policy: {name} (ID: {policy.id})")
        return policy
    
    @staticmethod
    def get_applicable_policy(
        db: Session,
        appointment: Appointment
    ) -> Optional[CancellationPolicy]:
        """Get the applicable cancellation policy for an appointment"""
        
        # Try to find service-specific policy first
        if appointment.service_id:
            policy = db.query(CancellationPolicy).filter(
                and_(
                    CancellationPolicy.service_id == appointment.service_id,
                    CancellationPolicy.is_active == True
                )
            ).first()
            if policy:
                return policy
        
        # Try location-specific policy
        if appointment.location_id:
            policy = db.query(CancellationPolicy).filter(
                and_(
                    CancellationPolicy.location_id == appointment.location_id,
                    CancellationPolicy.service_id.is_(None),
                    CancellationPolicy.is_active == True
                )
            ).first()
            if policy:
                return policy
        
        # Fall back to default policy
        policy = db.query(CancellationPolicy).filter(
            and_(
                CancellationPolicy.is_default == True,
                CancellationPolicy.is_active == True
            )
        ).first()
        
        return policy
    
    @staticmethod
    def calculate_cancellation_details(
        db: Session,
        appointment: Appointment,
        cancellation_time: Optional[datetime] = None,
        reason: CancellationReason = CancellationReason.CLIENT_REQUEST,
        is_emergency: bool = False
    ) -> Dict[str, Any]:
        """Calculate refund amount and fees for cancellation"""
        
        if not cancellation_time:
            cancellation_time = utcnow()
        
        # Get applicable policy
        policy = CancellationPolicyService.get_applicable_policy(db, appointment)
        if not policy:
            # Default policy: no refund, no fees
            return {
                "policy_id": None,
                "refund_type": RefundType.NO_REFUND,
                "refund_percentage": 0.0,
                "refund_amount": 0.0,
                "cancellation_fee": 0.0,
                "net_refund_amount": 0.0,
                "hours_before_appointment": 0.0,
                "policy_rule_applied": "no_policy",
                "is_emergency_exception": False,
                "is_first_time_client_grace": False
            }
        
        # Calculate hours before appointment
        appointment_time = appointment.start_time
        if appointment_time.tzinfo is None:
            appointment_time = appointment_time.replace(tzinfo=timezone.utc)
        if cancellation_time.tzinfo is None:
            cancellation_time = cancellation_time.replace(tzinfo=timezone.utc)
        
        time_diff = appointment_time - cancellation_time
        hours_before = max(0, time_diff.total_seconds() / 3600)
        
        # Get original payment amount
        payment = db.query(Payment).filter(Payment.appointment_id == appointment.id).first()
        original_amount = payment.amount if payment else appointment.price
        
        # Check for emergency exception
        if is_emergency and policy.allow_emergency_exception:
            return {
                "policy_id": policy.id,
                "refund_type": RefundType.FULL_REFUND,
                "refund_percentage": policy.emergency_refund_percentage,
                "refund_amount": original_amount * policy.emergency_refund_percentage,
                "cancellation_fee": 0.0,
                "net_refund_amount": original_amount * policy.emergency_refund_percentage,
                "hours_before_appointment": hours_before,
                "policy_rule_applied": "emergency_exception",
                "is_emergency_exception": True,
                "is_first_time_client_grace": False,
                "requires_manual_approval": policy.emergency_requires_approval
            }
        
        # Check for first-time client grace period
        is_first_time_client = False
        if policy.first_time_client_grace and appointment.client_id:
            client_appointment_count = db.query(Appointment).filter(
                and_(
                    Appointment.client_id == appointment.client_id,
                    Appointment.status != "cancelled",
                    Appointment.id != appointment.id
                )
            ).count()
            
            if client_appointment_count == 0 and hours_before >= policy.first_time_client_hours:
                is_first_time_client = True
                return {
                    "policy_id": policy.id,
                    "refund_type": RefundType.FULL_REFUND,
                    "refund_percentage": policy.first_time_client_refund_percentage,
                    "refund_amount": original_amount * policy.first_time_client_refund_percentage,
                    "cancellation_fee": 0.0,
                    "net_refund_amount": original_amount * policy.first_time_client_refund_percentage,
                    "hours_before_appointment": hours_before,
                    "policy_rule_applied": "first_time_client_grace",
                    "is_emergency_exception": False,
                    "is_first_time_client_grace": True
                }
        
        # Apply standard policy rules based on timing
        if reason == CancellationReason.NO_SHOW:
            refund_percentage = policy.no_show_refund_percentage
            cancellation_fee = policy.no_show_fee
            rule_applied = "no_show"
            refund_type = RefundType.NO_REFUND if refund_percentage == 0 else RefundType.PARTIAL_REFUND
        elif hours_before >= policy.advance_notice_hours:
            refund_percentage = policy.advance_refund_percentage
            cancellation_fee = policy.advance_cancellation_fee
            rule_applied = "advance_notice"
            refund_type = RefundType.FULL_REFUND if refund_percentage == 1.0 else RefundType.PARTIAL_REFUND
        elif hours_before >= policy.short_notice_hours:
            refund_percentage = policy.short_notice_refund_percentage
            cancellation_fee = policy.short_notice_cancellation_fee
            rule_applied = "short_notice"
            refund_type = RefundType.PARTIAL_REFUND if refund_percentage > 0 else RefundType.NO_REFUND
        else:
            refund_percentage = policy.immediate_refund_percentage
            cancellation_fee = policy.immediate_cancellation_fee
            rule_applied = "immediate_cancellation"
            refund_type = RefundType.NO_REFUND if refund_percentage == 0 else RefundType.PARTIAL_REFUND
        
        refund_amount = original_amount * refund_percentage
        net_refund_amount = max(0, refund_amount - cancellation_fee)
        
        # Determine final refund type
        if net_refund_amount == 0:
            refund_type = RefundType.NO_REFUND
        elif net_refund_amount == original_amount:
            refund_type = RefundType.FULL_REFUND
        else:
            refund_type = RefundType.PARTIAL_REFUND
        
        return {
            "policy_id": policy.id,
            "refund_type": refund_type,
            "refund_percentage": refund_percentage,
            "refund_amount": refund_amount,
            "cancellation_fee": cancellation_fee,
            "net_refund_amount": net_refund_amount,
            "hours_before_appointment": hours_before,
            "policy_rule_applied": rule_applied,
            "is_emergency_exception": False,
            "is_first_time_client_grace": is_first_time_client
        }
    
    @staticmethod
    def cancel_appointment(
        db: Session,
        appointment_id: int,
        cancelled_by_id: int,
        reason: CancellationReason = CancellationReason.CLIENT_REQUEST,
        reason_details: Optional[str] = None,
        is_emergency: bool = False,
        admin_notes: Optional[str] = None
    ) -> AppointmentCancellation:
        """Cancel an appointment and process refund according to policy"""
        
        # Get appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")
        
        if appointment.status == "cancelled":
            raise ValueError("Appointment is already cancelled")
        
        if appointment.status == "completed":
            raise ValueError("Cannot cancel a completed appointment")
        
        # Calculate cancellation details
        cancellation_details = CancellationPolicyService.calculate_cancellation_details(
            db, appointment, reason=reason, is_emergency=is_emergency
        )
        
        # Create cancellation record
        cancellation = AppointmentCancellation(
            appointment_id=appointment_id,
            policy_id=cancellation_details.get("policy_id"),
            cancelled_by_id=cancelled_by_id,
            reason=reason,
            reason_details=reason_details,
            hours_before_appointment=cancellation_details["hours_before_appointment"],
            original_appointment_time=appointment.start_time,
            original_amount=appointment.price,
            refund_type=cancellation_details["refund_type"],
            refund_percentage=cancellation_details["refund_percentage"],
            refund_amount=cancellation_details["refund_amount"],
            cancellation_fee=cancellation_details["cancellation_fee"],
            net_refund_amount=cancellation_details["net_refund_amount"],
            policy_rule_applied=cancellation_details["policy_rule_applied"],
            is_emergency_exception=cancellation_details["is_emergency_exception"],
            is_first_time_client_grace=cancellation_details["is_first_time_client_grace"],
            requires_manual_approval=cancellation_details.get("requires_manual_approval", False),
            admin_notes=admin_notes
        )
        
        # Get payment for refund processing
        payment = db.query(Payment).filter(Payment.appointment_id == appointment_id).first()
        if payment:
            cancellation.original_payment_id = payment.id
        
        db.add(cancellation)
        
        # Update appointment status
        appointment.status = "cancelled"
        
        db.commit()
        db.refresh(cancellation)
        
        # Process refund if applicable and doesn't require manual approval
        if (cancellation.net_refund_amount > 0 and 
            not cancellation.requires_manual_approval and 
            payment):
            try:
                CancellationPolicyService.process_cancellation_refund(
                    db, cancellation.id, cancelled_by_id
                )
            except Exception as e:
                logger.error(f"Failed to process automatic refund for cancellation {cancellation.id}: {e}")
                # Don't fail the cancellation if refund fails
        
        # Offer slot to waitlist
        if cancellation_details.get("policy_id"):
            policy = db.query(CancellationPolicy).filter(
                CancellationPolicy.id == cancellation_details["policy_id"]
            ).first()
            if policy and policy.auto_offer_to_waitlist:
                CancellationPolicyService.offer_slot_to_waitlist(db, appointment)
        
        # Send cancellation notifications
        try:
            CancellationPolicyService._send_cancellation_notifications(db, cancellation)
        except Exception as e:
            logger.error(f"Failed to send cancellation notifications: {e}")
        
        logger.info(f"Appointment {appointment_id} cancelled by user {cancelled_by_id}")
        return cancellation
    
    @staticmethod
    def process_cancellation_refund(
        db: Session,
        cancellation_id: int,
        processed_by_id: int
    ) -> Optional[Refund]:
        """Process refund for a cancellation"""
        
        cancellation = db.query(AppointmentCancellation).filter(
            AppointmentCancellation.id == cancellation_id
        ).first()
        
        if not cancellation:
            raise ValueError(f"Cancellation {cancellation_id} not found")
        
        if cancellation.refund_processed:
            raise ValueError("Refund already processed")
        
        if cancellation.net_refund_amount <= 0:
            raise ValueError("No refund amount to process")
        
        if not cancellation.original_payment_id:
            raise ValueError("No original payment found for refund")
        
        # Process refund through payment service
        try:
            refund_result = PaymentService.process_refund(
                payment_id=cancellation.original_payment_id,
                amount=cancellation.net_refund_amount,
                reason=f"Appointment cancellation - {cancellation.reason.value}",
                initiated_by_id=processed_by_id,
                db=db
            )
            
            # Update cancellation record
            cancellation.refund_processed = True
            cancellation.refund_processed_at = utcnow()
            cancellation.refund_processed_by_id = processed_by_id
            cancellation.refund_id = refund_result["refund_id"]
            
            db.commit()
            
            # Get the refund record
            refund = db.query(Refund).filter(Refund.id == refund_result["refund_id"]).first()
            
            logger.info(f"Processed refund for cancellation {cancellation_id}: ${cancellation.net_refund_amount}")
            return refund
            
        except Exception as e:
            logger.error(f"Failed to process refund for cancellation {cancellation_id}: {e}")
            raise
    
    @staticmethod
    def create_default_policies(db: Session, created_by_id: Optional[int] = None) -> List[CancellationPolicy]:
        """Create default cancellation policies for a business"""
        
        policies = []
        
        # Standard policy - moderate terms
        standard_policy = CancellationPolicyService.create_policy(
            db=db,
            name="Standard Cancellation Policy",
            description="Standard policy for most services",
            is_default=True,
            immediate_cancellation_hours=0,
            short_notice_hours=24,
            advance_notice_hours=48,
            immediate_refund_percentage=0.0,      # No refund for immediate cancellation
            short_notice_refund_percentage=0.5,   # 50% refund for 24-hour notice
            advance_refund_percentage=1.0,        # Full refund for 48+ hour notice
            immediate_cancellation_fee=25.0,      # $25 fee for immediate cancellation
            short_notice_cancellation_fee=10.0,   # $10 fee for short notice
            advance_cancellation_fee=0.0,         # No fee for advance notice
            no_show_fee=50.0,                     # $50 no-show fee
            no_show_refund_percentage=0.0,        # No refund for no-shows
            allow_emergency_exception=True,
            emergency_refund_percentage=1.0,      # Full refund for emergencies
            emergency_requires_approval=True,
            first_time_client_grace=True,
            first_time_client_hours=24,
            first_time_client_refund_percentage=1.0,
            auto_offer_to_waitlist=True,
            waitlist_notification_hours=2,
            created_by_id=created_by_id
        )
        policies.append(standard_policy)
        
        # Lenient policy - for premium services or VIP clients
        lenient_policy = CancellationPolicyService.create_policy(
            db=db,
            name="Lenient Cancellation Policy",
            description="More flexible policy for premium services",
            immediate_cancellation_hours=0,
            short_notice_hours=12,
            advance_notice_hours=24,
            immediate_refund_percentage=0.5,      # 50% refund even for immediate cancellation
            short_notice_refund_percentage=0.75,  # 75% refund for 12-hour notice
            advance_refund_percentage=1.0,        # Full refund for 24+ hour notice
            immediate_cancellation_fee=0.0,       # No fees
            short_notice_cancellation_fee=0.0,
            advance_cancellation_fee=0.0,
            no_show_fee=25.0,                     # Reduced no-show fee
            no_show_refund_percentage=0.0,
            allow_emergency_exception=True,
            emergency_refund_percentage=1.0,
            emergency_requires_approval=False,    # Auto-approve emergency refunds
            first_time_client_grace=True,
            first_time_client_hours=12,
            first_time_client_refund_percentage=1.0,
            auto_offer_to_waitlist=True,
            waitlist_notification_hours=1,
            created_by_id=created_by_id
        )
        policies.append(lenient_policy)
        
        # Strict policy - for high-demand services
        strict_policy = CancellationPolicyService.create_policy(
            db=db,
            name="Strict Cancellation Policy",
            description="Strict policy for high-demand services",
            immediate_cancellation_hours=0,
            short_notice_hours=48,
            advance_notice_hours=72,
            immediate_refund_percentage=0.0,      # No refund for immediate cancellation
            short_notice_refund_percentage=0.25,  # 25% refund for 48-hour notice
            advance_refund_percentage=0.75,       # 75% refund for 72+ hour notice
            immediate_cancellation_fee=50.0,      # Higher fees
            short_notice_cancellation_fee=25.0,
            advance_cancellation_fee=10.0,
            no_show_fee=100.0,                    # High no-show fee
            no_show_refund_percentage=0.0,
            max_cancellations_per_month=2,        # Limit frequent cancellations
            penalty_for_excess_cancellations=25.0,
            allow_emergency_exception=True,
            emergency_refund_percentage=0.75,     # Reduced emergency refund
            emergency_requires_approval=True,
            first_time_client_grace=False,        # No grace period
            auto_offer_to_waitlist=True,
            waitlist_notification_hours=3,
            created_by_id=created_by_id
        )
        policies.append(strict_policy)
        
        logger.info(f"Created {len(policies)} default cancellation policies")
        return policies
    
    @staticmethod
    def offer_slot_to_waitlist(db: Session, appointment: Appointment) -> bool:
        """Offer a cancelled appointment slot to waitlist members"""
        
        # Find matching waitlist entries
        query = db.query(WaitlistEntry).filter(
            and_(
                WaitlistEntry.is_active == True,
                or_(
                    WaitlistEntry.service_id == appointment.service_id,
                    WaitlistEntry.service_id.is_(None)
                ),
                or_(
                    WaitlistEntry.barber_id == appointment.barber_id,
                    WaitlistEntry.flexible_on_barber == True
                )
            )
        )
        
        # Filter by time preferences
        appointment_time = appointment.start_time.time() if appointment.start_time else None
        if appointment_time:
            query = query.filter(
                or_(
                    and_(
                        WaitlistEntry.preferred_time_start <= appointment_time,
                        WaitlistEntry.preferred_time_end >= appointment_time
                    ),
                    WaitlistEntry.flexible_on_time == True
                )
            )
        
        # Order by priority and creation time
        waitlist_entries = query.order_by(
            desc(WaitlistEntry.priority_score),
            WaitlistEntry.created_at
        ).all()
        
        if not waitlist_entries:
            return False
        
        # Notify the highest priority waitlist member
        for entry in waitlist_entries:
            try:
                CancellationPolicyService._notify_waitlist_member(db, entry, appointment)
                
                # Update waitlist entry
                entry.current_offer_appointment_id = appointment.id
                entry.offer_expires_at = utcnow() + timedelta(hours=2)  # 2-hour response window
                entry.times_notified += 1
                entry.last_notified_at = utcnow()
                
                db.commit()
                
                logger.info(f"Offered appointment {appointment.id} to waitlist member {entry.user_id}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to notify waitlist member {entry.user_id}: {e}")
                continue
        
        return False
    
    @staticmethod
    def _notify_waitlist_member(db: Session, waitlist_entry: WaitlistEntry, appointment: Appointment):
        """Send notification to waitlist member about available slot"""
        
        if not notification_service:
            logger.warning("Notification service not available")
            return
        
        user = waitlist_entry.user
        appointment_time = appointment.start_time.strftime("%B %d, %Y at %I:%M %p")
        
        context = {
            "client_name": user.name,
            "appointment_time": appointment_time,
            "service_name": appointment.service_name,
            "offer_expires_at": (utcnow() + timedelta(hours=2)).strftime("%I:%M %p"),
            "booking_url": f"https://bookedbarber.com/book/waitlist/{waitlist_entry.id}/accept"
        }
        
        # Send notifications based on preferences
        if waitlist_entry.notify_via_email:
            notification_service.queue_notification(
                db=db,
                user=user,
                template_name="waitlist_slot_available",
                context=context,
                appointment_id=appointment.id
            )
        
        if waitlist_entry.notify_via_sms and user.phone:
            notification_service.send_sms(
                phone=user.phone,
                message=f"Great news! A {appointment.service_name} slot is available on {appointment_time}. "
                       f"Book now: {context['booking_url']} (expires in 2 hours)"
            )
    
    @staticmethod
    def _send_cancellation_notifications(db: Session, cancellation: AppointmentCancellation):
        """Send cancellation confirmation and refund notifications"""
        
        if not notification_service:
            logger.warning("Notification service not available")
            return
        
        appointment = cancellation.appointment
        user = appointment.user
        
        refund_info = ""
        if cancellation.net_refund_amount > 0:
            if cancellation.requires_manual_approval:
                refund_info = f"Your refund of ${cancellation.net_refund_amount:.2f} is being processed and will be approved within 24 hours."
            else:
                refund_info = f"A refund of ${cancellation.net_refund_amount:.2f} has been processed to your original payment method."
        elif cancellation.cancellation_fee > 0:
            refund_info = f"A cancellation fee of ${cancellation.cancellation_fee:.2f} has been applied."
        else:
            refund_info = "No refund is available for this cancellation."
        
        context = {
            "client_name": user.name,
            "appointment_time": appointment.start_time.strftime("%B %d, %Y at %I:%M %p"),
            "service_name": appointment.service_name,
            "cancellation_reason": cancellation.reason.value.replace("_", " ").title(),
            "refund_info": refund_info,
            "business_phone": "(555) 123-4567"  # TODO: Get from settings
        }
        
        notification_service.queue_notification(
            db=db,
            user=user,
            template_name="appointment_cancellation_confirmation",
            context=context,
            appointment_id=appointment.id
        )
    
    @staticmethod
    def _log_policy_change(
        db: Session,
        policy_id: int,
        changed_by_id: Optional[int],
        reason: str,
        previous_config: Optional[Dict],
        new_config: Optional[Dict]
    ):
        """Log changes to cancellation policies"""
        
        history = CancellationPolicyHistory(
            policy_id=policy_id,
            changed_by_id=changed_by_id,
            change_reason=reason,
            previous_config=previous_config,
            new_config=new_config
        )
        
        db.add(history)
        db.commit()