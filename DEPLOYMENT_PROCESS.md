# BookedBarber V2 - Clean Deployment Process

## Overview
This document outlines the proven deployment process for BookedBarber V2, based on the successful nuclear reset strategy executed on 2025-07-23. This process ensures clean, reliable deployments while maintaining system stability.

## 🚨 Critical Success Factors

### 1. Branch Divergence Prevention
- **Problem**: Production/staging branch divergence can block deployments for weeks
- **Solution**: Regular sync between staging and production branches
- **Prevention**: Never allow more than 10 commits of divergence

### 2. Environment Separation
- **Development**: `localhost:3000/8000` (SQLite, daily development)
- **Staging**: `staging.bookedbarber.com` (PostgreSQL, testing/demos)  
- **Production**: `bookedbarber.com` (PostgreSQL, live customers)

### 3. GitHub PR Strategy
- **staging branch**: Primary development and testing
- **production branch**: Live production environment
- **feature branches**: Created from staging, merged via PRs

## 📋 Standard Deployment Workflow

### Phase 1: Feature Development
```bash
# 1. Start from staging
git checkout staging
git pull origin staging

# 2. Create feature branch
git checkout -b feature/description-YYYYMMDD

# 3. Develop and commit changes
git add .
git commit -m "feat: description

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push feature branch
git push origin feature/description-YYYYMMDD
```

### Phase 2: Deploy to Staging
```bash
# Create PR to staging
gh pr create --base staging --title "Feature: Description" \
  --body "## Summary
- Feature implementation details
- Testing completed

## Test Plan
- [ ] Feature functionality verified
- [ ] Integration tests passed
- [ ] No regressions detected

🤖 Generated with [Claude Code](https://claude.ai/code)"

# Merge PR and verify staging deployment
# Staging auto-deploys via Render webhook
```

### Phase 3: Deploy to Production
```bash
# After staging validation, create production PR
git checkout staging
git pull origin staging

gh pr create --base production --title "Release: Feature Description" \
  --body "✅ Staging tests completed
✅ Ready for production deployment

## Changes
- Feature implementation
- Testing results

🤖 Generated with [Claude Code](https://claude.ai/code)"

# Merge PR triggers production deployment
```

## 🆘 Emergency Recovery: Nuclear Reset Process

### When to Use Nuclear Reset
- **Branch divergence** > 20 commits
- **Deployment pipeline** completely broken
- **Conflicting changes** cannot be merged
- **Emergency fixes** needed immediately

### Nuclear Reset Steps

#### Step 1: Create Safety Backup
```bash
# Create backup branch from current production
git checkout production
git pull origin production
git checkout -b backup/pre-reset-$(date +%Y%m%d)
git push origin backup/pre-reset-$(date +%Y%m%d)

# Tag current production state
git tag -a v-backup-$(date +%Y%m%d) -m "Backup before nuclear reset"
git push origin v-backup-$(date +%Y%m%d)
```

#### Step 2: Verify Staging State
```bash
# Ensure staging is working and up-to-date
git checkout staging
git pull origin staging

# Test staging environment
curl -s https://staging.bookedbarber.com/health
# Verify all critical features work
```

#### Step 3: Execute Nuclear Reset
```bash
# Reset production to match staging exactly
git checkout production
git reset --hard origin/staging
git push origin production --force-with-lease

# Verify reset completed
git log --oneline -5
```

#### Step 4: Validate Production
```bash
# Monitor deployment
curl -s https://bookedbarber.com/health

# Check critical endpoints
curl -s https://bookedbarber.com/api/v1/health
curl -s https://bookedbarber.com/api/v2/analytics/health

# Verify OAuth functionality
# Test user registration/login flows
```

#### Step 5: Post-Reset Cleanup
```bash
# Update local branches
git checkout staging
git pull origin staging
git checkout production  
git pull origin production

# Clean up feature branches if needed
git branch -d feature/old-branch-name
```

## 🔍 Deployment Verification Checklist

### Pre-Deployment
- [ ] All tests pass (`npm test`, `pytest`)
- [ ] Linting passes (`npm run lint`, `ruff`)
- [ ] No security vulnerabilities
- [ ] Environment variables configured
- [ ] Database migrations ready

### During Deployment
- [ ] Staging deployment successful
- [ ] Health checks pass
- [ ] Critical user flows work
- [ ] No JavaScript console errors
- [ ] API endpoints responding

### Post-Deployment
- [ ] Production health checks pass
- [ ] OAuth login/registration works
- [ ] 6FB analytics loading
- [ ] Payment processing functional
- [ ] Error monitoring active (Sentry)

## 📊 Monitoring & Rollback

### Health Check Endpoints
```bash
# Frontend health
curl https://bookedbarber.com/

# Backend API health  
curl https://bookedbarber.com/api/v1/health
curl https://bookedbarber.com/api/v2/analytics/health

# Database connectivity
curl https://bookedbarber.com/api/v1/db-health
```

### Rollback Process
```bash
# If production issues detected, immediate rollback
git checkout production
git reset --hard v-backup-$(date +%Y%m%d)  # Use backup tag
git push origin production --force-with-lease

# Or rollback to specific commit
git reset --hard <last-good-commit-hash>
git push origin production --force-with-lease
```

### Monitoring Tools
- **Render Dashboard**: Deployment status and logs
- **Sentry**: Error tracking and alerts
- **GitHub Actions**: CI/CD pipeline status
- **Custom Health Checks**: Application-specific monitoring

## 🔧 Environment-Specific Configurations

### Staging Environment
```bash
# Staging-specific settings
ENVIRONMENT=staging
DATABASE_URL=postgresql://staging-db-url
NEXT_PUBLIC_API_URL=https://api-staging.bookedbarber.com
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Production Environment
```bash
# Production-specific settings
ENVIRONMENT=production
DATABASE_URL=postgresql://production-db-url
NEXT_PUBLIC_API_URL=https://api.bookedbarber.com
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 🚨 Emergency Contact & Escalation

### Deployment Issues
1. **Check Render logs** for deployment errors
2. **Review GitHub Actions** for CI/CD failures
3. **Monitor Sentry** for application errors
4. **Use backup branch** for immediate rollback

### Critical System Failures
1. **Immediate rollback** to last known good state
2. **Check database connectivity** and migrations
3. **Verify third-party services** (Stripe, SendGrid)
4. **Contact hosting provider** if infrastructure issues

## 📚 Best Practices & Lessons Learned

### Code Quality
- **Never disable linting** during deployment
- **Always run tests** before merging
- **Use conventional commits** for clear history
- **Tag releases** for easy rollback reference

### Branch Management
- **Keep staging clean** and deployable
- **Regular sync** between staging/production
- **Feature branches** short-lived (< 1 week)
- **Clean up** merged branches regularly

### Communication
- **Document changes** in PR descriptions
- **Tag team members** for review
- **Update CHANGELOG** for major releases
- **Notify stakeholders** of scheduled deployments

### Security
- **Never commit secrets** to repository
- **Use environment variables** for configuration
- **Regular security audits** of dependencies
- **Backup sensitive data** before major changes

## 🎯 Success Metrics

### Deployment Success
- **Zero-downtime deployments**: 99.9% uptime target
- **Rollback time**: < 5 minutes if needed
- **Feature velocity**: Weekly deployment cadence
- **Error rate**: < 0.1% post-deployment

### Process Efficiency
- **Staging to production**: < 24 hours
- **Feature development**: Consistent delivery
- **Issue resolution**: < 2 hours for critical bugs
- **Team confidence**: Reliable, repeatable process

---

**Last Updated**: 2025-07-23  
**Process Version**: 2.0 (Post Nuclear Reset)  
**Next Review**: 2025-08-23

## Appendix: Command Reference

### Quick Commands
```bash
# Check branch status
git status && git log --oneline -5

# Emergency staging deploy
git checkout staging && git pull && git push origin staging

# Emergency production deploy  
git checkout production && git reset --hard origin/staging && git push origin production --force-with-lease

# Health check all environments
curl -s https://staging.bookedbarber.com/health && curl -s https://bookedbarber.com/health
```

### Troubleshooting
```bash
# Check deployment logs
gh run list --limit 5
gh run view <run-id>

# Check Render deployment status
# Visit: https://dashboard.render.com/

# Database connection test
python -c "from database import engine; print('DB Connected:', engine.connect())"
```