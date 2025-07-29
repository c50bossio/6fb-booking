# 🚀 Vercel + GitHub Deployment Setup Guide

## Overview

This guide sets up a professional deployment workflow with:
- **Staging Environment**: `6fb-client-staging.vercel.app` (staging branch)
- **Production Environment**: `bookedbarber.com` (production branch)  
- **Preview Deployments**: Automatic previews for pull requests
- **GitHub Integration**: Automatic deployments on push

## 🎯 Current Branch Strategy

Your repository is already set up with the perfect branch structure:

```
📁 6fb-booking (GitHub Repository)
├── 🌿 staging branch      → Deploys to staging.vercel.app
├── 🌿 production branch   → Deploys to bookedbarber.com
└── 🌿 feature branches    → Create preview deployments
```

## 📋 Step-by-Step Setup

### Step 1: Create Vercel Projects

#### A. Create Staging Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Connect your GitHub account
3. Select repository: `6fb-booking`
4. Configure project:
   - **Project Name**: `6fb-client-staging`
   - **Framework**: Next.js
   - **Root Directory**: `backend-v2/frontend-v2`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm ci`
5. Click "Deploy"

#### B. Create Production Project  
1. Go to [vercel.com/new](https://vercel.com/new) again
2. Select repository: `6fb-booking`
3. Configure project:
   - **Project Name**: `6fb-client-production` or `bookedbarber`
   - **Framework**: Next.js
   - **Root Directory**: `backend-v2/frontend-v2`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm ci`
4. Click "Deploy"

### Step 2: Configure Git Branches

#### A. Staging Project
1. Go to staging project → Settings → Git
2. Set **Production Branch**: `staging`
3. This makes the staging branch deploy to this project

#### B. Production Project
1. Go to production project → Settings → Git  
2. Set **Production Branch**: `production`
3. This makes the production branch deploy to this project

### Step 3: Set Environment Variables

#### A. Staging Environment Variables
1. Go to staging project → Settings → Environment Variables
2. Copy all variables from `backend-v2/frontend-v2/.env.vercel.staging`
3. Set **Environment**: "Preview" and "Development"
4. Replace placeholder values with your actual staging keys:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Your test Stripe key
   - `NEXT_PUBLIC_API_URL` → Your staging backend URL
   - Other service keys as needed

#### B. Production Environment Variables
1. Go to production project → Settings → Environment Variables
2. Copy all variables from `backend-v2/frontend-v2/.env.vercel.production`
3. Set **Environment**: "Production"
4. Replace placeholder values with your actual production keys:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Your live Stripe key
   - `NEXT_PUBLIC_API_URL` → Your production backend URL
   - `NEXT_PUBLIC_GA_TRACKING_ID` → Your Google Analytics ID
   - Other production service keys

### Step 4: Set Up GitHub Secrets (Optional - for GitHub Actions)

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add these repository secrets:
   - `VERCEL_TOKEN` → Get from [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` → Found in Vercel team settings
   - `VERCEL_STAGING_PROJECT_ID` → Found in staging project settings
   - `VERCEL_PRODUCTION_PROJECT_ID` → Found in production project settings

### Step 5: Configure Custom Domain (Production)

1. Go to production project → Settings → Domains
2. Add your domains:
   - `bookedbarber.com`
   - `www.bookedbarber.com`
3. Follow Vercel's DNS configuration instructions

## 🔄 Your New Workflow

### Daily Development Workflow

1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Develop your feature**: Make changes, commit code
3. **Test on staging**: 
   ```bash
   git checkout staging
   git merge feature/new-feature
   git push origin staging
   ```
4. **Automatic staging deployment** happens → Test at staging URL
5. **Deploy to production**:
   ```bash
   git checkout production  
   git merge staging
   git push origin production
   ```
6. **Automatic production deployment** happens → Live at bookedbarber.com

### Pull Request Workflow

1. **Create PR**: staging ← feature/new-feature
2. **Automatic preview** deploys → Test in preview environment
3. **Merge PR**: Code goes to staging → Automatic staging deployment
4. **Create production PR**: production ← staging  
5. **Merge production PR** → Automatic production deployment

## 🌐 Your New URLs

After setup, you'll have:

- **Staging**: `https://6fb-client-staging.vercel.app`
- **Production**: `https://bookedbarber.com` (with custom domain)
- **Preview**: `https://6fb-booking-git-feature-branch.vercel.app` (for PRs)

## 🔧 Environment Configuration

### Staging Features (Enabled)
- Debug panel
- Test data display
- Development tools
- Staging environment indicator
- Test Stripe keys
- Disabled analytics

### Production Features (Enabled)  
- Live Stripe keys
- Google Analytics tracking
- Error tracking (Sentry)
- Security headers
- Performance optimizations
- SEO optimizations

## ✅ Verification Steps

### Test Staging Deployment
1. Make a small change to your code
2. Push to staging branch: `git push origin staging`
3. Check Vercel dashboard for deployment
4. Visit staging URL to verify changes

### Test Production Deployment
1. Merge staging to production: `git checkout production && git merge staging`
2. Push to production: `git push origin production`
3. Check Vercel dashboard for deployment  
4. Visit production URL to verify changes

## 🚨 Important Notes

### Security
- ✅ Only use test keys in staging environment
- ✅ Use live keys only in production environment
- ✅ Never commit API keys to repository
- ✅ All keys are stored in Vercel environment variables

### Performance
- ✅ Vercel provides edge caching and CDN
- ✅ Automatic image optimization
- ✅ Fast global deployments
- ✅ Built-in performance monitoring

### Monitoring
- ✅ Real-time deployment logs in Vercel dashboard
- ✅ Performance metrics and analytics
- ✅ Automatic error tracking
- ✅ GitHub integration shows deployment status

## 📞 Support

If you need help:
- Check Vercel deployment logs in dashboard
- Review GitHub Actions logs for build issues
- Verify environment variables are set correctly
- Test locally first: `npm run build` in frontend-v2 directory

## 🎉 Benefits

Your new setup provides:
- ✅ **Professional deployment pipeline**
- ✅ **Zero-downtime deployments** 
- ✅ **Automatic preview environments**
- ✅ **Fast global CDN delivery**
- ✅ **Built-in performance monitoring**
- ✅ **Easy rollback capabilities**
- ✅ **Team collaboration features**