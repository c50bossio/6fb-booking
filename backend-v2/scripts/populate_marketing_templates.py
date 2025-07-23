#!/usr/bin/env python3
"""
Script to populate sample marketing templates for the 6FB booking system
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import SessionLocal
from models import MarketingTemplate, User
from datetime import datetime, timezone

def create_marketing_templates(db):
    """Create sample marketing templates"""
    
    # Get a super admin user as creator
    admin = db.query(User).filter(User.role == "super_admin").first()
    if not admin:
        print("No super admin found. Please create one first.")
        return
    
    templates = [
        # Email Templates
        {
            "name": "Welcome Email",
            "description": "Welcome new clients to your barbershop",
            "template_type": "email",
            "category": "welcome",
            "subject": "Welcome to {{ business_name }}!",
            "content": """
<h2>Welcome {{ client_name }}!</h2>

<p>Thank you for choosing {{ business_name }} for your grooming needs. We're excited to have you as our valued client.</p>

<p>Here's what you can expect:</p>
<ul>
    <li>Professional barbers dedicated to your style</li>
    <li>Easy online booking available 24/7</li>
    <li>Exclusive offers and promotions</li>
    <li>Loyalty rewards for regular visits</li>
</ul>

<p>Book your next appointment online or call us at {{ business_phone }}.</p>

<p>We look forward to seeing you soon!</p>

<p>Best regards,<br>
The {{ business_name }} Team</p>
            """.strip(),
            "variables": ["client_name", "business_name", "business_phone"],
            "preview_data": {
                "client_name": "John Doe",
                "business_name": "Six Figure Barber Shop",
                "business_phone": "(555) 123-4567"
            }
        },
        {
            "name": "Monthly Promotion",
            "description": "Monthly promotional offer email",
            "template_type": "email",
            "category": "promotional",
            "subject": "{{ discount }}% Off This Month at {{ business_name }}!",
            "content": """
<h2>Special Offer for {{ client_name }}!</h2>

<p>This month only, enjoy <strong>{{ discount }}% off</strong> on {{ service_name }}!</p>

<p>{{ promotion_description }}</p>

<p><strong>Offer valid until: {{ offer_end_date }}</strong></p>

<p>Don't miss out on this exclusive offer. Book your appointment today!</p>

<a href="{{ booking_link }}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Book Now</a>

<p>Terms and conditions apply. Cannot be combined with other offers.</p>

<p>Best regards,<br>
{{ business_name }}</p>
            """.strip(),
            "variables": ["client_name", "business_name", "discount", "service_name", "promotion_description", "offer_end_date", "booking_link"],
            "preview_data": {
                "client_name": "John Doe",
                "business_name": "Six Figure Barber Shop",
                "discount": "20",
                "service_name": "Premium Haircut & Beard Trim",
                "promotion_description": "Get ready for the season with our premium grooming package!",
                "offer_end_date": "December 31, 2024",
                "booking_link": "https://book.sixfigurebarber.com"
            }
        },
        {
            "name": "Re-engagement Campaign",
            "description": "Win back inactive clients",
            "template_type": "email",
            "category": "retention",
            "subject": "We Miss You at {{ business_name }}!",
            "content": """
<h2>Hey {{ client_name }}, It's Been a While!</h2>

<p>We noticed it's been {{ days_since_visit }} days since your last visit to {{ business_name }}. We miss seeing you!</p>

<p>As a valued client, we'd love to welcome you back with a special offer:</p>

<div style="border: 2px solid #007bff; padding: 15px; margin: 20px 0; text-align: center;">
    <h3>{{ special_offer }}</h3>
    <p>Use code: <strong>{{ promo_code }}</strong></p>
</div>

<p>Your favorite barber is ready to give you that fresh look you deserve.</p>

<a href="{{ booking_link }}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Book Your Comeback Visit</a>

<p>Hope to see you soon!</p>

<p>{{ business_name }} Team</p>
            """.strip(),
            "variables": ["client_name", "business_name", "days_since_visit", "special_offer", "promo_code", "booking_link"],
            "preview_data": {
                "client_name": "John Doe",
                "business_name": "Six Figure Barber Shop",
                "days_since_visit": "60",
                "special_offer": "15% Off Your Next Service",
                "promo_code": "COMEBACK15",
                "booking_link": "https://book.sixfigurebarber.com"
            }
        },
        
        # SMS Templates
        {
            "name": "Quick Reminder SMS",
            "description": "Short appointment reminder via SMS",
            "template_type": "sms",
            "category": "reminder",
            "content": "Hi {{ client_name }}! Don't forget your appointment at {{ business_name }} tomorrow at {{ appointment_time }}. Reply CONFIRM to confirm or CANCEL to cancel.",
            "variables": ["client_name", "business_name", "appointment_time"],
            "preview_data": {
                "client_name": "John",
                "business_name": "6FB Shop",
                "appointment_time": "2:00 PM"
            }
        },
        {
            "name": "SMS Promotion",
            "description": "Short promotional SMS",
            "template_type": "sms",
            "category": "promotional",
            "content": "{{ business_name }}: {{ offer_text }} Book now: {{ booking_link }} Reply STOP to opt out.",
            "variables": ["business_name", "offer_text", "booking_link"],
            "preview_data": {
                "business_name": "6FB",
                "offer_text": "Flash Sale! 20% off all services today only!",
                "booking_link": "6fb.link/book"
            }
        },
        {
            "name": "Birthday SMS",
            "description": "Birthday greeting with special offer",
            "template_type": "sms",
            "category": "special_occasion",
            "content": "Happy Birthday {{ client_name }}! 🎉 Enjoy {{ birthday_offer }} at {{ business_name }} this month. Use code: {{ promo_code }}",
            "variables": ["client_name", "birthday_offer", "business_name", "promo_code"],
            "preview_data": {
                "client_name": "John",
                "birthday_offer": "25% off",
                "business_name": "6FB",
                "promo_code": "BDAY25"
            }
        }
    ]
    
    created_count = 0
    for template_data in templates:
        # Check if template already exists
        existing = db.query(MarketingTemplate).filter(
            MarketingTemplate.name == template_data["name"]
        ).first()
        
        if not existing:
            template = MarketingTemplate(
                **template_data,
                created_by_id=admin.id,
                is_active=True,
                usage_count=0
            )
            db.add(template)
            created_count += 1
            print(f"Created template: {template_data['name']}")
        else:
            print(f"Template already exists: {template_data['name']}")
    
    db.commit()
    print(f"\nCreated {created_count} new marketing templates")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        create_marketing_templates(db)
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()