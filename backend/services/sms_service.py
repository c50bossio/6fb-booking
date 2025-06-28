"""
SMS service for sending text messages via Twilio
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from sqlalchemy.orm import Session

from core.config import settings
from utils.logging import get_logger
from models.communication import SMSLog, SMSStatus

logger = get_logger(__name__)


class SMSService:
    """Service for sending SMS messages via Twilio"""

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER

        if settings.sms_enabled:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    def _format_phone_number(self, phone: str) -> str:
        """Format phone number to E.164 format"""
        # Remove all non-digit characters
        phone = "".join(filter(str.isdigit, phone))

        # Add country code if not present (assuming US)
        if len(phone) == 10:
            phone = "1" + phone

        # Add + prefix
        if not phone.startswith("+"):
            phone = "+" + phone

        return phone

    def _truncate_message(self, message: str, max_length: int = 160) -> str:
        """Truncate message to fit SMS character limit"""
        if len(message) <= max_length:
            return message

        # Truncate and add ellipsis
        return message[: max_length - 3] + "..."

    def _log_sms(
        self,
        db: Session,
        to_number: str,
        message: str,
        status: SMSStatus,
        error_message: Optional[str] = None,
        twilio_sid: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SMSLog:
        """Log SMS send attempt"""
        sms_log = SMSLog(
            recipient=to_number,
            message=message,
            status=status,
            error_message=error_message,
            twilio_sid=twilio_sid,
            metadata=metadata or {},
            sent_at=datetime.utcnow() if status == SMSStatus.SENT else None,
        )
        db.add(sms_log)
        db.commit()
        return sms_log

    def send_sms(
        self, db: Session, to_number: str, message: str, media_url: Optional[str] = None
    ) -> bool:
        """Send SMS message"""
        if not settings.sms_enabled:
            logger.warning("SMS service is not configured")
            return False

        try:
            # Format phone number
            formatted_number = self._format_phone_number(to_number)

            # Truncate message if needed
            truncated_message = self._truncate_message(message)

            # Send SMS
            if media_url:
                # MMS with media
                response = self.client.messages.create(
                    body=truncated_message,
                    from_=self.from_number,
                    to=formatted_number,
                    media_url=[media_url],
                )
            else:
                # Regular SMS
                response = self.client.messages.create(
                    body=truncated_message, from_=self.from_number, to=formatted_number
                )

            # Log success
            self._log_sms(
                db=db,
                to_number=formatted_number,
                message=truncated_message,
                status=SMSStatus.SENT,
                twilio_sid=response.sid,
                metadata={
                    "status": response.status,
                    "price": response.price,
                    "price_unit": response.price_unit,
                },
            )

            logger.info(f"SMS sent successfully to {formatted_number}")
            return True

        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {to_number}: {str(e)}")

            # Log failure
            self._log_sms(
                db=db,
                to_number=to_number,
                message=message,
                status=SMSStatus.FAILED,
                error_message=str(e),
            )

            return False
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_number}: {str(e)}")

            # Log failure
            self._log_sms(
                db=db,
                to_number=to_number,
                message=message,
                status=SMSStatus.FAILED,
                error_message=str(e),
            )

            return False

    def send_bulk_sms(
        self, db: Session, recipients: List[Dict[str, Any]], message_template: str
    ) -> Dict[str, int]:
        """Send bulk SMS to multiple recipients"""
        results = {"sent": 0, "failed": 0, "total": len(recipients)}

        for recipient in recipients:
            # Personalize message if template variables provided
            message = message_template
            if "context" in recipient:
                for key, value in recipient["context"].items():
                    message = message.replace(f"{{{key}}}", str(value))

            # Send SMS
            if self.send_sms(db=db, to_number=recipient["phone"], message=message):
                results["sent"] += 1
            else:
                results["failed"] += 1

        logger.info(
            f"Bulk SMS completed: {results['sent']} sent, {results['failed']} failed"
        )
        return results

    def check_delivery_status(self, twilio_sid: str) -> Optional[str]:
        """Check delivery status of a sent message"""
        if not settings.sms_enabled:
            return None

        try:
            message = self.client.messages(twilio_sid).fetch()
            return message.status
        except Exception as e:
            logger.error(f"Failed to check delivery status for {twilio_sid}: {str(e)}")
            return None

    def update_delivery_status(self, db: Session, twilio_sid: str):
        """Update delivery status in database"""
        status = self.check_delivery_status(twilio_sid)
        if not status:
            return

        # Map Twilio status to our status
        status_map = {
            "delivered": SMSStatus.DELIVERED,
            "failed": SMSStatus.FAILED,
            "undelivered": SMSStatus.FAILED,
            "sent": SMSStatus.SENT,
            "queued": SMSStatus.SENT,
        }

        sms_log = db.query(SMSLog).filter(SMSLog.twilio_sid == twilio_sid).first()
        if sms_log:
            sms_log.status = status_map.get(status, SMSStatus.SENT)
            if status == "delivered":
                sms_log.delivered_at = datetime.utcnow()
            db.commit()

    # Specific SMS methods

    def send_appointment_reminder(
        self,
        db: Session,
        to_number: str,
        appointment_data: Dict[str, Any],
        hours_before: int = 24,
    ) -> bool:
        """Send appointment reminder SMS"""
        if hours_before == 24:
            message = (
                f"Reminder: You have an appointment tomorrow at {appointment_data['time']} "
                f"for {appointment_data['service_name']} with {appointment_data['barber_name']}. "
                f"Reply CANCEL to cancel."
            )
        else:
            message = (
                f"Reminder: Your appointment is in {hours_before} hours at {appointment_data['time']} "
                f"for {appointment_data['service_name']} with {appointment_data['barber_name']}."
            )

        return self.send_sms(db, to_number, message)

    def send_appointment_confirmation(
        self, db: Session, to_number: str, appointment_data: Dict[str, Any]
    ) -> bool:
        """Send appointment confirmation SMS"""
        message = (
            f"Appointment confirmed! {appointment_data['date']} at {appointment_data['time']} "
            f"for {appointment_data['service_name']} with {appointment_data['barber_name']}. "
            f"Reply CANCEL to cancel."
        )

        return self.send_sms(db, to_number, message)

    def send_appointment_cancellation(
        self, db: Session, to_number: str, appointment_data: Dict[str, Any]
    ) -> bool:
        """Send appointment cancellation SMS"""
        message = (
            f"Your appointment on {appointment_data['date']} at {appointment_data['time']} "
            f"has been cancelled. To rebook, visit {settings.FRONTEND_URL}/book"
        )

        return self.send_sms(db, to_number, message)

    def send_payment_confirmation(
        self, db: Session, to_number: str, amount: float, service_name: str
    ) -> bool:
        """Send payment confirmation SMS"""
        message = f"Payment of ${amount:.2f} received for {service_name}. Thank you!"

        return self.send_sms(db, to_number, message)

    def send_marketing_message(
        self, db: Session, to_number: str, promotion: Dict[str, Any]
    ) -> bool:
        """Send marketing/promotional SMS"""
        message = (
            f"{promotion['title']}! {promotion['description']} "
            f"Valid until {promotion['expires']}. Book now: {settings.FRONTEND_URL}/book"
        )

        return self.send_sms(db, to_number, message)

    def send_verification_code(self, db: Session, to_number: str, code: str) -> bool:
        """Send verification code SMS"""
        message = f"Your 6FB verification code is: {code}. Valid for 10 minutes."

        return self.send_sms(db, to_number, message)


# Singleton instance
sms_service = SMSService()
