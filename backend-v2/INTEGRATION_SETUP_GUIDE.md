# BookedBarber Integration Setup Guide

This guide provides step-by-step instructions for obtaining API keys and configuring all third-party integrations in BookedBarber V2.

## Table of Contents

1. [Google Services](#google-services)
   - [Google OAuth Setup](#google-oauth-setup)
   - [Google My Business](#google-my-business)
   - [Google Analytics 4](#google-analytics-4)
   - [Google Tag Manager](#google-tag-manager)
   - [Google Ads](#google-ads)
2. [Meta Business Platform](#meta-business-platform)
3. [Stripe Connect](#stripe-connect)
4. [Sentry Error Tracking](#sentry-error-tracking)
5. [Verification Steps](#verification-steps)

## Google Services

### Google OAuth Setup

All Google services (Calendar, My Business, Ads) share the same OAuth credentials.

1. **Go to Google Cloud Console**
   - Navigate to https://console.cloud.google.com
   - Create a new project or select existing: "BookedBarber" (recommended name)

2. **Enable Required APIs**
   - Go to "APIs & Services" → "Library"
   - Search and enable:
     - Google Calendar API
     - Google My Business API
     - Google Ads API
     - Google Analytics Data API

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Name: "BookedBarber OAuth"
   - Add Authorized redirect URIs:
     ```
     http://localhost:8000/api/v2/integrations/callback
     http://localhost:8000/api/calendar/callback
     https://yourdomain.com/api/v2/integrations/callback
     https://yourdomain.com/api/calendar/callback
     ```
   - Save and copy:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`

### Google My Business

1. **Verify Business Ownership**
   - Go to https://business.google.com
   - Claim and verify your business locations
   - Note: Verification can take 3-5 days via postcard

2. **Enable API Access**
   - The GMB API uses the same OAuth credentials created above
   - No additional configuration needed

### Google Analytics 4

1. **Create GA4 Property**
   - Go to https://analytics.google.com
   - Admin → Create Property
   - Enter property name: "BookedBarber"
   - Set up Web data stream with your domain

2. **Get Measurement ID**
   - Admin → Data Streams → Web
   - Copy the Measurement ID (G-XXXXXXXXXX)
   - Add to .env: `GA4_MEASUREMENT_ID`

3. **Generate API Secret**
   - In the same data stream settings
   - Scroll to "Measurement Protocol API secrets"
   - Click "Create"
   - Name: "BookedBarber Server"
   - Copy the secret
   - Add to .env: `GA4_API_SECRET`

### Google Tag Manager

1. **Create GTM Account**
   - Go to https://tagmanager.google.com
   - Create Account: "BookedBarber"
   - Create Container: "BookedBarber Web"
   - Container type: Web

2. **Get Container ID**
   - Copy the GTM-XXXXXXX ID shown
   - Add to .env: `GTM_CONTAINER_ID`

3. **Install GTM Code**
   - Copy the provided code snippets
   - Add to your website's <head> and <body> tags

4. **Server-Side GTM (Optional)**
   - For advanced tracking without client-side code
   - Create Server container
   - Deploy to Google Cloud or other provider
   - Add server URL to .env: `GTM_SERVER_CONTAINER_URL`

### Google Ads

1. **Create Google Ads Account**
   - Go to https://ads.google.com
   - Set up your account and billing

2. **Apply for API Access**
   - Tools & Settings → API Center
   - Apply for Developer Token (can take 1-2 days)
   - Add to .env: `GOOGLE_ADS_DEVELOPER_TOKEN`

3. **Get Customer ID**
   - Find in top right corner (XXX-XXX-XXXX format)
   - Add to .env: `GOOGLE_ADS_CUSTOMER_ID`

4. **Create Conversion Action**
   - Tools & Settings → Conversions
   - Create new conversion action
   - Type: Website
   - Category: Purchase/Sign-up
   - Copy Conversion ID
   - Add to .env: `GOOGLE_ADS_CONVERSION_ID`

## Meta Business Platform

### Facebook App Setup

1. **Create Facebook App**
   - Go to https://developers.facebook.com
   - My Apps → Create App
   - Type: Business
   - App Name: "BookedBarber"

2. **Configure App**
   - Settings → Basic
   - Copy App ID and App Secret
   - Add to .env:
     - `META_APP_ID`
     - `META_APP_SECRET`

3. **Add Required Products**
   - Facebook Login
   - Instagram Basic Display
   - Marketing API
   - Configure OAuth redirect URLs

### Meta Pixel & Conversions API

1. **Access Events Manager**
   - Go to https://business.facebook.com/events_manager
   - Connect a Data Source → Web → Get Started

2. **Set Up Meta Pixel**
   - Name: "BookedBarber Pixel"
   - Enter website URL
   - Copy Pixel ID
   - Add to .env: `META_PIXEL_ID`

3. **Configure Conversions API**
   - In Events Manager → Settings
   - Generate Access Token
   - Add to .env: `META_CONVERSION_API_TOKEN`

4. **Test Events (Optional)**
   - Use Test Events tool
   - Generate test code
   - Add to .env: `META_TEST_EVENT_CODE`

## Stripe Connect

1. **Enable Stripe Connect**
   - Log in to https://dashboard.stripe.com
   - Connect → Get Started
   - Choose: Platform or Marketplace

2. **Configure Connect Settings**
   - Settings → Connect settings
   - Configure onboarding options
   - Set up webhook endpoints

3. **Get Connect Client ID**
   - Settings → Connect settings
   - Find Platform ID (ca_xxxxx)
   - Add to .env: `STRIPE_CONNECT_CLIENT_ID`

## Sentry Error Tracking

1. **Create Sentry Account**
   - Sign up at https://sentry.io
   - Create Organization: "BookedBarber"

2. **Create Project**
   - Projects → Create Project
   - Platform: Python (for backend)
   - Project name: "bookedbarber-backend"

3. **Get DSN**
   - Settings → Projects → [Your Project] → Client Keys
   - Copy DSN
   - Add to .env: `SENTRY_DSN`

4. **Configure Environments**
   - Set up different environments:
     - development
     - staging
     - production

## Verification Steps

After adding all API keys to your .env file:

### 1. Test Google OAuth
```bash
# Start backend server
cd backend-v2
uvicorn main:app --reload

# Visit in browser
http://localhost:8000/api/v2/integrations/available
```

### 2. Verify Analytics Tracking
```bash
# Check GA4 real-time reports
# Send test event via API
curl -X POST http://localhost:8000/api/v2/tracking/event \
  -H "Content-Type: application/json" \
  -d '{"event_type": "test_event"}'
```

### 3. Test Meta Pixel
```bash
# Use Meta Pixel Helper Chrome extension
# Or check Events Manager for test events
```

### 4. Validate All Configurations
```bash
# Run the validation script
cd backend-v2
python scripts/validate_integrations.py
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use different API keys** for each environment (dev/staging/prod)
3. **Rotate keys quarterly** for security
4. **Monitor API usage** in each platform's dashboard
5. **Set up alerts** for unusual activity
6. **Use OAuth scopes** minimally - only request what you need
7. **Store tokens encrypted** in database
8. **Implement rate limiting** to prevent abuse

## Troubleshooting

### Common Issues

1. **Google OAuth Error: "redirect_uri_mismatch"**
   - Ensure redirect URIs in Google Cloud Console match exactly
   - Include both http://localhost and production URLs

2. **Meta API: "Invalid OAuth Token"**
   - Token may be expired - implement refresh mechanism
   - Check app review status for required permissions

3. **Stripe Connect: "No such connect account"**
   - Ensure using correct API keys (live vs test)
   - Verify Connect is enabled on your account

4. **Sentry: Events not appearing**
   - Check DSN is correct
   - Verify environment matches
   - Check for filtering rules

## Support Resources

- **Google APIs**: https://developers.google.com/support
- **Meta Developers**: https://developers.facebook.com/support
- **Stripe Connect**: https://stripe.com/docs/connect
- **Sentry Docs**: https://docs.sentry.io

## Next Steps

1. Add API keys to your .env file
2. Run integration tests
3. Configure webhooks for real-time updates
4. Set up monitoring dashboards
5. Train team on using integrations

---

Last Updated: 2025-07-04