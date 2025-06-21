# Payment Provider Credentials Setup Guide

## Update your .env file with these credentials:

### Stripe Connect (Test Mode)
```env
# Your existing Stripe keys are already in .env
STRIPE_SECRET_KEY=sk_test_... (you already have this)
STRIPE_PUBLISHABLE_KEY=pk_test_... (you already have this)

# Add these new Connect-specific settings:
STRIPE_CONNECT_CLIENT_ID=ca_[GET_FROM_STRIPE_CONNECT_SETTINGS]
STRIPE_CONNECT_REDIRECT_URI=http://localhost:8000/api/v1/payment-splits/oauth-callback
```

### Square OAuth (Sandbox)
```env
# Square OAuth Configuration
SQUARE_APPLICATION_ID=[GET_FROM_SQUARE_DEVELOPER_DASHBOARD]
SQUARE_ACCESS_TOKEN=[GET_FROM_SQUARE_SANDBOX_TAB]
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=[GET_FROM_SQUARE_SANDBOX_TAB]
SQUARE_OAUTH_CLIENT_ID=[SAME_AS_APPLICATION_ID]
SQUARE_OAUTH_CLIENT_SECRET=[GET_FROM_SQUARE_OAUTH_TAB]
SQUARE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/payment-splits/oauth-callback
```

## Quick Setup Steps:

### For Stripe:
1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to: Settings → Connect settings
3. Copy your Connect client ID (starts with `ca_`)
4. Add OAuth redirect URL in Stripe Connect settings

### For Square:
1. Log into Square Developer: https://developer.squareup.com
2. Create new application or use existing
3. Go to OAuth tab → copy Application ID and Secret
4. Go to Sandbox tab → copy Access Token and Location ID
5. Add OAuth redirect URL in Square OAuth settings

## Testing the Integration:

### 1. Test Stripe Connect Flow:
```bash
# Get OAuth URL for a barber
curl -X POST http://localhost:8000/api/v1/payment-splits/connect-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "barber_id": 1,
    "platform": "stripe"
  }'
```

### 2. Test Square OAuth Flow:
```bash
# Get OAuth URL for a barber
curl -X POST http://localhost:8000/api/v1/payment-splits/connect-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "barber_id": 1,
    "platform": "square"
  }'
```

## Important Notes:

1. **Test Mode First**: Always start with test/sandbox credentials
2. **Redirect URIs**: Must match exactly in both your code and provider settings
3. **HTTPS Required**: In production, you'll need HTTPS for OAuth redirects
4. **Scopes**: Square requires specific OAuth scopes for payment processing
5. **Webhooks**: Set up webhooks to track payment status updates

## For Production:

1. **Stripe**: Switch to live mode keys (start with `sk_live_` and `pk_live_`)
2. **Square**: Submit app for review, then use production credentials
3. **Update redirect URIs** to your production domain
4. **Enable HTTPS** on your production server
5. **Encrypt sensitive data** like access tokens in database

## Troubleshooting:

- **Invalid redirect URI**: Make sure URLs match exactly (including trailing slashes)
- **Invalid client ID**: Check you're using Connect client ID, not regular API key
- **OAuth errors**: Verify all scopes/permissions are set correctly
- **Test with Postman**: Use Postman to test OAuth flows before integrating
