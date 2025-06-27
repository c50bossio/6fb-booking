# Third-Party API Compliance - 6FB Booking Platform

## Google Calendar API Compliance

### Terms of Service Requirements
- ✅ Proper OAuth implementation for user consent
- ✅ Rate limiting respected (300/min, 50k/day)
- ⚠️ **NEEDED**: "Powered by Google" attribution in calendar UI
- ⚠️ **NEEDED**: Privacy policy disclosure about Google Calendar access
- ✅ Webhook implementation for real-time updates

### Data Handling Requirements
- ✅ Only access calendars user explicitly authorizes
- ✅ Store minimal data (event IDs, not full event content)
- ⚠️ **VERIFY**: Ensure cached calendar data expires appropriately

### Code Locations
- Auth: `frontend/src/lib/google-calendar/client.ts`
- Sync: `frontend/src/lib/google-calendar/sync-service.ts`
- Webhooks: `frontend/src/app/api/webhooks/google-calendar/route.ts`

## Stripe API Compliance

### PCI Compliance Requirements
- ✅ Using Stripe Elements (no direct card data handling)
- ✅ HTTPS enforcement
- ⚠️ **NEEDED**: PCI compliance documentation
- ✅ No storage of sensitive payment data

### Terms of Service Requirements
- ✅ Stripe branding displayed in payment flow
- ✅ Proper error handling
- ⚠️ **NEEDED**: Dispute handling procedures documented

### Code Locations
- Payment components: `frontend/src/components/payments/`
- API integration: `backend/services/stripe_service.py`

## Other APIs

### Email Services
- Current: Direct SMTP (no third-party service detected)
- ⚠️ **CONSIDER**: GDPR compliance for email storage

### SMS Services
- Not currently implemented
- ⚠️ **FUTURE**: TCPA compliance when adding SMS

## Action Items
1. Add "Powered by Google" to calendar interface
2. Update privacy policy for Google Calendar access
3. Document PCI compliance measures
4. Add Stripe compliance documentation
5. Verify data retention policies for all APIs

*Compliance Officer: [Name]*
*Last Review: $(date)*
