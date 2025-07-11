# BookedBarber V2 - Staging Deployment Checklist

## 🚀 Pre-Deployment Steps

### 1. Code Preparation
- [ ] All changes committed to Git
- [ ] Code reviewed and tested locally
- [ ] Build passes without errors: `npm run build`
- [ ] Tests pass: `npm test` and `pytest`
- [ ] Linting passes: `npm run lint`

### 2. Branch Setup
- [ ] Create staging branch: `git checkout -b staging`
- [ ] Push staging branch: `git push origin staging`
- [ ] Ensure render.staging.yaml is in staging branch

### 3. Environment Configuration
- [ ] Copy `.env.staging.example` to `.env.staging`
- [ ] Update all staging-specific values
- [ ] Ensure test Stripe keys are configured
- [ ] Configure staging OAuth credentials

## 📦 Render Deployment

### 4. Initial Setup (First Time Only)
- [ ] Log in to [Render Dashboard](https://dashboard.render.com)
- [ ] Connect GitHub repository if not connected
- [ ] Create new Blueprint Instance
- [ ] Select staging branch
- [ ] Use `render.staging.yaml` as blueprint file

### 5. Service Configuration
- [ ] Backend service created: `sixfb-backend-v2-staging`
- [ ] Frontend service created: `sixfb-frontend-v2-staging`
- [ ] Database created: `sixfb-db-staging`
- [ ] All services set to deploy from staging branch

### 6. Environment Variables (Render Dashboard)
Configure these in each service's environment tab:

#### Backend Service
- [ ] `STRIPE_SECRET_KEY` (test key)
- [ ] `STRIPE_PUBLISHABLE_KEY` (test key)
- [ ] `STRIPE_WEBHOOK_SECRET` (test webhook)
- [ ] `SENDGRID_API_KEY`
- [ ] `FROM_EMAIL` = staging@bookedbarber.com
- [ ] `GOOGLE_CLIENT_ID` (staging OAuth)
- [ ] `GOOGLE_CLIENT_SECRET` (staging OAuth)
- [ ] `TWILIO_ACCOUNT_SID` (optional)
- [ ] `TWILIO_AUTH_TOKEN` (optional)

#### Frontend Service
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key)
- [ ] `NEXT_PUBLIC_GA_TRACKING_ID` (leave empty for staging)

## 🌐 Domain Configuration

### 7. Custom Domain Setup (Optional)
- [ ] Add custom domain in Render dashboard
- [ ] Backend: `api-staging.bookedbarber.com`
- [ ] Frontend: `staging.bookedbarber.com`
- [ ] Update DNS records (CNAME to Render URLs)
- [ ] Wait for SSL certificates to provision

## 🧪 Post-Deployment Verification

### 8. Service Health Checks
- [ ] Backend health: https://sixfb-backend-v2-staging.onrender.com/health
- [ ] Frontend loads: https://sixfb-frontend-v2-staging.onrender.com
- [ ] API docs accessible: https://sixfb-backend-v2-staging.onrender.com/docs

### 9. Database Setup
- [ ] Run migrations: Connect to Render shell and run `alembic upgrade head`
- [ ] (Optional) Seed test data: `python scripts/seed_staging_data.py`
- [ ] Create test admin user

### 10. Feature Testing
- [ ] Login/Registration works
- [ ] Booking flow completes
- [ ] Payments work with test cards
- [ ] Calendar integration connects
- [ ] Email notifications send
- [ ] Analytics dashboard loads

## 🔧 Ongoing Management

### 11. Deployment Process
- [ ] Push changes to staging branch
- [ ] Auto-deploy triggers (if enabled)
- [ ] Or manual deploy from Render dashboard
- [ ] Monitor logs for errors

### 12. Monitoring
- [ ] Check Render dashboard for service status
- [ ] Monitor error logs
- [ ] Set up alerts for downtime
- [ ] Review performance metrics

## 📝 Important URLs

### Staging Environment
- **Frontend**: https://sixfb-frontend-v2-staging.onrender.com
- **Backend API**: https://sixfb-backend-v2-staging.onrender.com
- **API Documentation**: https://sixfb-backend-v2-staging.onrender.com/docs
- **Health Check**: https://sixfb-backend-v2-staging.onrender.com/health

### Custom Domains (After Setup)
- **Frontend**: https://staging.bookedbarber.com
- **Backend API**: https://api-staging.bookedbarber.com

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in Render dashboard
   - Ensure all dependencies are in requirements.txt/package.json
   - Verify Python/Node versions match

2. **Database Connection Issues**
   - DATABASE_URL is automatically set by Render
   - Check if migrations ran successfully
   - Verify database service is running

3. **Environment Variable Issues**
   - Double-check all required variables are set
   - No quotes needed in Render dashboard
   - Restart service after changing variables

4. **Domain/SSL Issues**
   - DNS propagation can take up to 48 hours
   - Ensure CNAME records point to Render URLs
   - Check SSL certificate status in dashboard

## 🛠️ Useful Commands

### Deploy from Command Line
```bash
# Use the deployment script
./scripts/deploy-staging-render.sh

# Or manually push to staging
git push origin staging
```

### Connect to Backend Shell (Render)
```bash
# In Render dashboard, go to backend service
# Click "Shell" tab
# Run commands like:
alembic upgrade head
python -c "from database import get_db; print('DB connected')"
```

### Check Deployment Status
```bash
# If RENDER_API_KEY is set
./scripts/render-deployment-checker.sh
```

## 🎯 Success Criteria

Your staging environment is successfully deployed when:
- ✅ All services show "Live" status in Render
- ✅ Frontend loads without errors
- ✅ Backend health check returns 200
- ✅ Can create a test account and login
- ✅ Can complete a test booking
- ✅ Logs show no critical errors

---

**Note**: This staging environment uses test payment keys and should never process real payments. It's designed for testing new features before production deployment.