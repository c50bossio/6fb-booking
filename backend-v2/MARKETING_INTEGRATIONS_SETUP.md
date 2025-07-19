# Marketing Integrations Setup Guide

## 📋 Prerequisites

Before setting up marketing integrations, ensure you have:

1. **Backend Running**: BookedBarber V2 API at `http://localhost:8000`
2. **Database Configured**: SQLite or PostgreSQL with migrations applied
3. **Redis Running**: For caching and rate limiting
4. **Environment Variables**: Properly configured `.env` file

## 🔧 Environment Setup

### 1. Backend Configuration

Add these variables to your `.env` file:

```bash
# Google My Business OAuth
GMB_CLIENT_ID=your-gmb-client-id
GMB_CLIENT_SECRET=your-gmb-client-secret
GMB_REDIRECT_URI=http://localhost:8000/api/v2/integrations/gmb/callback

# Meta Business OAuth
META_CLIENT_ID=your-meta-client-id
META_CLIENT_SECRET=your-meta-client-secret
META_REDIRECT_URI=http://localhost:8000/api/v2/integrations/meta/callback

# Google Tag Manager
GTM_SERVER_CONTAINER_URL=https://your-gtm-server.com
GTM_MEASUREMENT_ID=G-XXXXXXXXXX
GTM_API_SECRET=your-gtm-api-secret

# Meta Conversions API
META_PIXEL_ID=your-pixel-id
META_CONVERSION_API_TOKEN=your-conversion-token
META_TEST_EVENT_CODE=TEST12345  # Optional for testing

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXXX
GOOGLE_ADS_CONVERSION_LABEL=your-label
```

### 2. Database Setup

The required tables are created automatically via SQLAlchemy models:
- `integrations` - OAuth connections and credentials
- `conversion_events` - Tracking event storage
- `tracking_configurations` - User-specific settings
- `conversion_goals` - Custom conversion definitions
- `campaign_tracking` - Campaign performance data

### 3. OAuth Provider Setup

#### Google My Business
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google My Business API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:8000/api/v2/integrations/gmb/callback`
6. Copy Client ID and Secret to `.env`

#### Meta (Facebook) Business
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app or select existing
3. Add Facebook Login product
4. Configure OAuth redirect URI
5. Copy App ID and Secret to `.env`

#### Google Tag Manager
1. Create GTM Server container
2. Get container URL from settings
3. Create Measurement Protocol API secret in GA4
4. Add values to `.env`

## 🚀 Quick Start

### 1. Start Backend Services

```bash
# Start Redis
redis-server

# Start Backend API
cd backend-v2
uvicorn main:app --reload --port 8000
```

### 2. Verify Installation

```bash
# Check health
curl http://localhost:8000/health

# Check API docs
open http://localhost:8000/docs
```

### 3. Test OAuth Flow

Use the provided test script:

```bash
cd backend-v2
python test_oauth_integrations.py
```

## 📡 API Endpoints

### Integration Management

```http
# List all integrations
GET /api/v2/integrations/list

# Initiate OAuth connection
POST /api/v2/integrations/connect
{
  "integration_type": "google_my_business",
  "redirect_uri": "http://localhost:3000/settings/integrations",
  "scopes": []
}

# Handle OAuth callback
GET /api/v2/integrations/callback?code=xxx&state=xxx

# Check integration health
GET /api/v2/integrations/{id}/health

# Disconnect integration
DELETE /api/v2/integrations/{id}
```

### Conversion Tracking

```http
# Track event
POST /api/tracking/events
{
  "event_name": "booking_completed",
  "event_type": "purchase",
  "event_value": 50.00,
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "summer_sale"
}

# Get conversion data
GET /api/tracking/conversions?start_date=2024-01-01&end_date=2024-12-31
```

### Review Management

```http
# Generate review response
POST /api/v2/reviews/generate-response
{
  "rating": 5,
  "review_text": "Great service!",
  "reviewer_name": "John Doe"
}

# Get review templates
GET /api/v2/reviews/templates
```

## 🧪 Testing

### Manual Testing

1. **OAuth Flow**:
   - Navigate to integrations page
   - Click "Connect" on desired integration
   - Complete OAuth flow
   - Verify connection status

2. **Conversion Tracking**:
   - Trigger test events
   - Check GTM real-time view
   - Verify Meta Events Manager

3. **Review Responses**:
   - Create test review
   - Generate response
   - Verify SEO optimization

### Automated Testing

```bash
# Run integration tests
cd backend-v2
pytest tests/test_integrations.py

# Run specific test
pytest tests/test_integrations.py::test_oauth_flow
```

## 🐛 Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Ensure redirect URIs match exactly in provider settings
   - Check for trailing slashes
   - Verify protocol (http vs https)

2. **Token Expiration**
   - Tokens are automatically refreshed
   - Check integration health regularly
   - Manual refresh available via API

3. **Rate Limiting**
   - Google APIs: 10,000 requests/day
   - Meta APIs: Varies by endpoint
   - Implement exponential backoff

4. **CORS Issues**
   - Verify ALLOWED_ORIGINS in `.env`
   - Check browser console for errors
   - Use proper headers in requests

### Debug Mode

Enable debug logging:

```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check logs for detailed error information:
```bash
tail -f backend-v2/logs/app.log
```

## 📈 Monitoring

### Health Checks

```bash
# Check all integrations health
curl http://localhost:8000/api/v2/integrations/health/all

# Check specific integration
curl http://localhost:8000/api/v2/integrations/{id}/health
```

### Metrics to Monitor
- OAuth token expiration times
- API rate limit usage
- Conversion tracking accuracy
- Review response times
- Error rates by integration

## 🔒 Security Considerations

1. **Token Storage**: All tokens encrypted at rest
2. **State Validation**: CSRF protection on OAuth flows
3. **Rate Limiting**: Prevent abuse of API endpoints
4. **Audit Logging**: Track all integration actions
5. **Scope Limitation**: Request minimal required permissions

## 📚 Additional Resources

- [Google My Business API Docs](https://developers.google.com/my-business)
- [Meta Business API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Google Tag Manager Server-side](https://developers.google.com/tag-manager/serverside)
- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check backend logs for detailed errors
4. Contact support with integration ID and error details

---

**Note**: This guide covers development setup. Production deployment requires:
- SSL certificates (HTTPS)
- Production OAuth credentials
- Proper domain configuration
- Enhanced security measures
- Monitoring and alerting setup