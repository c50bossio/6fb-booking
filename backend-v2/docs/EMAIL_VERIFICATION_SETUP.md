# Email Verification Setup Guide

## Overview
BookedBarber V2 requires email verification for all new user accounts. This guide explains how to configure email delivery for production.

## Current Status
- ✅ Email verification flow is implemented
- ✅ Registration correctly redirects to check-email page
- ✅ Verification tokens are generated and stored
- ⚠️ SendGrid returns 403 (no API key configured)
- ✅ Email verification is required before login

## SendGrid Configuration

### 1. Get SendGrid API Key
1. Sign up for SendGrid: https://signup.sendgrid.com/
2. Navigate to Settings > API Keys
3. Create a new API Key with "Full Access"
4. Copy the API key (starts with `SG.`)

### 2. Configure Environment
Add to your `.env` file:
```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Must be verified in SendGrid
SENDGRID_FROM_NAME=BookedBarber
```

### 3. Verify Sender Email
1. In SendGrid, go to Settings > Sender Authentication
2. Verify your sending domain or email address
3. Follow SendGrid's verification process

## Testing Email Delivery

### Test Script
```python
#!/usr/bin/env python3
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Test your SendGrid configuration
def test_sendgrid():
    api_key = os.getenv('SENDGRID_API_KEY')
    if not api_key:
        print("❌ SENDGRID_API_KEY not set in environment")
        return
    
    message = Mail(
        from_email=os.getenv('SENDGRID_FROM_EMAIL', 'test@example.com'),
        to_emails='your-test-email@example.com',
        subject='BookedBarber Email Test',
        html_content='<p>This is a test email from BookedBarber.</p>'
    )
    
    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        print(f"✅ Email sent! Status code: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_sendgrid()
```

## Registration Flow Behavior

### Expected Flow:
1. User fills out registration form
2. Backend creates user account (email_verified=false)
3. Backend generates verification token
4. Backend attempts to send verification email
5. Frontend redirects to `/check-email?email={email}`
6. User receives email and clicks verification link
7. User lands on `/verify-email?token={token}`
8. Backend verifies token and sets email_verified=true
9. User is redirected to login with success message

### Current Behavior:
- Steps 1-5 work correctly
- Step 6 fails due to missing SendGrid configuration
- The system correctly blocks login until email is verified

## Alternative Email Providers

### Option 1: SMTP (Gmail, Outlook)
```bash
# .env configuration for SMTP
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password for Gmail
SMTP_USE_TLS=true
```

### Option 2: AWS SES
```bash
# .env configuration for AWS SES
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@yourdomain.com
```

## Development Testing

### Without Email Service
For development, emails are logged to the console:
```
========== EMAIL VERIFICATION EMAIL ==========
To: user@example.com
Subject: Verify Your Email Address - BookedBarber

Hi User,

Welcome to BookedBarber! To complete your account setup, please verify your email address by clicking the link below:

http://localhost:3000/verify-email?token=xxxxx

This link will expire in 24 hours.
===============================================
```

### Manual Verification (Development Only)
```sql
-- Manually verify a user in development
UPDATE users 
SET email_verified = true, 
    verified_at = CURRENT_TIMESTAMP 
WHERE email = 'test@example.com';
```

## Troubleshooting

### Common Issues:

1. **SendGrid 403 Forbidden**
   - Cause: Missing or invalid API key
   - Solution: Set SENDGRID_API_KEY in .env

2. **Email not received**
   - Check spam/junk folder
   - Verify sender domain in SendGrid
   - Check SendGrid activity feed

3. **Verification link expired**
   - Links expire after 24 hours
   - User can request new link from check-email page

4. **Login blocked after registration**
   - This is expected behavior
   - Email verification is required
   - Check backend logs for email status

## Production Checklist

- [ ] SendGrid account created
- [ ] API key generated and added to .env
- [ ] Sender domain/email verified
- [ ] Test email sent successfully
- [ ] Email templates customized
- [ ] SPF/DKIM records configured
- [ ] Monitoring alerts set up
- [ ] Rate limits configured

## Security Considerations

1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate API keys** quarterly
4. **Monitor for abuse** via SendGrid dashboard
5. **Implement rate limiting** on verification endpoints

## Support

For issues with email delivery:
1. Check backend logs: `tail -f backend.log`
2. Verify SendGrid dashboard for delivery status
3. Test with `test-registration-api.py` script
4. Contact support@bookedbarber.com for assistance