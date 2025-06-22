# 6FB Booking System Database Schema

This document describes the database schema for the native booking functionality added to the 6FB Payouts platform.

## Overview

The booking system introduces 7 new tables that integrate with the existing database structure:

1. **service_categories** - Categories for organizing services
2. **services** - Individual services offered by barbers
3. **barber_availability** - Weekly schedule patterns
4. **booking_rules** - Shop-specific booking policies
5. **reviews** - Customer reviews for appointments
6. **booking_slots** - Pre-calculated available time slots
7. **wait_lists** - Wait list for fully booked services

## Table Schemas

### 1. service_categories

Organizes services into logical groups (e.g., Haircut, Beard & Shave, Color).

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| name | String(100) | Category name (unique) |
| slug | String(100) | URL-friendly identifier (unique) |
| description | Text | Category description |
| display_order | Integer | Order for UI display |
| icon | String(100) | Icon identifier |
| color | String(7) | Hex color for UI |
| is_active | Boolean | Whether category is active |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Last update timestamp |

### 2. services

Individual services that can be booked.

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| name | String(200) | Service name |
| description | Text | Service description |
| category_id | Integer | FK to service_categories |
| base_price | Float | Base service price |
| min_price | Float | Minimum price (variable pricing) |
| max_price | Float | Maximum price (variable pricing) |
| duration_minutes | Integer | Service duration |
| buffer_minutes | Integer | Time between appointments |
| requires_deposit | Boolean | Whether deposit required |
| deposit_type | String(20) | 'percentage' or 'fixed' |
| deposit_amount | Float | Deposit amount |
| is_addon | Boolean | Can be added to other services |
| can_overlap | Boolean | Can overlap with other bookings |
| max_advance_days | Integer | Max booking advance time |
| min_advance_hours | Integer | Min booking advance time |
| location_id | Integer | FK to locations (optional) |
| barber_id | Integer | FK to barbers (optional) |
| display_order | Integer | Display order |
| is_active | Boolean | Whether service is active |
| is_featured | Boolean | Featured service flag |
| tags | JSON | Array of search tags |
| meta_description | Text | SEO description |

**Constraints:**
- base_price >= 0
- duration_minutes > 0
- deposit_amount >= 0

### 3. barber_availability

Weekly recurring schedule patterns for barbers.

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| barber_id | Integer | FK to barbers |
| location_id | Integer | FK to locations |
| day_of_week | Enum | MONDAY through SUNDAY |
| start_time | Time | Daily start time |
| end_time | Time | Daily end time |
| break_start | Time | Break start (optional) |
| break_end | Time | Break end (optional) |
| is_available | Boolean | Whether available |
| max_bookings | Integer | Max appointments per slot |
| effective_from | Date | Schedule start date |
| effective_until | Date | Schedule end date |

**Constraints:**
- Unique: (barber_id, location_id, day_of_week, start_time)
- end_time > start_time
- break_end > break_start OR break_start IS NULL

### 4. booking_rules

Flexible rules system for booking policies.

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| location_id | Integer | FK to locations (optional) |
| barber_id | Integer | FK to barbers (optional) |
| service_id | Integer | FK to services (optional) |
| rule_type | String(50) | Type of rule |
| rule_name | String(100) | Human-readable name |
| description | Text | Rule description |
| parameters | JSON | Rule configuration |
| priority | Integer | Rule priority |
| is_active | Boolean | Whether rule is active |
| effective_from | DateTime | Rule start time |
| effective_until | DateTime | Rule end time |

**Rule Types:**
- `cancellation` - Cancellation policies
- `reschedule` - Rescheduling policies
- `booking_window` - How far in advance bookings allowed
- `no_show` - No-show penalties
- `deposit` - Deposit requirements
- `blackout` - Blackout dates

**Example Parameters:**
```json
// Cancellation rule
{
  "hours_before": 24,
  "fee_type": "percentage",
  "fee_amount": 50,
  "applies_to": "all_services"
}

// Booking window rule
{
  "min_hours": 2,
  "max_days": 60,
  "applies_to": "all_services"
}
```

### 5. reviews

Customer reviews linked to completed appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| appointment_id | Integer | FK to appointments (unique) |
| barber_id | Integer | FK to barbers |
| client_id | Integer | FK to clients |
| location_id | Integer | FK to locations |
| overall_rating | Enum | 1-5 star rating |
| service_rating | Enum | Service quality rating |
| cleanliness_rating | Enum | Cleanliness rating |
| punctuality_rating | Enum | Punctuality rating |
| value_rating | Enum | Value for money rating |
| title | String(200) | Review title |
| comment | Text | Review text |
| barber_response | Text | Barber's response |
| barber_response_date | DateTime | Response timestamp |
| is_verified | Boolean | Verified purchase |
| verification_date | DateTime | Verification timestamp |
| is_featured | Boolean | Featured review |
| is_hidden | Boolean | Hidden by admin |
| hide_reason | String(200) | Reason for hiding |
| photos | JSON | Array of photo URLs |

### 6. booking_slots

Pre-calculated available time slots for performance optimization.

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| barber_id | Integer | FK to barbers |
| location_id | Integer | FK to locations |
| service_id | Integer | FK to services |
| slot_date | Date | Date of slot |
| start_time | Time | Slot start time |
| end_time | Time | Slot end time |
| is_available | Boolean | Slot availability |
| is_blocked | Boolean | Admin blocked |
| block_reason | String(200) | Reason for blocking |

**Constraints:**
- Unique: (barber_id, location_id, slot_date, start_time)

### 7. wait_lists

Wait list management for fully booked services.

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| client_id | Integer | FK to clients |
| barber_id | Integer | FK to barbers (optional) |
| service_id | Integer | FK to services |
| location_id | Integer | FK to locations |
| preferred_date | Date | Preferred appointment date |
| preferred_time_start | Time | Preferred start time |
| preferred_time_end | Time | Preferred end time |
| flexibility_days | Integer | Date flexibility |
| status | String(20) | Wait list status |
| notification_sent_at | DateTime | Notification timestamp |
| expires_at | DateTime | Wait list expiration |

**Status Values:**
- `waiting` - On wait list
- `notified` - Notified of opening
- `booked` - Successfully booked
- `expired` - Wait list expired

## Relationships

### Service Relationships
- ServiceCategory (1) → Services (many)
- Service → ServiceCategory (belongs to)
- Service → Location (optional)
- Service → Barber (optional)

### Availability Relationships
- Barber (1) → BarberAvailability (many)
- Location (1) → BarberAvailability (many)
- BarberAvailability → Barber (belongs to)
- BarberAvailability → Location (belongs to)

### Review Relationships
- Appointment (1) → Review (1)
- Barber (1) → Reviews (many)
- Client (1) → Reviews (many)
- Location (1) → Reviews (many)

### Booking Rules Relationships
- Location (1) → BookingRules (many)
- Barber (1) → BookingRules (many)
- Service (1) → BookingRules (many)

## Migration Instructions

1. Apply the migration:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   alembic upgrade head
   ```

2. Seed initial data:
   ```bash
   python scripts/seed_booking_data.py
   ```

3. Verify the setup:
   ```bash
   python scripts/verify_booking_system.py
   ```

## Usage Examples

### Creating a Service
```python
from models.booking import Service, ServiceCategory

# Get category
haircut_category = db.query(ServiceCategory).filter_by(slug="haircut").first()

# Create service
service = Service(
    name="Executive Haircut",
    description="Premium haircut with consultation",
    category_id=haircut_category.id,
    base_price=75.0,
    duration_minutes=60,
    buffer_minutes=10,
    requires_deposit=True,
    deposit_type="fixed",
    deposit_amount=25.0
)
db.add(service)
db.commit()
```

### Setting Barber Availability
```python
from models.booking import BarberAvailability, DayOfWeek
from datetime import time

# Set Monday schedule
availability = BarberAvailability(
    barber_id=barber.id,
    location_id=location.id,
    day_of_week=DayOfWeek.MONDAY,
    start_time=time(9, 0),
    end_time=time(17, 0),
    break_start=time(12, 0),
    break_end=time(13, 0),
    is_available=True
)
db.add(availability)
db.commit()
```

### Creating a Booking Rule
```python
from models.booking import BookingRule

rule = BookingRule(
    rule_type="cancellation",
    rule_name="48 Hour Cancellation for Colors",
    description="Color services must be cancelled 48 hours in advance",
    parameters={
        "hours_before": 48,
        "fee_type": "percentage",
        "fee_amount": 100,
        "service_categories": ["hair-color"]
    },
    priority=10,
    is_active=True
)
db.add(rule)
db.commit()
```

## Performance Considerations

1. **Indexes**: All foreign keys and commonly queried fields are indexed
2. **Booking Slots**: Pre-calculate available slots during off-peak hours
3. **Reviews**: Consider pagination for barbers with many reviews
4. **Availability**: Cache weekly schedules in Redis for fast access

## Security Considerations

1. **Deposit Handling**: Always validate deposit calculations server-side
2. **Review Moderation**: Implement content filtering for reviews
3. **Booking Rules**: Validate rule parameters before applying
4. **Wait Lists**: Implement expiration to prevent stale entries