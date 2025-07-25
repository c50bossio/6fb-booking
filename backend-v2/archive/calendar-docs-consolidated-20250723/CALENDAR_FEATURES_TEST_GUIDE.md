# Calendar Features Testing Guide

This guide will help you test all the newly enabled calendar features in the 6FB Booking V2 system.

## Prerequisites

✅ Both servers are running:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

✅ Test barber account created:
- Email: test-barber@6fb.com
- Password: test123

## Testing Steps

### 1. Login as Test Barber

1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: test-barber@6fb.com
   - Password: test123
3. Click "Sign In"

### 2. Navigate to Calendar

1. Click "Calendar" in the sidebar or navigate to http://localhost:3000/calendar
2. You should see the calendar with enhanced features

### 3. Test New Calendar Features

#### A. Google Calendar Sync Panel
1. Look for the **"Sync"** button in the calendar header
2. Click it to toggle the Calendar Sync panel
3. You should see:
   - Sync status overview (Total, Synced, Not Synced appointments)
   - Date range selector for bulk sync
   - "Sync Now" button
   - Maintenance actions (Clean Up Orphaned Events)

#### B. Conflict Resolution Panel
1. Click the **"Conflicts"** button in the calendar header
2. The Conflict Resolver panel should appear showing:
   - Any calendar conflicts (if present)
   - Priority rules configuration
   - Options to resolve conflicts

#### C. Quick Access Buttons
Verify these buttons are visible in the calendar header:
- ✅ **New Appointment** - Creates new appointments
- ✅ **Sync** - Toggle sync panel
- ✅ **Conflicts** - Toggle conflict resolver
- ✅ **Availability** - Links to barber availability management
- ✅ **Recurring** - Links to recurring appointments

### 4. Test Calendar Settings Page

1. Navigate to http://localhost:3000/settings/calendar
2. Or click "Manage Calendar Settings" in the calendar page
3. Test each tab:

#### Connection Tab
- Check Google Calendar connection status
- If not connected, click "Connect Google Calendar"
- Follow OAuth2 flow to authorize

#### Sync Status Tab
- Same sync panel as in the main calendar
- Test bulk sync functionality

#### Conflicts Tab
- Same conflict resolver as in the main calendar
- Configure priority rules

#### Preferences Tab
- Configure sync preferences:
  - Auto-sync new appointments
  - Sync cancellations
  - Include client details
  - Block busy times
  - Add reminders
  - Color-code by service type

### 5. Test Drag-and-Drop Rescheduling

1. Create or find an existing appointment in the calendar
2. In Week or Day view:
   - Click and hold on an appointment
   - Drag it to a new time slot
   - Release to drop
3. Confirm the reschedule when prompted
4. Verify the appointment moved to the new time

### 6. Test Google Calendar Integration

#### Connect Google Calendar
1. Go to Settings → Calendar → Connection tab
2. Click "Connect Google Calendar"
3. Authorize the application in Google
4. Select which calendar to sync with

#### Test Sync
1. Create a new appointment in 6FB
2. Go to Calendar → Click "Sync" button
3. Click "Sync Now" with appropriate date range
4. Check your Google Calendar - the appointment should appear

### 7. Test Recurring Appointments

1. Click the "Recurring" button in the calendar header
2. This takes you to the recurring appointments page
3. Create a recurring pattern and verify it shows in the calendar

## Verification Checklist

- [ ] Calendar page loads with all new buttons
- [ ] Sync panel toggles on/off
- [ ] Conflict resolver toggles on/off
- [ ] Calendar settings page accessible
- [ ] All 4 tabs in settings work
- [ ] Google Calendar OAuth flow completes
- [ ] Appointments can be dragged to reschedule
- [ ] Sync to Google Calendar works
- [ ] Recurring appointments accessible

## Troubleshooting

### If buttons don't appear:
1. Make sure you're logged in as a barber (not a regular user)
2. Refresh the page (Ctrl/Cmd + R)
3. Clear browser cache and reload

### If Google Calendar won't connect:
1. Check browser console for errors
2. Ensure Google OAuth credentials are configured in backend
3. Check redirect URI matches your setup

### If drag-and-drop doesn't work:
1. Make sure you're in Week or Day view
2. Click and hold firmly on the appointment
3. Check browser console for JavaScript errors

## Screenshots

Take screenshots of:
1. Calendar with sync panel open
2. Calendar settings page
3. Successful Google Calendar connection
4. Drag-and-drop in action

## Notes

- The conflict resolver will only show conflicts if you have overlapping appointments
- Sync status will show 0% until you connect Google Calendar and sync
- Recurring appointments have their own dedicated interface

## Success Indicators

✅ All navigation buttons visible and functional
✅ Google Calendar successfully connected
✅ Appointments sync bidirectionally
✅ Drag-and-drop rescheduling works
✅ Settings page shows all configuration options

Happy testing! 🎉