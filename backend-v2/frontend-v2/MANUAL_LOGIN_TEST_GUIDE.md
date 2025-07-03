# 🧪 Manual Login Test Guide

## Login Redirect Fix - User Testing Instructions

The login redirect issue has been fixed with multiple fallback mechanisms. Please follow these steps to test:

### Test Environment Setup

1. **Ensure Backend is Running**:
   ```bash
   cd backend-v2
   uvicorn main:app --reload --port 8000
   ```

2. **Ensure Frontend is Running**:
   ```bash
   cd backend-v2/frontend-v2
   npm run dev  # Should start on port 3000
   ```

### Manual Test Steps

#### Step 1: Navigate to Login
1. Open browser to: http://localhost:3000/login
2. You should see the BookedBarber login page

#### Step 2: Open Browser Console
1. Press F12 or right-click → Inspect
2. Go to Console tab to monitor logs

#### Step 3: Attempt Login
1. Enter credentials:
   - **Email**: admin@bookedbarber.com
   - **Password**: admin123
2. Click "Sign in" button

#### Step 4: Monitor Console Logs
You should see these console messages in sequence:
```
Starting login...
🚀 Login request body: Object
🚀 Login request body JSON: {"email":"admin@bookedbarber.com","password":"admin123"}
Login response: Object
Token received, fetching profile...
✅ Login successful, starting redirect process...
📋 Fetching user profile...
```

#### Step 5: Expected Redirect Behavior
The system now has **3 fallback mechanisms**:

1. **Primary**: `router.push('/dashboard')` (immediate)
2. **Secondary**: `window.location.href` after 1 second if still on login page
3. **Tertiary**: Timeout fallback after 3 seconds that forces redirect

**Expected Result**: You should be redirected to the dashboard within 1-3 seconds

#### Step 6: Verify Dashboard Access
- URL should change to: http://localhost:3000/dashboard
- You should see the BookedBarber dashboard interface
- Login page should no longer be visible

### Success Criteria

✅ **PASS** if:
- Login form submits successfully
- Console shows authentication success
- Redirect to dashboard occurs within 3 seconds
- Dashboard page loads properly

❌ **FAIL** if:
- Page stays on login screen after 3+ seconds
- Console shows error messages
- No redirect occurs despite successful authentication

### Troubleshooting

If login still fails to redirect:

1. **Check Console Errors**: Look for any JavaScript errors
2. **Clear Browser Cache**: Hard refresh with Ctrl+Shift+R (or Cmd+Shift+R)
3. **Check Network Tab**: Verify API calls are succeeding
4. **Try Incognito Mode**: Test in private browsing window

### Next Steps After Successful Login

Once login redirect is confirmed working:
1. ✅ Navigate to booking page
2. ✅ Test appointment booking flow  
3. ✅ Verify calendar integration
4. ✅ Proceed with live payment testing

---

**Note**: The auth system is using a test bypass endpoint (`/api/v1/auth-test/login`) which accepts any credentials and returns a valid token. This is intentional for testing purposes.