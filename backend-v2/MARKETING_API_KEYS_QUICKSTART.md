# Marketing API Keys Quick Reference

## Missing API Keys Causing Warnings

The backend logs show warnings for these missing marketing integration keys. They are **optional for development** but recommended for production.

### 1. Google My Business (GMB)
```env
GMB_CLIENT_ID=
GMB_CLIENT_SECRET=
```
- **Purpose**: Manage business listings, respond to reviews
- **Required for**: Review automation features
- **Get from**: Google Cloud Console (same project as Calendar)

### 2. Meta Business (Facebook/Instagram)
```env
META_CLIENT_ID=
META_CLIENT_SECRET=
```
- **Purpose**: Facebook/Instagram business integrations
- **Required for**: Social media marketing features
- **Get from**: developers.facebook.com

### 3. Google Tag Manager Server-side
```env
GTM_SERVER_CONTAINER_URL=
GTM_MEASUREMENT_ID=
GTM_API_SECRET=
```
- **Purpose**: Advanced analytics and conversion tracking
- **Required for**: Server-side tracking features
- **Get from**: tagmanager.google.com + GA4 admin

### 4. Meta Pixel (Conversions API)
```env
META_PIXEL_ID=
META_CONVERSION_API_TOKEN=
```
- **Purpose**: Facebook/Instagram conversion tracking
- **Required for**: Meta ads optimization
- **Get from**: Facebook Events Manager

### 5. Google Ads
```env
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_CONVERSION_ID=
GOOGLE_ADS_CONVERSION_LABEL=
```
- **Purpose**: Google Ads conversion tracking
- **Required for**: Google Ads optimization
- **Get from**: Google Ads API Center

## Quick Fix for Development

To stop the warnings in development, you have two options:

### Option 1: Add Empty Keys (Recommended)
Already done! The .env file now includes these keys with empty values.

### Option 2: Disable Marketing Features
Set these in your .env:
```env
ENABLE_MARKETING_INTEGRATIONS=false
ENABLE_REVIEW_AUTOMATION=false
ENABLE_CONVERSION_TRACKING=false
```

## For Production Setup

1. Follow the detailed guide: `/docs/API_KEY_SETUP_GUIDE.md`
2. Start with the most important integrations:
   - SendGrid (email) - Required
   - Twilio (SMS) - Required for SMS features
   - Stripe (payments) - Required
   - Google Calendar - Recommended
   - Marketing integrations - Optional but valuable

## Testing Without Real Keys

The platform includes mock modes for testing:
```env
# Enable mock mode for testing
ENABLE_MOCK_INTEGRATIONS=true
```

This allows you to test the UI and workflows without real API credentials.