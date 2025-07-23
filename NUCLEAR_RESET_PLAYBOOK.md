# 🚨 Nuclear Reset Playbook - Emergency Deployment Recovery

**Use this playbook when standard deployments are blocked by branch divergence or critical system failures.**

## ⚠️ When to Execute Nuclear Reset

- **Branch divergence** > 20 commits between staging/production
- **Deployment pipeline** completely broken for > 4 hours  
- **Critical bugs** in production requiring immediate staging promotion
- **Merge conflicts** that cannot be resolved through normal process

## 🎯 Nuclear Reset Process (5-Step Recovery)

### ✅ Step 1: Create Safety Backup (2 minutes)
```bash
# Backup current production state
git checkout production
git pull origin production
git checkout -b backup/emergency-$(date +%Y%m%d-%H%M)
git push origin backup/emergency-$(date +%Y%m%d-%H%M)

# Create recovery tag
git checkout production
git tag -a emergency-backup-$(date +%Y%m%d) -m "Emergency backup before reset"
git push origin emergency-backup-$(date +%Y%m%d)
```

### ✅ Step 2: Verify Staging Health (3 minutes)
```bash
# Test staging environment thoroughly
curl -s https://staging.bookedbarber.com/health
curl -s https://api-staging.bookedbarber.com/health

# Manual verification checklist:
# [ ] Homepage loads
# [ ] User registration works  
# [ ] OAuth login functional
# [ ] 6FB analytics display
# [ ] Payment processing active
```

### ✅ Step 3: Execute Nuclear Reset (1 minute)
```bash
# Reset production to match staging exactly
git checkout production
git reset --hard origin/staging
git push origin production --force-with-lease

echo "✅ Nuclear reset completed - production now matches staging"
```

### ✅ Step 4: Monitor Deployment (5 minutes)
```bash
# Watch Render deployment progress
echo "🚀 Monitoring production deployment..."

# Check deployment status every 30 seconds
while true; do
  status=$(curl -s -o /dev/null -w "%{http_code}" https://bookedbarber.com/health)
  echo "$(date): Production health status: $status"
  [ "$status" = "200" ] && break
  sleep 30
done

echo "🎉 Production deployment successful!"
```

### ✅ Step 5: Validate Critical Functions (5 minutes)
```bash
# Test critical user flows
echo "🔍 Validating critical functions..."

# Test endpoints
curl -s https://bookedbarber.com/api/v1/health
curl -s https://bookedbarber.com/api/v2/analytics/health

# Manual validation checklist:
# [ ] Homepage loads without errors
# [ ] User registration/login works
# [ ] 6FB dashboard displays analytics  
# [ ] OAuth providers functional
# [ ] No JavaScript console errors
```

## 📋 Success Criteria

**Nuclear Reset is successful when:**
- ✅ Production health checks return 200
- ✅ All critical user flows work
- ✅ No deployment errors in Render logs
- ✅ 6FB analytics display properly
- ✅ OAuth authentication functional

## 🔄 Rollback Plan (If Reset Fails)

```bash
# Emergency rollback to backup
git checkout production
git reset --hard emergency-backup-$(date +%Y%m%d)
git push origin production --force-with-lease

# Verify rollback successful
curl -s https://bookedbarber.com/health
```

## 📞 Communication Template

**Before Reset:**
```
🚨 EMERGENCY DEPLOYMENT: Executing nuclear reset to resolve [issue]
- Production backup created: backup/emergency-YYYYMMDD-HHMM
- Staging verified and ready for promotion
- ETA: 15 minutes
- Will notify when complete
```

**After Reset:**
```
✅ NUCLEAR RESET COMPLETE
- Production successfully reset to match staging
- All critical functions validated
- Deployment time: X minutes
- Backup available if rollback needed: emergency-backup-YYYYMMDD
```

## 🏆 Post-Reset Actions

### Immediate (0-2 hours)
- [ ] Monitor error rates in Sentry
- [ ] Verify user registration/login flows
- [ ] Check payment processing
- [ ] Test 6FB analytics functionality

### Short-term (2-24 hours)  
- [ ] Review and merge any pending PRs
- [ ] Update team on new deployment baseline
- [ ] Clean up old backup branches (keep recent ones)
- [ ] Document lessons learned

### Long-term (1-7 days)
- [ ] Implement process improvements to prevent future divergence
- [ ] Review branch management strategy
- [ ] Update deployment automation
- [ ] Schedule team review of nuclear reset process

## 💡 Prevention Strategies

**To avoid future nuclear resets:**
1. **Limit branch divergence** to < 10 commits
2. **Weekly staging→production syncs**
3. **Automated divergence monitoring**
4. **Smaller, more frequent releases**
5. **Better merge conflict resolution**

## 🔧 Quick Commands Reference

```bash
# Check branch divergence
git rev-list --count production..staging

# Emergency health check
curl -s https://bookedbarber.com/health && echo " ✅" || echo " ❌"

# View recent commits
git log --oneline -10

# Check deployment status
git status && git log --oneline -3

# Emergency contact endpoints
curl -s https://bookedbarber.com/api/v1/health
curl -s https://staging.bookedbarber.com/health
```

---

**Last Executed**: 2025-07-23 (Successful - OAuth deployment crisis resolved)  
**Success Rate**: 100% (1/1 executions)  
**Average Execution Time**: 16 minutes  
**Next Review**: After next major deployment issue

## 🎯 Nuclear Reset Checklist

**Pre-Reset:**
- [ ] Create backup branch and tag
- [ ] Verify staging health thoroughly
- [ ] Notify team of emergency deployment
- [ ] Document the critical issue requiring reset

**During Reset:**
- [ ] Execute reset command
- [ ] Monitor Render deployment
- [ ] Check health endpoints
- [ ] Validate critical functions

**Post-Reset:**  
- [ ] Send completion notification
- [ ] Monitor for 2 hours
- [ ] Update documentation
- [ ] Plan prevention improvements