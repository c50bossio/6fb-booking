# 🔧 Render Configuration Update Checklist

## 📋 **IMPORTANT: Manual Actions Required on Render**

### **🎯 Current Status Analysis**
- ✅ **Production (`render.yaml`)**: ✅ **NO CHANGES NEEDED**
  - Uses `autoDeploy: true` without explicit branch → **Automatically deploys from default branch**
  - Since GitHub default branch is now `main`, Render will auto-deploy from `main` ✅

- ✅ **Staging (`render.staging.yaml`)**: ✅ **CONFIGURED CORRECTLY** 
  - Explicitly configured with `branch: staging` → **Will continue deploying from staging branch** ✅

---

## 🛠️ **Required Manual Actions on Render Dashboard**

### **1. Verify Production Service Branch Settings**
**⚠️ CRITICAL: Check that production services deploy from `main`**

**For Each Production Service:**
1. **Navigate to Render Dashboard**: https://dashboard.render.com
2. **Check Backend Service** (`sixfb-backend-v2`):
   - Go to service → **Settings** → **Build & Deploy**
   - **Verify Branch**: Should be `main` (or Auto-Deploy from default branch)
   - **If shows `develop`**: Change to `main`

3. **Check Frontend Service** (`sixfb-frontend-v2`):
   - Go to service → **Settings** → **Build & Deploy**  
   - **Verify Branch**: Should be `main` (or Auto-Deploy from default branch)
   - **If shows `develop`**: Change to `main`

### **2. Trigger Test Deployment (Recommended)**
After verifying branch settings:
1. **Manual Deploy Test**:
   - Go to each service → **Manual Deploy**
   - Select `main` branch
   - Click **Deploy** to verify everything works

2. **Monitor Deployment Logs**:
   - Check build logs for any errors
   - Verify services start successfully
   - Test production URLs to confirm functionality

### **3. Update Environment Variables (If Needed)**
**Check for any environment variables that reference `develop`:**
- Review all environment variables in Render dashboard
- Look for any variables containing "develop" in names or values
- Update any development-specific references to use "main"

### **4. Webhook Configuration (If Used)**
**If using Render webhooks for deployments:**
1. **Check Webhook URLs** in Render dashboard
2. **Verify GitHub webhook settings** point to correct branch
3. **Test webhook** by pushing a small change to `main`

---

## 🧪 **Verification Steps**

### **Step 1: Confirm Render is Using Main Branch**
```bash
# Check current deployments
curl -X GET "https://api.render.com/v1/services" \
  -H "Authorization: Bearer YOUR_RENDER_API_KEY" \
  -H "Accept: application/json"
```

### **Step 2: Test Production Deployment**
1. **Make small change** to main branch (e.g., update a comment)
2. **Push to main**: `git push origin main`
3. **Monitor Render dashboard** for automatic deployment
4. **Verify deployment** completes successfully

### **Step 3: Test Staging Workflow**
1. **In staging worktree**: Merge latest main
2. **Push to staging**: `git push origin staging`  
3. **Verify staging deployment** triggers automatically
4. **Test staging environment** functionality

### **Step 4: Full Integration Test**
1. **Create test feature worktree**: `./scripts/create-feature-worktree.sh render-test`
2. **Make small change** and commit
3. **Push feature branch**: `git push -u origin feature/render-test-YYYYMMDD`
4. **Merge to main** following normal workflow
5. **Verify automatic production deployment**

---

## ⚠️ **Potential Issues & Solutions**

### **Issue 1: Services Still Deploy from `develop`**
**Symptoms**: Deployments not triggering on main branch pushes
**Solution**: 
1. Manually change branch to `main` in Render dashboard
2. Trigger manual deployment to test

### **Issue 2: Environment Variables Reference `develop`**
**Symptoms**: Application errors after deployment
**Solution**:
1. Review all environment variables
2. Update any `develop`-specific values
3. Redeploy services

### **Issue 3: Staging Deployment Issues**
**Symptoms**: Staging deploys from wrong branch
**Solution**:
1. Verify `render.staging.yaml` specifies `branch: staging`
2. Ensure staging service uses staging configuration file

### **Issue 4: Webhook Failures**
**Symptoms**: Deployments don't trigger automatically
**Solution**:
1. Check GitHub webhook settings
2. Verify webhook points to correct Render endpoints
3. Test webhook with manual trigger

---

## 📞 **Emergency Rollback Plan**

**If production deployments fail:**

### **Quick Rollback Steps**:
1. **Render Dashboard** → Production Service → **Rollback** to previous deployment
2. **Temporarily change branch** back to `old-main` if needed
3. **Investigate issues** in staging environment first
4. **Fix and redeploy** once issues resolved

### **Complete Rollback** (Nuclear Option):
1. **Restore develop branch**: `git push origin old-main:develop`
2. **Change GitHub default branch** back to develop
3. **Update Render services** to deploy from develop
4. **Restore all documentation** from backup tag

---

## ✅ **Success Criteria**

**Branch transition is 100% complete when:**
- [ ] Production services deploy from `main` branch automatically
- [ ] Staging services deploy from `staging` branch automatically  
- [ ] Push to `main` triggers production deployment
- [ ] Push to `staging` triggers staging deployment
- [ ] All environment variables correct
- [ ] No deployment errors or service failures
- [ ] All application functionality works in production
- [ ] Worktree → main → staging → production workflow functions end-to-end

---

## 🎯 **Final Verification Command**

```bash
# Run this after completing Render updates
echo "=== RENDER INTEGRATION VERIFICATION ==="
echo "1. Latest commit on main:"
git log --oneline -1 main
echo "2. GitHub default branch:"
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
echo "3. Staging branch latest:"
git log --oneline -1 staging
echo "4. Ready for production deployment: ✅"
```

---

*After completing these steps, the branch rename transition will be 100% complete and production-ready!*