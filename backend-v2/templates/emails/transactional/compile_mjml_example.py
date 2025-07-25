#!/usr/bin/env python3
"""
Example script showing how to compile and use the MJML appointment confirmation template.

Requirements:
    pip install mjml jinja2

Usage:
    python compile_mjml_example.py
"""

import subprocess
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import os

def compile_mjml_to_html(mjml_content):
    """Compile MJML to HTML using mjml command line tool."""
    # You need to have mjml installed: npm install -g mjml
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

def render_appointment_confirmation():
    """Render the appointment confirmation email with sample data."""
    
    # Setup Jinja2 environment
    template_dir = os.path.dirname(os.path.abspath(__file__))
    env = Environment(loader=FileSystemLoader(os.path.join(template_dir, '../..')))
    
    # Load the template
    template = env.get_template('emails/transactional/appointment_confirmation.mjml')
    
    # Sample data for the template
    context = {
        'title': 'Appointment Confirmation - BookedBarber',
        'preview_text': 'Your appointment with Marcus Johnson is confirmed for Monday, Dec 18 at 2:00 PM',
        'subtitle': 'Premium Barber Booking Platform',
        'current_year': datetime.now().year,
        
        # Appointment details
        'service_name': 'Premium Haircut & Beard Trim',
        'barber_name': 'Marcus Johnson',
        'appointment_date': 'Monday, December 18, 2024',
        'appointment_time': '2:00 PM',
        'duration': '45',
        'price': '65.00',
        
        # Shop details
        'shop_name': 'Elite Cuts Barbershop',
        'shop_address': '123 Main Street, Suite 100',
        'shop_city': 'Brooklyn',
        'shop_state': 'NY',
        'shop_zip': '11201',
        'shop_phone': '(555) 123-4567',
        
        # URLs
        'qr_code_url': 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=BOOKING-ID-123456',
        'directions_url': 'https://maps.google.com/?q=123+Main+Street+Brooklyn+NY',
        'calendar_url': 'https://bookedbarber.com/calendar/add?id=123456',
        'manage_appointment_url': 'https://bookedbarber.com/appointments/123456',
        'help_url': 'https://bookedbarber.com/help',
        'unsubscribe_url': 'https://bookedbarber.com/unsubscribe',
        'preferences_url': 'https://bookedbarber.com/preferences'
    }
    
    # Render the MJML template
    mjml_content = template.render(**context)
    
    # Compile to HTML
    try:
        html_content = compile_mjml_to_html(mjml_content)
        
        # Save the compiled HTML
        output_path = 'appointment_confirmation_preview.html'
        with open(output_path, 'w') as f:
            f.write(html_content)
        
        print(f"✅ Email template compiled successfully!")
        print(f"📧 Preview saved to: {output_path}")
        print(f"🌐 Open in browser to see the result")
        
        return html_content
        
    except Exception as e:
        print(f"❌ Error compiling MJML: {e}")
        print("\nMake sure you have mjml installed:")
        print("  npm install -g mjml")
        
        # Save the raw MJML for debugging
        with open('appointment_confirmation_debug.mjml', 'w') as f:
            f.write(mjml_content)
        print(f"\n📄 Raw MJML saved to: appointment_confirmation_debug.mjml")

if __name__ == "__main__":
    render_appointment_confirmation()