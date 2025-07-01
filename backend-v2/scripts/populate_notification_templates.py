#!/usr/bin/env python3
"""
Script to populate notification templates in the database
"""

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import NotificationTemplate, Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def read_template_file(template_path: Path) -> str:
    """Read template content from file"""
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error reading template {template_path}: {e}")
        return ""

def populate_templates(db: Session):
    """Populate notification templates in the database"""
    
    template_dir = Path(__file__).parent.parent / "templates" / "notifications"
    
    # Define templates with their metadata
    templates = [
        {
            "name": "appointment_confirmation",
            "template_type": "email",
            "subject": "Appointment Confirmed - {{ appointment_date }} at {{ appointment_time }}",
            "file": "appointment_confirmation_email.html",
            "variables": [
                "client_name", "service_name", "appointment_date", "appointment_time", 
                "duration", "price", "barber_name", "business_name", "business_address", 
                "business_phone", "current_year"
            ]
        },
        {
            "name": "appointment_confirmation",
            "template_type": "sms",
            "subject": None,
            "file": "appointment_confirmation_sms.txt",
            "variables": [
                "client_name", "service_name", "appointment_date", "appointment_time", 
                "price", "barber_name", "business_name", "business_phone"
            ]
        },
        {
            "name": "appointment_reminder",
            "template_type": "email",
            "subject": "Reminder: Appointment {{ 'Today' if hours_until <= 2 else 'Tomorrow' }} - {{ appointment_time }}",
            "file": "appointment_reminder_email.html",
            "variables": [
                "client_name", "service_name", "appointment_date", "appointment_time", 
                "duration", "barber_name", "business_name", "business_address", 
                "business_phone", "hours_until", "cancellation_policy", "current_year"
            ]
        },
        {
            "name": "appointment_reminder",
            "template_type": "sms",
            "subject": None,
            "file": "appointment_reminder_sms.txt",
            "variables": [
                "client_name", "service_name", "appointment_date", "appointment_time", 
                "barber_name", "business_name", "business_address", "business_phone", "hours_until"
            ]
        },
        {
            "name": "appointment_cancellation",
            "template_type": "email",
            "subject": "Appointment Cancelled - {{ appointment_date }}",
            "file": "appointment_cancellation_email.html",
            "variables": [
                "client_name", "service_name", "appointment_date", "appointment_time", 
                "barber_name", "business_name", "business_phone", "cancelled_by", 
                "cancellation_reason", "cancellation_date", "refund_amount", 
                "refund_timeframe", "refund_method", "compensation_offered", 
                "book_new_url", "current_year"
            ]
        },
        {
            "name": "appointment_cancellation",
            "template_type": "sms",
            "subject": None,
            "file": "appointment_cancellation_sms.txt",
            "variables": [
                "client_name", "service_name", "appointment_date", "appointment_time", 
                "business_name", "business_phone", "cancelled_by", "refund_amount", 
                "refund_timeframe", "book_new_url"
            ]
        },
        {
            "name": "appointment_rescheduled",
            "template_type": "email",
            "subject": "Appointment Rescheduled - New Time: {{ new_appointment_date }} at {{ new_appointment_time }}",
            "file": None,  # Will create inline
            "variables": [
                "client_name", "service_name", "old_appointment_date", "old_appointment_time",
                "new_appointment_date", "new_appointment_time", "barber_name", "business_name"
            ]
        },
        {
            "name": "appointment_rescheduled",
            "template_type": "sms",
            "subject": None,
            "file": None,  # Will create inline
            "variables": [
                "client_name", "service_name", "old_appointment_date", "old_appointment_time",
                "new_appointment_date", "new_appointment_time", "business_name"
            ]
        }
    ]
    
    created_count = 0
    updated_count = 0
    
    for template_data in templates:
        # Check if template already exists
        existing = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == template_data["name"],
            NotificationTemplate.template_type == template_data["template_type"]
        ).first()
        
        # Read template content
        if template_data["file"]:
            template_path = template_dir / template_data["file"]
            body = read_template_file(template_path)
        else:
            # Inline templates for rescheduled notifications
            if template_data["name"] == "appointment_rescheduled":
                if template_data["template_type"] == "email":
                    body = """
<h2>Appointment Rescheduled</h2>
<p>Hi {{ client_name }},</p>
<p>Your appointment has been rescheduled:</p>
<p><strong>Previous:</strong> {{ old_appointment_date }} at {{ old_appointment_time }}</p>
<p><strong>New:</strong> {{ new_appointment_date }} at {{ new_appointment_time }}</p>
<p>Service: {{ service_name }}</p>
{% if barber_name %}<p>Barber: {{ barber_name }}</p>{% endif %}
<p>Thank you,<br>{{ business_name }}</p>
"""
                else:  # SMS
                    body = """📅 APPOINTMENT RESCHEDULED

Hi {{ client_name }}! Your appointment has been moved:

❌ Was: {{ old_appointment_date }} {{ old_appointment_time }}
✅ Now: {{ new_appointment_date }} {{ new_appointment_time }}
✂️ {{ service_name }}

- {{ business_name }}"""
        
        if not body:
            logger.warning(f"Empty template body for {template_data['name']} ({template_data['template_type']})")
            continue
        
        if existing:
            # Update existing template
            existing.subject = template_data["subject"]
            existing.body = body
            existing.variables = template_data["variables"]
            existing.is_active = True
            updated_count += 1
            logger.info(f"Updated template: {template_data['name']} ({template_data['template_type']})")
        else:
            # Create new template
            template = NotificationTemplate(
                name=template_data["name"],
                template_type=template_data["template_type"],
                subject=template_data["subject"],
                body=body,
                variables=template_data["variables"],
                is_active=True
            )
            db.add(template)
            created_count += 1
            logger.info(f"Created template: {template_data['name']} ({template_data['template_type']})")
    
    db.commit()
    logger.info(f"Template population complete: {created_count} created, {updated_count} updated")
    return created_count, updated_count

def main():
    """Main function"""
    logger.info("Starting notification template population...")
    
    db = SessionLocal()
    try:
        created, updated = populate_templates(db)
        logger.info(f"Successfully populated templates: {created} created, {updated} updated")
    except Exception as e:
        logger.error(f"Error populating templates: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()