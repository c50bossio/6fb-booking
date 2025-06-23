# 6FB Booking API Reference


## Authentication

- **POST** `/api/v1/auth/change-password`
- **POST** `/api/v1/auth/logout`
- **GET** `/api/v1/auth/me`
- **POST** `/api/v1/auth/register`
- **POST** `/api/v1/auth/token`

## Locations

- **GET** `/api/v1/locations/`
- **POST** `/api/v1/locations/`
- **GET** `/api/v1/locations/{location_id}`
- **PUT** `/api/v1/locations/{location_id}`
- **GET** `/api/v1/locations/{location_id}/analytics`
- **POST** `/api/v1/locations/{location_id}/assign-mentor`
- **GET** `/api/v1/locations/{location_id}/barbers`
- **GET** `/api/v1/revenue/location/{location_id}/revenue`

## Barbers

- **GET** `/api/v1/analytics/barber-comparison`
- **GET** `/api/v1/analytics/barber/{barber_id}/detailed`
- **GET** `/api/v1/analytics/sixfb-score/{barber_id}`
- **GET** `/api/v1/appointments/availability/{barber_id}`
- **GET** `/api/v1/barbers/`
- **POST** `/api/v1/barbers/`
- **GET** `/api/v1/barbers/{barber_id}`
- **PUT** `/api/v1/barbers/{barber_id}`
- **GET** `/api/v1/barbers/{barber_id}/performance`
- **GET** `/api/v1/barbers/{barber_id}/schedule`
- **GET** `/api/v1/revenue/commission/{barber_id}`
- **GET** `/api/v1/revenue/payout-report/{barber_id}`
- **GET** `/api/v1/sync/barber-sync-status`
- **GET** `/api/v1/users/{user_id}/barber-info`

## Services

- **GET** `/api/trafft/services`
- **GET** `/api/v1/analytics/services`

## Appointments

- **GET** `/api/trafft/appointments/recent`
- **GET** `/api/v1/appointments/`
- **POST** `/api/v1/appointments/`
- **GET** `/api/v1/appointments/{appointment_id}`
- **PUT** `/api/v1/appointments/{appointment_id}`
- **DELETE** `/api/v1/appointments/{appointment_id}`
- **GET** `/api/v1/dashboard/appointments/today`
- **GET** `/api/v1/dashboard/appointments/upcoming`
- **GET** `/api/v1/dashboard/appointments/week`
- **POST** `/api/v1/sync/resync/{appointment_id}`

## Booking

- **GET** `/api/v1/analytics/bookings`
