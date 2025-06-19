# Trafft Integration Setup Guide

This guide will help you set up the Trafft webhook integration for real-time synchronization between Trafft and your 6FB Platform.

## Prerequisites

1. Active Trafft account with API access
2. 6FB Platform deployed and running
3. Admin access to both systems

## Step 1: Get Your Trafft API Credentials

1. Log into your Trafft admin panel
2. Navigate to **Settings → Integrations → API**
3. Generate or copy your API key
4. Note your Trafft subdomain (e.g., `yourbusiness` from `yourbusiness.trafft.com`)

## Step 2: Configure Environment Variables

Add these environment variables to your backend service on Render:

```bash
TRAFFT_API_URL=https://api.trafft.com
TRAFFT_API_KEY=your_trafft_api_key_here
TRAFFT_WEBHOOK_SECRET=generate_a_secure_random_string_here
```

To generate a secure webhook secret:
```bash
openssl rand -base64 32
```

## Step 3: Connect Trafft to 6FB Platform

1. Access your 6FB Platform API documentation at:
   ```
   https://sixfb-backend.onrender.com/docs
   ```

2. Use the `/api/trafft/connect` endpoint with your API key:
   ```bash
   curl -X POST https://sixfb-backend.onrender.com/api/v1/api/trafft/connect \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_6FB_TOKEN" \
     -d '{"api_key": "YOUR_TRAFFT_API_KEY"}'
   ```

## Step 4: Register Webhooks

1. Get your webhook URL:
   ```
   https://sixfb-backend.onrender.com/api/v1/webhooks/trafft
   ```

2. Register webhooks using the API:
   ```bash
   curl -X POST https://sixfb-backend.onrender.com/api/v1/api/trafft/webhooks/register \
     -H "Authorization: Bearer YOUR_6FB_TOKEN"
   ```

3. Verify webhook registration:
   ```bash
   curl https://sixfb-backend.onrender.com/api/v1/api/trafft/webhooks/status \
     -H "Authorization: Bearer YOUR_6FB_TOKEN"
   ```

## Step 5: Perform Initial Data Import

Import your existing Trafft data:

```bash
curl -X POST https://sixfb-backend.onrender.com/api/v1/api/trafft/sync/initial \
  -H "Authorization: Bearer YOUR_6FB_TOKEN"
```

This will import:
- All employees/barbers
- All customers
- Recent appointments (last 30 days by default)
- All services

## Step 6: Test the Integration

1. Create a test appointment in Trafft
2. Check the webhook status:
   ```bash
   curl https://sixfb-backend.onrender.com/api/v1/webhooks/status
   ```

3. Verify the appointment appears in your 6FB dashboard

## Webhook Events Handled

The integration automatically handles these Trafft events:

- **appointment.created** - New appointments
- **appointment.updated** - Changes to appointments
- **appointment.cancelled** - Cancellations
- **appointment.completed** - Completed appointments
- **customer.created** - New customers
- **customer.updated** - Customer updates
- **payment.completed** - Payment processing

## Troubleshooting

### Check Integration Status
```bash
curl https://sixfb-backend.onrender.com/api/v1/api/trafft/status \
  -H "Authorization: Bearer YOUR_6FB_TOKEN"
```

### Manual Sync (if webhooks are missed)
```bash
curl -X POST https://sixfb-backend.onrender.com/api/v1/api/trafft/sync/manual \
  -H "Authorization: Bearer YOUR_6FB_TOKEN"
```

### View Webhook Logs
Check your Render service logs for webhook processing details.

### Common Issues

1. **401 Unauthorized**: Check your Trafft API key
2. **Webhook signature verification failed**: Verify your webhook secret matches
3. **No data syncing**: Ensure webhooks are registered and your backend URL is accessible

## Security Notes

- Keep your API keys secure
- Use HTTPS for all webhook endpoints
- Regularly rotate your webhook secret
- Monitor webhook logs for suspicious activity

## Support

For issues with:
- Trafft API: Contact Trafft support
- 6FB Platform: Check logs on Render dashboard
- Integration: Review webhook status endpoint