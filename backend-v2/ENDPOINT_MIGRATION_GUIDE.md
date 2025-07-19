# Endpoint Migration Guide: Bookings → Appointments

## Overview
BookedBarber V2 is undergoing a terminology migration from "bookings" to "appointments" to match our database model and provide consistency. This guide helps developers avoid common mistakes during the transition.

## ⚠️ Common Mistake: `/bookings/my`
**This endpoint does NOT exist and never has!**

### ❌ WRONG
```javascript
// This will return 422 Unprocessable Entity
fetch('/api/v2/bookings/my')
```

### ✅ CORRECT
```javascript
// Get current user's bookings
fetch('/api/v2/bookings/')  // Deprecated but works
fetch('/api/v2/appointments/')  // Preferred - use this!
```

## Current State (July 2025)

### Active Endpoints
Both routers are currently active for backward compatibility:

#### Bookings Router (DEPRECATED)
- `GET /api/v2/bookings/` - Get user's bookings
- `GET /api/v2/bookings/{id}` - Get specific booking
- `POST /api/v2/bookings/` - Create booking
- `PUT /api/v2/bookings/{id}` - Update booking
- `DELETE /api/v2/bookings/{id}` - Cancel booking

#### Appointments Router (PREFERRED)
- `GET /api/v2/appointments/` - Get user's appointments
- `GET /api/v2/appointments/{id}` - Get specific appointment
- `POST /api/v2/appointments/` - Create appointment
- `PUT /api/v2/appointments/{id}` - Update appointment
- `DELETE /api/v2/appointments/{id}` - Cancel appointment

### Key Differences
1. **Response field naming**: Both endpoints return the same data structure
2. **Schema aliases**: `BookingResponse` = `AppointmentResponse` (see schemas.py)
3. **No functional differences**: They do the exact same thing

## Migration Strategy

### For New Code
Always use `/appointments` endpoints:
```javascript
// Frontend API calls
const appointments = await fetchAPI('/api/v2/appointments/')

// Backend imports
from routers import appointments  // Not bookings!
```

### For Existing Code
1. Update API calls from `/bookings/` to `/appointments/`
2. Update variable names from `booking` to `appointment`
3. Update UI text from "Bookings" to "Appointments"

### Frontend Patterns
```javascript
// Old pattern (works but deprecated)
export async function getMyBookings() {
  return fetchAPI('/api/v2/bookings/')
}

// New pattern (preferred)
export async function getMyAppointments() {
  return fetchAPI('/api/v2/appointments/')
}
```

## Why This Confusion Exists

1. **Historical reasons**: Original API used "bookings" terminology
2. **Database mismatch**: Database model is named `Appointment`
3. **Incomplete migration**: Both endpoints exist during transition
4. **Mixed UI/API**: Frontend shows "My Bookings" but should use appointments API

## Testing Your Code

### Quick Test
```bash
# This should return 301 redirect (after our fix)
curl -X GET "http://localhost:8000/api/v2/bookings/my" \
  -H "Authorization: Bearer $TOKEN"

# This works correctly
curl -X GET "http://localhost:8000/api/v2/bookings/" \
  -H "Authorization: Bearer $TOKEN"

# This is preferred
curl -X GET "http://localhost:8000/api/v2/appointments/" \
  -H "Authorization: Bearer $TOKEN"
```

## Future Plans

1. **Phase 1** (Current): Both endpoints active, documentation updated
2. **Phase 2**: Update all frontend to use `/appointments`
3. **Phase 3**: Add deprecation warnings to `/bookings` endpoints
4. **Phase 4**: Remove `/bookings` router entirely

## Quick Reference

| Don't Use | Use Instead | Notes |
|-----------|-------------|-------|
| `/bookings/my` | `/bookings/` or `/appointments/` | Never existed |
| `/bookings/*` | `/appointments/*` | Deprecated |
| `BookingResponse` | `AppointmentResponse` | Schema alias |
| "My Bookings" (UI) | "My Appointments" | Consistency |

## Need Help?

If you encounter 422 errors related to bookings:
1. Check you're not using `/bookings/my`
2. Verify you're using the correct endpoint from the table above
3. Update to use `/appointments` endpoints
4. Check the order of route parameters

Remember: When in doubt, use `/appointments`!