// Simple script to book an appointment through the frontend
console.log(`
🎯 Manual Appointment Booking Test

1. Open your browser and go to: http://localhost:3000/login

2. Login with:
   - Email: test-barber@6fb.com
   - Password: test123

3. After login, navigate to the Calendar page

4. Click the "New Appointment" button

5. In the appointment modal:
   - Select a client (or create one)
   - Choose a service
   - Pick a date and time
   - Add notes if desired
   - Click "Book Appointment"

6. Once booked, test the new features:

   📱 Drag-and-Drop Test:
   - Find the appointment you just created
   - Click and hold on it
   - Drag to a different time slot
   - Confirm the reschedule

   🔄 Google Calendar Sync Test:
   - Click the "Sync" button in the header
   - Check the sync status
   - Click "Sync Now" to sync appointments
   - If not connected, go to Settings > Calendar to connect

   ⚠️ Conflict Resolution Test:
   - Click the "Conflicts" button
   - View any calendar conflicts
   - Configure priority rules

   📅 Calendar Settings:
   - Click "Manage Calendar Settings"
   - Explore all 4 tabs
   - Configure your preferences

Happy testing! 🚀
`);