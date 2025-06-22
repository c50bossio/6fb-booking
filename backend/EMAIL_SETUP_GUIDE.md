# Email Configuration Guide for 6FB Booking Platform

## Overview

Email configuration is **OPTIONAL** but recommended for the 6FB Booking Platform. The system will function without email, but certain features will be disabled.

## Features That Work WITHOUT Email

✅ **Core Functionality:**
- User registration and login
- Booking appointments
- Payment processing
- Analytics and reporting
- Barber management
- All dashboard features

## Features That REQUIRE Email

⚠️ **Email-Dependent Features:**
- Appointment confirmation emails
- Appointment reminder emails (24 hours before)
- Payment receipt emails
- Password reset functionality
- Welcome emails for new users
- Cancellation notifications

## Quick Setup Guide

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication:**
   - Go to your Google Account settings
   - Enable 2-step verification

2. **Generate App Password:**
   - Visit https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Copy the 16-character password (remove spaces)

3. **Configure .env file:**
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 16-char App Password (no spaces)
   FROM_EMAIL=your-email@gmail.com
   EMAIL_FROM_NAME=Your Business Name
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account:**
   - Sign up at https://sendgrid.com
   - Verify your email address

2. **Generate API Key:**
   - Go to Settings > API Keys
   - Create key with "Mail Send" permissions

3. **Configure .env file:**
   ```env
   SENDGRID_API_KEY=SG.your-api-key-here
   FROM_EMAIL=noreply@yourdomain.com
   EMAIL_FROM_NAME=Your Business Name
   ```

### Option 3: Other Providers

See `.env.template` for configuration examples for:
- Mailgun
- Amazon SES
- Microsoft 365/Outlook

## Testing Your Email Configuration

### Method 1: Command Line Test
```bash
cd /Users/bossio/6fb-booking/backend
python test_email_config.py your-email@example.com
```

### Method 2: API Endpoint Test
```bash
# Start the backend server
uvicorn main:app --reload

# Test email configuration status
curl http://localhost:8000/api/v1/test/email-status

# Send test email
curl -X POST http://localhost:8000/api/v1/test/email-config \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "your-email@example.com",
    "test_type": "simple"
  }'
```

## Troubleshooting

### Gmail Issues

**Authentication Failed:**
- Ensure you're using an App Password, NOT your regular password
- Check that 2-factor authentication is enabled
- Make sure there are no spaces in the app password

**Connection Issues:**
- Allow "less secure apps" if using legacy authentication
- Check firewall settings for port 587

### SendGrid Issues

**API Key Invalid:**
- Ensure the key starts with "SG."
- Check that the key has "Mail Send" permissions
- Verify domain or use Single Sender Verification

### General Issues

**No Emails Received:**
- Check spam/junk folder
- Verify FROM_EMAIL is valid
- Check SMTP server logs
- Test with `test_email_config.py` script

## Environment Variables Reference

```env
# Required for email functionality
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
EMAIL_FROM_NAME=6FB Platform

# Alternative: SendGrid API
SENDGRID_API_KEY=SG.your-api-key
FROM_EMAIL=noreply@yourdomain.com
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Use app-specific passwords** for Gmail
4. **Rotate API keys** regularly
5. **Monitor email logs** for suspicious activity

## Next Steps

1. Choose your email provider
2. Copy `.env.example` to `.env`
3. Configure email settings
4. Test with `python test_email_config.py`
5. Start using email features!

---

**Note:** The platform is fully functional without email configuration. Email features will be automatically disabled if not configured, and the system will log messages instead of sending emails in development mode.
