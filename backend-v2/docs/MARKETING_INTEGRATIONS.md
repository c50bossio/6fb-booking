# Marketing Integrations Documentation

## Overview

BookedBarber V2's Marketing Integrations Suite provides comprehensive tools for barbershops to maximize their digital presence, track conversions, and automate customer engagement. The suite integrates with major platforms including Google My Business, Google Ads, Meta Business, and more.

## Key Features

### 🏪 Google My Business Integration
- **Review Management**: Automated review monitoring and intelligent response generation
- **SEO Optimization**: Google-guideline compliant responses that boost local SEO
- **Business Updates**: Automatic posting of special offers, events, and business hours
- **Performance Analytics**: Track review ratings, response rates, and engagement metrics

### 📊 Conversion Tracking & Attribution
- **Multi-Platform Tracking**: Google Tag Manager, Google Analytics 4, Meta Pixel integration
- **Attribution Modeling**: Multi-touch attribution across digital channels
- **ROI Analytics**: Track return on investment for marketing campaigns
- **Event Tracking**: Custom conversion events for bookings, payments, and engagement

### ⭐ Review Automation System
- **Smart Responses**: AI-generated, personalized responses to customer reviews
- **Template Management**: Customizable response templates for different scenarios
- **Sentiment Analysis**: Automatic categorization and prioritization of reviews
- **Bulk Operations**: Efficiently manage large volumes of reviews

### 🎯 Campaign Management
- **Email/SMS Campaigns**: Targeted marketing with segmentation and personalization
- **A/B Testing**: Optimize campaign performance with automated testing
- **Automation Workflows**: Set up trigger-based campaigns for customer lifecycle events
- **Performance Tracking**: Real-time analytics and conversion tracking

## API Endpoints

### Base URLs
- Reviews: `/api/v2/reviews`
- Integrations: `/api/v2/integrations`
- Tracking: `/api/v2/tracking`
- Marketing: `/api/v2/marketing`

### Authentication
All endpoints require valid JWT authentication with appropriate role permissions.

## Google My Business Integration

### 1. OAuth Connection Setup

```http
POST /api/v2/integrations/connect
```

Initiate GMB OAuth flow for business account connection.

**Request Body:**
```json
{
  "integration_type": "google_my_business",
  "redirect_uri": "https://your-app.com/oauth/callback",
  "scopes": ["business.manage", "reviews.read"]
}
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/oauth/v2/auth?...",
  "state": "encrypted_state_token",
  "expires_in": 3600
}
```

### 2. Review Management

#### Fetch Reviews
```http
GET /api/v2/reviews?platform=google_my_business&status=new
```

**Query Parameters:**
- `platform`: Review platform (google_my_business, yelp, facebook)
- `status`: Review status (new, responded, pending)
- `sentiment`: Review sentiment (positive, negative, neutral)
- `date_from`: Start date for review filtering
- `date_to`: End date for review filtering

**Response:**
```json
{
  "reviews": [
    {
      "id": 123,
      "external_id": "ChIJxxxxxxxxxxx",
      "platform": "google_my_business",
      "rating": 5,
      "text": "Amazing service! Best barber in town.",
      "author_name": "John D.",
      "created_at": "2024-07-01T10:30:00Z",
      "sentiment": "positive",
      "status": "new",
      "response": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "pages": 8
  },
  "analytics": {
    "average_rating": 4.7,
    "total_reviews": 156,
    "response_rate": 85.2
  }
}
```

#### Generate Smart Response
```http
POST /api/v2/reviews/{review_id}/generate-response
```

Generate AI-powered response for a review.

**Request Body:**
```json
{
  "template_type": "appreciation",
  "business_context": {
    "business_name": "Elite Cuts Barbershop",
    "owner_name": "Mike Johnson",
    "specialties": ["fades", "beard trimming", "classic cuts"]
  },
  "personalization_level": "high"
}
```

**Response:**
```json
{
  "generated_response": "Thank you so much, John! We're thrilled you loved your fade and the experience at Elite Cuts. Mike takes great pride in delivering precision cuts and we're honored to be your go-to barbershop. We look forward to seeing you again soon!",
  "seo_optimized": true,
  "sentiment_match": "positive",
  "word_count": 42,
  "compliance_score": 98
}
```

#### Post Response
```http
POST /api/v2/reviews/{review_id}/respond
```

**Request Body:**
```json
{
  "response_text": "Thank you so much, John! We're thrilled...",
  "auto_post": true,
  "platform_specific": {
    "google_my_business": {
      "include_business_link": true,
      "use_business_voice": true
    }
  }
}
```

### 3. Business Profile Management

#### Update Business Hours
```http
PUT /api/v2/integrations/google-my-business/hours
```

**Request Body:**
```json
{
  "hours": {
    "monday": { "open": "09:00", "close": "18:00" },
    "tuesday": { "open": "09:00", "close": "18:00" },
    "wednesday": { "open": "09:00", "close": "18:00" },
    "thursday": { "open": "09:00", "close": "19:00" },
    "friday": { "open": "09:00", "close": "19:00" },
    "saturday": { "open": "08:00", "close": "17:00" },
    "sunday": { "closed": true }
  },
  "special_hours": [
    {
      "date": "2024-12-25",
      "closed": true,
      "reason": "Christmas Day"
    }
  ]
}
```

#### Post Business Updates
```http
POST /api/v2/integrations/google-my-business/posts
```

**Request Body:**
```json
{
  "post_type": "offer",
  "content": "🔥 Summer Special! 20% off all haircuts this week. Book now!",
  "media_url": "https://your-cdn.com/summer-special.jpg",
  "call_to_action": {
    "type": "book_appointment",
    "url": "https://book.bookedbarber.com/elite-cuts"
  },
  "offer_details": {
    "discount_percent": 20,
    "valid_until": "2024-07-15T23:59:59Z",
    "terms": "Valid for new and existing customers"
  }
}
```

## Conversion Tracking & Attribution

### 1. Event Tracking Setup

#### Configure Tracking Platforms
```http
POST /api/v2/tracking/config
```

**Request Body:**
```json
{
  "platforms": {
    "google_analytics": {
      "measurement_id": "G-XXXXXXXXXX",
      "api_secret": "encrypted_secret",
      "enhanced_measurement": true
    },
    "google_tag_manager": {
      "container_id": "GTM-XXXXXXX",
      "server_side": true
    },
    "meta_pixel": {
      "pixel_id": "123456789012345",
      "access_token": "encrypted_token",
      "test_event_code": "TEST123"
    }
  },
  "conversion_goals": [
    {
      "name": "appointment_booked",
      "value": 35.00,
      "currency": "USD"
    },
    {
      "name": "first_visit_completed",
      "value": 45.00,
      "currency": "USD"
    }
  ]
}
```

### 2. Track Conversion Events

```http
POST /api/v2/tracking/event
```

**Request Body:**
```json
{
  "event_name": "appointment_booked",
  "client_id": "client_123.456.789",
  "session_id": "session_abc123",
  "value": 35.00,
  "currency": "USD",
  "custom_parameters": {
    "service_type": "fade_cut",
    "barber_id": "barber_456",
    "booking_source": "website",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_promotion"
  },
  "user_data": {
    "email_hash": "hashed_email",
    "phone_hash": "hashed_phone",
    "first_name_hash": "hashed_first_name",
    "last_name_hash": "hashed_last_name"
  }
}
```

**Response:**
```json
{
  "event_id": "evt_12345",
  "status": "tracked",
  "platforms_notified": [
    "google_analytics",
    "meta_pixel",
    "google_tag_manager"
  ],
  "attribution": {
    "first_touch": {
      "source": "google",
      "medium": "organic",
      "campaign": null,
      "timestamp": "2024-06-15T14:20:00Z"
    },
    "last_touch": {
      "source": "google",
      "medium": "cpc",
      "campaign": "summer_promotion",
      "timestamp": "2024-07-01T10:15:00Z"
    }
  }
}
```

### 3. Attribution Reporting

```http
GET /api/v2/tracking/attribution-report
```

**Query Parameters:**
- `date_from`: Start date for report
- `date_to`: End date for report
- `attribution_model`: first_touch, last_touch, linear, time_decay
- `conversion_goal`: Specific conversion goal to analyze

**Response:**
```json
{
  "attribution_model": "linear",
  "date_range": {
    "from": "2024-06-01",
    "to": "2024-06-30"
  },
  "conversions": {
    "total": 124,
    "value": 4340.00,
    "currency": "USD"
  },
  "attribution_breakdown": [
    {
      "source": "google",
      "medium": "cpc",
      "campaign": "summer_promotion",
      "conversions": 45,
      "value": 1575.00,
      "attribution_percentage": 36.3
    },
    {
      "source": "facebook",
      "medium": "social",
      "campaign": "brand_awareness",
      "conversions": 28,
      "value": 980.00,
      "attribution_percentage": 22.6
    }
  ],
  "customer_journey": {
    "average_touchpoints": 3.2,
    "average_days_to_convert": 4.7,
    "most_common_path": ["google/organic", "facebook/social", "direct/none"]
  }
}
```

## Campaign Management

### 1. Email/SMS Campaigns

#### Create Campaign
```http
POST /api/v2/marketing/campaigns
```

**Request Body:**
```json
{
  "name": "Summer Promotion Campaign",
  "type": "promotional",
  "channels": ["email", "sms"],
  "target_audience": {
    "segments": ["regular_clients", "lapsed_clients"],
    "filters": {
      "last_visit_days_ago": 30,
      "total_visits": { "min": 2 },
      "preferred_services": ["haircut", "beard_trim"]
    }
  },
  "content": {
    "email": {
      "subject": "🔥 Don't Miss Our Summer Special!",
      "template_id": "summer_promo_template",
      "personalization": {
        "include_name": true,
        "include_last_service": true,
        "include_preferred_barber": true
      }
    },
    "sms": {
      "message": "Hi {first_name}! Summer special: 20% off {preferred_service} with {preferred_barber}. Book: {booking_link}",
      "include_opt_out": true
    }
  },
  "schedule": {
    "send_immediately": false,
    "scheduled_for": "2024-07-05T10:00:00Z",
    "timezone": "America/New_York"
  },
  "tracking": {
    "utm_source": "email_campaign",
    "utm_medium": "email",
    "utm_campaign": "summer_2024",
    "conversion_goal": "appointment_booked"
  }
}
```

#### A/B Testing
```http
POST /api/v2/marketing/campaigns/{campaign_id}/ab-test
```

**Request Body:**
```json
{
  "test_type": "subject_line",
  "variants": [
    {
      "name": "variant_a",
      "percentage": 50,
      "content": {
        "subject": "🔥 Don't Miss Our Summer Special!"
      }
    },
    {
      "name": "variant_b", 
      "percentage": 50,
      "content": {
        "subject": "Limited Time: 20% Off All Haircuts"
      }
    }
  ],
  "test_duration_hours": 24,
  "winning_metric": "open_rate",
  "auto_send_winner": true
}
```

### 2. Review Response Templates

#### Create Template
```http
POST /api/v2/reviews/templates
```

**Request Body:**
```json
{
  "name": "Positive Review Response",
  "category": "appreciation",
  "sentiment": "positive",
  "rating_range": {
    "min": 4,
    "max": 5
  },
  "template": "Thank you so much, {customer_name}! We're absolutely thrilled that you loved your {service_type} with {barber_name}. Your kind words mean the world to our team at {business_name}. We can't wait to see you again soon! 💪✂️",
  "variables": [
    "customer_name",
    "service_type", 
    "barber_name",
    "business_name"
  ],
  "seo_optimized": true,
  "auto_apply": true,
  "compliance_checked": true
}
```

#### Generate Response from Template
```http
POST /api/v2/reviews/templates/{template_id}/generate
```

**Request Body:**
```json
{
  "review_id": 123,
  "variables": {
    "customer_name": "John",
    "service_type": "fade cut",
    "barber_name": "Mike",
    "business_name": "Elite Cuts Barbershop"
  },
  "customization_level": "medium"
}
```

## Integration Health Monitoring

### Health Check Dashboard
```http
GET /api/v2/integrations/health
```

**Response:**
```json
{
  "overall_status": "healthy",
  "integrations": [
    {
      "type": "google_my_business",
      "status": "connected",
      "last_sync": "2024-07-03T10:00:00Z",
      "health_score": 98,
      "issues": [],
      "metrics": {
        "reviews_synced_24h": 12,
        "responses_posted_24h": 8,
        "api_calls_remaining": 1850
      }
    },
    {
      "type": "google_analytics",
      "status": "connected",
      "last_sync": "2024-07-03T10:30:00Z",
      "health_score": 95,
      "issues": [
        {
          "type": "warning",
          "message": "Enhanced measurement not configured",
          "action_required": "Enable enhanced measurement in GA4"
        }
      ],
      "metrics": {
        "events_tracked_24h": 342,
        "conversion_rate": 3.2
      }
    }
  ],
  "recommendations": [
    "Consider enabling Google My Business messaging",
    "Set up additional conversion goals for better tracking"
  ]
}
```

## Security & Compliance

### OAuth Token Management
- **Automatic Refresh**: Tokens refreshed automatically before expiration
- **Secure Storage**: All tokens encrypted at rest
- **Scope Limitation**: Minimal required permissions only
- **Audit Logging**: All OAuth activities logged

### Privacy Compliance
- **GDPR Ready**: Data processing agreements and consent management
- **Data Minimization**: Only necessary data collected and processed
- **Right to be Forgotten**: Automated data deletion capabilities
- **Anonymization**: Customer data anonymized for analytics

### Rate Limiting
- **Platform Limits**: Respect third-party API rate limits
- **Fair Usage**: Intelligent queuing and throttling
- **Priority Handling**: Critical operations prioritized
- **Error Handling**: Graceful degradation during rate limit hits

## Setup & Configuration

### Prerequisites
1. **Google Cloud Project** with APIs enabled:
   - Google My Business API
   - Google Analytics Reporting API
   - Google Calendar API

2. **Meta Developer Account** with:
   - Facebook App created
   - Business Manager access
   - Pixel configured

3. **Domain Verification**:
   - Domain verified in Google Search Console
   - Facebook domain verification completed

### Quick Setup Guide

1. **Configure OAuth Applications**
   ```bash
   # Set environment variables
   export GOOGLE_CLIENT_ID="your_google_client_id"
   export GOOGLE_CLIENT_SECRET="your_google_client_secret"
   export META_APP_ID="your_meta_app_id"
   export META_APP_SECRET="your_meta_app_secret"
   ```

2. **Initialize Integration Settings**
   ```http
   POST /api/v2/integrations/init
   ```

3. **Connect Platforms**
   - Use OAuth flows to connect Google My Business
   - Set up Meta Pixel tracking
   - Configure Google Analytics 4

4. **Test Configuration**
   ```http
   POST /api/v2/integrations/test
   ```

## Troubleshooting

### Common Issues

#### 1. OAuth Connection Failures
```
Error: Invalid OAuth redirect URI
Solution: Ensure redirect URI matches exactly in platform settings
```

#### 2. Review Sync Issues
```
Error: GMB API quota exceeded
Solution: Implement exponential backoff and reduce sync frequency
```

#### 3. Tracking Not Working
```
Error: Events not appearing in Google Analytics
Solution: Check measurement ID and ensure debug mode is enabled
```

### Error Codes

- `MKT_001`: OAuth token expired or invalid
- `MKT_002`: Platform API quota exceeded
- `MKT_003`: Invalid tracking configuration
- `MKT_004`: Review response violates platform guidelines
- `MKT_005`: Campaign scheduling conflict

### Debug Tools

#### Test Event Tracking
```http
POST /api/v2/tracking/test-event
```

#### Validate Integration
```http
GET /api/v2/integrations/{integration_id}/validate
```

#### Review Platform Status
```http
GET /api/v2/integrations/platform-status
```

## Performance Optimization

### Caching Strategy
- **Review Data**: 15-minute cache for review listings
- **Analytics Data**: 1-hour cache for attribution reports
- **Template Responses**: 24-hour cache for generated responses
- **Platform Health**: 5-minute cache for health checks

### Batch Processing
- **Review Sync**: Batch API calls to optimize quota usage
- **Event Tracking**: Queue events for batch sending
- **Response Generation**: Parallel processing for multiple reviews

## Monitoring & Analytics

### Key Metrics
- **Review Response Rate**: Percentage of reviews responded to
- **Average Response Time**: Time from review to response
- **Campaign Performance**: Open rates, click rates, conversions
- **Attribution Accuracy**: Tracking accuracy across platforms

### Alerting
- OAuth token expiration warnings
- API quota approaching limits
- Campaign performance anomalies
- Integration health degradation

## Future Roadmap

### Q4 2024
- TikTok Business integration
- Advanced AI review sentiment analysis
- Automated campaign optimization

### Q1 2025
- YouTube Business profile integration
- Voice-enabled review responses
- Cross-platform customer journey mapping

### Q2 2025
- Instagram Shopping integration
- Predictive campaign performance modeling
- Advanced multi-touch attribution

## Support Resources

- **Integration Support**: integrations@bookedbarber.com
- **Marketing Questions**: marketing@bookedbarber.com  
- **Technical Issues**: support@bookedbarber.com
- **Documentation**: docs.bookedbarber.com/marketing

---

*Last Updated: 2025-07-03*
*Version: 2.0.0*