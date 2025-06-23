# 6FB Booking Platform - API Documentation

Complete API reference for integrating with the 6FB Booking Platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Core Resources](#core-resources)
- [Booking Management](#booking-management)
- [Payment Processing](#payment-processing)
- [User Management](#user-management)
- [Analytics](#analytics)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDK and Libraries](#sdk-and-libraries)

---

## Getting Started

### Base URL
```
Production: https://api.6fbbooking.com/api/v1
Development: http://localhost:8000/api/v1
```

### API Versioning
- Current version: `v1`
- Version header: `Accept: application/json; version=1`
- Backward compatibility maintained for 12 months

### Content Types
- Request: `application/json`
- Response: `application/json`
- File uploads: `multipart/form-data`

---

## Authentication

### JWT Token Authentication

#### Obtain Access Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "barber",
    "permissions": ["booking:read", "booking:write"]
  }
}
```

#### Using Access Token
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer {refresh_token}
```

### API Key Authentication (For Integrations)
```http
X-API-Key: your-api-key-here
```

#### Generate API Key
```http
POST /auth/api-keys
Authorization: Bearer {access_token}

{
  "name": "Integration Name",
  "permissions": ["booking:read", "client:read"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

---

## Core Resources

### User Profiles

#### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 123,
  "email": "barber@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "barber",
  "location_id": 1,
  "phone": "+1-555-0123",
  "profile": {
    "bio": "Professional barber with 10 years experience",
    "specialties": ["haircuts", "beard_styling"],
    "profile_image_url": "https://cdn.example.com/profiles/123.jpg",
    "verified": true
  },
  "settings": {
    "notifications_enabled": true,
    "booking_window_days": 30,
    "cancellation_window_hours": 4
  }
}
```

#### Update User Profile
```http
PUT /users/{user_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1-555-0124",
  "profile": {
    "bio": "Updated bio",
    "specialties": ["haircuts", "beard_styling", "color"]
  }
}
```

### Locations

#### List Locations
```http
GET /locations
```

**Parameters:**
- `active_only` (boolean): Filter active locations only
- `services` (array): Filter by available services
- `lat` (float): Latitude for distance sorting
- `lng` (float): Longitude for distance sorting

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Downtown 6FB Studio",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "country": "US",
        "coordinates": {
          "lat": 40.7128,
          "lng": -74.0060
        }
      },
      "contact": {
        "phone": "+1-555-0100",
        "email": "downtown@6fb.com"
      },
      "hours": {
        "monday": {"open": "09:00", "close": "18:00"},
        "tuesday": {"open": "09:00", "close": "18:00"},
        "wednesday": {"open": "09:00", "close": "18:00"},
        "thursday": {"open": "09:00", "close": "20:00"},
        "friday": {"open": "09:00", "close": "20:00"},
        "saturday": {"open": "08:00", "close": "18:00"},
        "sunday": {"closed": true}
      },
      "services_available": [1, 2, 3, 4],
      "barbers_count": 5,
      "rating": 4.8,
      "images": [
        "https://cdn.example.com/locations/1/interior.jpg",
        "https://cdn.example.com/locations/1/exterior.jpg"
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

### Services

#### List Services
```http
GET /services
```

**Parameters:**
- `category_id` (integer): Filter by service category
- `location_id` (integer): Filter by location
- `active_only` (boolean): Active services only

**Response:**
```json
{
  "services": [
    {
      "id": 1,
      "name": "Premium Men's Haircut",
      "category": {
        "id": 1,
        "name": "Haircuts",
        "slug": "haircuts"
      },
      "description": "Complete haircut with consultation, wash, cut, and style",
      "duration_minutes": 45,
      "price": {
        "base": 65.00,
        "currency": "USD"
      },
      "requirements": {
        "advance_booking_hours": 24,
        "cancellation_hours": 4,
        "skill_level": "intermediate"
      },
      "add_ons": [
        {
          "id": 10,
          "name": "Beard Trim",
          "price": 15.00,
          "duration_minutes": 15
        }
      ],
      "available_at_locations": [1, 2, 3]
    }
  ]
}
```

---

## Booking Management

### Availability

#### Check Availability
```http
GET /availability
```

**Parameters:**
- `barber_id` (integer): Specific barber
- `service_id` (integer): Required service
- `location_id` (integer): Required location
- `date_start` (date): Start date (YYYY-MM-DD)
- `date_end` (date): End date (YYYY-MM-DD)
- `duration_minutes` (integer): Service duration

**Response:**
```json
{
  "availability": [
    {
      "date": "2024-01-15",
      "slots": [
        {
          "start_time": "09:00",
          "end_time": "09:45",
          "available": true,
          "barber_id": 5,
          "price": 65.00
        },
        {
          "start_time": "09:45",
          "end_time": "10:30",
          "available": false,
          "reason": "booked"
        },
        {
          "start_time": "10:30",
          "end_time": "11:15",
          "available": true,
          "barber_id": 5,
          "price": 65.00
        }
      ]
    }
  ],
  "timezone": "America/New_York"
}
```

### Appointments

#### Create Appointment
```http
POST /appointments
Authorization: Bearer {token}
Content-Type: application/json

{
  "client_id": 456,
  "barber_id": 5,
  "service_id": 1,
  "location_id": 1,
  "appointment_datetime": "2024-01-15T09:00:00-05:00",
  "add_ons": [10],
  "notes": "First time client, prefers shorter style",
  "payment_method_id": "pm_1234567890"
}
```

**Response:**
```json
{
  "id": 789,
  "status": "confirmed",
  "client": {
    "id": 456,
    "name": "Jane Smith",
    "phone": "+1-555-0200"
  },
  "barber": {
    "id": 5,
    "name": "Mike Wilson",
    "profile_image_url": "https://cdn.example.com/barbers/5.jpg"
  },
  "service": {
    "id": 1,
    "name": "Premium Men's Haircut",
    "duration_minutes": 45
  },
  "add_ons": [
    {
      "id": 10,
      "name": "Beard Trim",
      "price": 15.00
    }
  ],
  "location": {
    "id": 1,
    "name": "Downtown 6FB Studio",
    "address": "123 Main St, New York, NY 10001"
  },
  "appointment_datetime": "2024-01-15T09:00:00-05:00",
  "end_datetime": "2024-01-15T09:45:00-05:00",
  "pricing": {
    "service_price": 65.00,
    "add_ons_price": 15.00,
    "subtotal": 80.00,
    "tax": 7.20,
    "total": 87.20,
    "currency": "USD"
  },
  "payment": {
    "status": "completed",
    "payment_intent_id": "pi_1234567890",
    "amount_paid": 87.20
  },
  "created_at": "2024-01-10T14:30:00Z",
  "booking_reference": "6FB-789-2024"
}
```

#### List Appointments
```http
GET /appointments
Authorization: Bearer {token}
```

**Parameters:**
- `status` (string): Filter by status (pending, confirmed, completed, cancelled)
- `barber_id` (integer): Filter by barber
- `client_id` (integer): Filter by client
- `location_id` (integer): Filter by location
- `date_start` (date): Start date filter
- `date_end` (date): End date filter
- `page` (integer): Page number
- `per_page` (integer): Items per page (max 100)

#### Update Appointment
```http
PUT /appointments/{appointment_id}
Authorization: Bearer {token}

{
  "status": "completed",
  "notes": "Client was very satisfied with the service",
  "actual_duration_minutes": 50,
  "additional_charges": [
    {
      "description": "Premium styling product",
      "amount": 25.00
    }
  ]
}
```

#### Cancel Appointment
```http
DELETE /appointments/{appointment_id}
Authorization: Bearer {token}

{
  "reason": "client_request",
  "refund_amount": 87.20,
  "notes": "Client had to cancel due to emergency"
}
```

---

## Payment Processing

### Payment Methods

#### List Payment Methods
```http
GET /payment-methods
Authorization: Bearer {token}
```

#### Add Payment Method
```http
POST /payment-methods
Authorization: Bearer {token}

{
  "type": "card",
  "token": "tok_1234567890",  // From Stripe Elements
  "set_as_default": true
}
```

### Transactions

#### Process Payment
```http
POST /payments
Authorization: Bearer {token}

{
  "appointment_id": 789,
  "payment_method_id": "pm_1234567890",
  "amount": 87.20,
  "currency": "USD",
  "description": "Appointment payment for booking #6FB-789-2024"
}
```

**Response:**
```json
{
  "id": "txn_abc123",
  "status": "succeeded",
  "amount": 87.20,
  "currency": "USD",
  "payment_method": {
    "type": "card",
    "last_four": "4242",
    "brand": "visa"
  },
  "receipt_url": "https://pay.stripe.com/receipts/...",
  "created_at": "2024-01-15T14:30:00Z"
}
```

#### Refund Payment
```http
POST /payments/{payment_id}/refund
Authorization: Bearer {token}

{
  "amount": 43.60,  // Partial refund
  "reason": "service_not_provided",
  "notes": "Refunding 50% due to shortened service"
}
```

### Barber Payouts

#### Get Payout History
```http
GET /payouts
Authorization: Bearer {token}
```

**Response:**
```json
{
  "payouts": [
    {
      "id": "po_abc123",
      "amount": 520.50,
      "currency": "USD",
      "status": "paid",
      "arrival_date": "2024-01-16",
      "method": "standard",
      "destination": {
        "type": "bank_account",
        "last_four": "6789"
      },
      "period": {
        "start": "2024-01-08",
        "end": "2024-01-14"
      },
      "appointments_count": 12,
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

## User Management

### Clients

#### Create Client
```http
POST /clients
Authorization: Bearer {token}

{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0200",
  "date_of_birth": "1990-05-15",
  "preferences": {
    "preferred_barber_id": 5,
    "communication_preference": "email",
    "appointment_reminders": true
  },
  "notes": "Prefers appointments in the morning"
}
```

#### Get Client Profile
```http
GET /clients/{client_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 456,
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0200",
  "status": "active",
  "preferences": {
    "preferred_barber_id": 5,
    "communication_preference": "email",
    "appointment_reminders": true
  },
  "stats": {
    "total_appointments": 15,
    "total_spent": 975.50,
    "average_rating_given": 4.8,
    "last_appointment": "2024-01-10T09:00:00Z",
    "loyalty_points": 150
  },
  "created_at": "2023-08-15T10:30:00Z"
}
```

### Barbers

#### List Barbers
```http
GET /barbers
```

**Parameters:**
- `location_id` (integer): Filter by location
- `service_id` (integer): Filter by service capability
- `available_date` (date): Filter by availability
- `rating_min` (float): Minimum rating filter

**Response:**
```json
{
  "barbers": [
    {
      "id": 5,
      "first_name": "Mike",
      "last_name": "Wilson",
      "profile_image_url": "https://cdn.example.com/barbers/5.jpg",
      "bio": "Professional barber specializing in modern cuts",
      "specialties": ["haircuts", "beard_styling"],
      "rating": 4.9,
      "reviews_count": 127,
      "years_experience": 8,
      "location": {
        "id": 1,
        "name": "Downtown 6FB Studio"
      },
      "pricing": {
        "base_rate": 65.00,
        "premium_rate": 85.00
      },
      "next_available": "2024-01-16T10:00:00-05:00"
    }
  ]
}
```

---

## Analytics

### Business Metrics

#### Get Dashboard Stats
```http
GET /analytics/dashboard
Authorization: Bearer {token}
```

**Parameters:**
- `period` (string): today, week, month, quarter, year
- `location_id` (integer): Filter by location
- `barber_id` (integer): Filter by barber

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31",
    "label": "January 2024"
  },
  "revenue": {
    "total": 15420.50,
    "change_percent": 12.5,
    "trend": "up"
  },
  "appointments": {
    "total": 234,
    "completed": 210,
    "cancelled": 18,
    "no_shows": 6,
    "completion_rate": 89.7
  },
  "clients": {
    "total_served": 156,
    "new_clients": 23,
    "returning_clients": 133,
    "retention_rate": 85.3
  },
  "barber_performance": [
    {
      "barber_id": 5,
      "name": "Mike Wilson",
      "appointments": 45,
      "revenue": 3250.00,
      "rating": 4.9,
      "6fb_score": 87.5
    }
  ]
}
```

### 6FB Score Calculation

#### Get 6FB Score
```http
GET /analytics/6fb-score
Authorization: Bearer {token}
```

**Parameters:**
- `barber_id` (integer): Specific barber score
- `period` (string): Calculation period

**Response:**
```json
{
  "score": 87.5,
  "grade": "A",
  "components": {
    "revenue_per_client": {
      "score": 90,
      "value": 62.50,
      "weight": 0.3
    },
    "rebooking_rate": {
      "score": 85,
      "value": 0.78,
      "weight": 0.25
    },
    "service_efficiency": {
      "score": 88,
      "value": 0.92,
      "weight": 0.2
    },
    "client_satisfaction": {
      "score": 92,
      "value": 4.6,
      "weight": 0.15
    },
    "no_show_management": {
      "score": 82,
      "value": 0.94,
      "weight": 0.1
    }
  },
  "calculated_at": "2024-01-15T09:00:00Z",
  "period": {
    "start": "2023-12-15",
    "end": "2024-01-15"
  }
}
```

---

## Webhooks

### Webhook Events

#### Available Events
- `appointment.created`
- `appointment.updated`
- `appointment.cancelled`
- `payment.succeeded`
- `payment.failed`
- `payout.paid`
- `user.created`
- `review.created`

#### Webhook Configuration
```http
POST /webhooks
Authorization: Bearer {token}

{
  "url": "https://yourapp.com/webhooks/6fb",
  "events": [
    "appointment.created",
    "payment.succeeded"
  ],
  "secret": "your-webhook-secret"
}
```

#### Webhook Payload Example
```json
{
  "id": "evt_abc123",
  "type": "appointment.created",
  "created": 1610467200,
  "data": {
    "object": {
      "id": 789,
      "status": "confirmed",
      "client_id": 456,
      "barber_id": 5,
      "appointment_datetime": "2024-01-15T09:00:00-05:00",
      "total_amount": 87.20
    }
  },
  "api_version": "v1"
}
```

#### Webhook Signature Verification
```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

---

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "request_id": "req_abc123"
  }
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VALIDATION_ERROR` - Request data validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `BOOKING_CONFLICT` - Time slot no longer available
- `PAYMENT_FAILED` - Payment processing error
- `RATE_LIMITED` - API rate limit exceeded

---

## Rate Limiting

### Rate Limits
- **Standard API**: 1000 requests per hour per user
- **Webhook endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute per IP

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1610467200
```

### Rate Limit Response
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "API rate limit exceeded",
    "retry_after": 3600
  }
}
```

---

## SDK and Libraries

### Official SDKs

#### JavaScript/Node.js
```bash
npm install @6fb/booking-sdk
```

```javascript
import { SixFBClient } from '@6fb/booking-sdk';

const client = new SixFBClient({
  apiKey: 'your-api-key',
  environment: 'production' // or 'sandbox'
});

// Create appointment
const appointment = await client.appointments.create({
  clientId: 456,
  barberId: 5,
  serviceId: 1,
  appointmentDatetime: '2024-01-15T09:00:00-05:00'
});
```

#### Python
```bash
pip install sixfb-booking-sdk
```

```python
from sixfb import SixFBClient

client = SixFBClient(
    api_key='your-api-key',
    environment='production'
)

# Get availability
availability = client.availability.list(
    barber_id=5,
    service_id=1,
    date_start='2024-01-15',
    date_end='2024-01-21'
)
```

### Postman Collection
Import our Postman collection for easy API testing:
```
https://api.6fbbooking.com/postman/collection.json
```

---

## Support

### Developer Support
- **Documentation**: https://docs.6fbbooking.com
- **Support Email**: developers@6fbbooking.com
- **Discord**: https://discord.gg/6fb-developers
- **Status Page**: https://status.6fbbooking.com

### Rate Limit Increases
Contact support for higher rate limits with:
- Use case description
- Expected request volume
- Integration timeline

### Sandbox Environment
- **Base URL**: https://api-sandbox.6fbbooking.com/api/v1
- **Test Cards**: Use Stripe test cards
- **Test Data**: Pre-populated with sample locations and barbers

---

*API Documentation Version 1.0*
*Last Updated: January 2025*
