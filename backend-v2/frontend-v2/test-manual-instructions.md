# Manual Test Instructions for Drag and Drop

## Setup
1. Ensure the frontend is running on http://localhost:3000
2. Ensure the backend is running on http://localhost:8000

## Test Steps

1. **Login**
   - Navigate to http://localhost:3000/login
   - Use credentials: john.doe@example.com / Secure123!

2. **Navigate to Calendar**
   - Go to http://localhost:3000/calendar
   - Wait for appointments to load

3. **Test Drag and Drop**
   - Open browser developer console (F12)
   - Look for appointments with status "pending" or "confirmed" (not "completed" or "cancelled")
   - Try to drag an appointment by clicking and holding on it
   - Watch console for "[DRAG DEBUG]" messages
   - Drop the appointment on an empty time slot

4. **Expected Behavior**
   - Appointment should become semi-transparent when dragging
   - Drop zones should highlight when hovering
   - After drop, reschedule modal should appear
   - Console should show debug messages

5. **Check Console Output**
   - Look for "[DRAG DEBUG] DragStart triggered"
   - Look for "[DRAG DEBUG] Drop triggered"
   - Look for "[DRAG DEBUG] checkAndUpdateAppointment called"
   - Check for any error messages

## Debugging Tips
- If drag doesn't start, check if appointment has `draggable="true"` attribute
- If drop doesn't work, check if preventDefault is being called
- Check Network tab for API calls to `/api/v1/appointments/{id}/reschedule`