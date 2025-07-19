# API Key Setup Guide for BookedBarber V2

This guide helps you obtain and configure all the required API keys for the BookedBarber platform. Follow these step-by-step instructions for each service.

## Table of Contents
1. [SendGrid (Email)](#sendgrid-email)
2. [Twilio (SMS)](#twilio-sms)
3. [Google Calendar](#google-calendar)
4. [Google My Business](#google-my-business)
5. [Meta Business (Facebook/Instagram)](#meta-business)
6. [Google Tag Manager](#google-tag-manager)
7. [Google Ads](#google-ads)
8. [Stripe Payment](#stripe-payment)
9. [Sentry Monitoring](#sentry-monitoring)

## Development vs Production

- For **development**, you can leave most marketing integration keys empty
- For **production**, all payment and notification keys are required
- Marketing integrations are optional but recommended for full functionality

---

## SendGrid (Email)

SendGrid powers all email notifications in BookedBarber.

### Steps to Get API Key:

1. **Create Account**: Go to [SendGrid](https://signup.sendgrid.com/)
2. **Verify Email**: Complete email verification
3. **Create API Key**:
   - Navigate to Settings → API Keys
   - Click "Create API Key"
   - Name: "BookedBarber Production" (or "Development")
   - Permissions: Full Access
   - Copy the key (shown only once!)

4. **Verify Sender**:
   - Go to Settings → Sender Authentication
   - Add and verify your sending email domain
   - Or use Single Sender Verification for testing

### Configuration:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Must be verified
SENDGRID_FROM_NAME=BookedBarber
```

### Free Tier: 100 emails/day forever

---

## Twilio (SMS)

Twilio handles SMS notifications for appointments.

### Steps to Get Credentials:

1. **Create Account**: Go to [Twilio](https://www.twilio.com/try-twilio)
2. **Verify Phone Number**: Complete phone verification
3. **Get Credentials**:
   - Dashboard shows Account SID and Auth Token
   - Copy both values

4. **Get Phone Number**:
   - Go to Phone Numbers → Manage → Buy a Number
   - Choose a local number with SMS capability
   - Cost: ~$1/month per number

### Configuration:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number
```

### Trial Limitations:
- Can only send to verified numbers
- Messages prefixed with "Sent from Twilio trial account"
- $15 free credit

---

## Google Calendar

Enables two-way calendar sync for barbers.

### Steps to Get OAuth Credentials:

1. **Google Cloud Console**: Go to [console.cloud.google.com](https://console.cloud.google.com)

2. **Create/Select Project**:
   - Click project dropdown → New Project
   - Name: "BookedBarber"

3. **Enable Calendar API**:
   - Go to APIs & Services → Library
   - Search "Google Calendar API"
   - Click Enable

4. **Create OAuth Credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Configure consent screen first:
     - User Type: External
     - App name: BookedBarber
     - User support email: your email
     - Developer contact: your email
   - Application type: Web application
   - Name: "BookedBarber OAuth"
   - Authorized redirect URIs:
     - Development: `http://localhost:8000/api/calendar/callback`
     - Production: `https://yourdomain.com/api/calendar/callback`

5. **Copy Credentials**:
   - Download JSON or copy Client ID and Secret

### Configuration:
```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
```

---

## Google My Business

For managing business listings and reviews.

### Steps to Get API Access:

1. **Same Project**: Use the same Google Cloud project

2. **Enable GMB API**:
   - APIs & Services → Library
   - Search "Google My Business API"
   - Click Enable

3. **Create OAuth Credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Use same consent screen
   - Add redirect URI: `http://localhost:8000/api/v2/integrations/gmb/callback`

4. **Request Access** (if needed):
   - Some GMB APIs require approval
   - Fill out access form if prompted

### Configuration:
```env
GMB_CLIENT_ID=xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GMB_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GMB_REDIRECT_URI=http://localhost:8000/api/v2/integrations/gmb/callback
```

---

## Meta Business

For Facebook and Instagram integrations.

### Steps to Get App Credentials:

1. **Facebook Developers**: Go to [developers.facebook.com](https://developers.facebook.com)

2. **Create App**:
   - My Apps → Create App
   - Type: Business
   - App Name: BookedBarber
   - App Contact Email: your email

3. **Configure App**:
   - Settings → Basic
   - Add Platform → Website
   - Site URL: `https://yourdomain.com`
   - App Domains: `yourdomain.com`

4. **Add Products**:
   - Facebook Login → Set Up
   - Valid OAuth Redirect URIs:
     - `http://localhost:8000/api/v2/integrations/meta/callback`
     - `https://yourdomain.com/api/v2/integrations/meta/callback`

5. **Get Credentials**:
   - Settings → Basic
   - Copy App ID and App Secret

### Configuration:
```env
META_CLIENT_ID=xxxxxxxxxxxxxxxxx
META_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_REDIRECT_URI=http://localhost:8000/api/v2/integrations/meta/callback
```

---

## Google Tag Manager

For server-side tracking and analytics.

### Steps to Set Up:

1. **Create GTM Account**: Go to [tagmanager.google.com](https://tagmanager.google.com)

2. **Create Server Container**:
   - Create new container
   - Target platform: Server
   - Choose deployment method

3. **Get Server URL**:
   - If using Google's servers: Copy provided URL
   - If self-hosting: Deploy and use your URL

4. **Link GA4**:
   - In GA4, go to Admin → Data Streams
   - Select your stream
   - Measurement Protocol API secrets → Create new secret

### Configuration:
```env
GTM_SERVER_CONTAINER_URL=https://gtm.yourdomain.com
GTM_MEASUREMENT_ID=G-XXXXXXXXXX
GTM_API_SECRET=xxxxxxxxxxxxxxxxxxxxxx
```

---

## Google Ads

For conversion tracking and optimization.

### Steps to Get API Access:

1. **Google Ads Account**: Must have active account at [ads.google.com](https://ads.google.com)

2. **Developer Token**:
   - Tools & Settings → API Center
   - Apply for Basic Access
   - Approval can take 1-2 days

3. **Get Customer ID**:
   - Top right of Google Ads interface
   - Format: XXX-XXX-XXXX (remove dashes)

4. **Create Conversion**:
   - Tools → Conversions
   - Create conversion action
   - Note the Conversion ID and Label

### Configuration:
```env
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXXX
GOOGLE_ADS_CONVERSION_LABEL=xxxxxxxxxxxxxxxxxxxxx
```

---

## Stripe Payment

Already configured in the template. For production:

### Steps for Production Keys:

1. **Activate Account**: Complete Stripe activation at [dashboard.stripe.com](https://dashboard.stripe.com)

2. **Get Live Keys**:
   - Developers → API keys
   - Toggle "View test data" OFF
   - Copy live keys

3. **Configure Webhooks**:
   - Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/v2/webhooks/stripe`
   - Select events to listen to

### Configuration:
```env
# Production only - never commit these!
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Sentry Monitoring

For error tracking and performance monitoring.

### Steps to Get DSN:

1. **Create Account**: Go to [sentry.io](https://sentry.io)

2. **Create Project**:
   - Create New Project
   - Platform: Python (for backend)
   - Project name: bookedbarber-backend

3. **Get DSN**:
   - Settings → Projects → Your Project → Client Keys
   - Copy DSN

### Configuration:
```env
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o0000000.ingest.sentry.io/0000000
SENTRY_ENVIRONMENT=production
```

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** in production
3. **Rotate keys regularly** (quarterly recommended)
4. **Use least privilege** - only grant necessary permissions
5. **Monitor usage** - set up alerts for unusual activity
6. **Use different keys** for development/staging/production
7. **Document key ownership** - know who has access

## Troubleshooting

### Common Issues:

1. **"API key missing" warnings**:
   - Expected in development if service not used
   - Check spelling of environment variable names
   - Restart server after adding keys

2. **Authentication failures**:
   - Verify key is active and not expired
   - Check correct environment (test vs live)
   - Ensure proper formatting (no extra spaces)

3. **Rate limiting**:
   - Most services have free tier limits
   - Monitor usage in provider dashboards
   - Implement caching where possible

## Support

For help with specific services:
- SendGrid: support@sendgrid.com
- Twilio: twilio.com/help
- Google APIs: cloud.google.com/support
- Stripe: support.stripe.com

---

Last Updated: 2025-01-08