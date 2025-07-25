#!/usr/bin/env python3
"""
Example integration showing how to use the appointment confirmation email template
with the BookedBarber notification service.

This demonstrates how to:
1. Load and render the MJML template
2. Compile it to HTML
3. Send it via the notification service
"""

from typing import Dict
import os
import subprocess
from datetime import datetime, timedelta
from jinja2 import Environment, FileSystemLoader
import base64
from io import BytesIO
import qrcode


class EmailTemplateService:
    """Service for handling email template rendering and compilation."""
    
    def __init__(self, template_base_path: str):
        self.env = Environment(
            loader=FileSystemLoader(template_base_path),
            autoescape=True
        )
    
    def compile_mjml(self, mjml_content: str) -> str:
        """Compile MJML to HTML using mjml command."""
        try:
            process = subprocess.Popen(
                ['mjml', '-i', '-s'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(mjml_content)
            
            if process.returncode != 0:
                raise Exception(f"MJML compilation failed: {stderr}")
            
            return stdout
        except FileNotFoundError:
            raise Exception("MJML not found. Install with: npm install -g mjml")
    
    def generate_qr_code(self, data: str) -> str:
        """Generate QR code and return as base64 data URL."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
    
    def render_appointment_confirmation(
        self,
        appointment_data: Dict,
        shop_data: Dict,
        client_data: Dict
    ) -> tuple[str, str]:
        """
        Render appointment confirmation email.
        
        Returns:
            tuple: (html_content, plain_text_content)
        """
        
        # Generate QR code for the appointment
        qr_data = f"APPT:{appointment_data['id']}:{appointment_data['date']}:{client_data['id']}"
        qr_code_url = self.generate_qr_code(qr_data)
        
        # Format appointment date and time
        appointment_datetime = datetime.fromisoformat(appointment_data['datetime'])
        
        # Build template context
        context = {
            'title': 'Appointment Confirmation - BookedBarber',
            'preview_text': f"Your appointment with {appointment_data['barber_name']} is confirmed for {appointment_datetime.strftime('%A, %B %d at %I:%M %p')}",
            'subtitle': 'Premium Barber Booking Platform',
            'current_year': datetime.now().year,
            
            # Appointment details
            'service_name': appointment_data['service_name'],
            'barber_name': appointment_data['barber_name'],
            'appointment_date': appointment_datetime.strftime('%A, %B %d, %Y'),
            'appointment_time': appointment_datetime.strftime('%I:%M %p'),
            'duration': appointment_data['duration'],
            'price': f"{appointment_data['price']:.2f}",
            
            # Shop details
            'shop_name': shop_data['name'],
            'shop_address': shop_data['address'],
            'shop_city': shop_data['city'],
            'shop_state': shop_data['state'],
            'shop_zip': shop_data['zip'],
            'shop_phone': shop_data['phone'],
            
            # URLs
            'qr_code_url': qr_code_url,
            'directions_url': f"https://maps.google.com/?q={shop_data['address'].replace(' ', '+')}+{shop_data['city']}+{shop_data['state']}",
            'calendar_url': f"https://bookedbarber.com/calendar/add?id={appointment_data['id']}",
            'manage_appointment_url': f"https://bookedbarber.com/appointments/{appointment_data['id']}",
            'help_url': 'https://bookedbarber.com/help',
            'unsubscribe_url': f"https://bookedbarber.com/unsubscribe?token={client_data['unsubscribe_token']}",
            'preferences_url': f"https://bookedbarber.com/preferences?token={client_data['preferences_token']}"
        }
        
        # Render MJML template
        template = self.env.get_template('emails/transactional/appointment_confirmation.mjml')
        mjml_content = template.render(**context)
        
        # Compile to HTML
        html_content = self.compile_mjml(mjml_content)
        
        # Generate plain text version
        plain_text = self._generate_plain_text(context)
        
        return html_content, plain_text
    
    def _generate_plain_text(self, context: Dict) -> str:
        """Generate plain text version of the email."""
        return f"""
Appointment Confirmed!

Your appointment has been successfully booked.

SERVICE: {context['service_name']}
BARBER: {context['barber_name']}
DATE: {context['appointment_date']}
TIME: {context['appointment_time']}
DURATION: {context['duration']} minutes
PRICE: ${context['price']}

LOCATION:
{context['shop_name']}
{context['shop_address']}
{context['shop_city']}, {context['shop_state']} {context['shop_zip']}

Get Directions: {context['directions_url']}

WHAT TO EXPECT:
- Arrive 5-10 minutes early
- Bring your phone or this confirmation
- Payment will be processed after service

Need to make changes?
You can reschedule or cancel your appointment up to 24 hours before your scheduled time.
Visit: {context['manage_appointment_url']}

Questions? Call us at {context['shop_phone']} or visit {context['help_url']}

---
This appointment was booked through BookedBarber
© {context['current_year']} BookedBarber. All rights reserved.

Unsubscribe: {context['unsubscribe_url']}
Update Preferences: {context['preferences_url']}
"""


# Example usage with the notification service
async def send_appointment_confirmation(
    appointment_id: str,
    notification_service,  # Your notification service instance
    db_session  # Database session
):
    """Example function showing how to send appointment confirmation."""
    
    # Fetch appointment data from database
    appointment = db_session.query(Appointment).filter_by(id=appointment_id).first()
    
    # Prepare data
    appointment_data = {
        'id': appointment.id,
        'datetime': appointment.datetime.isoformat(),
        'service_name': appointment.service.name,
        'barber_name': f"{appointment.barber.first_name} {appointment.barber.last_name}",
        'duration': appointment.service.duration,
        'price': appointment.service.price
    }
    
    shop_data = {
        'name': appointment.barber.shop.name,
        'address': appointment.barber.shop.address,
        'city': appointment.barber.shop.city,
        'state': appointment.barber.shop.state,
        'zip': appointment.barber.shop.zip,
        'phone': appointment.barber.shop.phone
    }
    
    client_data = {
        'id': appointment.client.id,
        'email': appointment.client.email,
        'unsubscribe_token': appointment.client.unsubscribe_token,
        'preferences_token': appointment.client.preferences_token
    }
    
    # Initialize template service
    template_service = EmailTemplateService('/path/to/templates')
    
    # Render email
    html_content, plain_text = template_service.render_appointment_confirmation(
        appointment_data,
        shop_data,
        client_data
    )
    
    # Send via notification service
    await notification_service.send_email(
        to_email=client_data['email'],
        subject=f"Appointment Confirmed - {appointment_data['barber_name']}",
        html_content=html_content,
        plain_text=plain_text,
        category='appointment_confirmation'
    )
    
    # Also send SMS if client has opted in
    if appointment.client.sms_notifications_enabled:
        sms_message = f"Your appointment with {appointment_data['barber_name']} is confirmed for {appointment_data['appointment_date']} at {appointment_data['appointment_time']}. Reply STOP to opt out."
        
        await notification_service.send_sms(
            to_phone=appointment.client.phone,
            message=sms_message
        )


if __name__ == "__main__":
    # Test the template rendering
    template_service = EmailTemplateService(os.path.dirname(os.path.abspath(__file__)) + '/../..')
    
    # Sample data
    test_appointment = {
        'id': 'APPT-123456',
        'datetime': (datetime.now() + timedelta(days=3)).isoformat(),
        'service_name': 'Premium Haircut & Beard Trim',
        'barber_name': 'Marcus Johnson',
        'duration': 45,
        'price': 65.00
    }
    
    test_shop = {
        'name': 'Elite Cuts Barbershop',
        'address': '123 Main Street, Suite 100',
        'city': 'Brooklyn',
        'state': 'NY',
        'zip': '11201',
        'phone': '(555) 123-4567'
    }
    
    test_client = {
        'id': 'CLIENT-789',
        'email': 'client@example.com',
        'unsubscribe_token': 'test-unsubscribe-token',
        'preferences_token': 'test-preferences-token'
    }
    
    try:
        html, plain = template_service.render_appointment_confirmation(
            test_appointment,
            test_shop,
            test_client
        )
        
        # Save preview
        with open('appointment_confirmation_test.html', 'w') as f:
            f.write(html)
        
        print("✅ Template rendered successfully!")
        print("📧 HTML preview saved to: appointment_confirmation_test.html")
        print("\n📄 Plain text version:")
        print("-" * 50)
        print(plain)
        
    except Exception as e:
        print(f"❌ Error: {e}")