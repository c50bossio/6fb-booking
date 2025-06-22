# 💳 Stripe Connect Setup Guide for 6FB Automated Payouts

This guide walks you through setting up Stripe Connect for automated barber payouts.

## 🏗️ Step 1: Stripe Account Setup

### 1.1 Create/Access Stripe Account
1. Go to https://dashboard.stripe.com
2. Create account or log in
3. Complete business verification if required

### 1.2 Enable Stripe Connect
1. Navigate to **Connect** in the sidebar
2. Click **Get started**
3. Choose **"Platform or marketplace"**
4. Select **"Express"** (recommended for barbers)
5. Complete the setup wizard

## 🔑 Step 2: Get API Credentials

### 2.1 API Keys
1. Go to **Developers → API keys**
2. Copy your keys:
   ```env
   # For testing
   STRIPE_SECRET_KEY=sk_test_51ABC123...
   STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
   
   # For production (after going live)
   STRIPE_SECRET_KEY=sk_live_51ABC123...
   STRIPE_PUBLISHABLE_KEY=pk_live_51ABC123...
   ```

### 2.2 Connect Client ID
1. Go to **Connect → Settings**
2. Find your **Client ID**:
   ```env
   STRIPE_CONNECT_CLIENT_ID=ca_ABC123...
   ```

## 🔗 Step 3: Configure Connect Settings

### 3.1 OAuth Settings
1. **Connect → Settings → OAuth settings**
2. Add redirect URIs:
   ```
   # Development
   http://localhost:3000/stripe/callback
   
   # Production
   https://yourdomain.com/stripe/callback
   ```

### 3.2 Branding
1. **Connect → Settings → Branding**
2. Upload your logo
3. Set brand colors
4. Add business name

### 3.3 Application Details
1. Fill in business information
2. Add support contact
3. Set privacy policy URL
4. Set terms of service URL

## 🪝 Step 4: Webhook Configuration

### 4.1 Create Webhook Endpoint
1. **Developers → Webhooks**
2. **Add endpoint**
3. Enter endpoint URL:
   ```
   # Development
   https://your-ngrok-url.ngrok.io/api/v1/webhooks/stripe
   
   # Production
   https://yourdomain.com/api/v1/webhooks/stripe
   ```

### 4.2 Select Events
Select these events for automated payouts:
- `account.updated` - When barber updates their info
- `payout.created` - When payout is initiated
- `payout.paid` - When payout succeeds
- `payout.failed` - When payout fails
- `transfer.created` - When transfer is made
- `transfer.updated` - When transfer status changes

### 4.3 Get Webhook Secret
1. Click on your webhook endpoint
2. Copy the **Signing secret**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_ABC123...
   ```

## 📝 Step 5: Test Configuration

### 5.1 Test API Connection
```bash
curl -X GET "http://localhost:8000/api/v1/test-payout/configuration-status"
```

Should return:
```json
{
  "stripe": {
    "secret_key_configured": true,
    "connect_client_id_configured": true,
    "environment": "test"
  }
}
```

### 5.2 Test OAuth Flow
1. Create a test barber
2. Generate Connect OAuth URL
3. Complete the connection flow

## 🚀 Step 6: Barber Onboarding Flow

### 6.1 Connect URL Generation
```javascript
// Frontend code example
const connectBarber = async (barberId) => {
  const response = await fetch('/api/v1/barbers/stripe-connect/oauth-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barber_id: barberId })
  });
  
  const { oauth_url } = await response.json();
  window.location.href = oauth_url;  // Redirect to Stripe
};
```

### 6.2 OAuth Callback Handling
```javascript
// Handle successful connection
const handleStripeCallback = async (code, state) => {
  const response = await fetch('/api/v1/barbers/stripe-connect/oauth-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state })
  });
  
  const result = await response.json();
  if (result.success) {
    // Show success message
    // Redirect to payout settings
  }
};
```

## 💰 Step 7: Payout Configuration

### 7.1 Set Default Payout Settings
```python
# Backend configuration
DEFAULT_PAYOUT_SETTINGS = {
    "enabled": True,
    "method": "stripe_standard",  # or "stripe_instant"
    "frequency": "weekly",
    "day_of_week": 5,  # Friday
    "time": "17:00",
    "minimum_payout": 50,
    "hold_days": 2,
    "auto_deduct_fees": True,
    "notification_settings": {
        "send_payout_notification": True,
        "send_summary_report": True,
        "send_failure_alerts": True
    }
}
```

### 7.2 Barber-Specific Settings
Barbers can customize:
- Payout frequency (daily, weekly, monthly)
- Payout method (instant vs standard)
- Minimum payout amounts
- Notification preferences

## 🧪 Step 8: Testing Payouts

### 8.1 Create Test Commission
```bash
curl -X POST "http://localhost:8000/api/v1/test-payout/create-test-commission/1" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.0}'
```

### 8.2 Trigger Test Payout
```bash
curl -X POST "http://localhost:8000/api/v1/test-payout/trigger-payout/1"
```

### 8.3 Check Payout Status
```bash
curl -X GET "http://localhost:8000/api/v1/test-payout/payout-status/1"
```

## 🔍 Step 9: Monitoring & Troubleshooting

### 9.1 Stripe Dashboard Monitoring
- **Connect → Accounts** - View connected barbers
- **Connect → Transfers** - Monitor payout activity
- **Developers → Webhooks** - Check webhook delivery
- **Developers → Logs** - Review API calls

### 9.2 Common Issues & Solutions

#### Issue: OAuth Connection Fails
```
Error: "The redirect URI provided is not in the list of allowed values"
```
**Solution:** Add correct redirect URI in Connect settings

#### Issue: Payout Fails
```
Error: "The destination account is not active"
```
**Solution:** Barber needs to complete Stripe Express onboarding

#### Issue: Webhooks Not Received
```
Error: "Webhook signature verification failed"
```
**Solution:** Check webhook secret in environment variables

### 9.3 Account Status Checks
```python
# Check if barber can receive payouts
def check_barber_payout_status(barber_id):
    barber = get_barber(barber_id)
    if not barber.stripe_account_id:
        return "No Stripe account connected"
    
    account_status = stripe_service.check_account_status(barber.stripe_account_id)
    if not account_status["payouts_enabled"]:
        return "Payouts not enabled - needs to complete onboarding"
    
    return "Ready for payouts"
```

## 📊 Step 10: Production Deployment

### 10.1 Go Live Checklist
- [ ] Business verification completed
- [ ] Connect application approved by Stripe
- [ ] Production webhook endpoints configured
- [ ] SSL certificates installed
- [ ] Error monitoring set up (Sentry)
- [ ] Backup payout methods configured

### 10.2 Switch to Live Credentials
1. **API keys**: Replace `sk_test_` with `sk_live_`
2. **Webhooks**: Update to production URLs
3. **Environment**: Set `ENVIRONMENT=production`
4. **Testing**: Run full payout cycle test

### 10.3 Security Considerations
- Store secrets in environment variables only
- Use HTTPS for all endpoints
- Implement rate limiting
- Monitor for suspicious activity
- Regular security audits

## 📈 Step 11: Advanced Features

### 11.1 Instant Payouts (1% fee)
```python
# Enable instant payouts for VIP barbers
payout_settings = {
    "method": "stripe_instant",  # Arrives in 30 minutes
    "instant_fee_threshold": 1000  # Auto-instant for payouts > $1000
}
```

### 11.2 Bulk Payouts
```python
# Process multiple barbers at once
def process_bulk_payouts():
    active_plans = get_active_compensation_plans()
    for plan in active_plans:
        if should_process_payout(plan):
            process_payout(plan.id)
```

### 11.3 Custom Payout Rules
```python
# Advanced payout logic
def calculate_payout_amount(barber_id, period):
    commissions = get_unpaid_commissions(barber_id, period)
    bonuses = calculate_performance_bonuses(barber_id, period)
    deductions = calculate_deductions(barber_id, period)
    
    return commissions + bonuses - deductions
```

## 🆘 Support & Resources

- **Stripe Connect Documentation**: https://stripe.com/docs/connect
- **Express Accounts Guide**: https://stripe.com/docs/connect/express-accounts
- **Webhooks Reference**: https://stripe.com/docs/api/events
- **Testing Guide**: https://stripe.com/docs/connect/testing

## ✅ Final Checklist

- [ ] Stripe Connect enabled
- [ ] API credentials configured
- [ ] OAuth settings completed
- [ ] Webhooks configured
- [ ] Test payouts successful
- [ ] Barber onboarding flow tested
- [ ] Error handling implemented
- [ ] Monitoring set up
- [ ] Production deployment ready

Your Stripe Connect integration is now ready for automated payouts! 🎉

## 💡 Pro Tips

1. **Start with Express accounts** - Easiest for barbers to set up
2. **Use test mode extensively** - Stripe provides excellent test data
3. **Monitor webhook delivery** - Set up alerts for failed webhooks
4. **Implement idempotency** - Prevent duplicate payouts
5. **Cache account status** - Avoid excessive API calls
6. **Provide clear onboarding** - Help barbers through Connect flow
7. **Handle edge cases** - Failed payouts, account suspensions, etc.
8. **Keep detailed logs** - Essential for troubleshooting