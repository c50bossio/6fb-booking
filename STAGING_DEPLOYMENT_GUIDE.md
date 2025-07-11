# 🚀 Staging Deployment Guide - BookedBarber V2

## Status: Ready for Deployment ✅

Repository cleaned of large files. All staging configurations ready for deployment.

## 📋 Render Blueprint Deployment

### Quick Deploy Steps
1. Go to: https://dashboard.render.com/blueprints
2. Click "New Blueprint Instance"
3. Repository: `c50bossio/6fb-booking`
4. Branch: `staging-deploy-clean`
5. Blueprint file: `render.staging.yaml`
6. Click "Create"

### Expected Services
- **Backend**: `sixfb-backend-v2-staging`
- **Frontend**: `sixfb-frontend-v2-staging`
- **Database**: `sixfb-db-staging`

### Environment Variables Needed
Configure in Render dashboard:
```
# Backend
DATABASE_URL=postgresql://user:pass@host/sixfb_staging
SECRET_KEY=your-staging-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
ENVIRONMENT=staging
DEBUG=true

# Frontend  
NEXT_PUBLIC_API_URL=https://sixfb-backend-v2-staging.onrender.com
NEXT_PUBLIC_SITE_URL=https://sixfb-frontend-v2-staging.onrender.com
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Expected URLs
- Frontend: https://sixfb-frontend-v2-staging.onrender.com
- Backend: https://sixfb-backend-v2-staging.onrender.com
- API Docs: https://sixfb-backend-v2-staging.onrender.com/docs

---
Repository cleaned and ready for deployment!