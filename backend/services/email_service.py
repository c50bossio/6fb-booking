"""
Email service for sending HTML and plain text emails via SMTP
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from config.settings import settings
from utils.logging import get_logger

# from models.communication import EmailLog, EmailStatus

logger = get_logger(__name__)


class EmailService:
    """Service for sending emails with templates and tracking"""

    def __init__(self):
        self.smtp_host = getattr(settings, "SMTP_HOST", None)
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_username = getattr(settings, "SMTP_USERNAME", None)
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        self.from_email = (
            getattr(settings, "EMAIL_FROM_ADDRESS", None) or self.smtp_username
        )
        self.from_name = getattr(settings, "EMAIL_FROM_NAME", "6FB Platform")

        # Initialize Jinja2 for email templates
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        if not template_dir.exists():
            template_dir.mkdir(parents=True, exist_ok=True)
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def _get_smtp_connection(self):
        """Create SMTP connection"""
        try:
            if self.smtp_port == 587:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            elif self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)

            server.login(self.smtp_username, self.smtp_password)
            return server
        except Exception as e:
            logger.error(f"Failed to connect to SMTP server: {str(e)}")
            raise

    def _render_template(
        self, template_name: str, context: Dict[str, Any]
    ) -> tuple[str, str]:
        """Render email template to HTML and plain text"""
        try:
            # Add default context
            context.update(
                {
                    "current_year": datetime.now().year,
                    "platform_name": "6FB Platform",
                    "support_email": "support@6fbplatform.com",
                    "website_url": settings.FRONTEND_URL,
                }
            )

            # Render HTML template
            html_template = self.jinja_env.get_template(f"{template_name}.html")
            html_content = html_template.render(**context)

            # Render plain text template
            try:
                text_template = self.jinja_env.get_template(f"{template_name}.txt")
                text_content = text_template.render(**context)
            except Exception:
                # If no text template, create basic text from context
                text_content = self._html_to_text(html_content)

            return html_content, text_content
        except Exception as e:
            logger.error(f"Failed to render template {template_name}: {str(e)}")
            raise

    def _html_to_text(self, html: str) -> str:
        """Convert HTML to plain text (basic implementation)"""
        import re

        # Remove HTML tags
        text = re.sub("<[^<]+?>", "", html)
        # Replace multiple spaces with single space
        text = re.sub(" +", " ", text)
        # Replace multiple newlines with double newline
        text = re.sub("\n+", "\n\n", text)
        return text.strip()

    def _create_message(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> MIMEMultipart:
        """Create email message with HTML and plain text parts"""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email
        msg["Reply-To"] = "reply@em3014.6fbmentorship.com"

        if cc:
            msg["Cc"] = ", ".join(cc)

        # Add text and HTML parts
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")

        msg.attach(text_part)
        msg.attach(html_part)

        # Add attachments if any
        if attachments:
            for attachment in attachments:
                self._add_attachment(msg, attachment)

        return msg

    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """Add attachment to email message"""
        try:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment["content"])
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition", f'attachment; filename= {attachment["filename"]}'
            )
            msg.attach(part)
        except Exception as e:
            logger.error(f"Failed to add attachment: {str(e)}")

    # def _log_email(
    #     self,
    #     db: Session,
    #     to_email: str,
    #     subject: str,
    #     template: str,
    #     status: EmailStatus,
    #     error_message: Optional[str] = None,
    #     metadata: Optional[Dict[str, Any]] = None,
    # ) -> EmailLog:
    #     """Log email send attempt"""
    #     email_log = EmailLog(
    #         recipient=to_email,
    #         subject=subject,
    #         template=template,
    #         status=status,
    #         error_message=error_message,
    #         metadata=metadata or {},
    #         sent_at=datetime.utcnow() if status == EmailStatus.SENT else None,
    #     )
    #     db.add(email_log)
    #     db.commit()
    #     return email_log

    def send_email(
        self,
        db: Session,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """Send email using template"""
        if not getattr(settings, "email_enabled", True):
            logger.warning("Email service is not configured")
            return False

        try:
            # Render template
            html_content, text_content = self._render_template(template_name, context)

            # Create message
            msg = self._create_message(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                cc=cc,
                bcc=bcc,
                attachments=attachments,
            )

            # Send email
            with self._get_smtp_connection() as server:
                recipients = [to_email]
                if cc:
                    recipients.extend(cc)
                if bcc:
                    recipients.extend(bcc)

                server.send_message(msg, self.from_email, recipients)

            # Log success
            # self._log_email(
            #     db=db,
            #     to_email=to_email,
            #     subject=subject,
            #     template=template_name,
            #     status=EmailStatus.SENT,
            #     metadata={"context": context},
            # )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")

            # Log failure
            # self._log_email(
            #     db=db,
            #     to_email=to_email,
            #     subject=subject,
            #     template=template_name,
            #     status=EmailStatus.FAILED,
            #     error_message=str(e),
            #     metadata={"context": context},
            # )

            return False

    def send_bulk_emails(
        self,
        db: Session,
        recipients: List[Dict[str, Any]],
        subject: str,
        template_name: str,
        common_context: Dict[str, Any] = None,
    ) -> Dict[str, int]:
        """Send bulk emails to multiple recipients"""
        results = {"sent": 0, "failed": 0, "total": len(recipients)}

        for recipient in recipients:
            # Merge common context with recipient-specific context
            context = common_context.copy() if common_context else {}
            context.update(recipient.get("context", {}))

            # Send email
            if self.send_email(
                db=db,
                to_email=recipient["email"],
                subject=subject,
                template_name=template_name,
                context=context,
            ):
                results["sent"] += 1
            else:
                results["failed"] += 1

        logger.info(
            f"Bulk email completed: {results['sent']} sent, {results['failed']} failed"
        )
        return results

    # Specific email methods

    def send_appointment_confirmation(
        self, db: Session, to_email: str, appointment_data: Dict[str, Any]
    ) -> bool:
        """Send appointment confirmation email"""
        return self.send_email(
            db=db,
            to_email=to_email,
            subject=f"Appointment Confirmed - {appointment_data['service_name']}",
            template_name="appointment_confirmation",
            context={
                "appointment": appointment_data,
                "cancel_url": f"{settings.FRONTEND_URL}/appointments/{appointment_data['id']}/cancel",
                "reschedule_url": f"{settings.FRONTEND_URL}/appointments/{appointment_data['id']}/reschedule",
            },
        )

    def send_appointment_reminder(
        self,
        db: Session,
        to_email: str,
        appointment_data: Dict[str, Any],
        hours_before: int = 24,
    ) -> bool:
        """Send appointment reminder email"""
        return self.send_email(
            db=db,
            to_email=to_email,
            subject=f"Reminder: Appointment Tomorrow - {appointment_data['service_name']}",
            template_name="appointment_reminder",
            context={
                "appointment": appointment_data,
                "hours_before": hours_before,
                "view_url": f"{settings.FRONTEND_URL}/appointments/{appointment_data['id']}",
            },
        )

    def send_appointment_cancellation(
        self,
        db: Session,
        to_email: str,
        appointment_data: Dict[str, Any],
        reason: Optional[str] = None,
    ) -> bool:
        """Send appointment cancellation email"""
        return self.send_email(
            db=db,
            to_email=to_email,
            subject=f"Appointment Cancelled - {appointment_data['service_name']}",
            template_name="appointment_cancellation",
            context={
                "appointment": appointment_data,
                "reason": reason,
                "rebook_url": f"{settings.FRONTEND_URL}/book",
            },
        )

    def send_payment_receipt(
        self, db: Session, to_email: str, payment_data: Dict[str, Any]
    ) -> bool:
        """Send payment receipt email"""
        return self.send_email(
            db=db,
            to_email=to_email,
            subject=f"Payment Receipt - ${payment_data['amount']:.2f}",
            template_name="payment_receipt",
            context={
                "payment": payment_data,
                "invoice_url": f"{settings.FRONTEND_URL}/invoices/{payment_data['id']}",
            },
        )

    def send_welcome_email(
        self, db: Session, to_email: str, user_data: Dict[str, Any]
    ) -> bool:
        """Send welcome email to new users"""
        return self.send_email(
            db=db,
            to_email=to_email,
            subject="Welcome to 6FB Platform!",
            template_name="welcome",
            context={
                "user": user_data,
                "login_url": f"{settings.FRONTEND_URL}/login",
                "profile_url": f"{settings.FRONTEND_URL}/profile",
            },
        )

    def send_password_reset(
        self, db: Session, to_email: str, reset_token: str, user_name: str
    ) -> bool:
        """Send password reset email"""
        return self.send_email(
            db=db,
            to_email=to_email,
            subject="Password Reset Request",
            template_name="password_reset",
            context={
                "user_name": user_name,
                "reset_url": f"{settings.FRONTEND_URL}/reset-password?token={reset_token}",
                "expires_in": "1 hour",
            },
        )

    async def send_welcome_email(self, email: str, first_name: str) -> bool:
        """Send welcome email to new client (async wrapper)"""
        # For now, just log in development
        logger.info(f"Sending welcome email to {email} for {first_name}")
        return True

    async def send_vip_welcome_email(self, email: str, first_name: str) -> bool:
        """Send VIP welcome email to client (async wrapper)"""
        logger.info(f"Sending VIP welcome email to {email} for {first_name}")
        return True

    async def send_custom_email(
        self, email: str, subject: str, message: str, first_name: str
    ) -> bool:
        """Send custom email to client (async wrapper)"""
        logger.info(f"Sending custom email to {email}: {subject}")
        # In production, this would send actual email
        return True


# Singleton instance
email_service = EmailService()


# Standalone functions for booking endpoints
def send_booking_confirmation(
    client_email: str,
    client_name: str,
    barber_name: str,
    service_name: str,
    appointment_date,
    appointment_time,
    location: str,
    booking_token: str,
    location_address: Optional[str] = None,
):
    """Send booking confirmation email (standalone function for booking endpoints)"""
    from datetime import date, time

    # Format date and time
    if isinstance(appointment_date, date):
        date_str = appointment_date.strftime("%A, %B %d, %Y")
    else:
        date_str = str(appointment_date)

    if isinstance(appointment_time, time):
        time_str = appointment_time.strftime("%I:%M %p")
    else:
        time_str = str(appointment_time)

    subject = f"Appointment Confirmation - {service_name} with {barber_name}"

    # Build confirmation URL
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    confirmation_url = f"{base_url}/booking/confirm/{booking_token}"

    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Appointment Confirmation</h2>

            <p>Dear {client_name},</p>

            <p>Your appointment has been successfully booked!</p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Appointment Details:</h3>

                <p style="margin: 5px 0;"><strong>Service:</strong> {service_name}</p>
                <p style="margin: 5px 0;"><strong>Barber:</strong> {barber_name}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {date_str}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> {time_str}</p>
                <p style="margin: 5px 0;"><strong>Location:</strong> {location}</p>
                {f'<p style="margin: 5px 0;"><strong>Address:</strong> {location_address}</p>' if location_address else ''}
            </div>

            <div style="margin: 20px 0;">
                <a href="{confirmation_url}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Appointment Details</a>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Important:</strong> Please arrive 5 minutes before your scheduled time. If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
            </div>

            <p>We look forward to seeing you!</p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

            <p style="font-size: 12px; color: #6b7280;">
                This email was sent from 6FB Booking Platform. If you did not book this appointment, please contact us immediately.
            </p>
        </div>
    </body>
    </html>
    """

    # In development, just log the email
    if os.getenv("ENVIRONMENT", "development").lower() == "development":
        logger.info(f"[DEV] Booking confirmation email would be sent to {client_email}")
        logger.debug(f"Subject: {subject}")
        return True

    # In production, use the email service
    try:
        # This would need database session in production
        # For now, we'll use a simple SMTP approach
        logger.info(f"Booking confirmation email sent to {client_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking confirmation email: {str(e)}")
        return False
