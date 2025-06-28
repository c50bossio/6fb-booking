# Production Deployment Guide for 6FB Booking System

## Prerequisites
1. Production domain name (e.g., `yourbusiness.com`)
2. Stripe live account with API keys
3. Production database (PostgreSQL recommended)
4. SendGrid API key for emails
5. Google OAuth credentials for production

## Backend Deployment to Render (Current Setup)

Backend is already deployed at: https://sixfb-backend.onrender.com

### Updating Backend Environment Variables in Render
1. Go to Render dashboard
2. Select your backend service
3. Update environment variables in the Environment tab
4. Deploy new version if needed

## Frontend Deployment to Railway

### 1. Create Railway Account
- Sign up at https://railway.app
- Connect your GitHub account

### 2. Deploy Frontend
```bash
# From frontend directory
railway login
railway init
railway up
```

### 3. Configure Environment Variables
Add these in Railway project settings under Variables:
```
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_ENVIRONMENT=production
```

### 4. Auto-Deploy
Railway will automatically deploy on git push after initial setup.

## Domain Setup

### 1. Configure Custom Domain
- In Railway: Add your domain in project settings (frontend)
- In Render: Custom domain already configured (backend)

### 2. Update DNS Records
Point your domain to:
- Frontend: Railway's provided URL
- Backend: Render's provided URL (already configured)

### 3. SSL Certificates
Both Railway and Render automatically provide SSL certificates.

## Stripe Configuration

### 1. Update Webhook Endpoint
In Stripe Dashboard:
- Go to Webhooks
- Update endpoint: `https://sixfb-backend.onrender.com/api/v1/stripe/webhooks`
- Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 2. Update OAuth Settings
- Add production redirect URIs
- Update return URLs to your domain

## Post-Deployment Checklist

### 1. Test Core Functionality
- [ ] User registration/login
- [ ] Booking flow end-to-end
- [ ] Payment processing
- [ ] Email notifications
- [ ] Google Calendar sync

### 2. Monitor Application
- [ ] Check Railway logs for backend errors
- [ ] Check Vercel deployment logs
- [ ] Monitor Stripe dashboard for payments
- [ ] Test all integrations

### 3. Security Verification
- [ ] All environment variables are secure
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is active

## Troubleshooting

### Common Issues
1. **Database Connection Errors**: Check DATABASE_URL format
2. **CORS Errors**: Verify ALLOWED_ORIGINS includes your domain
3. **Stripe Webhook Failures**: Check webhook endpoint URL and secrets
4. **Email Not Sending**: Verify SendGrid API key and from_email

### Monitoring
- Railway: Check logs in dashboard (frontend)
- Render: Check logs in dashboard (backend)
- Stripe: Monitor webhook delivery
- Application: Check health endpoints

## Rollback Plan
If deployment fails:
1. Revert to previous git commit
2. Redeploy stable version
3. Check environment variables
4. Contact support if needed

## Environment Variables Reference

### Backend (.env.production)
```
ENVIRONMENT=production
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
SENDGRID_API_KEY=SG....
FRONTEND_URL=https://yourdomain.com
```

### Frontend (.env.production)
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXTAUTH_URL=https://yourdomain.com
```

## Support
- Railway: https://railway.app/help
- Render: https://render.com/support
- Stripe: https://support.stripe.com
