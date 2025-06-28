"""
Communication integration service for automated notifications
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import asyncio

from models.appointment import Appointment
from models.payment import Payment
from models.user import User
from models.client import Client
from models.communication import NotificationPreference
from services.email_service import email_service
from services.sms_service import sms_service
from services.notification_service import NotificationService
from utils.logging import get_logger

logger = get_logger(__name__)


class CommunicationIntegrationService:
    """Service for integrating communications with business events"""

    @staticmethod
    async def send_appointment_notifications(
        db: Session,
        appointment: Appointment,
        notification_type: str,
        additional_context: Optional[Dict[str, Any]] = None,
    ):
        """Send notifications for appointment events"""
        try:
            # Get client and barber information
            client = db.query(Client).filter(Client.id == appointment.client_id).first()
            barber_user = (
                db.query(User).filter(User.id == appointment.barber_id).first()
            )

            if not client or not barber_user:
                logger.error(
                    f"Missing client or barber for appointment {appointment.id}"
                )
                return

            # Prepare appointment data
            appointment_data = {
                "id": appointment.id,
                "client_name": client.name,
                "client_email": client.email,
                "client_phone": client.phone,
                "barber_name": barber_user.full_name,
                "service_name": appointment.service_name,
                "date": appointment.appointment_time.strftime("%B %d, %Y"),
                "time": appointment.appointment_time.strftime("%I:%M %p"),
                "duration": appointment.duration,
                "location_name": (
                    appointment.location.name if appointment.location else "N/A"
                ),
                "location_address": (
                    appointment.location.address if appointment.location else "N/A"
                ),
                "price": appointment.price,
                "notes": appointment.notes,
            }

            if additional_context:
                appointment_data.update(additional_context)

            # Send notifications based on type
            if notification_type == "confirmation":
                await CommunicationIntegrationService._send_appointment_confirmation(
                    db, client, barber_user, appointment_data
                )
            elif notification_type == "reminder":
                await CommunicationIntegrationService._send_appointment_reminder(
                    db, client, barber_user, appointment_data
                )
            elif notification_type == "cancellation":
                await CommunicationIntegrationService._send_appointment_cancellation(
                    db, client, barber_user, appointment_data
                )

            # Send real-time notification to barber
            await NotificationService.send_appointment_notification(
                db=db,
                user_id=barber_user.id,
                appointment_data=appointment_data,
                notification_type=notification_type,
            )

        except Exception as e:
            logger.error(f"Error sending appointment notifications: {str(e)}")

    @staticmethod
    async def _send_appointment_confirmation(
        db: Session, client: Client, barber_user: User, appointment_data: Dict[str, Any]
    ):
        """Send appointment confirmation notifications"""
        # Check client preferences (if user account exists)
        client_user = db.query(User).filter(User.email == client.email).first()
        if client_user:
            prefs = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == client_user.id)
                .first()
            )

            # Send email if enabled
            if not prefs or prefs.email_appointment_confirmation:
                email_service.send_appointment_confirmation(
                    db=db, to_email=client.email, appointment_data=appointment_data
                )

            # Send SMS if enabled
            if client.phone and (not prefs or prefs.sms_appointment_confirmation):
                sms_service.send_appointment_confirmation(
                    db=db, to_number=client.phone, appointment_data=appointment_data
                )
        else:
            # No user account, send notifications by default
            email_service.send_appointment_confirmation(
                db=db, to_email=client.email, appointment_data=appointment_data
            )

            if client.phone:
                sms_service.send_appointment_confirmation(
                    db=db, to_number=client.phone, appointment_data=appointment_data
                )

    @staticmethod
    async def _send_appointment_reminder(
        db: Session, client: Client, barber_user: User, appointment_data: Dict[str, Any]
    ):
        """Send appointment reminder notifications"""
        hours_before = appointment_data.get("hours_before", 24)

        # Check client preferences
        client_user = db.query(User).filter(User.email == client.email).first()
        if client_user:
            prefs = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == client_user.id)
                .first()
            )

            # Send email if enabled
            if not prefs or prefs.email_appointment_reminder:
                email_service.send_appointment_reminder(
                    db=db,
                    to_email=client.email,
                    appointment_data=appointment_data,
                    hours_before=hours_before,
                )

            # Send SMS if enabled
            if client.phone and (not prefs or prefs.sms_appointment_reminder):
                sms_service.send_appointment_reminder(
                    db=db,
                    to_number=client.phone,
                    appointment_data=appointment_data,
                    hours_before=hours_before,
                )
        else:
            # No user account, send notifications by default
            email_service.send_appointment_reminder(
                db=db,
                to_email=client.email,
                appointment_data=appointment_data,
                hours_before=hours_before,
            )

            if client.phone:
                sms_service.send_appointment_reminder(
                    db=db,
                    to_number=client.phone,
                    appointment_data=appointment_data,
                    hours_before=hours_before,
                )

    @staticmethod
    async def _send_appointment_cancellation(
        db: Session, client: Client, barber_user: User, appointment_data: Dict[str, Any]
    ):
        """Send appointment cancellation notifications"""
        reason = appointment_data.get("cancellation_reason")

        # Check client preferences
        client_user = db.query(User).filter(User.email == client.email).first()
        if client_user:
            prefs = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == client_user.id)
                .first()
            )

            # Send email if enabled
            if not prefs or prefs.email_appointment_cancellation:
                email_service.send_appointment_cancellation(
                    db=db,
                    to_email=client.email,
                    appointment_data=appointment_data,
                    reason=reason,
                )

            # Send SMS if enabled
            if client.phone and (not prefs or prefs.sms_appointment_cancellation):
                sms_service.send_appointment_cancellation(
                    db=db, to_number=client.phone, appointment_data=appointment_data
                )
        else:
            # No user account, send notifications by default
            email_service.send_appointment_cancellation(
                db=db,
                to_email=client.email,
                appointment_data=appointment_data,
                reason=reason,
            )

            if client.phone:
                sms_service.send_appointment_cancellation(
                    db=db, to_number=client.phone, appointment_data=appointment_data
                )

    @staticmethod
    async def send_payment_notifications(
        db: Session,
        payment: Payment,
        additional_context: Optional[Dict[str, Any]] = None,
    ):
        """Send notifications for payment events"""
        try:
            # Get user information
            user = db.query(User).filter(User.id == payment.user_id).first()
            if not user:
                logger.error(f"User not found for payment {payment.id}")
                return

            # Prepare payment data
            payment_data = {
                "id": payment.id,
                "receipt_number": f"REC-{payment.created_at.year}-{payment.id:06d}",
                "customer_name": user.full_name,
                "date": payment.created_at.strftime("%B %d, %Y"),
                "amount": payment.amount,
                "payment_method": (
                    payment.payment_method.type.value
                    if payment.payment_method
                    else "N/A"
                ),
                "card_last_four": (
                    payment.payment_method.last_four if payment.payment_method else None
                ),
                "service_name": payment.description,
                "barber_name": payment.metadata.get("barber_name", "N/A"),
                "service_date": payment.created_at.strftime("%B %d, %Y"),
                "service_amount": payment.amount,
                "tip_amount": payment.metadata.get("tip_amount", 0),
            }

            if additional_context:
                payment_data.update(additional_context)

            # Check user preferences
            prefs = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == user.id)
                .first()
            )

            # Send email receipt if enabled
            if not prefs or prefs.email_payment_receipt:
                email_service.send_payment_receipt(
                    db=db, to_email=user.email, payment_data=payment_data
                )

            # Send SMS confirmation if enabled
            if user.phone and prefs and prefs.sms_payment_confirmation:
                sms_service.send_payment_confirmation(
                    db=db,
                    to_number=user.phone,
                    amount=payment.amount,
                    service_name=payment.description,
                )

        except Exception as e:
            logger.error(f"Error sending payment notifications: {str(e)}")

    @staticmethod
    async def schedule_appointment_reminders(db: Session):
        """Schedule reminders for upcoming appointments"""
        try:
            now = datetime.utcnow()

            # Get all active appointments
            appointments = (
                db.query(Appointment)
                .filter(
                    Appointment.status == "confirmed",
                    Appointment.appointment_time > now,
                )
                .all()
            )

            for appointment in appointments:
                time_until = appointment.appointment_time - now

                # Check for 24-hour reminder
                if timedelta(hours=23) < time_until < timedelta(hours=25):
                    await CommunicationIntegrationService.send_appointment_notifications(
                        db=db,
                        appointment=appointment,
                        notification_type="reminder",
                        additional_context={"hours_before": 24},
                    )

                # Check for 2-hour reminder
                elif timedelta(hours=1.5) < time_until < timedelta(hours=2.5):
                    await CommunicationIntegrationService.send_appointment_notifications(
                        db=db,
                        appointment=appointment,
                        notification_type="reminder",
                        additional_context={"hours_before": 2},
                    )

        except Exception as e:
            logger.error(f"Error scheduling appointment reminders: {str(e)}")

    @staticmethod
    async def send_welcome_notification(db: Session, user: User):
        """Send welcome notifications to new users"""
        try:
            user_data = {
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role,
                "location": (
                    user.primary_location.name if user.primary_location else None
                ),
            }

            # Send welcome email
            email_service.send_welcome_email(
                db=db, to_email=user.email, user_data=user_data
            )

            # Send welcome SMS if phone number exists
            if user.phone:
                sms_service.send_sms(
                    db=db,
                    to_number=user.phone,
                    message=f"Welcome to 6FB Platform, {user.first_name}! Login at {settings.FRONTEND_URL} to get started.",
                )

        except Exception as e:
            logger.error(f"Error sending welcome notifications: {str(e)}")


# Create a background task to run reminders
async def run_reminder_scheduler(db: Session):
    """Background task to check and send reminders"""
    while True:
        try:
            await CommunicationIntegrationService.schedule_appointment_reminders(db)
            # Run every 30 minutes
            await asyncio.sleep(1800)
        except Exception as e:
            logger.error(f"Error in reminder scheduler: {str(e)}")
            await asyncio.sleep(60)  # Wait 1 minute on error
