# Trafft API Setup Guide

## Getting Your Trafft API Key

1. **Login to Trafft Admin Panel**
   - Go to: https://headlinesbarbershops.trafft.com/admin
   - Login with your Trafft admin credentials

2. **Navigate to API Settings**
   - Go to: **Settings** → **Integrations** → **API Keys**
   - Or direct link: https://headlinesbarbershops.trafft.com/admin/settings/integrations/api

3. **Create or Get API Key**
   - If you see an existing API key, copy it
   - If not, click "Generate New API Key"
   - Make sure the key has these permissions:
     - Read appointments
     - Read customers
     - Read employees
     - Read services
     - Read locations

4. **Update Your Environment Variables**
   - Copy the new API key
   - Update in Render backend service:
     - Go to Environment tab
     - Update `TRAFFT_API_KEY` with the new key

## Testing the Connection

Once you have the correct API key:

1. Update the test script with your new key
2. Run: `python3 test_trafft_connection.py`
3. You should see successful connections

## API Documentation

The Trafft API typically uses:
- Base URL: `https://app.trafft.com/api/v1`
- Authentication: Bearer token in Authorization header
- Format: `Authorization: Bearer YOUR_API_KEY`

## Common Issues

1. **401 Unauthorized**
   - API key is invalid or expired
   - Wrong authentication format

2. **403 Forbidden**
   - API key lacks required permissions
   - Account subscription doesn't include API access

3. **404 Not Found**
   - Wrong API endpoint URL
   - Feature not available in your plan

## Next Steps

After getting the correct API key:
1. Update backend environment variables on Render
2. Test the connection locally
3. Deploy and sync your Trafft data