# Calendar Access Methods with Test Data

## Summary

There are multiple ways to access the calendar page with test data to identify console errors and debug issues. Here are the available methods:

## Method 1: Test User Login (RECOMMENDED)

### Test Account Credentials
- **Email**: `test_claude@example.com`
- **Password**: `testpassword123`
- **Role**: client (converted from barber)
- **User ID**: 2

### Steps:
1. Navigate to: `http://localhost:3000/login`
2. Enter the credentials above
3. Login should redirect to dashboard or calendar
4. Navigate to: `http://localhost:3000/calendar`

### Test Data Available:
- 4 test appointments already created
- Test clients and services
- Proper authentication tokens

## Method 2: Direct HTML Access Page

### File Location:
`/Users/bossio/6fb-booking/backend-v2/test_calendar_access.html`

### Usage:
1. Open the HTML file in your browser
2. Click "Go to Login Page" or "Direct Calendar Access"
3. Authentication tokens are automatically set via JavaScript
4. Follow the on-screen instructions

## Method 3: Manual Token Setup

### Steps:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run the following JavaScript:

```javascript
// Set authentication token
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X2NsYXVkZUBleGFtcGxlLmNvbSIsInJvbGUiOiJjbGllbnQiLCJleHAiOjE3NTI1OTY2NjgsInR5cGUiOiJhY2Nlc3MifQ.fg9xiEwEPp1NsPUJdAVUec8NJ6NPRCnd4Benm-NjCH4');

// Set user info
localStorage.setItem('user', JSON.stringify({
    email: 'test_claude@example.com',
    name: 'Claude Test',
    role: 'client'
}));

// Reload page
window.location.reload();
```

4. Navigate to: `http://localhost:3000/calendar`

## Method 4: API Access for Testing

### Get Fresh Token:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_claude@example.com",
    "password": "testpassword123"
  }'
```

### Test API Endpoints:
```bash
# Get user profile
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get appointments
curl -X GET "http://localhost:8000/api/v1/appointments" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Method 5: Demo Scripts (Database Issues)

### Available Scripts:
- `setup_test_demo.py` - Comprehensive demo setup (has database lock issues)
- `simple_calendar_demo.py` - Simple demo (schema issues)
- `create-simple-test-user.py` - Creates test user (already run)

### Usage:
```bash
# If database allows, run:
python setup_test_demo.py

# Or for simple setup:
python create-simple-test-user.py
```

## Method 6: Other Available Test Users

### Alternative Test Users in Database:
1. **admin@bookedbarber.com** (ID: 3, role: admin)
2. **debug@example.com** (ID: 5, role: barber)
3. **barber@example.com** (ID: 30, role: barber)
4. **admin@sixfb.com** (ID: 31, role: admin)
5. **barber@sixfb.com** (ID: 32, role: barber)

**Note**: Passwords for these users are unknown and would need to be reset.

## Debugging Console Errors

### What to Look For:
1. **JavaScript Errors**: Component rendering issues, undefined variables
2. **Network Errors**: Failed API calls to backend
3. **Authentication Issues**: Token expiration, invalid credentials
4. **React Component Issues**: Hooks, state management problems
5. **Calendar-Specific Issues**: Date handling, timezone issues

### Common Error Types:
- `TypeError: Cannot read property 'map' of undefined`
- `Network Error: Failed to fetch`
- `401 Unauthorized`
- `ReferenceError: variable is not defined`
- `Warning: Each child in a list should have a unique "key" prop`

### Browser Developer Tools:
1. **Console Tab**: JavaScript errors and warnings
2. **Network Tab**: API call failures, slow requests
3. **Application Tab**: LocalStorage, SessionStorage inspection
4. **Elements Tab**: Component structure and styles

## Environment Requirements

### Backend Server:
- URL: `http://localhost:8000`
- Status: Must be running
- Health Check: `http://localhost:8000/health`

### Frontend Server:
- URL: `http://localhost:3000`
- Status: Must be running
- Framework: Next.js

### Database:
- Type: SQLite (development)
- Location: `./6fb_booking.db`
- Test Data: Available via test_claude@example.com

## Troubleshooting

### Common Issues:
1. **Database Locked**: Backend may be holding connections
2. **Token Expired**: Get fresh token via API
3. **Role Mismatch**: test_claude has 'client' role but may need 'barber' for some features
4. **Network Issues**: Check if both servers are running

### Solutions:
1. **Restart Backend**: `uvicorn main:app --reload`
2. **Restart Frontend**: `npm run dev`
3. **Clear Storage**: Clear localStorage and sessionStorage
4. **Check Logs**: Backend terminal and browser console

## Authentication Flow

### Normal Flow:
1. User enters credentials
2. POST to `/api/v1/auth/login`
3. Receive access_token and refresh_token
4. Store tokens in localStorage
5. Include token in API requests as `Authorization: Bearer TOKEN`

### Current Token Details:
- **Type**: JWT (JSON Web Token)
- **Expiry**: Check `exp` field in token payload
- **Role**: client
- **Subject**: test_claude@example.com

## Next Steps

1. **Primary Method**: Use Method 1 (Test User Login) as it's the most reliable
2. **Backup Method**: Use Method 3 (Manual Token Setup) if login fails
3. **Debug**: Open browser DevTools and check Console tab for errors
4. **Access Calendar**: Navigate to `http://localhost:3000/calendar`
5. **Report Findings**: Document any console errors or issues found

## Success Criteria

The calendar should:
- Load without JavaScript errors
- Display test appointments
- Show today's revenue counter
- Allow creation of new appointments
- Support different view modes (day, week, month)
- Handle user interactions without errors

---

*Last Updated: $(date)*
*Test User: test_claude@example.com*
*Access Token: Valid until token expiry*