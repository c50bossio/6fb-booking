# BookedBarber Email Templates

This directory contains modern, premium email templates for the BookedBarber notification system built with MJML.

## Overview

The email templates are designed with:
- **Modern, premium aesthetic** inspired by top SaaS products
- **Mobile-first responsive design** that looks great on all devices
- **Brand consistency** using the BookedBarber teal/turquoise color scheme (#0891b2)
- **Dark mode support** for modern email clients
- **Accessibility** with proper contrast ratios and semantic HTML

## Template Structure

```
templates/
├── emails/
│   ├── base/
│   │   └── layout.mjml          # Base layout template
│   └── transactional/
│       ├── appointment_confirmation.mjml   # Appointment confirmation email
│       ├── email_design_system.css        # Design system reference
│       ├── compile_mjml_example.py        # MJML compilation example
│       └── notification_integration_example.py  # Integration example
```

## Available Templates

### 1. Appointment Confirmation (`appointment_confirmation.mjml`)

A comprehensive appointment confirmation email featuring:

- **Hero Section**: Success icon and confirmation message
- **Appointment Details Card**: Service, barber, date/time, duration, and price
- **Location Section**: Map preview and shop address with directions link
- **QR Code Section**: Quick check-in QR code
- **What to Expect**: Helpful tips for the appointment
- **Action Buttons**: Add to calendar and manage appointment
- **Help Section**: Support information

## Design System

### Colors

- **Primary**: `#0891b2` (Teal/Turquoise)
- **Primary Light**: `#dbeafe` (Light blue background)
- **Primary Dark**: `#1e40af` (Dark blue accents)
- **Text Primary**: `#1f2937` (Dark gray)
- **Text Secondary**: `#6b7280` (Medium gray)
- **Background**: `#f3f4f6` (Light gray)
- **Card Background**: `#f9fafb` (Off-white)

### Typography

- **Headings**: 32px, 700 weight, primary color
- **Subheadings**: 20px, 600 weight, dark gray
- **Body**: 16px, regular weight, 24px line height
- **Captions**: 14px, uppercase, letter-spacing

### Components

- **Cards**: 12px border radius, subtle border, light background
- **Buttons**: 8px border radius, 16px vertical padding, 32px horizontal padding
- **Spacing**: Consistent 8px grid system (8, 16, 24, 32, 40px)

## Setup Instructions

### 1. Install MJML

```bash
npm install -g mjml
```

### 2. Install Python Dependencies

```bash
pip install mjml jinja2 qrcode pillow
```

### 3. Compile Templates

Use the provided example script:

```bash
python templates/emails/transactional/compile_mjml_example.py
```

## Integration Guide

### Using with FastAPI/Backend

```python
from email_template_service import EmailTemplateService

# Initialize service
template_service = EmailTemplateService('templates')

# Render email
html_content, plain_text = template_service.render_appointment_confirmation(
    appointment_data={
        'id': 'APPT-123',
        'datetime': '2024-12-18T14:00:00',
        'service_name': 'Premium Haircut',
        'barber_name': 'Marcus Johnson',
        'duration': 45,
        'price': 65.00
    },
    shop_data={
        'name': 'Elite Cuts',
        'address': '123 Main St',
        'city': 'Brooklyn',
        'state': 'NY',
        'zip': '11201',
        'phone': '(555) 123-4567'
    },
    client_data={
        'id': 'CLIENT-456',
        'email': 'client@example.com',
        'unsubscribe_token': 'token123',
        'preferences_token': 'token456'
    }
)

# Send via your notification service
await notification_service.send_email(
    to_email=client_data['email'],
    subject='Appointment Confirmed',
    html_content=html_content,
    plain_text=plain_text
)
```

### Template Variables

The appointment confirmation template expects these variables:

```python
{
    # Meta
    'title': str,
    'preview_text': str,
    'subtitle': str,
    'current_year': int,
    
    # Appointment
    'service_name': str,
    'barber_name': str,
    'appointment_date': str,  # "Monday, December 18, 2024"
    'appointment_time': str,  # "2:00 PM"
    'duration': str,          # "45"
    'price': str,             # "65.00"
    
    # Shop
    'shop_name': str,
    'shop_address': str,
    'shop_city': str,
    'shop_state': str,
    'shop_zip': str,
    'shop_phone': str,
    
    # URLs
    'qr_code_url': str,
    'directions_url': str,
    'calendar_url': str,
    'manage_appointment_url': str,
    'help_url': str,
    'unsubscribe_url': str,
    'preferences_url': str
}
```

## Testing

### Local Preview

1. Run the compilation example:
   ```bash
   python compile_mjml_example.py
   ```

2. Open the generated `appointment_confirmation_preview.html` in your browser

### Email Client Testing

Test the templates in various email clients:
- Gmail (Web & Mobile)
- Apple Mail (macOS & iOS)
- Outlook (Web & Desktop)
- Yahoo Mail
- Dark mode in supported clients

### Responsive Testing

The templates are optimized for:
- Desktop: 600px+ width
- Mobile: 320px-599px width
- Tablets: Works well at all sizes

## Best Practices

1. **Always compile MJML to HTML** before sending
2. **Include both HTML and plain text** versions
3. **Test with real data** to ensure proper formatting
4. **Verify links** are correct and trackable
5. **Check image URLs** are accessible from email clients
6. **Monitor email deliverability** and engagement

## Adding New Templates

1. Create new MJML file in `templates/emails/transactional/`
2. Extend the base layout: `{% extends "emails/base/layout.mjml" %}`
3. Follow the design system for consistency
4. Add template variables documentation
5. Create integration example
6. Test across email clients

## Troubleshooting

### MJML Compilation Errors

- Ensure MJML is installed: `npm install -g mjml`
- Check template syntax with: `mjml -v template.mjml`
- Validate Jinja2 syntax separately

### Rendering Issues

- Verify all template variables are provided
- Check for missing or incorrect data types
- Use the debug mode to see raw MJML output

### Email Client Issues

- Some clients strip CSS - use inline styles via MJML
- Test dark mode appearance
- Verify image loading and alt text
- Check link tracking compatibility