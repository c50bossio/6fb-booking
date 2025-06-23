
# Production Booking API Summary
Generated: 2025-06-23T16:52:05.683818
Base URL: https://sixfb-backend.onrender.com

## Public Endpoints Tested

### 1. Service Categories
- GET /api/v1/services/categories
- No authentication required
- Returns list of service categories

### 2. Services
- GET /api/v1/services
- No authentication required
- Query params: category_id, is_active, is_addon
- Returns list of all services

### 3. Booking Endpoints
- GET /api/v1/booking-public/shops/{shop_id}/barbers
- GET /api/v1/booking-public/barbers/{barber_id}/services
- GET /api/v1/booking-public/barbers/{barber_id}/availability
- POST /api/v1/booking-public/bookings/create
- GET /api/v1/booking-public/bookings/confirm/{token}

## Booking Flow

1. Get available barbers for a shop
2. Get services offered by a barber
3. Check availability for barber/service combo
4. Create booking with client details
5. Confirm booking using token

## Example Booking Payload
```json
{
    "barber_id": 1,
    "service_id": 1,
    "appointment_date": "2025-01-01",
    "appointment_time": "10:00:00",
    "client_first_name": "John",
    "client_last_name": "Doe",
    "client_email": "john@example.com",
    "client_phone": "555-1234",
    "notes": "First visit",
    "timezone": "America/New_York"
}
```

## Notes
- All booking endpoints are public (no auth required)
- Availability returns time slots with availability status
- Booking confirmation provides full appointment details
- Email confirmation is sent automatically
