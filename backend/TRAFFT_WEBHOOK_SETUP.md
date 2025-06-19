# Trafft Webhook Setup Guide

## 1. Configure Webhooks in Trafft Dashboard

1. Log into your Trafft dashboard at https://headlinesbarbershops.admin.wlbookings.com
2. Navigate to **Settings > Integrations > Webhooks**
3. Click **Add Webhook** or **New Webhook**
4. Configure the webhook:

   - **Webhook URL**: `https://sixfb-backend.onrender.com/api/v1/webhooks/trafft`
   - **Events to Subscribe**:
     - ✅ Appointment Created
     - ✅ Appointment Updated
     - ✅ Appointment Cancelled
     - ✅ Customer Created
     - ✅ Customer Updated
     - ✅ Payment Completed
   - **Secret Key**: Copy if provided (used for signature verification)

5. Save the webhook configuration
6. Test the webhook using Trafft's test button

## 2. Add Environment Variables to Render

1. Go to your Render dashboard
2. Select your backend service (sixfb-backend)
3. Go to **Environment** tab
4. Add these environment variables:

   ```
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   TRAFFT_WEBHOOK_SECRET=your_trafft_webhook_secret_here
   ```

5. Save and let the service redeploy

## 3. Verify Webhook is Working

Visit: https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/setup

This will show:
- The webhook URL to use
- Setup instructions
- Test endpoint

## 4. Monitor Webhook Events

Check your Render logs to see incoming webhook events:
- Each event will be logged with its type and payload
- This helps you understand the data structure Trafft sends

## 5. Webhook Data Flow

1. **Trafft Event Occurs** (e.g., new appointment)
2. **Trafft Sends Webhook** to your endpoint
3. **Your Backend Receives** and verifies the webhook
4. **Data is Processed**:
   - Appointments saved to database
   - Customers synced
   - Payments recorded
5. **Real-time Updates** in your dashboard

## Example Webhook Payloads

### Appointment Created
```json
{
  "event": "appointment.created",
  "appointment": {
    "id": "123",
    "customerId": "456",
    "employeeId": "789",
    "serviceId": "101",
    "startTime": "2025-06-20T14:30:00Z",
    "endTime": "2025-06-20T15:30:00Z",
    "status": "confirmed",
    "price": 65.00
  }
}
```

### Customer Created
```json
{
  "event": "customer.created",
  "customer": {
    "id": "456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }
}
```

## Troubleshooting

- **Webhook not receiving**: Check Trafft webhook logs
- **401/403 errors**: Verify webhook secret in env vars
- **Data not saving**: Check Render logs for processing errors