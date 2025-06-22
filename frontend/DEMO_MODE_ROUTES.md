# 6FB Booking Platform - Demo Mode Active

## How to Access the Application

1. Navigate to the login page
2. Click "Sign in" with any credentials (or just click the button)
3. You'll be automatically logged in as a demo user with full admin permissions

## Available Routes

### Main Dashboard
- `/dashboard` - Main dashboard with overview metrics and calendar

### Core Features
- `/barbers` - Manage barbers and their payment accounts
- `/dashboard/appointments` - View and manage appointments
- `/analytics` - Comprehensive analytics dashboard
- `/payments` - Payment processing and history
- `/clients` - Client database and profiles
- `/barber-payments` - Barber payout management

### Calendar & Booking
- `/dashboard/calendar` - Full calendar view
- `/booking-demo` - Booking widget demo
- `/demo/booking` - Public booking interface
- `/demo/calendar-modals` - Calendar modal examples

### Settings & Configuration
- `/dashboard/calendar-settings` - Calendar configuration
- `/dashboard/trafft-connect` - Trafft integration settings

### Demo Pages
- `/test-dashboard` - Test dashboard
- `/demo/notifications` - Notification system demo

## Demo Mode Features

- **No Authentication Required**: Automatic login with demo credentials
- **Full Admin Access**: All features and permissions enabled
- **Mock Data**: Realistic sample data for testing
- **Safe Environment**: No real transactions or changes

## Key Features to Explore

1. **Dashboard**: Real-time metrics, calendar view, and quick actions
2. **Barber Management**: Add barbers, manage payment splits, connect payment accounts
3. **Appointment System**: View, create, and manage appointments
4. **Analytics**: Revenue tracking, performance metrics, and insights
5. **Payment Processing**: Handle payments, track transactions, manage payouts
6. **Calendar System**: Drag-and-drop scheduling, availability management

## Notes

- Demo mode is currently active (DEMO_MODE = true in AuthProvider.tsx)
- To disable demo mode, set DEMO_MODE = false in the AuthProvider
- API calls return mock data when authentication fails
- All features are fully functional with simulated data
