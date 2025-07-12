# 🚀 6FB Booking V2 - Deployment Workflow Guide

## 🎯 Overview

This guide covers the complete workflow for developing locally and deploying to staging. Perfect for rapid development iteration!

## 📋 Quick Start

### **Start Local Development:**
```bash
./start-local-dev.sh
```

### **Deploy to Staging:**
```bash
./deploy-to-staging.sh "Your feature description"
```

### **Stop Local Development:**
```bash
./stop-local-dev.sh
```

## 🔄 Complete Development Workflow

### **1. Start Local Development**
```bash
# Start both frontend and backend
./start-local-dev.sh

# Your app will be available at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### **2. Develop and Test Locally**
- Make your changes in the codebase
- Test thoroughly on localhost
- Verify both frontend and backend work together

### **3. Deploy to Staging**
```bash
# Quick deployment with auto-generated message
./deploy-to-staging.sh

# Or with custom commit message
./deploy-to-staging.sh "feat: add user authentication"
```

### **4. Monitor Staging Deployment**
The script will automatically:
- ✅ Commit your changes
- ✅ Push to GitHub (`deployment-clean` branch)
- ✅ Trigger auto-deploy on Render
- ✅ Monitor deployment status
- ✅ Verify services are responding

### **5. Test on Staging**
- **Frontend**: https://sixfb-frontend-v2-staging.onrender.com
- **Backend**: https://sixfb-backend-v2-staging.onrender.com
- **API Docs**: https://sixfb-backend-v2-staging.onrender.com/docs

## 💬 Perfect Claude Prompts

### **For Quick Features:**
```
"I've finished testing [feature name] locally and want to deploy to staging. Please commit and deploy the changes."
```

### **For Bug Fixes:**
```
"I fixed [bug description] locally. Please deploy this hotfix to staging immediately."
```

### **For New Features:**
```
"I've completed [feature name] locally and it's ready for staging testing. Please review the code and deploy to staging."
```

### **For Environment Issues:**
```
"My local environment isn't syncing with staging. Please help debug the configuration differences."
```

### **For Rollbacks:**
```
"The latest staging deployment has issues. Please rollback to the previous working version."
```

## 🌍 Environment Overview

### **Local Development:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Database**: SQLite (./6fb_booking.db)
- **Environment**: Development mode
- **Auto-reload**: Enabled for both services

### **Staging Environment:**
- **Frontend**: https://sixfb-frontend-v2-staging.onrender.com
- **Backend**: https://sixfb-backend-v2-staging.onrender.com
- **Database**: PostgreSQL (6fb-database on Render)
- **Environment**: Staging mode
- **Auto-deploy**: Enabled from `deployment-clean` branch

### **Environment Variables:**
| Variable | Local | Staging |
|----------|--------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `https://sixfb-backend-v2-staging.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://sixfb-frontend-v2-staging.onrender.com` |
| `DATABASE_URL` | `sqlite:///./6fb_booking.db` | `postgresql://...` |
| `ENVIRONMENT` | `development` | `staging` |

## 🔧 Advanced Workflows

### **Feature Branch Development:**
```bash
# Create feature branch
git checkout -b feature/user-profile

# Develop locally
./start-local-dev.sh
# ... make changes ...

# When ready for staging, merge to deployment-clean
git checkout deployment-clean
git merge feature/user-profile
./deploy-to-staging.sh "feat: add user profile management"

# Clean up feature branch
git branch -d feature/user-profile
```

### **Hotfix Workflow:**
```bash
# Quick fix directly on deployment-clean
git checkout deployment-clean
# ... make urgent fix ...
./deploy-to-staging.sh "fix: critical payment processing bug"
```

### **Skip Auto-Deploy:**
```bash
# For documentation changes that don't need deployment
git commit -m "docs: update README [skip render]"
git push origin deployment-clean
```

## 📊 Deployment Timeline

| Action | Time | What Happens |
|--------|------|-------------|
| `./deploy-to-staging.sh` | 0s | Script starts, commits changes |
| Git push | 5-10s | Code pushed to GitHub |
| Render detects push | 10-15s | Auto-deploy triggers |
| Build starts | 30s | Dependencies installed |
| Build completes | 2-3min | Services restart |
| Health check passes | 3-5min | Deployment complete |

## 🚨 Troubleshooting

### **Local Development Issues:**

**Port conflicts:**
```bash
# Kill processes on ports 3000 and 8000
./stop-local-dev.sh
# Then restart
./start-local-dev.sh
```

**Environment variables missing:**
```bash
# Check if .env files exist
ls backend-v2/.env
ls backend-v2/frontend-v2/.env.local

# The startup script will create basic .env.local if missing
```

**Dependencies out of sync:**
```bash
# Backend dependencies
cd backend-v2
pip install -r requirements.txt

# Frontend dependencies  
cd frontend-v2
npm install
```

### **Staging Deployment Issues:**

**Build fails:**
- Check Render dashboard logs
- Verify no TypeScript errors locally
- Ensure all dependencies are in package.json

**Services don't respond:**
- Wait 5 minutes for full deployment
- Check environment variables in Render dashboard
- Verify branch is `deployment-clean`

**API errors:**
- Check CORS configuration
- Verify frontend/backend URLs match
- Check database connection

## 🎯 Best Practices

### **Development:**
1. ✅ Always test locally before deploying
2. ✅ Use descriptive commit messages
3. ✅ Test both frontend and backend integration
4. ✅ Verify environment variables are correct

### **Deployment:**
1. ✅ Deploy frequently (multiple times per day)
2. ✅ Test immediately after deployment
3. ✅ Monitor Render dashboard during deployment
4. ✅ Keep staging in sync with development

### **Branch Management:**
1. ✅ Use `deployment-clean` for staging deployments
2. ✅ Create feature branches for complex features
3. ✅ Keep `main` branch for production-ready code
4. ✅ Clean up feature branches after merging

## 📝 Git Workflow Summary

```
localhost development → deployment-clean branch → staging environment → production (when ready)
       ↓                        ↓                         ↓
   Local testing          Auto-deploy trigger      Integration testing
```

## 🚀 Ready for Production?

When your staging environment is stable and ready:

1. **Merge to main branch**
2. **Create production services** (follow SIMPLE_RENDER_DEPLOY.md)
3. **Set production environment variables**
4. **Deploy production services**
5. **Configure custom domain and SSL**

---

**🎉 You now have a complete localhost-to-staging workflow that makes deployment as easy as running one command!**