# Secrets Setup Guide - 6FB Booking Platform

This guide helps you securely configure all required API keys and secrets for the 6FB Booking Platform.

## 🔒 Security First

**NEVER commit real secrets to version control!**

- Use environment variables in production
- Use `.env` files for local development (add to `.gitignore`)
- Rotate secrets regularly
- Use different secrets for different environments

## 📋 Required Secrets Checklist

### 🔑 Application Security Keys

Generate these unique keys for your application:

```bash
# Generate a 32-character encryption key
python3 -c 'import secrets; print("DATA_ENCRYPTION_KEY=" + secrets.token_urlsafe(32))'

# Generate a 64-character secret key
python3 -c 'import secrets; print("SECRET_KEY=" + secrets.token_urlsafe(64))'

# Generate a 64-character JWT secret key (must be different from SECRET_KEY)
python3 -c 'import secrets; print("JWT_SECRET_KEY=" + secrets.token_urlsafe(64))'
```

Add these to your `.env` file:
```bash
DATA_ENCRYPTION_KEY=your_generated_32_char_key
SECRET_KEY=your_generated_64_char_key
JWT_SECRET_KEY=your_different_64_char_key
```

### 💳 Stripe Payment Processing

1. **Create Stripe Account**: Go to [https://stripe.com](https://stripe.com)
2. **Get API Keys**: Visit [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

For **Development** (use test keys):
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

For **Production** (use live keys):
```bash
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```

3. **Setup Stripe Connect**:
   - Go to [https://dashboard.stripe.com/settings/connect](https://dashboard.stripe.com/settings/connect)
   - Get your Connect Client ID:
```bash
STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id_here
```

4. **Setup Webhooks**:
   - Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Add endpoint: `https://yourdomain.com/api/v1/webhooks/stripe`
   - Copy the webhook secret:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 📅 Google Calendar Integration

1. **Create Google Cloud Project**:
   - Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Calendar API**:
   - In the Google Cloud Console, enable the "Google Calendar API"

3. **Create OAuth 2.0 Credentials**:
   - Go to "Credentials" section
   - Create "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:8000/api/v1/google-calendar/oauth/callback`
     - Production: `https://yourdomain.com/api/v1/google-calendar/oauth/callback`

4. **Configure in .env**:
```bash
GOOGLE_CALENDAR_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
```

### 📧 Email Configuration

Choose one of these email providers:

#### Option 1: Gmail (Development/Testing)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Configure:
```bash
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_app_password
FROM_EMAIL=your_email@gmail.com
```

#### Option 2: SendGrid (Production Recommended)
1. Create SendGrid account: [https://sendgrid.com](https://sendgrid.com)
2. Create API key: [https://app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys)
3. Configure:
```bash
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### 📱 SMS Configuration (Optional)

1. **Create Twilio Account**: [https://twilio.com](https://twilio.com)
2. **Get Credentials**: [https://console.twilio.com/](https://console.twilio.com/)
3. **Configure**:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## 🌍 Environment-Specific Configuration

### Development (.env)
```bash
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=sqlite:///./6fb_booking.db
FRONTEND_URL=http://localhost:3000
```

### Production (.env.production)
```bash
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://user:pass@host:5432/dbname
FRONTEND_URL=https://yourdomain.com
```

## 🔍 Testing Your Configuration

1. **Test Stripe Connection**:
```bash
cd backend
python verify_stripe_connection.py
```

2. **Test Email Configuration**:
```bash
cd backend
python -c "from services.notification_service import NotificationService; ns = NotificationService(); print('Email configured:', ns.smtp_username is not None)"
```

3. **Test Google Calendar**:
```bash
cd backend
python scripts/test_google_calendar_integration.py
```

## 🚨 Security Best Practices

1. **Use different secrets for each environment**
2. **Regularly rotate your secrets**
3. **Never share secrets in chat, email, or screenshots**
4. **Use environment variables in production, not .env files**
5. **Limit access to secrets on a need-to-know basis**
6. **Monitor for secret leaks in logs and error messages**

## 🆘 Troubleshooting

### Common Issues:

**"Invalid Stripe API key"**
- Check that you're using the correct key for your environment (test vs live)
- Ensure no extra spaces or characters

**"Google OAuth Error"**
- Verify redirect URIs match exactly (including http/https)
- Check that Google Calendar API is enabled

**"Email sending failed"**
- For Gmail: Ensure app password is generated and 2FA is enabled
- For SendGrid: Verify API key has sending permissions

**"Database connection failed"**
- Check DATABASE_URL format
- For PostgreSQL: Ensure database exists and credentials are correct

## 🔗 Useful Links

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [SendGrid Dashboard](https://app.sendgrid.com/)
- [Twilio Console](https://console.twilio.com/)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)

---

**Remember**: This setup is a one-time process. Once configured, your secrets will be automatically used by the application.
