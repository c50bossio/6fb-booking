"""
Test endpoint for email configuration
This file can be removed after testing
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from datetime import datetime

from config.settings import settings
from services.email_service import email_service
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/test", tags=["test"])


class TestEmailRequest(BaseModel):
    to_email: EmailStr
    test_type: str = "simple"  # simple, appointment, payment


@router.post("/email-config")
async def test_email_configuration(
    request: TestEmailRequest,
    background_tasks: BackgroundTasks
):
    """
    Test email configuration without authentication
    
    This endpoint is for testing purposes only and should be removed in production.
    """
    try:
        # Check if email is configured
        if not settings.email_enabled:
            return {
                "status": "not_configured",
                "message": "Email service is not configured",
                "details": {
                    "smtp_username_set": bool(settings.SMTP_USERNAME),
                    "smtp_password_set": bool(settings.SMTP_PASSWORD),
                    "smtp_server": settings.SMTP_HOST,
                    "smtp_port": settings.SMTP_PORT
                },
                "instructions": "Please configure email settings in your .env file. See .env.template for examples."
            }
        
        # Prepare test context based on test type
        if request.test_type == "appointment":
            subject = "Test Appointment Confirmation"
            html_content = f"""
            <h2>Appointment Confirmation Test</h2>
            <p>This is a test email for appointment confirmation.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
                <h3>Test Appointment Details:</h3>
                <p><strong>Service:</strong> Test Haircut</p>
                <p><strong>Barber:</strong> Test Barber</p>
                <p><strong>Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                <p><strong>Time:</strong> 2:00 PM</p>
                <p><strong>Location:</strong> Test Location</p>
            </div>
            """
        elif request.test_type == "payment":
            subject = "Test Payment Receipt"
            html_content = f"""
            <h2>Payment Receipt Test</h2>
            <p>This is a test email for payment receipt.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
                <h3>Test Payment Details:</h3>
                <p><strong>Amount:</strong> $50.00</p>
                <p><strong>Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                <p><strong>Method:</strong> Credit Card ending in 4242</p>
                <p><strong>Receipt #:</strong> TEST-001</p>
            </div>
            """
        else:
            subject = "6FB Platform - Email Configuration Test"
            html_content = f"""
            <h2>Email Configuration Test Successful!</h2>
            <p>This test confirms your email configuration is working correctly.</p>
            <p><strong>Test Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p><strong>SMTP Server:</strong> {settings.SMTP_HOST}:{settings.SMTP_PORT}</p>
            <p><strong>From Email:</strong> {settings.EMAIL_FROM_ADDRESS or settings.SMTP_USERNAME}</p>
            """
        
        # Try to send email
        try:
            # Create a mock database session (email service expects it)
            class MockDB:
                def add(self, obj): pass
                def commit(self): pass
                def query(self, model): return self
                def filter(self, *args): return self
                def first(self): return None
            
            mock_db = MockDB()
            
            # Use direct SMTP for testing
            from services.email_service import EmailService
            test_service = EmailService()
            
            # Send simple email
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS or settings.SMTP_USERNAME}>"
            msg['To'] = request.to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect and send
            if settings.SMTP_PORT == 587:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
            elif settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            return {
                "status": "success",
                "message": f"Test email sent successfully to {request.to_email}",
                "details": {
                    "subject": subject,
                    "test_type": request.test_type,
                    "smtp_server": f"{settings.SMTP_HOST}:{settings.SMTP_PORT}",
                    "from_email": settings.EMAIL_FROM_ADDRESS or settings.SMTP_USERNAME
                }
            }
            
        except smtplib.SMTPAuthenticationError as e:
            return {
                "status": "auth_error",
                "message": "SMTP authentication failed",
                "error": str(e),
                "troubleshooting": [
                    "For Gmail: Make sure you're using an App Password, not your regular password",
                    "For Gmail: Enable 2-factor authentication and generate an App Password",
                    "For other providers: Check your SMTP credentials"
                ]
            }
        except smtplib.SMTPConnectError as e:
            return {
                "status": "connection_error",
                "message": "Failed to connect to SMTP server",
                "error": str(e),
                "troubleshooting": [
                    "Check SMTP_SERVER and SMTP_PORT settings",
                    "Ensure your firewall allows outbound connections on the SMTP port",
                    "Verify the SMTP server address is correct"
                ]
            }
        except Exception as e:
            return {
                "status": "error",
                "message": "Failed to send test email",
                "error": str(e),
                "error_type": type(e).__name__
            }
            
    except Exception as e:
        logger.error(f"Error in test email endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Test failed: {str(e)}"
        )


@router.get("/email-status")
async def check_email_status():
    """Check current email configuration status"""
    return {
        "email_enabled": settings.email_enabled,
        "smtp_configured": {
            "server": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "username_set": bool(settings.SMTP_USERNAME),
            "password_set": bool(settings.SMTP_PASSWORD),
            "from_email": settings.EMAIL_FROM_ADDRESS or settings.SMTP_USERNAME,
            "from_name": settings.EMAIL_FROM_NAME
        },
        "sendgrid_configured": bool(settings.SENDGRID_API_KEY),
        "environment": settings.ENVIRONMENT,
        "instructions": {
            "gmail": "Use App Password from https://myaccount.google.com/apppasswords",
            "sendgrid": "Get API key from https://sendgrid.com",
            "config_file": ".env (copy from .env.template)"
        }
    }