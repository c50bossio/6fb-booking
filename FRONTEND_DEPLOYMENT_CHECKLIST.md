# Frontend Deployment Checklist for Render

## Pre-Deployment Verification

### Local Testing
- [ ] Run `npm run validate:build` in frontend directory
- [ ] Build passes without errors: `npm run build`
- [ ] No TypeScript errors (or `ignoreBuildErrors: true` in next.config.js)
- [ ] No ESLint errors (or `ignoreDuringBuilds: true` in next.config.js)
- [ ] All tests pass: `npm test`

### Configuration Files
- [ ] `package.json` has correct scripts (build, start)
- [ ] `package-lock.json` is committed
- [ ] `next.config.js` has `output: 'standalone'` for production
- [ ] `.env.production.example` documents all required variables

### API Configuration
- [ ] `NEXT_PUBLIC_API_URL` points to correct backend
- [ ] Backend CORS includes frontend URL
- [ ] API client uses environment variable for base URL

## Render Configuration

### Service Setup (render.yaml)
- [ ] Frontend service defined in render.yaml
- [ ] Build command: `cd frontend && npm ci && npm run build`
- [ ] Start command: `cd frontend && npm run start`
- [ ] Health check path: `/`
- [ ] Region matches backend (oregon)
- [ ] Plan selected (starter: $7/month)

### Environment Variables in Render
- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (if using Stripe)
- [ ] `NEXT_PUBLIC_GA_TRACKING_ID` (if using Analytics)
- [ ] `NEXT_PUBLIC_SITE_URL` (frontend URL)
- [ ] `NEXT_TELEMETRY_DISABLED=1`
- [ ] `PORT=3000` (Render will override)

## Deployment Process

### Initial Deployment
- [ ] Push code to GitHub main branch
- [ ] Create new Blueprint in Render
- [ ] Select repository with render.yaml
- [ ] Review services to be created
- [ ] Click "Apply" to create services

### Post-Deployment Verification
- [ ] Service shows as "Live" in Render dashboard
- [ ] Health check passing (green status)
- [ ] Frontend loads in browser
- [ ] No console errors in browser
- [ ] API calls successful (check Network tab)

## API Integration Testing

### Backend Connectivity
- [ ] Login page loads
- [ ] Can submit login form
- [ ] API requests go to correct backend URL
- [ ] No CORS errors in console
- [ ] Authentication tokens stored correctly

### Feature Testing
- [ ] Dashboard loads after login
- [ ] Calendar functionality works
- [ ] Appointment creation/editing works
- [ ] Analytics data displays
- [ ] Settings pages accessible

## Production Readiness

### Security
- [ ] HTTPS enabled (automatic on Render)
- [ ] Security headers configured (next.config.js)
- [ ] Environment variables not exposed
- [ ] No sensitive data in logs

### Performance
- [ ] Page load time < 3 seconds
- [ ] No memory warnings in Render logs
- [ ] Static assets loading correctly
- [ ] Images optimized by Next.js

### Monitoring
- [ ] Health checks configured
- [ ] Email alerts set up for failures
- [ ] Logs accessible in Render dashboard
- [ ] Error tracking configured (if using Sentry)

## Troubleshooting Quick Checks

### If Build Fails
- [ ] Check Node version compatibility
- [ ] Verify all dependencies in package.json
- [ ] Check for missing environment variables
- [ ] Review build logs for specific errors

### If Runtime Fails
- [ ] Verify start command is correct
- [ ] Check PORT environment variable
- [ ] Review runtime logs for errors
- [ ] Ensure standalone build output exists

### If API Calls Fail
- [ ] Verify NEXT_PUBLIC_API_URL is correct
- [ ] Check backend is running
- [ ] Confirm CORS settings on backend
- [ ] Test API endpoint directly

## Final Sign-off

- [ ] All checklist items completed
- [ ] Frontend accessible at Render URL
- [ ] Core functionality tested
- [ ] Team notified of deployment
- [ ] Documentation updated with new URL

## Quick Commands Reference

```bash
# Local validation
cd frontend && npm run validate:build

# Manual deployment trigger (if auto-deploy disabled)
git push origin main

# View logs (with Render CLI)
render logs 6fb-booking-frontend --tail

# Rollback if needed
# Use Render dashboard > Events > Rollback
```

## Important URLs

- Frontend URL: `https://6fb-booking-frontend.onrender.com`
- Backend API: `https://sixfb-backend.onrender.com`
- Render Dashboard: `https://dashboard.render.com`
- API Docs: `https://sixfb-backend.onrender.com/docs`
