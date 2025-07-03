#!/usr/bin/env python3
"""
Check notification service credentials
"""

from config import settings

print('SendGrid API Key:', 'Configured' if settings.sendgrid_api_key and settings.sendgrid_api_key != '' else 'Missing')
print('SendGrid From Email:', settings.sendgrid_from_email)
print('Twilio Account SID:', 'Configured' if settings.twilio_account_sid and settings.twilio_account_sid != '' else 'Missing')
print('Twilio Phone Number:', settings.twilio_phone_number)
print('Email Notifications Enabled:', settings.enable_email_notifications)
print('SMS Notifications Enabled:', settings.enable_sms_notifications)
print('Notification retry attempts:', settings.notification_retry_attempts)
print('Notification retry delay:', settings.notification_retry_delay_seconds)