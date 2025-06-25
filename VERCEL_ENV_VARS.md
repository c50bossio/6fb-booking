# Vercel Environment Variables Configuration

These environment variables need to be set in your Vercel dashboard for the login to work:

## Required Environment Variables

1. **NEXT_PUBLIC_API_URL**
   - Value: `https://sixfb-backend.onrender.com/api/v1`
   - Description: Backend API endpoint

2. **NEXT_PUBLIC_USE_CORS_PROXY**
   - Value: `false`
   - Description: Disable proxy usage since CORS is properly configured

3. **NEXT_PUBLIC_ENVIRONMENT**
   - Value: `production`
   - Description: Environment setting

## How to Set These in Vercel

1. Go to your Vercel dashboard
2. Select your project (bookbarber-6fb)
3. Go to Settings → Environment Variables
4. Add each variable above

## Why This Fixes the Login Issue

- The backend CORS is working perfectly (confirmed with curl testing)
- The issue was the frontend was trying to use a proxy that doesn't exist on Vercel
- By setting `NEXT_PUBLIC_USE_CORS_PROXY=false`, the frontend will make direct calls to the backend
- The backend already has the correct CORS headers configured

## Test Credentials

- Email: admin@6fb.com
- Password: admin123
