# Production Deployment Checklist - Backend v2

## Pre-Deployment Checklist

### 1. Environment Configuration ✅

#### Backend Environment Variables
- [ ] **DATABASE_URL**: PostgreSQL connection string configured
- [ ] **SECRET_KEY**: Secure 64+ character key generated (not default)
- [ ] **STRIPE_SECRET_KEY**: Live Stripe secret key (sk_live_...)
- [ ] **STRIPE_PUBLISHABLE_KEY**: Live Stripe publishable key (pk_live_...)
- [ ] **STRIPE_WEBHOOK_SECRET**: Webhook endpoint secret configured
- [ ] **ALLOWED_ORIGINS**: Production domains configured
- [ ] **ENVIRONMENT**: Set to "production"
- [ ] **DEBUG**: Set to false

#### Optional but Recommended
- [ ] **SENDGRID_API_KEY**: Email service configured
- [ ] **TWILIO_ACCOUNT_SID** & **TWILIO_AUTH_TOKEN**: SMS service configured
- [ ] **GOOGLE_CLIENT_ID** & **GOOGLE_CLIENT_SECRET**: Calendar integration
- [ ] **REDIS_URL**: Caching and queues configured
- [ ] **SENTRY_DSN**: Error tracking configured

#### Frontend Environment Variables
- [ ] **NEXT_PUBLIC_API_URL**: Production backend URL
- [ ] **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Live Stripe publishable key
- [ ] **NEXT_PUBLIC_DEMO_MODE**: Set to false
- [ ] **NODE_ENV**: Set to production

### 2. Security Validation ✅

#### Critical Security Checks
- [ ] All default/example keys replaced with production values
- [ ] Secret keys are at least 32 characters long
- [ ] No test API keys in production environment
- [ ] CORS origins restricted to production domains only
- [ ] SSL/HTTPS enabled on all domains
- [ ] Security headers configured

#### Authentication & Authorization
- [ ] JWT secret key is unique and secure
- [ ] Password hashing configured (bcrypt)
- [ ] Rate limiting enabled and configured
- [ ] Session timeout configured appropriately

### 3. Database Setup ✅

#### PostgreSQL Production Database
- [ ] PostgreSQL instance provisioned
- [ ] Database connection tested
- [ ] Database migrations applied
- [ ] Connection pooling configured
- [ ] Backup strategy implemented

#### Data Validation
- [ ] Test data removed from production database
- [ ] Admin users created with secure passwords
- [ ] Database indexes optimized
- [ ] Performance tested under load

### 4. External Services ✅

#### Stripe Payment Processing
- [ ] Live Stripe account configured
- [ ] Webhook endpoints configured and tested
- [ ] Payment flow tested with small amounts
- [ ] Payout system configured for barbers
- [ ] Tax settings configured if required

#### Email Service (SendGrid) - ⚠️ PRODUCTION REQUIREMENTS
- [ ] **SendGrid Pro plan** with dedicated IP address (required for production)
- [ ] **IP warmup process** completed (minimum 2-4 weeks)
- [ ] **Domain authentication** (bookedbarber.com) verified
- [ ] **Verified senders** configured (noreply@bookedbarber.com, support@bookedbarber.com)
- [ ] **Email templates** with BookedBarber branding
- [ ] **Deliverability testing** to major providers (Gmail, Outlook, corporate domains)
- [ ] **Bounce and complaint webhooks** configured for automated list hygiene
- [ ] **Email analytics tracking** implemented
- [ ] **Unsubscribe mechanism** working for marketing emails
- [ ] **DMARC/SPF/DKIM records** configured and verified
- [ ] **Sender reputation monitoring** dashboard setup

**Note**: Free SendGrid accounts use shared IPs that may be blacklisted by corporate email servers. Production deployment requires dedicated IP to ensure reliable delivery.

#### SMS Service (Twilio)
- [ ] Twilio account setup
- [ ] Phone number verified
- [ ] SMS templates configured
- [ ] Test messages sent successfully
- [ ] Opt-out mechanism implemented

#### Google Calendar Integration
- [ ] Google Cloud Console project setup
- [ ] OAuth 2.0 credentials configured
- [ ] Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Integration tested end-to-end

### 5. Monitoring & Observability ✅

#### Error Tracking
- [ ] Sentry project configured
- [ ] Error alerts setup
- [ ] Performance monitoring enabled
- [ ] Release tracking configured

#### Application Monitoring
- [ ] Health check endpoints working
- [ ] Uptime monitoring configured
- [ ] Performance metrics collection
- [ ] Log aggregation setup

#### Alerting
- [ ] Critical error alerts configured
- [ ] Performance degradation alerts
- [ ] Payment failure alerts
- [ ] Database connection alerts

### 6. Performance & Scalability ✅

#### Application Performance
- [ ] API response times < 500ms average
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Static assets optimized

#### Load Testing
- [ ] Concurrent user load tested
- [ ] Payment processing under load tested
- [ ] Database performance under load verified
- [ ] Memory usage monitored

### 7. Deployment Platform ✅

#### Railway Deployment
- [ ] Environment variables set in Railway dashboard
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Health checks passing
- [ ] Auto-deployment from git configured

#### Render Deployment
- [ ] Environment variables set in Render dashboard
- [ ] PostgreSQL database connected
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Build and deploy successful

### 8. Testing & Validation ✅

#### Pre-Deployment Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] End-to-end booking flow tested
- [ ] Payment processing tested
- [ ] Email/SMS notifications tested

#### Post-Deployment Validation
- [ ] Health check endpoint responding
- [ ] API endpoints accessible
- [ ] Frontend connecting to backend
- [ ] Authentication flow working
- [ ] Booking creation working
- [ ] Payment processing working

### 9. Backup & Recovery ✅

#### Backup Strategy
- [ ] Database backup schedule configured
- [ ] Backup retention policy set
- [ ] Backup restoration tested
- [ ] Environment variable backup secured

#### Disaster Recovery
- [ ] Recovery procedures documented
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined
- [ ] Incident response plan ready

### 10. Documentation & Support ✅

#### Technical Documentation
- [ ] API documentation up to date
- [ ] Environment setup documented
- [ ] Troubleshooting guide available
- [ ] Architecture documentation current

#### User Documentation
- [ ] User guides updated
- [ ] Admin panel documentation
- [ ] Support contact information
- [ ] Privacy policy and terms updated

## Quick Validation Commands

### Run Environment Validator
```bash
cd backend-v2
python validate_environment.py
```

### Test Database Connection
```bash
python -c "from database import engine; print('Database connection:', engine.execute('SELECT 1').scalar())"
```

### Test Stripe Configuration
```bash
python -c "import stripe; from config import settings; stripe.api_key = settings.stripe_secret_key; print('Stripe:', stripe.Account.retrieve())"
```

### Test API Health
```bash
curl https://your-api-domain.com/health
```

## Go-Live Checklist

### Final Pre-Launch
- [ ] All items above completed and verified
- [ ] Load testing completed successfully
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Monitoring and alerting active

### Launch Day
- [ ] DNS records updated to point to production
- [ ] SSL certificates verified
- [ ] All team members notified
- [ ] Monitoring dashboards open
- [ ] Support channels ready

### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify payment processing
- [ ] Monitor user activity
- [ ] Collect and address feedback

## Emergency Contacts & Procedures

### Critical Service Contacts
- **Stripe Support**: [Stripe Dashboard](https://dashboard.stripe.com)
- **Database Provider**: Railway/Render support
- **DNS Provider**: Domain registrar support
- **Email Service**: SendGrid support

### Rollback Procedures
1. **Immediate Issues**: Revert to previous deployment
2. **Database Issues**: Restore from latest backup
3. **Payment Issues**: Contact Stripe support immediately
4. **DNS Issues**: Revert DNS changes

## Status Legend
- ✅ **Ready**: All items in this section are deployment-ready
- ⚠️ **Partial**: Some items configured, others need attention
- ❌ **Not Ready**: Critical items missing, must fix before deployment

---

**Important**: This checklist should be completed and verified before any production deployment. Each item should be tested and confirmed working in a staging environment first.

**Last Updated**: 2025-06-29  
**For**: 6FB Booking Platform v2  
**Environment**: Production Deployment