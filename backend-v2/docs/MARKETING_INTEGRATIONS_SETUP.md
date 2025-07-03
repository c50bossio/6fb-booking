# Marketing Integrations Setup Guide

## Overview

BookedBarber V2 includes a comprehensive marketing integrations suite designed to help barbershops track their marketing ROI, manage online reputation, and optimize their digital presence. This guide covers the setup and configuration of all marketing integrations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google My Business Integration](#google-my-business-integration)
3. [Google Tag Manager Setup](#google-tag-manager-setup)
4. [Meta Pixel Integration](#meta-pixel-integration)
5. [Review Management System](#review-management-system)
6. [Email & SMS Marketing](#email-sms-marketing)
7. [Integration Settings Dashboard](#integration-settings-dashboard)
8. [Environment Configuration](#environment-configuration)
9. [Testing & Validation](#testing-validation)
10. [GDPR Compliance](#gdpr-compliance)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up marketing integrations, ensure you have:

- Admin access to BookedBarber V2
- Google Business Profile (for GMB integration)
- Google Tag Manager account
- Meta Business Manager account
- Valid API credentials for each platform
- SSL certificate (required for production)

## Google My Business Integration

### 1. Enable Google My Business API

1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable these APIs:
   - Google My Business API
   - Google My Business Management API
   - Google Places API

### 2. Create OAuth Credentials

```bash
# Navigate to Credentials section
# Create OAuth 2.0 Client ID
# Application type: Web application
# Authorized redirect URIs:
# - https://yourdomain.com/api/v1/integrations/gmb/callback
# - http://localhost:8000/api/v1/integrations/gmb/callback (development)
```

### 3. Configure Environment Variables

```env
# Google My Business
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/integrations/gmb/callback
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/business.manage
```

### 4. Connect Google My Business

```python
# API Endpoint for OAuth flow
POST /api/v1/integrations/gmb/connect

# Response includes authorization URL
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}

# User completes OAuth flow
# Callback handles token exchange
GET /api/v1/integrations/gmb/callback?code=...&state=...
```

### 5. Fetch Business Locations

```python
# Get connected locations
GET /api/v1/marketing/gmb/locations

# Response
{
  "locations": [
    {
      "id": "accounts/123/locations/456",
      "name": "Elite Cuts Barbershop",
      "address": "123 Main St, City, State",
      "phone": "+1234567890",
      "website": "https://elitecuts.com",
      "primary_category": "Barber Shop"
    }
  ]
}
```

### 6. Review Management

```python
# Fetch reviews
GET /api/v1/reviews?location_id=123

# Auto-respond to review
POST /api/v1/reviews/123/respond
{
  "response_type": "positive_detailed",
  "custom_message": "Optional custom addition"
}
```

## Google Tag Manager Setup

### 1. Create GTM Container

1. Visit [Google Tag Manager](https://tagmanager.google.com)
2. Create new container (Web type)
3. Copy container ID (GTM-XXXXXX)

### 2. Configure in BookedBarber

```python
# Add GTM configuration
POST /api/v1/integrations/tracking/gtm
{
  "container_id": "GTM-XXXXXX",
  "enabled": true,
  "environment": "production"
}
```

### 3. Default Events Tracked

BookedBarber automatically tracks these events:

```javascript
// Page Views
gtag('event', 'page_view', {
  page_title: 'Booking Page',
  page_location: window.location.href,
  page_path: window.location.pathname
});

// Booking Events
gtag('event', 'begin_checkout', {
  currency: 'USD',
  value: 45.00,
  items: [{
    item_id: 'service_123',
    item_name: 'Premium Haircut',
    price: 45.00,
    quantity: 1
  }]
});

// Conversion Events
gtag('event', 'purchase', {
  transaction_id: 'booking_123',
  value: 45.00,
  currency: 'USD',
  items: [...]
});
```

### 4. Custom Event Configuration

```python
# Configure custom events
POST /api/v1/tracking/events/configure
{
  "custom_events": [
    {
      "name": "loyalty_signup",
      "parameters": {
        "method": "booking_flow"
      }
    }
  ]
}
```

## Meta Pixel Integration

### 1. Create Meta Pixel

1. Access [Meta Business Manager](https://business.facebook.com)
2. Navigate to Events Manager
3. Create new pixel
4. Copy Pixel ID

### 2. Configure Meta Pixel

```python
# Add Meta Pixel
POST /api/v1/integrations/tracking/meta
{
  "pixel_id": "1234567890",
  "enabled": true,
  "advanced_matching": true,
  "test_event_code": "TEST12345" // Optional for testing
}
```

### 3. Automatic Events

```javascript
// Page View
fbq('track', 'PageView');

// View Content (Service Page)
fbq('track', 'ViewContent', {
  content_name: 'Premium Haircut',
  content_category: 'Haircut Services',
  content_ids: ['service_123'],
  content_type: 'product',
  value: 45.00,
  currency: 'USD'
});

// Initiate Checkout
fbq('track', 'InitiateCheckout', {
  content_ids: ['service_123'],
  contents: [{id: 'service_123', quantity: 1}],
  currency: 'USD',
  num_items: 1,
  value: 45.00
});

// Purchase
fbq('track', 'Purchase', {
  content_ids: ['service_123'],
  content_name: 'Premium Haircut',
  content_type: 'product',
  currency: 'USD',
  value: 45.00
});
```

### 4. Advanced Matching

```javascript
// Automatically hashed customer data
fbq('init', '1234567890', {
  em: 'hashed_email@example.com', // SHA-256 hashed
  fn: 'hashed_firstname',
  ln: 'hashed_lastname',
  ph: 'hashed_phone',
  ct: 'hashed_city',
  st: 'hashed_state',
  zp: 'hashed_zip'
});
```

## Review Management System

### 1. Configure Review Templates

```python
# Set up response templates
POST /api/v1/reviews/templates
{
  "templates": {
    "positive_brief": "Thank you for your 5-star review, {customer_name}! We appreciate your business.",
    "positive_detailed": "Thank you so much for taking the time to share your experience, {customer_name}! We're thrilled you enjoyed your {service_name}. Looking forward to seeing you again soon!",
    "neutral_encouraging": "Thank you for your feedback, {customer_name}. We're always looking to improve. Please let us know how we can make your next visit even better!",
    "negative_apologetic": "We're sorry to hear about your experience, {customer_name}. This isn't the level of service we strive for. Please contact us at {phone} so we can make this right."
  }
}
```

### 2. Auto-Response Configuration

```python
# Configure auto-response rules
POST /api/v1/reviews/auto-response/configure
{
  "enabled": true,
  "rules": [
    {
      "rating": [5],
      "template": "positive_detailed",
      "delay_minutes": 60
    },
    {
      "rating": [4],
      "template": "positive_brief",
      "delay_minutes": 120
    },
    {
      "rating": [1, 2],
      "template": "negative_apologetic",
      "delay_minutes": 30,
      "notify_manager": true
    }
  ]
}
```

### 3. SEO Optimization

```python
# Configure SEO keywords for responses
POST /api/v1/reviews/seo/configure
{
  "location_keywords": ["downtown", "main street"],
  "service_keywords": ["haircut", "beard trim", "fade"],
  "brand_keywords": ["professional", "experienced", "premium"]
}
```

## Email & SMS Marketing

### 1. SendGrid Configuration

```env
# Email configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourbarbershop.com
SENDGRID_FROM_NAME=Your Barbershop Name
```

### 2. Twilio Configuration

```env
# SMS configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

### 3. Campaign Management

```python
# Create marketing campaign
POST /api/v1/marketing/campaigns
{
  "name": "Holiday Special",
  "type": "email_sms",
  "audience": {
    "segments": ["regular_customers"],
    "filters": {
      "last_visit_days": 30,
      "total_spent_min": 100
    }
  },
  "content": {
    "email": {
      "subject": "🎄 Holiday Special - 20% Off!",
      "template_id": "holiday_promo_2024"
    },
    "sms": {
      "message": "Holiday Special at {shop_name}! Book now for 20% off. Reply STOP to opt out."
    }
  },
  "schedule": {
    "send_at": "2024-12-01T10:00:00Z"
  }
}
```

## Integration Settings Dashboard

### 1. Access Integration Hub

Navigate to `/settings/integrations` in the BookedBarber dashboard.

### 2. Available Integrations

```typescript
// Integration status interface
interface Integration {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  config?: Record<string, any>;
}

// Example integrations
const integrations: Integration[] = [
  {
    id: 'google_my_business',
    name: 'Google My Business',
    status: 'connected',
    lastSync: new Date('2024-01-15T10:30:00Z'),
    config: {
      locations: 2,
      autoResponse: true
    }
  },
  {
    id: 'google_tag_manager',
    name: 'Google Tag Manager',
    status: 'connected',
    config: {
      containerId: 'GTM-XXXXXX',
      events: ['purchase', 'begin_checkout']
    }
  }
];
```

### 3. Health Monitoring

```python
# Check integration health
GET /api/v1/integrations/health

# Response
{
  "integrations": {
    "google_my_business": {
      "status": "healthy",
      "last_check": "2024-01-15T12:00:00Z",
      "metrics": {
        "reviews_synced": 145,
        "responses_sent": 89,
        "api_calls_remaining": 9500
      }
    },
    "meta_pixel": {
      "status": "healthy",
      "events_24h": 1234,
      "match_rate": 0.76
    }
  }
}
```

## Environment Configuration

### Complete .env Example

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/bookedbarber

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-min-64-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google My Business
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/integrations/gmb/callback

# Google Tag Manager
GTM_CONTAINER_ID=GTM-XXXXXX
GTM_AUTH=optional-auth-string
GTM_PREVIEW=optional-preview-string

# Meta Pixel
META_PIXEL_ID=1234567890
META_ACCESS_TOKEN=your-meta-access-token
META_TEST_EVENT_CODE=TEST12345

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourbarbershop.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Redis (for caching)
REDIS_URL=redis://localhost:6379/0

# Feature Flags
ENABLE_GMB_INTEGRATION=true
ENABLE_CONVERSION_TRACKING=true
ENABLE_AUTO_REVIEW_RESPONSE=true
```

## Testing & Validation

### 1. Test Google My Business Connection

```bash
# Test OAuth flow
curl -X POST http://localhost:8000/api/v1/integrations/gmb/connect \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify locations
curl http://localhost:8000/api/v1/marketing/gmb/locations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Validate Tracking Implementation

```javascript
// Browser console testing
// Check GTM
console.log(window.dataLayer);

// Check Meta Pixel
console.log(window.fbq);

// Trigger test event
window.dataLayer.push({
  event: 'test_event',
  test_parameter: 'test_value'
});
```

### 3. Test Review Auto-Response

```python
# Create test review
POST /api/v1/reviews/test
{
  "rating": 5,
  "text": "Great haircut!",
  "author": "Test Customer",
  "location_id": "test_location"
}

# Check generated response
GET /api/v1/reviews/test/response
```

## GDPR Compliance

### 1. Consent Management

```javascript
// Implement consent banner
const consentManager = {
  init() {
    if (!this.hasConsent()) {
      this.showConsentBanner();
    }
  },
  
  hasConsent() {
    return localStorage.getItem('gdpr_consent') === 'granted';
  },
  
  grantConsent() {
    localStorage.setItem('gdpr_consent', 'granted');
    this.enableTracking();
  },
  
  denyConsent() {
    localStorage.setItem('gdpr_consent', 'denied');
    this.disableTracking();
  },
  
  enableTracking() {
    // Enable GTM
    window.dataLayer.push({'gtm.start': new Date().getTime()});
    
    // Enable Meta Pixel
    fbq('consent', 'grant');
  },
  
  disableTracking() {
    // Disable tracking
    window['ga-disable-GTM-XXXXXX'] = true;
    fbq('consent', 'revoke');
  }
};
```

### 2. Data Export

```python
# Export customer data
GET /api/v1/customers/{id}/export

# Response includes all marketing data
{
  "customer_data": {...},
  "marketing_preferences": {...},
  "tracking_events": [...],
  "review_interactions": [...]
}
```

### 3. Right to Deletion

```python
# Delete customer marketing data
DELETE /api/v1/customers/{id}/marketing-data

# Removes:
# - Marketing preferences
# - Tracking identifiers
# - Review history
# - Campaign interactions
```

## Troubleshooting

### Common Issues

#### 1. Google My Business Connection Fails

```bash
# Check OAuth credentials
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Verify redirect URI matches exactly
# Common issue: trailing slash mismatch

# Test API access
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  https://mybusinessbusinessinformation.googleapis.com/v1/accounts
```

#### 2. Tracking Events Not Firing

```javascript
// Debug GTM
console.log('DataLayer:', window.dataLayer);

// Enable GTM preview mode
// Add &gtm_debug=x to URL

// Check for blockers
if (typeof gtag === 'undefined') {
  console.error('GTM not loaded - check for ad blockers');
}
```

#### 3. Meta Pixel Match Rate Low

```python
# Verify advanced matching data
GET /api/v1/tracking/meta/diagnostics

# Common issues:
# - Email not hashed properly
# - Phone format inconsistent
# - Missing customer data

# Fix: Ensure consistent data format
def format_phone_for_meta(phone: str) -> str:
    """Format phone for Meta advanced matching"""
    # Remove all non-digits
    digits = re.sub(r'\D', '', phone)
    # Ensure country code
    if len(digits) == 10:
        digits = '1' + digits
    return digits
```

#### 4. Review Auto-Response Not Working

```bash
# Check webhook registration
GET /api/v1/integrations/gmb/webhooks

# Verify response templates
GET /api/v1/reviews/templates

# Check response queue
GET /api/v1/reviews/response-queue

# Common fix: Re-authenticate GMB
POST /api/v1/integrations/gmb/reconnect
```

### Debug Mode

Enable debug mode for detailed logging:

```env
# Add to .env
MARKETING_DEBUG=true
LOG_LEVEL=DEBUG
```

```python
# Check debug logs
tail -f logs/marketing_integration.log

# Example debug output
2024-01-15 10:30:15 DEBUG GMB: Fetching reviews for location_123
2024-01-15 10:30:16 DEBUG GMB: Found 3 new reviews
2024-01-15 10:30:17 DEBUG Review: Generating response for 5-star review
2024-01-15 10:30:18 DEBUG GMB: Response posted successfully
```

### Support Resources

- **API Documentation**: `/docs/api/marketing`
- **Integration Status**: `/api/v1/integrations/status`
- **Health Dashboard**: `/admin/integrations/health`
- **Support Email**: support@bookedbarber.com

## Best Practices

1. **Regular Monitoring**: Check integration health daily
2. **Response Time**: Respond to reviews within 24-48 hours
3. **Tracking Validation**: Test events weekly
4. **Data Hygiene**: Clean customer data for better matching
5. **Consent First**: Always get consent before tracking
6. **Test Thoroughly**: Use test modes before production
7. **Document Changes**: Log all integration modifications

## Conclusion

The BookedBarber marketing integrations provide a comprehensive solution for barbershops to manage their digital presence, track ROI, and automate customer engagement. Follow this guide carefully to ensure proper setup and maximize the benefits of each integration.

For additional support or custom integration needs, contact the BookedBarber support team.