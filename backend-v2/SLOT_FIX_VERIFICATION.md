# Booking Slot Fix Verification

This directory contains verification tools to test the booking slot logic and message consistency fixes.

## Files

- `verify_slot_fix.py` - Main verification script
- `test_slot_fix.sh` - Quick test runner
- `SLOT_FIX_VERIFICATION.md` - This documentation

## Quick Usage

### Run Quick Current Time Test
```bash
./test_slot_fix.sh
```

### Run Full Test Suite
```bash
python verify_slot_fix.py
```

### Run Only Current Time Test
```bash
python verify_slot_fix.py --quick
```

## What the Test Validates

1. **Slot Filtering Logic**: Verifies that slots are correctly filtered based on the 2-hour lead time
2. **Next Available Calculation**: Ensures the API correctly identifies the next available slot
3. **Frontend Message Logic**: Validates what message should be displayed to users
4. **API Response Consistency**: Checks that the API response matches expected behavior

## Test Scenarios

The full test suite runs scenarios for different times of day:
- Early Morning (7 AM) - Should show most slots available
- Mid Morning (10 AM) - Should filter some early slots
- Afternoon (2 PM) - Should filter morning slots
- Late Afternoon (4 PM) - Should filter most slots for today
- Evening (7 PM) - Should show tomorrow's slots
- Current Time - Real-world scenario

## Expected Behavior

### When slots are available today:
- Shows count of available slots
- Indicates if some slots were filtered due to lead time

### When no slots available today:
- Shows "No available slots for today"
- If tomorrow has slots: "Next available slot is tomorrow at [time]"

### API Response Fields:
- `slots`: Array of available time slots
- `next_available_date`: Date of next available slot
- `next_available_time`: Time of next available slot  
- `message`: User-friendly message about availability

## Debugging

If tests fail:
1. Check that the backend server is running
2. Verify database has test data (script creates it automatically)
3. Check console output for specific error messages
4. Run with current time to see real-world behavior

## Manual API Testing

```bash
# Test today's slots
curl 'http://localhost:8000/api/v2/bookings/slots?booking_date=2025-06-28'

# Test tomorrow's slots
curl 'http://localhost:8000/api/v2/bookings/slots?booking_date=2025-06-29'
```