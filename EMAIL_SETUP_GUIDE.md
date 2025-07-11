# Email SMTP Setup Guide

## Overview
The 6FB Platform requires SMTP credentials to send emails. This guide covers setup options for different email providers.

## Required Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_NAME=6FB Platform
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

## Provider-Specific Setup

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Visit https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Configure .env**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Free tier: 100 emails/day

2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Select "Restricted Access" with "Mail Send" permission

3. **Configure .env**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM_ADDRESS=verified-sender@yourdomain.com
   ```

4. **Verify Sender**
   - Settings → Sender Authentication
   - Add and verify your sending email/domain

### Option 3: Amazon SES

1. **Setup AWS SES**
   - AWS Console → Simple Email Service
   - Verify email address or domain

2. **Create SMTP Credentials**
   - SMTP Settings → Create SMTP Credentials
   - Save the credentials

3. **Configure .env**
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USERNAME=your-ses-smtp-username
   SMTP_PASSWORD=your-ses-smtp-password
   ```

### Option 4: Mailgun

1. **Create Mailgun Account**
   - Sign up at https://mailgun.com
   - Free tier: 5,000 emails/month

2. **Get SMTP Credentials**
   - Domains → Select domain → SMTP credentials

3. **Configure .env**
   ```bash
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USERNAME=postmaster@your-domain.mailgun.org
   SMTP_PASSWORD=your-mailgun-password
   ```

### Option 5: Local Development (MailHog)

For local testing without sending real emails:

1. **Using Docker Compose**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Configure .env**
   ```bash
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USERNAME=any-username
   SMTP_PASSWORD=any-password
   ```

3. **View Emails**
   - Visit http://localhost:8025
   - All emails will appear in MailHog interface

## Testing Email Configuration

### Quick Test Script

Create `test_email.py` in the backend directory:

```python
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from database import SessionLocal
from services.email_service import email_service
from core.config import settings

def test_email_config():
    """Test email configuration"""
    print(f"Email enabled: {settings.email_enabled}")
    print(f"SMTP Host: {settings.SMTP_HOST}")
    print(f"SMTP Port: {settings.SMTP_PORT}")
    print(f"SMTP Username: {settings.SMTP_USERNAME}")

    if not settings.email_enabled:
        print("\n❌ Email is not configured. Please check your .env file.")
        return

    # Test sending
    db = SessionLocal()
    try:
        test_email = input("\nEnter email address to send test to: ")

        success = email_service.send_email(
            db=db,
            to_email=test_email,
            subject="6FB Platform - Test Email",
            template_name="welcome",
            context={
                "user": {
                    "name": "Test User",
                    "email": test_email
                }
            }
        )

        if success:
            print(f"✅ Test email sent successfully to {test_email}")
        else:
            print(f"❌ Failed to send test email")

    finally:
        db.close()

if __name__ == "__main__":
    test_email_config()
```

Run with:
```bash
cd backend
python test_email.py
```

## Production Considerations

### Email Deliverability

1. **SPF Records**
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **DKIM Setup**
   - Provider-specific (SendGrid/SES will guide you)

3. **DMARC Policy**
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

### Rate Limiting

The email service includes built-in protections:
- Bulk email sending with delays
- Error handling and retry logic
- Email logging for troubleshooting

### Security Best Practices

1. **Never commit credentials**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Use App Passwords**
   - Don't use your main account password
   - Use provider-specific app passwords

3. **Monitor Usage**
   - Check email logs regularly
   - Monitor for bounces and complaints

## Troubleshooting

### Common Issues

1. **"Email service is not configured"**
   - Check all SMTP variables are set in `.env`
   - Restart the backend server

2. **Authentication Failed**
   - Verify username/password
   - For Gmail: Use app password, not account password
   - Check 2FA is enabled (for Gmail)

3. **Connection Timeout**
   - Check firewall allows outbound SMTP
   - Try different port (587 vs 465)
   - Verify SMTP_HOST is correct

4. **Emails Going to Spam**
   - Set up SPF/DKIM/DMARC
   - Use a verified sender domain
   - Avoid spam trigger words

### Debug Mode

Enable email debugging in your `.env`:
```bash
LOG_LEVEL=DEBUG
```

Check logs at:
```bash
tail -f backend-v2/logs/app.log
```

## Next Steps

1. Choose an email provider based on your needs
2. Set up SMTP credentials in `.env`
3. Test with the provided script
4. Configure domain authentication for production
5. Monitor email delivery metrics

For production, consider using a transactional email service (SendGrid, AWS SES) for better deliverability and analytics.
