# Timezone Management API Documentation

This document describes the timezone management endpoints added to the 6FB Booking API.

## Overview

The timezone management system allows users to:
- View and update their timezone preferences
- List available timezones with current UTC offsets
- Get commonly used timezones for quick selection
- All appointment times are stored in UTC and converted to user's timezone for display

## Endpoints

### User Timezone Management

#### Get User Profile with Timezone
```
GET /api/v2/users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "timezone": "America/New_York",
  "created_at": "2025-01-01T00:00:00"
}
```

#### Get User Timezone
```
GET /api/v2/users/timezone
Authorization: Bearer {token}
```

**Response:**
```json
{
  "timezone": "America/New_York",
  "current_time": "2025-06-28T09:30:00-04:00"
}
```

#### Update User Timezone
```
PUT /api/v2/users/timezone
Authorization: Bearer {token}
Content-Type: application/json

{
  "timezone": "America/Los_Angeles"
}
```

**Response:**
```json
{
  "message": "Timezone updated successfully",
  "timezone": "America/Los_Angeles",
  "current_time": "2025-06-28T06:30:00-07:00",
  "offset": "-0700"
}
```

### Timezone Information

#### List All Timezones
```
GET /api/v2/timezones?search=America&limit=10&offset=0
Authorization: Bearer {token}
```

**Query Parameters:**
- `search` (optional): Search timezones by name
- `limit` (optional, default: 100, max: 500): Number of results
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "timezones": [
    {
      "name": "America/New_York",
      "offset": "-04:00",
      "display_name": "America - New York (-04:00)"
    },
    {
      "name": "America/Chicago",
      "offset": "-05:00",
      "display_name": "America - Chicago (-05:00)"
    }
  ],
  "total": 140
}
```

#### Get Common Timezones
```
GET /api/v2/timezones/common
Authorization: Bearer {token}
```

**Response:**
```json
{
  "timezones": [
    {
      "name": "US/Eastern",
      "offset": "-04:00",
      "display_name": "US - Eastern (-04:00)"
    },
    {
      "name": "US/Central",
      "offset": "-05:00",
      "display_name": "US - Central (-05:00)"
    },
    {
      "name": "US/Mountain",
      "offset": "-06:00",
      "display_name": "US - Mountain (-06:00)"
    },
    {
      "name": "US/Pacific",
      "offset": "-07:00",
      "display_name": "US - Pacific (-07:00)"
    }
  ],
  "total": 25
}
```

#### Get Specific Timezone Details
```
GET /api/v2/timezones/{timezone_name}
Authorization: Bearer {token}
```

**Example:**
```
GET /api/v2/timezones/America/New_York
```

**Response:**
```json
{
  "name": "America/New_York",
  "offset": "-04:00",
  "display_name": "America - New York (-04:00)"
}
```

## Error Handling

### Invalid Timezone
```json
{
  "detail": [
    {
      "loc": ["body", "timezone"],
      "msg": "Invalid timezone: Mars/Olympus_Mons. Must be a valid timezone identifier.",
      "type": "value_error"
    }
  ]
}
```

### Timezone Not Found
```json
{
  "detail": "Timezone 'Invalid/Timezone' not found"
}
```

## Implementation Notes

1. **Database Schema**: Added `timezone` column to users table with default value 'UTC'
2. **Validation**: All timezone inputs are validated against pytz.all_timezones
3. **Authentication**: All endpoints require valid JWT authentication
4. **UTC Storage**: All datetime values in the database remain in UTC
5. **Client Conversion**: Frontend should convert UTC times to user's timezone for display

## Migration

Run the database migration to add the timezone field:
```bash
alembic upgrade head
```

## Testing

Use the provided test script to verify all endpoints:
```bash
python test_timezone_endpoints.py
```

Make sure to update the TEST_EMAIL and TEST_PASSWORD in the script with valid credentials.