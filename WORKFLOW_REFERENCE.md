# 🔄 BookedBarber V2 - Complete Workflow Reference
**Last Updated**: July 14, 2025  
**Status**: ACTIVE WORKFLOW DOCUMENTATION

---

## 🎯 **OVERVIEW**

This document defines the complete development workflow for BookedBarber V2, including environment architecture, Git branching strategy, and deployment processes.

---

## 🌍 **ENVIRONMENT ARCHITECTURE**

### **Environment Hierarchy**
```
Development → Feature Branches → Staging (Cloud) → Production
```

### **Environment Details**

| Environment | Frontend | Backend | Database | Purpose |
|-------------|----------|---------|----------|---------|
| **Development** | `localhost:3000` | `localhost:8000` | SQLite (`6fb_booking.db`) | Daily development work |
| **Staging** | `sixfb-frontend-v2-staging.onrender.com` | `sixfb-backend-v2-staging.onrender.com` | PostgreSQL (Render) | Team collaboration, demos |
| **Production** | `bookedbarber.com` | `api.bookedbarber.com` | PostgreSQL (Production) | Live customer environment |

### **Key Changes from Legacy Workflow**
- ❌ **Removed**: Local staging ports (localhost:3001, localhost:8001)
- ✅ **Added**: Cloud-based staging on Render.com
- ✅ **Simplified**: Direct development → cloud staging → production flow

---

## 🌿 **GIT BRANCHING STRATEGY**

### **Branch Hierarchy**
```
main (production)
├── staging (cloud deployments)
├── develop (integration branch)
├── feature/feature-name-YYYYMMDD (individual features)
└── hotfix/fix-name-YYYYMMDD (emergency fixes)
```

### **Branch Purposes**

#### **Main Branches**
- **`main`**: Production deployments ONLY
- **`develop`**: Integration branch for all feature development
- **`staging`**: Cloud staging deployments (Render)

#### **Supporting Branches**
- **`feature/name-YYYYMMDD`**: Individual feature development
- **`hotfix/name-YYYYMMDD`**: Production emergency fixes
- **`release/version-YYYYMMDD`**: Release preparation (optional)

---

## 🚀 **DEPLOYMENT WORKFLOWS**

### **1. Regular Feature Development**

#### **Step 1: Feature Development**
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/calendar-sync-20250714

# Develop locally
# ... development work on localhost:3000 + localhost:8000 ...

# Commit and push
git add .
git commit -m "feat: add calendar sync functionality"
git push origin feature/calendar-sync-20250714
```

#### **Step 2: Integration**
```bash
# Create Pull Request to develop
# After code review and approval, merge to develop
```

#### **Step 3: Staging Deployment**
```bash
# Deploy to cloud staging
git checkout staging
git pull origin staging
git merge develop
git push origin staging

# This triggers automatic deployment to:
# - Frontend: sixfb-frontend-v2-staging.onrender.com
# - Backend: sixfb-backend-v2-staging.onrender.com
```

#### **Step 4: Production Deployment**
```bash
# After staging validation, deploy to production
git checkout main
git pull origin main
git merge staging
git push origin main

# This triggers deployment to:
# - Frontend: bookedbarber.com
# - Backend: api.bookedbarber.com
```

### **2. Emergency Hotfix Workflow**

#### **Step 1: Hotfix Creation**
```bash
# Create hotfix directly from main
git checkout main
git pull origin main
git checkout -b hotfix/payment-bug-20250714

# Fix the issue
# ... emergency fix development ...

# Test locally and commit
git add .
git commit -m "fix: resolve payment processing bug"
git push origin hotfix/payment-bug-20250714
```

#### **Step 2: Emergency Deployment**
```bash
# Deploy directly to production
git checkout main
git merge hotfix/payment-bug-20250714
git push origin main

# Immediately merge back to develop
git checkout develop
git merge main
git push origin develop

# Also merge to staging for consistency
git checkout staging
git merge main
git push origin staging
```

### **3. Staging-Only Testing**
```bash
# For testing experimental features on staging only
git checkout staging
git cherry-pick <feature-commit-hash>
git push origin staging

# Test on staging environment
# If successful, follow regular merge process
```

---

## 🛠️ **DEVELOPMENT COMMANDS**

### **Local Development**
```bash
# Start development environment
cd 6fb-booking/backend-v2
uvicorn main:app --reload --port 8000

# In separate terminal
cd backend-v2/frontend-v2
npm run dev  # Runs on port 3000
```

### **Testing**
```bash
# Backend tests
cd backend-v2
pytest

# Frontend tests
cd backend-v2/frontend-v2
npm test

# Full test suite
./scripts/parallel-tests.sh
```

### **Database Operations**
```bash
# Development database (SQLite)
cd backend-v2
alembic upgrade head

# Staging database (PostgreSQL)
# Managed automatically by Render

# Production database (PostgreSQL)
# Managed through deployment platform
```

---

## 🔍 **DEPLOYMENT VALIDATION**

### **Staging Validation Checklist**
- [ ] **Frontend loads**: `https://sixfb-frontend-v2-staging.onrender.com`
- [ ] **Backend health**: `https://sixfb-backend-v2-staging.onrender.com/health`
- [ ] **API functionality**: Test key endpoints
- [ ] **Database connectivity**: Verify PostgreSQL connection
- [ ] **Authentication**: Test login/registration flows
- [ ] **Payment processing**: Test with Stripe test keys

### **Production Validation Checklist**
- [ ] **Domain accessibility**: `https://bookedbarber.com`
- [ ] **API endpoints**: `https://api.bookedbarber.com/health`
- [ ] **SSL certificates**: Verify HTTPS working
- [ ] **Database performance**: Check optimized queries
- [ ] **Error tracking**: Verify Sentry integration
- [ ] **Payment processing**: Confirm live Stripe keys
- [ ] **Email/SMS services**: Test SendGrid/Twilio

---

## 🏗️ **ENVIRONMENT CONFIGURATION**

### **Development Environment**
```bash
# Local configuration
DATABASE_URL=sqlite:///./6fb_booking.db
ENVIRONMENT=development
DEBUG=true
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8000
```

### **Staging Environment**
```bash
# Render staging configuration
ENVIRONMENT=staging
DATABASE_URL=postgresql://staging-connection-string
FRONTEND_URL=https://sixfb-frontend-v2-staging.onrender.com
API_URL=https://sixfb-backend-v2-staging.onrender.com
```

### **Production Environment**
```bash
# Production configuration
ENVIRONMENT=production
DATABASE_URL=postgresql://production-connection-string
FRONTEND_URL=https://bookedbarber.com
API_URL=https://api.bookedbarber.com
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **Rollback Scenarios**

#### **Level 1: Application Rollback (5 minutes)**
```bash
# Rollback to previous deployment
git checkout main
git reset --hard HEAD~1
git push --force origin main
```

#### **Level 2: Branch Rollback (10 minutes)**
```bash
# Revert problematic merge
git checkout main
git revert -m 1 <merge-commit-hash>
git push origin main
```

#### **Level 3: Database Rollback (30 minutes)**
```bash
# Database migration rollback
alembic downgrade -1
```

### **Emergency Contacts**
- **Technical Lead**: Primary deployment authority
- **DevOps Engineer**: Infrastructure and platform issues
- **Database Administrator**: Data-related emergencies

---

## 📊 **MONITORING & HEALTH CHECKS**

### **Automated Monitoring**
- **Sentry Error Tracking**: All environments
- **Health Endpoints**: `/health` on all services
- **Database Performance**: PostgreSQL monitoring
- **Uptime Monitoring**: External service monitoring

### **Manual Health Checks**
```bash
# Staging health check
curl https://sixfb-backend-v2-staging.onrender.com/health

# Production health check
curl https://api.bookedbarber.com/health

# Database performance
python scripts/database_performance_check.py
```

---

## 🔐 **SECURITY CONSIDERATIONS**

### **Environment Isolation**
- **Development**: Local only, test credentials
- **Staging**: Cloud isolated, test credentials
- **Production**: Live credentials, full security

### **Credential Management**
- **Development**: `.env` files (local only)
- **Staging**: Render environment variables
- **Production**: Secure environment variables

### **Access Control**
- **Main branch**: Protected, requires code review
- **Staging branch**: Team access, manual deployment
- **Production**: Restricted access, approval required

---

## 📋 **QUICK REFERENCE**

### **Common Commands**
```bash
# Switch to feature development
git checkout develop && git pull && git checkout -b feature/new-feature-$(date +%Y%m%d)

# Deploy to staging
git checkout staging && git merge develop && git push origin staging

# Deploy to production
git checkout main && git merge staging && git push origin main

# Emergency hotfix
git checkout main && git checkout -b hotfix/urgent-fix-$(date +%Y%m%d)
```

### **Environment URLs**
- **Development**: `localhost:3000` + `localhost:8000`
- **Staging**: `sixfb-frontend-v2-staging.onrender.com` + `sixfb-backend-v2-staging.onrender.com`
- **Production**: `bookedbarber.com` + `api.bookedbarber.com`

---

**This workflow reference is the authoritative source for BookedBarber V2 development processes. All team members and AI assistants should reference this document for workflow decisions.**