# BookedBarber V2 - API Documentation

## Overview

BookedBarber V2 provides a comprehensive RESTful API for barbershop booking and business management. The API is built with FastAPI and includes advanced features like AI analytics, marketing integrations, GDPR compliance, and multi-factor authentication.

## Base Information

- **API Version**: 2.0.0
- **Base URL**: 
  - Development: `http://localhost:8000`
  - Staging: `http://localhost:8001`
  - Production: `https://api.bookedbarber.com`
- **Protocol**: HTTPS (production), HTTP (development)
- **Format**: JSON
- **Documentation**: 
  - Swagger UI: `/docs`
  - ReDoc: `/redoc`
  - OpenAPI Spec: `/openapi.json`

## Authentication

### JWT Authentication

Most endpoints require JWT (JSON Web Token) authentication. Include the access token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Obtaining Access Tokens

#### Standard Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "barber",
    "mfa_enabled": false
  }
}
```

#### Multi-Factor Authentication

If MFA is enabled, login requires an additional verification step:

```http
POST /api/v1/mfa/verify
Content-Type: application/json
Authorization: Bearer <partial_token>

{
  "otp_code": "123456"
}
```

#### Token Refresh
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### API Keys

Some endpoints support API key authentication for server-to-server communication:

```http
X-API-Key: your_api_key_here
```

## Rate Limiting

API endpoints are rate limited to ensure fair usage and system stability:

| Endpoint Category | Rate Limit | Time Window |
|------------------|------------|-------------|
| General API | 100 requests | 1 minute |
| Authentication | 10 requests | 1 minute |
| Payment Operations | 20 requests | 1 minute |
| Email/SMS Sending | 50 requests | 1 hour |
| AI Analytics | 30 requests | 1 minute |
| File Uploads | 10 requests | 1 minute |

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict (e.g., double booking) |
| 422 | Unprocessable Entity - Validation errors |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Error Response Format

```json
{
  "detail": "Error description",
  "error_code": "BOOKING_CONFLICT",
  "timestamp": "2024-07-03T10:30:00Z",
  "path": "/api/v1/appointments",
  "request_id": "req_123456789"
}
```

### Validation Errors

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    },
    {
      "loc": ["body", "phone"],
      "msg": "ensure this value matches required format",
      "type": "value_error.regex"
    }
  ]
}
```

## Core API Endpoints

### Authentication Endpoints

#### User Registration
```http
POST /api/v1/auth/register
```

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "client",
  "business_name": "Elite Cuts" // Required for barber/admin roles
}
```

#### Password Reset
```http
POST /api/v1/auth/forgot-password
```

Initiate password reset process.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### Change Password
```http
PUT /api/v1/auth/change-password
```

Change user password (requires authentication).

**Request Body:**
```json
{
  "current_password": "old_password",
  "new_password": "new_secure_password"
}
```

### User Management

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "barber",
  "business_name": "Elite Cuts",
  "timezone": "America/New_York",
  "mfa_enabled": true,
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-07-03T08:15:00Z"
}
```

#### Update User Profile
```http
PUT /api/v1/users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1234567890",
  "timezone": "America/Los_Angeles"
}
```

### Appointment Management

#### List Appointments
```http
GET /api/v1/appointments?start_date=2024-07-01&end_date=2024-07-31&status=confirmed
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date` (optional): Filter appointments from date (YYYY-MM-DD)
- `end_date` (optional): Filter appointments to date (YYYY-MM-DD)
- `status` (optional): Filter by status (pending, confirmed, completed, cancelled)
- `barber_id` (optional): Filter by barber
- `client_id` (optional): Filter by client
- `page` (optional): Page number for pagination (default: 1)
- `per_page` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "appointments": [
    {
      "id": 456,
      "client_id": 123,
      "barber_id": 789,
      "service_id": 1,
      "start_time": "2024-07-03T14:00:00Z",
      "end_time": "2024-07-03T15:00:00Z",
      "status": "confirmed",
      "price": 35.00,
      "currency": "USD",
      "notes": "Regular customer, prefers fade cut",
      "created_at": "2024-07-01T10:30:00Z",
      "client": {
        "id": 123,
        "first_name": "Mike",
        "last_name": "Johnson",
        "email": "mike@example.com",
        "phone": "+1234567890"
      },
      "barber": {
        "id": 789,
        "first_name": "Sarah",
        "last_name": "Williams",
        "business_name": "Elite Cuts"
      },
      "service": {
        "id": 1,
        "name": "Haircut & Style",
        "duration": 60,
        "price": 35.00
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Create Appointment
```http
POST /api/v1/appointments
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "client_id": 123,
  "barber_id": 789,
  "service_id": 1,
  "start_time": "2024-07-03T14:00:00Z",
  "notes": "First-time client",
  "send_confirmation": true
}
```

#### Update Appointment
```http
PUT /api/v1/appointments/{appointment_id}
Authorization: Bearer <token>
```

#### Cancel Appointment
```http
DELETE /api/v1/appointments/{appointment_id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cancellation_reason": "Client requested cancellation",
  "send_notification": true
}
```

### Payment Processing

#### Create Payment Intent
```http
POST /api/v1/payments/create-intent
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "appointment_id": 456,
  "amount": 3500, // Amount in cents
  "currency": "USD",
  "payment_method_types": ["card"],
  "capture_method": "automatic"
}
```

**Response:**
```json
{
  "client_secret": "pi_123456789_secret_abc123",
  "payment_intent_id": "pi_123456789",
  "amount": 3500,
  "currency": "USD",
  "status": "requires_payment_method"
}
```

#### Confirm Payment
```http
POST /api/v1/payments/confirm
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "payment_intent_id": "pi_123456789",
  "payment_method_id": "pm_123456789"
}
```

#### Payment History
```http
GET /api/v1/payments/history?start_date=2024-07-01&end_date=2024-07-31
Authorization: Bearer <token>
```

### Client Management

#### List Clients
```http
GET /api/v1/clients?search=john&page=1&per_page=20
Authorization: Bearer <token>
```

#### Create Client
```http
POST /api/v1/clients
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "notes": "Prefers afternoon appointments",
  "marketing_consent": true
}
```

#### Get Client Details
```http
GET /api/v1/clients/{client_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "notes": "Prefers afternoon appointments",
  "total_appointments": 15,
  "total_spent": 525.00,
  "last_appointment": "2024-06-15T14:00:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "marketing_consent": true,
  "appointments": [
    // Recent appointments
  ]
}
```

### Calendar Integration

#### Get Calendar Events
```http
GET /api/v1/calendar/events?start=2024-07-01&end=2024-07-31
Authorization: Bearer <token>
```

#### Sync with Google Calendar
```http
POST /api/v1/calendar/sync
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "calendar_id": "primary",
  "sync_direction": "bidirectional", // "to_google", "from_google", "bidirectional"
  "sync_past_days": 30,
  "sync_future_days": 90
}
```

#### Calendar OAuth
```http
GET /api/v1/calendar/oauth/initiate
Authorization: Bearer <token>
```

## Advanced Features

### AI Analytics Endpoints

#### Get Performance Benchmarks
```http
POST /api/v1/ai-analytics/benchmark
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "metric_type": "revenue",
  "date_range_start": "2024-01-01",
  "date_range_end": "2024-06-30"
}
```

**Response:**
```json
{
  "user_metric": 12500.00,
  "industry_average": 11200.00,
  "percentile_rank": 75,
  "recommendations": [
    "Your revenue is 11.6% above industry average",
    "Consider optimizing appointment scheduling during peak hours"
  ]
}
```

#### Revenue Forecasting
```http
POST /api/v1/ai-analytics/predict/revenue
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "months_ahead": 6,
  "include_seasonal": true
}
```

#### Client Churn Prediction
```http
POST /api/v1/ai-analytics/predict/churn
Authorization: Bearer <token>
```

### Marketing Integration Endpoints

#### Google My Business - Fetch Reviews
```http
GET /api/v1/reviews?platform=google_my_business&status=new
Authorization: Bearer <token>
```

#### Generate Review Response
```http
POST /api/v1/reviews/{review_id}/generate-response
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "template_type": "appreciation",
  "personalization_level": "high"
}
```

#### Track Conversion Event
```http
POST /api/v1/tracking/event
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "event_name": "appointment_booked",
  "value": 35.00,
  "currency": "USD",
  "custom_parameters": {
    "service_type": "haircut",
    "utm_source": "google",
    "utm_campaign": "summer_promotion"
  }
}
```

### GDPR Compliance Endpoints

#### Get User Consents
```http
GET /api/v1/privacy/consents
Authorization: Bearer <token>
```

#### Update Consent
```http
PUT /api/v1/privacy/consents
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "consents": [
    {
      "consent_type": "marketing_emails",
      "status": "granted"
    },
    {
      "consent_type": "aggregate_analytics",
      "status": "denied"
    }
  ]
}
```

#### Request Data Export
```http
POST /api/v1/privacy/data-export
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "export_format": "json",
  "data_categories": [
    "profile_data",
    "booking_history",
    "payment_records"
  ]
}
```

#### Account Deletion
```http
POST /api/v1/privacy/delete-account
Authorization: Bearer <token>
```

### Multi-Factor Authentication

#### Setup MFA
```http
POST /api/v1/mfa/setup
Authorization: Bearer <token>
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "backup_codes": [
    "12345678",
    "87654321"
  ]
}
```

#### Enable MFA
```http
POST /api/v1/mfa/enable
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "otp_code": "123456"
}
```

#### Verify MFA
```http
POST /api/v1/mfa/verify
Authorization: Bearer <token>
```

## Webhooks

BookedBarber V2 supports webhooks for real-time event notifications.

### Webhook Events

| Event Type | Description |
|------------|-------------|
| `appointment.created` | New appointment scheduled |
| `appointment.updated` | Appointment details changed |
| `appointment.cancelled` | Appointment cancelled |
| `payment.succeeded` | Payment completed successfully |
| `payment.failed` | Payment attempt failed |
| `client.created` | New client registered |
| `review.received` | New review received from platform |

### Webhook Configuration

```http
POST /api/v1/webhooks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/bookedbarber",
  "events": ["appointment.created", "payment.succeeded"],
  "secret": "your_webhook_secret"
}
```

### Webhook Payload Example

```json
{
  "id": "evt_123456789",
  "type": "appointment.created",
  "created": 1625097600,
  "data": {
    "object": {
      "id": 456,
      "client_id": 123,
      "barber_id": 789,
      "start_time": "2024-07-03T14:00:00Z",
      "status": "confirmed"
    }
  }
}
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

### Pagination Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "pages": 8,
    "has_next": true,
    "has_prev": false,
    "next_page": 2,
    "prev_page": null
  }
}
```

## Filtering and Sorting

### Common Filter Parameters

- `start_date` / `end_date`: Date range filtering
- `status`: Status filtering
- `search`: Text search across relevant fields
- `barber_id` / `client_id`: Entity filtering

### Sorting

- `sort_by`: Field to sort by
- `sort_order`: `asc` or `desc` (default: `desc`)

Example:
```http
GET /api/v1/appointments?sort_by=start_time&sort_order=asc
```

## File Uploads

### Upload Profile Image

```http
POST /api/v1/users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [binary_image_data]
```

**Supported formats**: JPG, PNG, GIF
**Maximum size**: 5MB
**Recommended dimensions**: 400x400px

## Environment-Specific Features

### Development Environment

- Extended error messages
- Swagger UI available at `/docs`
- CORS enabled for localhost
- Debug logging enabled

### Staging Environment

- Test Stripe keys
- Sandbox third-party integrations
- Enhanced logging
- Performance monitoring

### Production Environment

- Live Stripe keys
- Production third-party integrations
- Optimized logging
- Security headers enforced
- Rate limiting enforced

## SDK and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `npm install @bookedbarber/sdk`
- **Python**: `pip install bookedbarber-sdk`
- **PHP**: `composer require bookedbarber/sdk`

### Third-Party Libraries

- **Postman Collection**: Available in `/docs/api/` directory
- **OpenAPI Generator**: Generate client SDKs from OpenAPI spec
- **Insomnia**: Import OpenAPI spec for testing

## API Versioning

BookedBarber uses URL path versioning:

- **Current Version**: `v1` (e.g., `/api/v1/appointments`)
- **Deprecation Policy**: 12 months notice before version retirement
- **Backwards Compatibility**: Minor updates maintain compatibility

## Security Best Practices

### For Developers

1. **Always use HTTPS** in production
2. **Validate JWT tokens** on every request
3. **Implement rate limiting** on your end for additional protection
4. **Store API keys securely** (environment variables, secure vaults)
5. **Validate webhook signatures** to ensure authenticity
6. **Use the principle of least privilege** for API access

### Authentication Security

- JWT tokens expire after 1 hour
- Refresh tokens expire after 30 days
- MFA required for admin operations
- API keys can be rotated without downtime

## Support and Resources

### Documentation

- **API Reference**: This document
- **OpenAPI Specification**: `/docs/api/openapi.json`
- **Interactive Documentation**: `/docs` (Swagger UI)
- **Alternative Documentation**: `/redoc` (ReDoc)

### Code Examples

All endpoints include code examples in:
- cURL
- JavaScript (fetch/axios)
- Python (requests)
- PHP (Guzzle)

### Support Channels

- **Documentation**: https://docs.bookedbarber.com
- **Email Support**: api-support@bookedbarber.com
- **Developer Community**: https://community.bookedbarber.com
- **Status Page**: https://status.bookedbarber.com
- **GitHub Issues**: For SDK and integration issues

### SLA and Uptime

- **Uptime SLA**: 99.9%
- **Response Time**: <200ms (95th percentile)
- **Maintenance Windows**: Announced 48 hours in advance
- **Incident Communication**: via status page and email

---

*Last Updated: 2025-07-03*
*API Version: 2.0.0*
*Documentation Version: 1.0*