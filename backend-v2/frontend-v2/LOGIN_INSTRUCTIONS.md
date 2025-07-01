# Login Instructions to Access Dashboard

The dashboard pages are stuck loading because you need to be authenticated first.

## Quick Fix - Manual Login

1. Open your browser and go to: http://localhost:3000/login
2. Login with these credentials:
   - Email: admin@6fb.com
   - Password: admin123
3. After successful login, you'll be redirected to the dashboard
4. The enterprise dashboard will be available at: http://localhost:3000/enterprise/dashboard

## Why This Happens

The AppLayout component checks for authentication on protected routes:
- If no auth token is found, it tries to fetch the user profile
- The API returns 403 (Forbidden) because you're not logged in
- The component stays in loading state indefinitely

## Alternative - Direct Dashboard Access for Development

If you want to bypass login during development, you can:

1. Create a development-only auto-login
2. Use a mock authentication token
3. Disable auth checks in development mode

Would you like me to implement any of these development shortcuts?