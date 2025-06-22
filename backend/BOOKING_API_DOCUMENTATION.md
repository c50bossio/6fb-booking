# Booking API Documentation

This document describes the booking API endpoints for the 6FB platform.

## Base URL
```
http://localhost:8000/api/v1/booking
```

## Public Endpoints (No Authentication Required)

### 1. List Shop Barbers
Get all active barbers for a specific shop/location.

**Endpoint:** `GET /public/shops/{shop_id}/barbers`

**Response:**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "business_name": "John's Cuts",
    "average_rating": 4.8,
    "total_reviews": 25,
    "bio": "Professional barber with 10 years experience",
    "profile_image": "https://example.com/profile.jpg"
  }
]
```

### 2. Get Barber Services
Get all services offered by a specific barber.

**Endpoint:** `GET /public/barbers/{barber_id}/services`

**Query Parameters:**
- `category_id` (optional): Filter by service category
- `is_addon` (optional): Filter addon services only

**Response:**
```json
[
  {
    "id": 1,
    "name": "Classic Haircut",
    "description": "Traditional haircut with consultation",
    "category_id": 1,
    "category_name": "Haircuts",
    "base_price": 35.00,
    "min_price": null,
    "max_price": null,
    "duration_minutes": 30,
    "requires_deposit": false,
    "deposit_amount": null,
    "deposit_type": null,
    "is_addon": false,
    "tags": ["haircut", "classic"]
  }
]
```

### 3. Get Barber Availability
Get available time slots for a barber.

**Endpoint:** `GET /public/barbers/{barber_id}/availability`

**Query Parameters:**
- `service_id` (required): Service to book
- `start_date` (required): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (defaults to 7 days from start)
- `timezone` (optional): Timezone (default: America/New_York)

**Response:**
```json
{
  "barber_id": 1,
  "service_id": 1,
  "timezone": "America/New_York",
  "slots": [
    {
      "date": "2024-01-15",
      "start_time": "09:00:00",
      "end_time": "09:30:00",
      "available": true,
      "reason": null
    },
    {
      "date": "2024-01-15",
      "start_time": "09:30:00",
      "end_time": "10:00:00",
      "available": false,
      "reason": "Already booked"
    }
  ]
}
```

### 4. Create Booking
Create a new appointment booking.

**Endpoint:** `POST /public/bookings/create`

**Request Body:**
```json
{
  "barber_id": 1,
  "service_id": 1,
  "appointment_date": "2024-01-15",
  "appointment_time": "14:00:00",
  "client_first_name": "Jane",
  "client_last_name": "Smith",
  "client_email": "jane@example.com",
  "client_phone": "5551234567",
  "notes": "First time client, referred by John",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "booking_token": "abc123def456...",
  "appointment_id": 123,
  "confirmation_message": "Your appointment has been booked successfully!",
  "appointment_details": {
    "barber": "John Doe",
    "service": "Classic Haircut",
    "date": "2024-01-15",
    "time": "14:00:00",
    "duration": "30 minutes",
    "price": "$35.00",
    "location": "Downtown Barbershop"
  }
}
```

### 5. Confirm Booking
Retrieve booking details using confirmation token.

**Endpoint:** `GET /public/bookings/confirm/{booking_token}`

**Response:**
```json
{
  "status": "confirmed",
  "appointment": {
    "id": 123,
    "date": "2024-01-15",
    "time": "14:00:00",
    "service": "Classic Haircut",
    "duration": "30 minutes",
    "price": "$35.00",
    "status": "scheduled"
  },
  "barber": {
    "name": "John Doe",
    "business_name": "John's Cuts"
  },
  "client": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "5551234567"
  },
  "location": {
    "name": "Downtown Barbershop",
    "address": "123 Main St, City, ST 12345"
  }
}
```

## Authenticated Endpoints (JWT Required)

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### 1. Create Service
Create a new service (barber or admin only).

**Endpoint:** `POST /services/create`

**Request Body:**
```json
{
  "name": "Premium Haircut",
  "description": "Premium service with hot towel and styling",
  "category_id": 1,
  "base_price": 50.00,
  "min_price": 45.00,
  "max_price": 60.00,
  "duration_minutes": 45,
  "buffer_minutes": 15,
  "requires_deposit": true,
  "deposit_type": "percentage",
  "deposit_amount": 20,
  "is_addon": false,
  "can_overlap": false,
  "max_advance_days": 60,
  "min_advance_hours": 4,
  "is_featured": true,
  "tags": ["premium", "haircut", "styling"]
}
```

### 2. Update Service
Update an existing service.

**Endpoint:** `PUT /services/{service_id}/update`

**Request Body:** (same as create, all fields optional)

### 3. Delete Service
Soft delete a service (mark as inactive).

**Endpoint:** `DELETE /services/{service_id}`

### 4. Get Barber Schedule
Get full schedule including appointments and availability.

**Endpoint:** `GET /barbers/{barber_id}/schedule`

**Query Parameters:**
- `start_date` (required): Start date
- `end_date` (optional): End date (defaults to 7 days)

**Response:**
```json
{
  "barber": {
    "id": 1,
    "name": "John Doe",
    "business_name": "John's Cuts"
  },
  "date_range": {
    "start": "2024-01-15",
    "end": "2024-01-22"
  },
  "availability_patterns": [
    {
      "day_of_week": "MONDAY",
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "break_start": "12:00:00",
      "break_end": "13:00:00",
      "max_bookings": null,
      "effective_from": null,
      "effective_until": null
    }
  ],
  "appointments": [
    {
      "id": 123,
      "date": "2024-01-15",
      "time": "14:00:00",
      "duration": 30,
      "client": "Jane Smith",
      "service": "Classic Haircut",
      "revenue": 35.00,
      "status": "scheduled"
    }
  ]
}
```

### 5. Set Barber Availability
Set or update barber's availability schedule.

**Endpoint:** `POST /barbers/{barber_id}/availability`

**Request Body:**
```json
[
  {
    "day_of_week": 1,  // 0=Monday, 6=Sunday
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "break_start": "12:00:00",
    "break_end": "13:00:00",
    "is_available": true,
    "max_bookings": null,
    "effective_from": null,
    "effective_until": null
  }
]
```

### 6. Get Booking Calendar
Get calendar view of bookings with filters.

**Endpoint:** `GET /bookings/calendar`

**Query Parameters:**
- `start_date` (required): Start date
- `end_date` (required): End date (max 90 days)
- `barber_id` (optional): Filter by barber
- `location_id` (optional): Filter by location
- `service_id` (optional): Filter by service
- `status` (optional): Filter by status

**Response:**
```json
{
  "date_range": {
    "start": "2024-01-15",
    "end": "2024-01-22"
  },
  "summary": {
    "total_appointments": 25,
    "completed": 20,
    "scheduled": 5,
    "total_revenue": 875.00,
    "average_revenue": 35.00
  },
  "calendar": {
    "2024-01-15": [
      {
        "id": 123,
        "time": "14:00:00",
        "duration": 30,
        "barber": "John Doe",
        "client": "Jane Smith",
        "service": "Classic Haircut",
        "revenue": 35.00,
        "status": "scheduled",
        "customer_type": "returning"
      }
    ]
  }
}
```

### 7. Create Review
Create a review for a completed appointment.

**Endpoint:** `POST /reviews/create`

**Request Body:**
```json
{
  "appointment_id": 123,
  "overall_rating": 5,
  "service_rating": 5,
  "cleanliness_rating": 5,
  "punctuality_rating": 4,
  "value_rating": 5,
  "title": "Excellent service!",
  "comment": "John did an amazing job. Very professional and friendly.",
  "photos": ["https://example.com/photo1.jpg"]
}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

Public endpoints are rate-limited to:
- 100 requests per minute per IP for listing endpoints
- 10 requests per minute per IP for booking creation

## Notes

1. All dates should be in ISO format (YYYY-MM-DD)
2. All times should be in 24-hour format (HH:MM:SS)
3. Timezone defaults to America/New_York if not specified
4. Prices are in USD
5. Phone numbers should be digits only (no formatting)
6. Email addresses are validated and must be properly formatted