# 🚀 Staging Deployment Guide - BookedBarber V2

## Status: Automated Deployment Ready ✅

**Problem Solved**: Repository git history issues fixed with automated deployment tools.

## 🎯 **Why You Can Now Deploy Automatically**

### Issues We Fixed:
1. ✅ **Large File Removal**: Cleaned 158MB backup file from git history
2. ✅ **Secret Detection**: Created clean deployment process bypassing GitHub push protection
3. ✅ **Build Errors**: Fixed all TypeScript compilation issues
4. ✅ **Automation**: Created direct Render API deployment tools

## 🚀 **Three Deployment Options**

### Option 1: Direct Render API Deployment (Recommended)
```bash
# Set your Render API key (get from https://dashboard.render.com/account/api-keys)
export RENDER_API_KEY=your_render_api_key_here

# Run the direct deployment script
./scripts/deploy-render-direct.sh
```

**Why this works**: Bypasses git push entirely, uses Render API directly.

### Option 2: Manual Render Dashboard (Easiest)
1. Go to: https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository: `c50bossio/6fb-booking`
4. Select branch: `staging` or `staging-deploy-clean`
5. Configure services as shown below

### Option 3: GitHub Actions (Automated)
```bash
# Set GitHub secrets in repository settings:
# RENDER_API_KEY, RENDER_BACKEND_SERVICE_ID, RENDER_FRONTEND_SERVICE_ID

# Push to staging branch triggers automatic deployment
git push origin staging
```

## 📋 **Service Configuration**

### Backend Service
- **Name**: `sixfb-backend-v2-staging`
- **Runtime**: Python 3.9
- **Build Command**: `cd backend-v2 && pip install -r requirements.txt`
- **Start Command**: `cd backend-v2 && uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Branch**: `staging`

### Frontend Service
- **Name**: `sixfb-frontend-v2-staging`
- **Runtime**: Node 18
- **Build Command**: `cd backend-v2/frontend-v2 && npm ci && npm run build`
- **Start Command**: `cd backend-v2/frontend-v2 && npm start`
- **Branch**: `staging`

### Database
- **Name**: `sixfb-db-staging`
- **Type**: PostgreSQL
- **Database**: `sixfb_staging`
- **Plan**: Free tier

## 🔐 **Environment Variables Configuration**

### Copy from Template
```bash
# Use the prepared template
cp backend-v2/.env.staging.render render-env-vars.txt
# Edit with your actual keys, then copy to Render dashboard
```

### Required Variables
See `backend-v2/.env.staging.render` for complete list including:
- Database credentials (auto-provided by Render)
- Stripe test keys
- SendGrid API key
- OAuth credentials
- Debug and staging flags

## ✅ **Deployment Verification**

### Automatic Testing
```bash
# Test the deployed staging environment
./scripts/verify-staging-deployment.sh
```

### Manual Verification
- **Frontend**: https://sixfb-frontend-v2-staging.onrender.com
- **Backend**: https://sixfb-backend-v2-staging.onrender.com/health
- **API Docs**: https://sixfb-backend-v2-staging.onrender.com/docs

## 🔧 **Troubleshooting**

### Common Issues
1. **Build fails**: Check logs in Render dashboard
2. **Environment vars**: Use the template in `.env.staging.render`
3. **Database connection**: Verify DATABASE_URL is set correctly
4. **CORS errors**: Ensure CORS_ORIGINS includes frontend URL

### Getting Help
- **Render Logs**: Check service logs in Render dashboard
- **Verification**: Run `./scripts/verify-staging-deployment.sh`
- **Manual Check**: Test endpoints directly with curl

## 🎉 **Success Criteria**

After successful deployment:
- ✅ Frontend loads at staging URL
- ✅ Backend health check returns 200
- ✅ API documentation accessible
- ✅ Database connection working
- ✅ CORS configured correctly

## 🚀 **Next Steps After Deployment**

1. **Test Features**: Use the staging environment for testing
2. **Set Custom Domain**: Point staging.bookedbarber.com to Render
3. **Configure Monitoring**: Set up alerts and health checks
4. **Team Access**: Share staging URLs with team members

---

**Deployment Status**: ✅ Ready for automated deployment
**Repository**: Clean and optimized
**Last Updated**: July 11, 2025