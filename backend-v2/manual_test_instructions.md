# Manual Test Instructions for Login Flow and Skip Button

## Test Objective
Verify that:
1. Login works with admin@bookedbarber.com / admin123
2. User is redirected to dashboard after login
3. Welcome page loads at /dashboard/welcome
4. "Skip for now" button exists and works

## Step-by-Step Test

### 1. Login Test
1. Open Chrome and navigate to: http://localhost:3000/login
2. If you see a cookie banner, click "Accept All"
3. Enter credentials:
   - Email: admin@bookedbarber.com
   - Password: admin123
4. Click "Sign in" button
5. **Expected Result**: Should redirect to /dashboard

### 2. Welcome Page Test
1. After successful login, navigate to: http://localhost:3000/dashboard/welcome
2. **Expected Result**: Welcome page should load with onboarding content

### 3. Skip Button Test
1. On the welcome page, look for a "Skip for now" link or button
2. Click the "Skip for now" element
3. **Expected Result**: Should redirect to main dashboard (/dashboard)

## What to Check

### If Login Fails:
- Check browser console for errors (F12 > Console tab)
- Check Network tab for failed API calls
- Look for any error messages on the page

### If Skip Button Missing:
- Take a screenshot of the welcome page
- Check if there are any other navigation options
- Note the exact URL you're on

## Results to Report

Please report:
1. ✅/❌ Login successful?
2. ✅/❌ Redirected to dashboard?
3. ✅/❌ Welcome page loads?
4. ✅/❌ Skip button visible?
5. ✅/❌ Skip button works?

Any error messages or unexpected behavior should be noted.