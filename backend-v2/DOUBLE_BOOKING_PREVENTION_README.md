# Double-Booking Prevention System

## Overview

The BookedBarber V2 platform now includes a comprehensive double-booking prevention system that ensures appointments cannot overlap or conflict, even under high concurrent load. This system implements multiple layers of protection to guarantee data integrity and provide a smooth user experience.

## Key Features

### 1. **Database-Level Constraints**
- PostgreSQL trigger function `check_appointment_overlap()` that validates appointments before insert/update
- Considers appointment duration and buffer times
- Prevents overlapping appointments at the database level as a final safety net
- Automatic rollback on constraint violations

### 2. **Optimistic Concurrency Control**
- Version tracking on each appointment record
- Prevents lost updates when multiple users modify the same appointment
- Automatic retry logic on version conflicts
- Maintains data consistency without excessive locking

### 3. **Advisory Locking**
- Session-level advisory locks per barber during booking operations
- Prevents race conditions during concurrent booking attempts
- Configurable timeout (default: 5 seconds)
- Automatically released on transaction completion

### 4. **Comprehensive Conflict Detection**
- Checks for time overlaps including buffer times
- Validates against existing appointments with FOR UPDATE row locking
- Considers appointment status (excludes cancelled/no-show)
- Supports complex overlap scenarios

### 5. **Retry Logic with Exponential Backoff**
- Automatic retry on transient failures
- Exponential backoff with jitter to prevent thundering herd
- Configurable retry attempts and delays
- Graceful degradation on persistent failures

### 6. **Idempotency Support**
- Optional idempotency keys for booking operations
- Prevents duplicate bookings from repeated requests
- 24-hour cache retention for idempotent operations
- Request fingerprinting for validation

## Architecture

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Idempotency    │ ◄── Check for duplicate requests
│     Check       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Advisory Lock   │ ◄── Barber-level concurrency control
│  Acquisition    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Conflict      │ ◄── Row-level locking for accuracy
│   Detection     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Create/Update │ ◄── Version increment for optimistic control
│   Appointment   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database Trigger│ ◄── Final validation at DB level
│   Validation    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Success     │
└─────────────────┘
```

## Implementation Details

### Database Migration

The system adds the following to the appointments table:
- `version` column for optimistic concurrency control
- Composite indexes for performance optimization
- PostgreSQL trigger for overlap validation

```sql
-- Version tracking
ALTER TABLE appointments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Performance indexes
CREATE INDEX ix_appointments_barber_start_time ON appointments(barber_id, start_time);
CREATE INDEX ix_appointments_barber_status_time ON appointments(barber_id, status, start_time)
WHERE status NOT IN ('cancelled', 'no_show');
```

### API Integration

The system seamlessly integrates with existing booking endpoints:

```python
# Standard booking creation - now with double-booking prevention
appointment = create_booking(
    db=db,
    user_id=user_id,
    booking_date=date(2025, 1, 15),
    booking_time="14:00",
    service="Haircut",
    barber_id=1,
    buffer_time_before=15,  # 15-minute buffer before
    buffer_time_after=15    # 15-minute buffer after
)

# Updating with concurrency control
updated_appointment = update_booking(
    db=db,
    booking_id=appointment.id,
    user_id=user_id,
    update_data={
        'booking_time': '15:00',
        'notes': 'Rescheduled'
    }
)
```

### Error Handling

The system provides clear error messages for different conflict scenarios:

- **BookingConflictError**: "This time slot conflicts with an existing appointment"
- **ConcurrencyError**: "Booking has been modified by another user"
- **Timeout Error**: "Could not acquire lock within timeout period"

## Configuration

### Enabling/Disabling the System

```python
from services.booking_service_wrapper import configure_booking_service

# Enable double-booking prevention (default)
configure_booking_service(enable_double_booking_prevention=True)

# Disable for testing or maintenance
configure_booking_service(enable_double_booking_prevention=False)
```

### Tuning Parameters

```python
# Advisory lock timeout (seconds)
ADVISORY_LOCK_TIMEOUT = 5

# Retry configuration
MAX_RETRY_ATTEMPTS = 3
INITIAL_RETRY_DELAY = 0.1  # seconds
MAX_RETRY_DELAY = 1.0      # seconds
BACKOFF_FACTOR = 2.0

# Idempotency key expiration
IDEMPOTENCY_KEY_TTL = 24  # hours
```

## Testing

Run the comprehensive test suite:

```bash
python test_double_booking_prevention.py
```

The test suite covers:
1. Concurrent booking attempts
2. Overlapping appointments with buffers
3. Optimistic concurrency control scenarios
4. Retry logic behavior
5. Database constraint validation

## Performance Considerations

- **Index Usage**: All conflict queries use optimized indexes
- **Lock Duration**: Advisory locks are held only during critical sections
- **Retry Overhead**: Exponential backoff prevents excessive database load
- **Query Optimization**: Partial indexes reduce query overhead

## Monitoring

Key metrics to monitor:
- Booking conflict rate
- Average retry count per booking
- Advisory lock wait times
- Database constraint violations
- Idempotency cache hit rate

## Migration Guide

For existing systems:

1. Run the database migration:
   ```bash
   alembic upgrade head
   ```

2. Update application startup to enable the system:
   ```python
   # In main.py startup event
   from services.booking_service_wrapper import configure_booking_service
   configure_booking_service(enable_double_booking_prevention=True)
   ```

3. Test thoroughly in staging environment

4. Deploy with monitoring enabled

## Troubleshooting

### Common Issues

1. **"Could not acquire lock" errors**
   - Increase `ADVISORY_LOCK_TIMEOUT`
   - Check for long-running transactions

2. **Frequent retry failures**
   - Review booking patterns for hotspots
   - Consider increasing buffer times

3. **Performance degradation**
   - Verify indexes are being used
   - Check for missing statistics updates

### Debug Mode

Enable detailed logging:
```python
import logging
logging.getLogger('services.booking_service_enhanced').setLevel(logging.DEBUG)
```

## Future Enhancements

- Distributed locking for multi-node deployments
- Machine learning for conflict prediction
- Automatic buffer time optimization
- Real-time availability websocket updates