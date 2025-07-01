# 🚀 Calendar Demo Instructions

## Quick Start

Follow these simple steps to see the calendar features in action:

### Step 1: Start the Backend Server
Open a terminal and run:
```bash
cd backend-v2
uvicorn main:app --reload
```
The backend will start at http://localhost:8000

### Step 2: Start the Frontend Server
Open a second terminal and run:
```bash
cd frontend-v2
npm run dev
```
The frontend will start at http://localhost:3000

### Step 3: Run the Demo Setup
Open a third terminal and run:
```bash
cd backend-v2
python3 setup_test_demo.py
```

## What the Demo Does

The setup script will:

1. **Create a Test User** 
   - Email: `demo@6fb.com`
   - Password: `Demo123!@#`
   - Role: Barber

2. **Test the Login**
   - Verifies authentication is working
   - Gets access tokens

3. **Create Sample Data**
   - Service: Premium Haircut ($50)
   - 3 test clients
   - 4 appointments for today:
     - 2 completed (shows revenue)
     - 2 upcoming

4. **Open the Calendar**
   - Automatically opens the calendar page
   - Sets up authentication in your browser
   - Shows today's revenue counter

## Features to Try

Once the calendar opens:

1. **Revenue Counter** - See today's revenue at the top ($100 from completed appointments)

2. **View Appointments** - See all appointments in the calendar grid

3. **Create New Appointment** - Click on any time slot to create a new appointment

4. **Different Views**
   - Day view (default)
   - Week view
   - Month view

5. **Navigation** - Use the sidebar to navigate to other features

## Manual Login

If you want to log in manually:
1. Go to http://localhost:3000
2. Use credentials:
   - Email: `demo@6fb.com`
   - Password: `Demo123!@#`

## Troubleshooting

### "Servers not running" error
Make sure both backend and frontend servers are running before running the demo script.

### Login fails
1. Check the backend server is running
2. Try running the script again
3. Check for any error messages in the backend terminal

### Calendar doesn't open
1. Make sure the frontend is running at http://localhost:3000
2. Try manually navigating to http://localhost:3000/calendar after logging in

## Test Credentials Summary

- **Email**: demo@6fb.com
- **Password**: Demo123!@#
- **Role**: Barber
- **Service**: Premium Haircut ($50)

## Next Steps

After the demo, you can:
- Create more appointments
- Try different calendar views
- Explore other features like analytics and client management
- Check the booking page to see how clients would book appointments