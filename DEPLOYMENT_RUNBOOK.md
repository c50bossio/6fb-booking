# BookedBarber V2 - Deployment Runbook
**Complete Deployment Operations Guide**  
Last updated: 2025-07-23  
Version: 2.0

## 🎯 Overview

This runbook provides comprehensive guidance for deploying BookedBarber V2 to staging and production environments using the automated deployment scripts.

## 📋 Pre-Deployment Checklist

### Development Environment Setup
- [ ] **Git Status Clean**: `git status` shows no uncommitted changes
- [ ] **Branch Strategy**: Working from appropriate branch (staging/production)
- [ ] **Environment Files**: `.env` and `.env.local` files configured
- [ ] **Dependencies**: All npm and pip dependencies installed
- [ ] **Tests Passing**: All unit and integration tests pass locally

### Required Tools
- [ ] **Python 3.11+**: Required for backend deployment
- [ ] **Node.js 18+**: Required for frontend deployment
- [ ] **Docker**: Required for containerized deployments
- [ ] **Git**: Required for version control operations
- [ ] **curl**: Required for health check validation

### API Keys and Secrets
- [ ] **Stripe Keys**: Test keys for staging, live keys for production
- [ ] **SendGrid**: Email service API keys configured
- [ ] **Twilio**: SMS service credentials configured
- [ ] **Google Services**: OAuth and Calendar API credentials
- [ ] **Analytics**: Google Analytics and Meta Pixel configured

## 🚀 Staging Deployment

### Purpose
Staging deployments are used for:
- Testing new features before production
- Validating changes with stakeholders
- Running integration tests
- Performance testing with production-like data

### Staging Deployment Process

#### Step 1: Prepare for Staging Deployment
```bash
# Navigate to project directory
cd /Users/bossio/6fb-booking/6fb-infrastructure-polish

# Ensure clean working directory
git status

# Switch to staging branch
git checkout staging
git pull origin staging
```

#### Step 2: Run Staging Deployment
```bash
# Execute automated staging deployment
python scripts/deploy-staging.py

# The script will:
# 1. Check prerequisites
# 2. Run test suite (failures allowed for staging)
# 3. Build staging Docker images
# 4. Deploy to Render staging environment
# 5. Validate deployment health
# 6. Run smoke tests
# 7. Generate deployment report
```

#### Step 3: Validate Staging Deployment
```bash
# Manual validation steps
curl -f https://staging.bookedbarber.com
curl -f https://api-staging.bookedbarber.com/health
curl -f https://api-staging.bookedbarber.com/api/v2/health

# Review deployment report
cat STAGING_DEPLOYMENT_REPORT.md
```

### Staging Environment Details
- **Frontend URL**: https://staging.bookedbarber.com
- **API URL**: https://api-staging.bookedbarber.com
- **Database**: PostgreSQL (Render Starter plan)
- **Redis**: Redis cache (Render Starter plan)
- **Cost**: ~$35/month
- **Auto-deploy**: Enabled from staging branch

### Staging Troubleshooting

#### Common Issues
1. **Build Failures**
   ```bash
   # Check build logs in Render dashboard
   # Common causes: Missing dependencies, environment variables
   ```

2. **Health Check Failures**
   ```bash
   # Wait additional time for deployment to complete
   # Check Render service logs for specific errors
   ```

3. **Test Failures**
   ```bash
   # Staging allows test failures - review but continue
   # Fix critical test failures before production
   ```

## 🏭 Production Deployment

### Purpose
Production deployments must be:
- **Stable**: Thoroughly tested in staging
- **Secure**: All security measures active
- **Monitored**: Comprehensive monitoring enabled
- **Recoverable**: Rollback capability ready

### Production Deployment Process

#### Step 1: Pre-Production Validation
```bash
# Ensure staging is stable and validated
curl -f https://staging.bookedbarber.com
curl -f https://api-staging.bookedbarber.com/health

# Switch to production branch
git checkout production
git pull origin production

# Verify production environment variables are set
python scripts/validate-environment-keys.py
```

#### Step 2: Run Production Deployment
```bash
# Execute automated production deployment
python scripts/deploy-production.py

# Confirmation prompt will appear
# Type 'yes' to confirm production deployment

# The script will:
# 1. Check prerequisites (strict validation)
# 2. Create backup of current state
# 3. Run comprehensive test suite
# 4. Build production Docker images
# 5. Deploy to staging first for final validation
# 6. Deploy to production environment
# 7. Validate production deployment
# 8. Run post-deployment tests
# 9. Send success notification
```

#### Step 3: Post-Production Validation
```bash
# Manual validation steps
curl -f https://bookedbarber.com
curl -f https://api.bookedbarber.com/health
curl -f https://api.bookedbarber.com/api/v2/health

# Monitor error rates in Sentry
# Check performance metrics in monitoring dashboard
# Verify critical user journeys work correctly
```

### Production Environment Details
- **Frontend URL**: https://bookedbarber.com
- **API URL**: https://api.bookedbarber.com
- **Database**: PostgreSQL (Render Standard plan)
- **Redis**: Redis cache (Render Standard plan)
- **Cost**: ~$200/month
- **Auto-deploy**: Disabled (manual deployments only)
- **Instances**: 2 backend, 1 frontend (with auto-scaling)

### Production Monitoring
- **Health Checks**: Automated every 30 seconds
- **Error Tracking**: Sentry with 80% error sampling
- **Performance**: 5% performance tracing
- **Uptime**: 99.9% SLA target
- **Response Time**: <200ms for 95% of requests

## 🔄 Rollback Procedures

### Automatic Rollback
Production deployment script includes automatic rollback on:
- Health check failures
- Post-deployment test failures
- Critical errors during deployment

### Manual Rollback
```bash
# For production issues after successful deployment
cd /Users/bossio/6fb-booking/6fb-infrastructure-polish

# Run production deployment script
python scripts/deploy-production.py

# When prompted, the script will detect issues and offer rollback
# Alternatively, use git to rollback:
git checkout production
git reset --hard [previous-commit-hash]
git push origin production --force-with-lease
```

### Emergency Procedures
For critical production issues:

1. **Immediate Response**
   ```bash
   # Check current system status
   curl https://bookedbarber.com/health
   
   # Check error rates in Sentry dashboard
   # Monitor user reports and support tickets
   ```

2. **Quick Mitigation**
   ```bash
   # Temporarily disable problematic features via feature flags
   # Scale up instances if performance issue
   # Contact on-call engineer if available
   ```

3. **Full Rollback**
   ```bash
   # Use deployment script rollback capability
   python scripts/deploy-production.py
   # Follow rollback prompts
   ```

## 📊 Monitoring & Alerts

### Health Monitoring
- **Endpoint Monitoring**: `/health` and `/api/v2/health`
- **Database Connectivity**: Connection pool monitoring
- **Redis Cache**: Cache hit ratio and connectivity
- **Response Times**: API response time tracking

### Error Tracking
- **Sentry Integration**: Real-time error tracking
- **Log Aggregation**: Centralized logging
- **Performance Monitoring**: Request/response monitoring
- **Security Monitoring**: Rate limiting and security events

### Alert Configuration
- **Deployment Notifications**: Slack integration for deployment status
- **Error Rate Alerts**: >1% error rate for 5 minutes
- **Performance Alerts**: >500ms response time for 95th percentile
- **Uptime Alerts**: Service downtime detection

## 🛠️ Troubleshooting Guide

### Common Deployment Issues

#### 1. Prerequisites Check Failures
```bash
# Issue: Git working directory not clean
git stash push -m "Temporary stash for deployment"

# Issue: Missing environment variables
cp .env.template .env
# Configure required environment variables

# Issue: Docker not available
# Install Docker Desktop or ensure Docker service is running
```

#### 2. Build Failures
```bash
# Backend build failures
cd backend-v2
pip install -r requirements.txt
python -m pytest

# Frontend build failures
cd backend-v2/frontend-v2
npm install
npm run build
```

#### 3. Health Check Failures
```bash
# Wait for services to fully start (up to 5 minutes)
# Check service logs in Render dashboard
# Verify environment variables are correctly set
# Check database connectivity
```

#### 4. Test Failures
```bash
# Run tests locally to identify issues
cd backend-v2 && python -m pytest -v
cd backend-v2/frontend-v2 && npm test

# Fix failing tests before attempting deployment
# Consider running subset of tests for faster feedback
```

### Performance Issues
```bash
# Check database performance
# Monitor connection pool utilization
# Review cache hit ratios
# Analyze slow query logs
```

### Security Issues
```bash
# Review security monitoring alerts
# Check rate limiting effectiveness
# Verify SSL certificate status
# Audit authentication logs
```

## 📞 Support & Escalation

### Internal Support
- **Development Team**: Primary contact for code-related issues
- **DevOps Team**: Infrastructure and deployment issues
- **Security Team**: Security incidents and vulnerabilities

### External Support
- **Render Support**: Infrastructure provider support
- **Third-party Services**: Stripe, SendGrid, Twilio support as needed

### Documentation Resources
- **API Documentation**: `/docs` endpoint
- **Error Codes**: Reference guide for common errors
- **Performance Baselines**: Expected performance metrics
- **Security Policies**: Security implementation details

## 🔄 Deployment Schedule

### Recommended Deployment Windows
- **Staging**: Anytime during business hours
- **Production**: 
  - **Preferred**: Tuesday-Thursday, 10 AM - 2 PM PST
  - **Avoid**: Fridays, weekends, holidays
  - **Emergency**: 24/7 with proper escalation

### Deployment Frequency
- **Staging**: Multiple times per day as needed
- **Production**: 
  - **Regular releases**: Weekly or bi-weekly
  - **Hotfixes**: As needed with expedited process
  - **Major releases**: Monthly with extensive testing

## 📋 Deployment Checklist Templates

### Staging Deployment Checklist
- [ ] All tests passing locally
- [ ] Feature branch merged to staging
- [ ] Stakeholder approval for testing
- [ ] Run `python scripts/deploy-staging.py`
- [ ] Validate deployment report
- [ ] Notify team of staging deployment
- [ ] Test critical user journeys
- [ ] Document any issues found

### Production Deployment Checklist
- [ ] Staging validation complete
- [ ] All tests passing
- [ ] Performance testing complete
- [ ] Security review complete
- [ ] Database migration tested (if applicable)
- [ ] Rollback plan documented
- [ ] On-call engineer available
- [ ] Run `python scripts/deploy-production.py`
- [ ] Monitor deployment closely
- [ ] Validate critical functionality
- [ ] Send deployment notification
- [ ] Update deployment log

---

**Remember**: Always test in staging before production deployment, and keep rollback plans ready for any production deployment.

*For additional support, refer to the Infrastructure Polish Complete guide and individual deployment script documentation.*