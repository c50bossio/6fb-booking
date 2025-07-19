# 🚨 CRITICAL: Stripe Production Upgrade Guide

**Status**: BookedBarber V2 currently using TEST keys - cannot process real payments  
**Priority**: BLOCKING production revenue  
**Time Required**: 1 hour  
**Risk Level**: Medium (standard live key activation)

---

## 🎯 Current Situation

✅ **Working TEST Configuration**:
```bash
STRIPE_SECRET_KEY=sk_test_51RbMZpPNpTbxU6SgHLuX8MVRTRvHakZntpJ9rI3fihERTRCmQ2Dlf8gb4lbD0O5MMtK8qEM57w7Cxgi9IjQziajJ00RKSJhVpq
STRIPE_PUBLISHABLE_KEY=pk_test_51RbMZpPNpTbxU6Sges2slnfQWOO7nll4xYCSEUSYtjuQ667EU0rkhmQlghK0nDu5x1WnyiKNRGT2kMrEOXnIWsXD00whqgT2DQ
STRIPE_WEBHOOK_SECRET=whsec_dc1cee6044c5809b3999bcaf61539b19b3141f8dc778b8f9f2652a0f21d77bfe
```

⚠️ **Needs**: Live keys for production revenue processing

---

## 🔐 Security Checklist (Complete BEFORE upgrading)

### 1. Stripe Account Verification
- [ ] **Business Information**: Complete and verified
- [ ] **Bank Account**: Added and verified for payouts
- [ ] **Identity Verification**: Documents approved
- [ ] **Tax Information**: W-9/tax forms submitted
- [ ] **Representative Details**: Business owner information verified

### 2. Security Requirements
- [ ] **Two-Factor Authentication**: Enabled on Stripe account
- [ ] **API Key Restrictions**: Ready to restrict by IP (optional)
- [ ] **Webhook Endpoints**: Production URLs ready
- [ ] **SSL Certificate**: Valid for production domain
- [ ] **Team Access**: Remove unnecessary team members

---

## 🚀 Step-by-Step Upgrade Process

### Step 1: Pre-Flight Verification (5 minutes)

```bash
# 1. Verify current test integration works
curl -X POST http://localhost:8000/api/v2/payments/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -d '{"amount": 100, "currency": "usd", "test_mode": true}'

# 2. Check current Stripe dashboard status
# Login to dashboard.stripe.com
# Verify account is ready for live mode
```

### Step 2: Generate Live Keys (10 minutes)

1. **Navigate to Stripe Dashboard**
   ```
   URL: https://dashboard.stripe.com/apikeys
   ```

2. **Switch to Live Mode**
   ```
   Toggle: "Test mode" → "Live mode" (top left)
   Warning: You'll see "View live data" badge
   ```

3. **Generate Live API Keys**
   ```bash
   # Copy these from Stripe Dashboard:
   Secret key: sk_live_51... (Reveal and copy)
   Publishable key: pk_live_51... (Copy directly)
   ```

4. **Create Production Webhook Endpoint**
   ```bash
   # In Stripe Dashboard > Developers > Webhooks
   # Add endpoint:
   URL: https://yourdomain.com/api/v2/webhooks/stripe
   Events: payment_intent.succeeded, payment_intent.payment_failed
   
   # Copy webhook secret:
   Signing secret: whsec_live_...
   ```

### Step 3: Update Environment Configuration (10 minutes)

**⚠️ CRITICAL: Make backup copy first**
```bash
# Backup current working configuration
cp backend-v2/.env backend-v2/.env.backup.$(date +%Y%m%d_%H%M%S)
```

**Update Backend Configuration**:
```bash
# Edit backend-v2/.env
# Replace these lines:

# OLD (TEST):
STRIPE_SECRET_KEY=sk_test_51RbMZpPNpTbxU6SgHLuX8MVRTRvHakZntpJ9rI3fihERTRCmQ2Dlf8gb4lbD0O5MMtK8qEM57w7Cxgi9IjQziajJ00RKSJhVpq
STRIPE_PUBLISHABLE_KEY=pk_test_51RbMZpPNpTbxU6Sges2slnfQWOO7nll4xYCSEUSYtjuQ667EU0rkhmQlghK0nDu5x1WnyiKNRGT2kMrEOXnIWsXD00whqgT2DQ
STRIPE_WEBHOOK_SECRET=whsec_dc1cee6044c5809b3999bcaf61539b19b3141f8dc778b8f9f2652a0f21d77bfe

# NEW (LIVE):
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE
```

**Update Frontend Configuration**:
```bash
# Edit backend-v2/frontend-v2/.env.local
# Replace this line:

# OLD (TEST):
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RbMZpPNpTbxU6Sges2slnfQWOO7nll4xYCSEUSYtjuQ667EU0rkhmQlghK0nDu5x1WnyiKNRGT2kMrEOXnIWsXD00whqgT2DQ

# NEW (LIVE):
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
```

### Step 4: Test Live Integration (15 minutes)

**⚠️ CRITICAL: Test with SMALL amount first**

```bash
# 1. Restart backend with new configuration
cd backend-v2
uvicorn main:app --reload

# 2. Test payment processing (LIVE - will charge real money!)
curl -X POST https://yourdomain.com/api/v2/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN" \
  -d '{"amount": 100, "currency": "usd", "description": "Production test"}'

# 3. Verify in Stripe Dashboard
# Check: Payments > All payments
# Should see: $1.00 test payment

# 4. Test webhook delivery
# In Stripe Dashboard > Developers > Webhooks
# Check: Recent deliveries tab
# Should see: Successful webhook calls
```

### Step 5: Production Deployment (20 minutes)

1. **Deploy Backend with Live Keys**
   ```bash
   # Railway/Render deployment
   # Update environment variables in platform dashboard
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...
   ```

2. **Deploy Frontend with Live Keys**
   ```bash
   # Vercel/Netlify deployment
   # Update environment variables in platform dashboard
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

3. **Update Webhook URLs in Stripe**
   ```bash
   # In Stripe Dashboard > Developers > Webhooks
   # Update endpoint URL to production:
   https://yourdomain.com/api/v2/webhooks/stripe
   ```

---

## ✅ Verification Checklist

### Immediate Verification (5 minutes)
- [ ] **API Health**: `curl https://yourdomain.com/health` returns 200
- [ ] **Stripe Keys**: Dashboard shows live mode active
- [ ] **Payment Test**: Small live payment successful
- [ ] **Webhook Test**: Webhook delivery successful
- [ ] **Frontend**: Payment form loads without errors

### Business Verification (24 hours)
- [ ] **Real Customer Payment**: Process actual customer payment
- [ ] **Payout Test**: Verify money reaches bank account
- [ ] **Webhook Reliability**: Monitor webhook success rate >99%
- [ ] **Error Monitoring**: No payment-related errors in logs
- [ ] **Customer Experience**: Payment flow smooth end-to-end

---

## 🚨 Emergency Rollback Procedures

### If Live Payments Fail:

**Immediate Rollback (2 minutes)**:
```bash
# 1. Restore backup configuration
cp backend-v2/.env.backup.TIMESTAMP backend-v2/.env

# 2. Restart services
# Railway: rollback deployment
# Render: redeploy previous version

# 3. Update Stripe webhooks back to test mode
```

**Communication Template**:
```
URGENT: Payment processing temporarily offline for maintenance.
Estimated restore time: 15 minutes.
Customers: Please retry payment shortly.
```

---

## 💰 Stripe Connect Setup (For Barber Payouts)

### Current Status
- **Connect Client ID**: Not configured (`STRIPE_CONNECT_CLIENT_ID=""`)
- **Impact**: Cannot process automated barber payouts
- **Priority**: HIGH (revenue sharing blocked)

### Setup Process
1. **Enable Stripe Connect**
   ```bash
   # In Stripe Dashboard > Connect
   # Choose: Express accounts (recommended)
   # Complete: Platform application
   ```

2. **Get Connect Client ID**
   ```bash
   # In Stripe Dashboard > Connect > Settings
   # Copy: Client ID (ca_...)
   
   # Add to backend-v2/.env:
   STRIPE_CONNECT_CLIENT_ID=ca_YOUR_CONNECT_CLIENT_ID
   ```

3. **Test Barber Onboarding**
   ```bash
   # Test barber can connect account
   # Test commission calculations
   # Test automated payouts
   ```

---

## 📊 Production Monitoring

### Key Metrics to Monitor
- **Payment Success Rate**: Target >99%
- **Average Processing Time**: Target <3 seconds
- **Webhook Delivery Rate**: Target >99%
- **Dispute Rate**: Target <1%
- **Failed Payment Rate**: Target <5%

### Stripe Dashboard Monitoring
- **Payments**: Monitor daily revenue
- **Disputes**: Handle customer disputes quickly
- **Payouts**: Ensure bank transfers successful
- **Webhooks**: Monitor delivery reliability
- **Connect**: Track barber payout status

### Alerting Setup
```bash
# Set up alerts for:
1. Failed payment rate >5%
2. Webhook failure rate >1%
3. Large payment amounts (>$500)
4. Dispute notifications
5. Account verification issues
```

---

## 🔒 Security Best Practices

### API Key Security
```bash
# ✅ DO:
- Store keys in environment variables only
- Use different keys per environment
- Rotate keys quarterly
- Restrict API keys by IP (if possible)
- Monitor API key usage

# ❌ DON'T:
- Commit keys to version control
- Share keys via email/Slack
- Use same keys across environments
- Store keys in application code
- Leave test keys in production
```

### Webhook Security
```bash
# ✅ DO:
- Verify webhook signatures
- Use HTTPS endpoints only
- Implement idempotency
- Log all webhook events
- Handle webhook retries

# ❌ DON'T:
- Process unverified webhooks
- Use HTTP endpoints
- Process duplicate events
- Ignore webhook failures
- Block webhook processing
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "No such payment_intent"
```bash
# Cause: Using test key with live payment_intent
# Solution: Verify all keys are live mode
```

**Issue**: "Webhook signature verification failed"
```bash
# Cause: Using test webhook secret with live webhooks
# Solution: Update webhook secret to live version
```

**Issue**: "Your account cannot accept live charges"
```bash
# Cause: Business verification incomplete
# Solution: Complete Stripe account verification
```

### Stripe Support
- **Dashboard**: https://dashboard.stripe.com/support
- **Documentation**: https://stripe.com/docs
- **Status Page**: https://status.stripe.com
- **Emergency**: Contact via dashboard (24/7 for live accounts)

---

## ✅ Final Production Checklist

- [ ] **Account Verified**: Stripe business verification complete
- [ ] **Keys Updated**: All test keys replaced with live keys
- [ ] **Webhooks Configured**: Production URLs set up
- [ ] **Testing Complete**: Live payment test successful
- [ ] **Deployment**: Production environment updated
- [ ] **Monitoring**: Stripe dashboard alerts configured
- [ ] **Backup Plan**: Rollback procedure documented
- [ ] **Team Training**: Staff knows production payment process

---

**⚠️ CRITICAL REMINDER**: Live keys process real money. Test thoroughly with small amounts before full production launch.

**💡 SUCCESS INDICATOR**: When this upgrade is complete, BookedBarber V2 can process real customer payments and generate revenue.