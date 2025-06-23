# 6FB Booking Platform - Troubleshooting Guide

This guide helps resolve common issues encountered while using the 6FB Booking Platform.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Authentication Issues](#authentication-issues)
- [Booking Problems](#booking-problems)
- [Payment Issues](#payment-issues)
- [Notification Problems](#notification-problems)
- [Performance Issues](#performance-issues)
- [Mobile App Issues](#mobile-app-issues)
- [Integration Problems](#integration-problems)
- [System Errors](#system-errors)
- [Emergency Procedures](#emergency-procedures)

---

## Quick Diagnostics

### System Status Check
Before troubleshooting, check if the issue is system-wide:

1. **Status Page**: Visit https://status.6fbbooking.com
2. **Service Health**: 
   ```bash
   curl -X GET "https://api.6fbbooking.com/health"
   ```
3. **Basic Connectivity**:
   ```bash
   ping api.6fbbooking.com
   ```

### Browser Diagnostics
1. **Clear Cache**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Check Console**: F12 → Console tab for JavaScript errors
3. **Network Tab**: F12 → Network tab to check API requests
4. **Incognito Mode**: Test in private/incognito window

### Quick Fixes Checklist
- [ ] Refresh the page
- [ ] Clear browser cache
- [ ] Check internet connection
- [ ] Try different browser
- [ ] Check system status page
- [ ] Verify login credentials

---

## Authentication Issues

### Cannot Log In

#### Symptoms
- "Invalid credentials" error
- Login form not submitting
- Redirect loops after login

#### Solutions

**1. Password Issues**
```
Problem: Forgot password
Solution:
1. Click "Forgot Password" on login page
2. Enter your email address
3. Check email for reset link (check spam folder)
4. Click link and create new password
5. Password requirements: 8+ characters, 1 uppercase, 1 number
```

**2. Account Locked**
```
Problem: Account locked after multiple failed attempts
Solution:
1. Wait 15 minutes for automatic unlock
2. Or contact support to unlock immediately
3. Use account recovery if you suspect compromise
```

**3. Email Not Verified**
```
Problem: Cannot log in with unverified email
Solution:
1. Check email for verification link
2. Click verification link
3. If expired, request new verification email
4. Check spam/junk folders
```

#### Diagnostic Commands
```bash
# Test authentication endpoint
curl -X POST "https://api.6fbbooking.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Check user status
curl -X GET "https://api.6fbbooking.com/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Session Expires Too Quickly

#### Symptoms
- Frequent logouts
- "Session expired" messages
- Need to re-authenticate often

#### Solutions
1. **Check Browser Settings**:
   - Ensure cookies are enabled
   - Disable strict cookie policies
   - Whitelist 6fbbooking.com domain

2. **Clear Browser Data**:
   - Clear cookies for 6fbbooking.com
   - Clear local storage
   - Restart browser

3. **Network Issues**:
   - Check if corporate firewall blocks sessions
   - Try different network connection
   - Contact IT if on company network

---

## Booking Problems

### Cannot View Available Times

#### Symptoms
- Calendar shows no available slots
- "No availability" message when slots should exist
- Loading spinner that never completes

#### Solutions

**1. Date Range Issues**
```
Problem: Looking too far in advance
Solution:
- Check booking window settings (usually 30-60 days)
- Try selecting dates within the next 2 weeks
- Contact barber/location for extended booking
```

**2. Service/Location Mismatch**
```
Problem: Selected service not available at location
Solution:
1. Verify service is offered at chosen location
2. Check if barber provides the specific service
3. Try different location or service combination
```

**3. Browser/Cache Issues**
```
Problem: Outdated availability data
Solution:
1. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Try incognito/private browsing mode
```

#### Diagnostic Steps
```javascript
// Check availability API directly
fetch('https://api.6fbbooking.com/api/v1/availability?service_id=1&barber_id=5&date_start=2024-01-15')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Booking Creation Fails

#### Symptoms
- "Booking failed" error messages
- Payment processed but no booking created
- Booking appears then disappears

#### Solutions

**1. Double Booking Prevention**
```
Problem: Time slot taken while booking
Solution:
1. Refresh availability
2. Select alternative time
3. Book immediately after selecting time
4. Check confirmation email
```

**2. Payment Issues**
```
Problem: Payment fails during booking
Solution:
1. Verify card details
2. Check if card supports online payments
3. Try different payment method
4. Contact bank if card is declined
```

**3. Technical Errors**
```
Problem: System error during booking
Solution:
1. Check error message details
2. Copy error ID for support
3. Wait 5 minutes and retry
4. Contact support with error details
```

### Cannot Cancel/Reschedule

#### Symptoms
- Cancel/reschedule buttons not working
- "Cannot modify booking" errors
- Options not available in booking details

#### Solutions

**1. Policy Restrictions**
```
Problem: Outside cancellation window
Solution:
- Check cancellation policy (usually 4-24 hours)
- Contact location directly for exceptions
- Understand no-show fees may apply
```

**2. Booking Status Issues**
```
Problem: Booking in wrong status
Solution:
1. Refresh booking details
2. Check if already completed/cancelled
3. Contact support if status is incorrect
```

---

## Payment Issues

### Payment Declined

#### Symptoms
- "Payment declined" messages
- Card not accepted
- Transaction fails at checkout

#### Solutions

**1. Card Issues**
```
Common Decline Reasons:
- Insufficient funds
- Expired card
- Incorrect CVV
- Zip code mismatch
- International card restrictions

Solutions:
1. Verify all card details
2. Check available balance
3. Try different card
4. Contact bank for authorization
5. Use PayPal or digital wallet
```

**2. Security Blocks**
```
Problem: Fraud protection blocking payment
Solution:
1. Contact bank to authorize transaction
2. Inform bank of legitimate purchase
3. Try payment again after authorization
4. Use alternative payment method
```

#### Diagnostic Commands
```bash
# Test payment endpoint
curl -X POST "https://api.6fbbooking.com/api/v1/payments" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"currency":"usd","payment_method":"pm_test"}'
```

### Refund Issues

#### Symptoms
- Refund not received
- Partial refund amount
- Refund status unclear

#### Solutions

**1. Processing Time**
```
Normal Refund Timeline:
- Credit cards: 5-10 business days
- Digital wallets: 1-3 business days
- Bank transfers: 3-5 business days

If refund is delayed:
1. Check original payment method
2. Contact bank/card issuer
3. Provide refund reference ID
```

**2. Refund Policy Issues**
```
Problem: Refund denied or reduced
Solution:
1. Review cancellation policy
2. Check cancellation timing
3. Understand no-show fees
4. Contact support for policy questions
```

### Barber Payout Problems

#### Symptoms
- Payouts not received
- Incorrect payout amounts
- Payout account issues

#### Solutions

**1. Account Verification**
```
Problem: Unverified Stripe account
Solution:
1. Complete Stripe Connect onboarding
2. Provide all required documents
3. Verify bank account details
4. Wait for Stripe approval
```

**2. Payout Schedule**
```
Problem: Expecting faster payouts
Solution:
1. Check payout schedule (daily/weekly)
2. Understand processing delays
3. Verify minimum payout amounts
4. Contact admin for schedule changes
```

---

## Notification Problems

### Not Receiving Emails

#### Symptoms
- No booking confirmations
- Missing appointment reminders
- No password reset emails

#### Solutions

**1. Email Delivery Issues**
```
Troubleshooting Steps:
1. Check spam/junk folders
2. Add noreply@6fbbooking.com to contacts
3. Whitelist 6fbbooking.com domain
4. Check email client filtering rules
5. Try different email address
```

**2. Email Preferences**
```
Problem: Notifications disabled
Solution:
1. Go to Settings → Notifications
2. Enable email notifications
3. Update email address if changed
4. Save preferences
```

#### Email Diagnostics
```bash
# Test email delivery
curl -X POST "https://api.6fbbooking.com/api/v1/test-email" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"email":"test@example.com"}'
```

### SMS Issues

#### Symptoms
- Not receiving text reminders
- SMS verification codes not arriving
- International SMS problems

#### Solutions

**1. Phone Number Issues**
```
Problem: Wrong or old phone number
Solution:
1. Update phone number in profile
2. Use full international format (+1234567890)
3. Verify number is SMS-capable
4. Check for carrier blocking
```

**2. Carrier Restrictions**
```
Problem: Carrier blocking promotional SMS
Solution:
1. Contact carrier to unblock
2. Add 6FB shortcode to allowed list
3. Try different phone number
4. Switch to email notifications
```

---

## Performance Issues

### Slow Page Loading

#### Symptoms
- Pages take long to load
- Timeouts during booking
- Slow API responses

#### Solutions

**1. Network Issues**
```
Diagnostics:
1. Test internet speed: speedtest.net
2. Try different network connection
3. Check if corporate firewall interferes
4. Use mobile data to test
```

**2. Browser Performance**
```
Solutions:
1. Close other browser tabs
2. Disable unnecessary extensions
3. Clear browser cache and cookies
4. Update browser to latest version
5. Try different browser
```

**3. Device Performance**
```
Solutions:
1. Close other applications
2. Restart device
3. Check available storage space
4. Update operating system
```

#### Performance Diagnostics
```javascript
// Measure API response time
const start = performance.now();
fetch('https://api.6fbbooking.com/api/v1/appointments')
  .then(() => {
    const end = performance.now();
    console.log(`API call took ${end - start} milliseconds`);
  });
```

### Database Connection Issues

#### Symptoms
- "Database error" messages
- Incomplete data loading
- Transaction failures

#### Solutions

**1. Temporary Issues**
```
Solution:
1. Wait 1-2 minutes and retry
2. Refresh the page
3. Check system status page
4. Contact support if persistent
```

**2. Maintenance Windows**
```
Problem: Scheduled maintenance
Solution:
1. Check system status for maintenance schedules
2. Wait until maintenance completes
3. Subscribe to status page for updates
```

---

## Mobile App Issues

### PWA Installation Problems

#### Symptoms
- Cannot add to home screen
- App icon not appearing
- Offline features not working

#### Solutions

**1. iOS Installation**
```
Steps:
1. Open in Safari (not Chrome)
2. Tap Share button
3. Select "Add to Home Screen"
4. Confirm installation
```

**2. Android Installation**
```
Steps:
1. Open in Chrome
2. Tap menu (three dots)
3. Select "Add to Home Screen"
4. Confirm installation
```

### Mobile Display Issues

#### Symptoms
- Text too small/large
- Buttons not responsive
- Layout broken on mobile

#### Solutions

**1. Zoom Settings**
```
Problem: Incorrect zoom level
Solution:
1. Double-tap to reset zoom
2. Use pinch gesture to adjust
3. Check browser zoom settings
4. Reset to 100% zoom
```

**2. Viewport Issues**
```
Problem: Desktop layout on mobile
Solution:
1. Force refresh: pull down on page
2. Clear mobile browser cache
3. Try different mobile browser
4. Check responsive design toggle
```

---

## Integration Problems

### API Authentication Failures

#### Symptoms
- 401 Unauthorized errors
- API keys not working
- Token expiration issues

#### Solutions

**1. API Key Issues**
```
Problem: Invalid or expired API key
Solution:
1. Generate new API key in admin panel
2. Update API key in your application
3. Check key permissions and scopes
4. Verify key is active and not revoked
```

**2. JWT Token Problems**
```
Problem: Token expired or invalid
Solution:
1. Implement token refresh logic
2. Check token expiration time
3. Handle 401 responses appropriately
4. Re-authenticate when needed
```

#### API Testing
```bash
# Test API key authentication
curl -X GET "https://api.6fbbooking.com/api/v1/appointments" \
  -H "X-API-Key: your-api-key-here"

# Test JWT token
curl -X GET "https://api.6fbbooking.com/api/v1/auth/me" \
  -H "Authorization: Bearer your-jwt-token"
```

### Webhook Issues

#### Symptoms
- Webhooks not received
- Duplicate webhook deliveries
- Webhook signature verification failures

#### Solutions

**1. Endpoint Accessibility**
```
Problem: Webhook endpoint not reachable
Solution:
1. Verify endpoint URL is publicly accessible
2. Check firewall and security groups
3. Test endpoint with curl or Postman
4. Ensure HTTPS is configured correctly
```

**2. Signature Verification**
```python
# Correct signature verification
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)
```

---

## System Errors

### 500 Internal Server Error

#### When It Occurs
- Server-side application errors
- Database connection failures
- Unhandled exceptions

#### Solutions

**1. Immediate Actions**
```
For Users:
1. Wait 5 minutes and try again
2. Try different browser/device
3. Contact support with error details
4. Include request ID if provided

For Admins:
1. Check application logs
2. Verify database connectivity
3. Check server resources (CPU, memory)
4. Review recent deployments
```

**2. Error Logging**
```bash
# Check application logs
tail -f /var/log/6fb-booking/application.log

# Check database logs
tail -f /var/log/postgresql/postgresql.log

# Check nginx/apache logs
tail -f /var/log/nginx/error.log
```

### 404 Not Found Errors

#### Common Causes
- Incorrect URLs
- Deleted resources
- Routing configuration issues

#### Solutions

**1. URL Issues**
```
Problem: Incorrect URL structure
Solution:
1. Verify URL spelling and format
2. Check for extra/missing slashes
3. Ensure proper URL encoding
4. Use absolute URLs when possible
```

**2. Deleted Resources**
```
Problem: Accessing deleted appointment/user
Solution:
1. Verify resource still exists
2. Check if user has permissions
3. Use resource listing APIs first
4. Handle 404 responses gracefully
```

### 503 Service Unavailable

#### When It Occurs
- Server maintenance
- Database maintenance
- High traffic overload
- Rate limiting

#### Solutions

**1. Scheduled Maintenance**
```
Problem: Planned maintenance window
Solution:
1. Check system status page
2. Wait for maintenance completion
3. Subscribe to maintenance notifications
4. Plan around scheduled maintenance
```

**2. Rate Limiting**
```
Problem: Too many requests
Solution:
1. Implement request rate limiting
2. Add exponential backoff
3. Cache responses when possible
4. Contact support for limit increases
```

---

## Emergency Procedures

### System Outage

#### Immediate Actions
1. **Verify Outage Scope**:
   - Check if issue is local or widespread
   - Test from different networks/devices
   - Check social media for reports

2. **Communication**:
   - Post status page update
   - Send email notification to users
   - Update social media channels
   - Contact major clients directly

3. **Technical Response**:
   - Check server health and resources
   - Review application and database logs
   - Verify network connectivity
   - Check third-party service status

#### Escalation Process
```
Level 1: Automatic monitoring alerts
Level 2: On-call engineer response (within 15 minutes)
Level 3: Senior engineer escalation (within 30 minutes)
Level 4: Engineering manager involvement (within 1 hour)
Level 5: Executive notification (critical issues)
```

### Data Corruption

#### Immediate Actions
1. **Stop Further Damage**:
   - Take affected systems offline
   - Prevent automatic processes
   - Preserve evidence

2. **Assess Scope**:
   - Identify affected data
   - Determine timeframe
   - Check backup integrity

3. **Recovery Process**:
   - Restore from most recent clean backup
   - Replay transactions if possible
   - Verify data integrity
   - Test system functionality

### Security Incident

#### Response Steps
1. **Immediate Containment**:
   - Isolate affected systems
   - Revoke compromised credentials
   - Block malicious IP addresses

2. **Assessment**:
   - Determine attack vector
   - Assess data exposure
   - Document evidence

3. **Communication**:
   - Notify legal team
   - Prepare customer communications
   - Contact law enforcement if required
   - File required breach notifications

---

## Getting Additional Help

### Support Channels

#### For Users
- **Live Chat**: Available 9 AM - 6 PM EST
- **Email**: support@6fbbooking.com
- **Phone**: 1-800-6FB-BOOK
- **Help Center**: https://help.6fbbooking.com

#### For Developers
- **Technical Support**: developers@6fbbooking.com
- **Discord**: https://discord.gg/6fb-developers
- **GitHub Issues**: https://github.com/6fb-booking/issues
- **Stack Overflow**: Tag with `6fb-booking`

#### For Administrators
- **Priority Support**: admin-support@6fbbooking.com
- **Phone**: 1-800-6FB-ADMIN
- **Slack Channel**: #6fb-admin-support

### Information to Include in Support Requests

#### For All Issues
- Detailed description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Time when issue occurred
- Browser/device information
- User account or booking ID

#### For Technical Issues
- Error messages and codes
- Request ID (if provided)
- API endpoint and parameters
- Network configuration details
- Integration platform information

#### For Payment Issues
- Transaction ID or payment intent ID
- Amount and currency
- Payment method used
- Error codes received
- Bank/card issuer information

---

## Preventive Measures

### Regular Maintenance
- Keep browsers updated
- Clear cache monthly
- Review notification settings
- Update payment methods before expiration
- Test booking process periodically

### Monitoring Setup
- Set up status page monitoring
- Subscribe to service notifications
- Monitor API rate limits
- Track error rates and response times
- Regular backup verification

### Best Practices
- Use secure, unique passwords
- Enable two-factor authentication
- Keep contact information updated
- Review booking policies regularly
- Test integrations after updates

---

*This guide is updated regularly based on common issues and user feedback.*

*Last Updated: January 2025*
*Version: 1.0*