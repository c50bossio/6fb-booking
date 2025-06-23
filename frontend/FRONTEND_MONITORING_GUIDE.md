# Frontend Monitoring and Validation Guide

This guide provides comprehensive instructions for validating, monitoring, and managing the 6FB Booking frontend deployment.

## Table of Contents

1. [Pre-Deployment Validation](#pre-deployment-validation)
2. [Health Check Monitoring](#health-check-monitoring)
3. [Performance Testing](#performance-testing)
4. [Rollback Procedures](#rollback-procedures)
5. [Continuous Monitoring](#continuous-monitoring)
6. [Troubleshooting](#troubleshooting)

## Pre-Deployment Validation

### Running Full Validation

The pre-deployment validation script performs comprehensive checks to ensure your frontend is ready for deployment.

```bash
# Run complete validation
npm run validate:deployment

# Run basic build validation only
npm run validate:build
```

### What Gets Validated

1. **Environment Checks**
   - Node.js version (18+)
   - Package manager setup
   - Required configuration files

2. **Dependencies**
   - All packages installed
   - No security vulnerabilities
   - Lock file present and up to date

3. **Build Process**
   - TypeScript compilation
   - ESLint checks
   - Production build success
   - Bundle size analysis

4. **Configuration**
   - Environment variables
   - Next.js configuration
   - Build output settings

### Interpreting Results

The validation script provides color-coded output:
- 🟢 **Green**: Passed checks
- 🟡 **Yellow**: Warnings (non-blocking)
- 🔴 **Red**: Errors (must fix before deployment)

A validation report is saved to `validation-report.json` with detailed metrics.

## Health Check Monitoring

### Single Health Check

Run a one-time health check on your deployed application:

```bash
# Check production
npm run health:check https://your-app.onrender.com

# Check local development
npm run health:check http://localhost:3000
```

### Continuous Monitoring

Monitor your application continuously with automatic health checks:

```bash
# Start continuous monitoring (checks every 60 seconds)
npm run health:monitor https://your-app.onrender.com
```

Press `Ctrl+C` to stop monitoring. A report is saved to `health-check-report.json`.

### Health Check Endpoints

The monitor checks these endpoints:
1. **Homepage** (`/`) - Must return 200 and contain HTML
2. **API Health** (`/api/health`) - Must return 200
3. **Login Page** (`/login`) - Must return 200
4. **Static Assets** (`/_next/static`) - Must be accessible

### Custom Health Checks

Edit `scripts/health-check-monitor.js` to add custom endpoints:

```javascript
const config = {
  endpoints: [
    {
      name: 'Custom Endpoint',
      path: '/your-endpoint',
      expectedStatus: 200,
      timeout: 10000,
      checkContent: 'expected-content',
    },
    // Add more endpoints...
  ],
};
```

## Performance Testing

### Running Performance Baseline

Establish performance benchmarks for your application:

```bash
# Test local build
npm run performance:baseline

# Test production deployment
npm run performance:baseline https://your-app.onrender.com
```

### Performance Metrics

The baseline test measures:

1. **Bundle Size**
   - Total JavaScript size
   - Individual chunk sizes
   - CSS bundle size

2. **Core Web Vitals**
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)

3. **Lighthouse Scores**
   - Performance
   - Accessibility
   - Best Practices
   - SEO

### Performance Targets

Default thresholds (configurable in `scripts/performance-baseline.js`):

```javascript
const metrics = {
  firstContentfulPaint: 1800,      // 1.8 seconds
  largestContentfulPaint: 2500,    // 2.5 seconds
  timeToInteractive: 3800,         // 3.8 seconds
  totalBlockingTime: 300,          // 300ms
  cumulativeLayoutShift: 0.1,      // 0.1
  maxBundleSize: 300,              // 300KB
  maxPageSize: 150,                // 150KB per page
};
```

### Performance Report

Results are saved to `performance-baseline.json` with:
- Detailed metrics for each page
- Bundle analysis
- Lighthouse scores
- Improvement recommendations

## Rollback Procedures

### Creating a Rollback Plan

Before deployment, create a comprehensive rollback plan:

```bash
# Create full rollback plan with documentation
npm run rollback:create
```

This generates:
- `rollback-plan.json` - Structured rollback data
- `ROLLBACK_PLAN.md` - Human-readable instructions
- Platform-specific rollback steps

### Creating Deployment Checkpoint

Always create a checkpoint before deploying:

```bash
# Create checkpoint (automatically run before deploy)
npm run rollback:checkpoint
```

This saves:
- Current Git commit hash
- Branch information
- Build configuration
- Timestamp

### Executing Rollback

If deployment fails, execute rollback:

```bash
# Start interactive rollback process
npm run rollback:execute
```

Options available:
1. **Platform Rollback** - Use Render/Vercel native rollback
2. **Git Rollback** - Revert to previous commit
3. **Manual Instructions** - Step-by-step guide

### Verifying Rollback

After rollback, verify the deployment:

```bash
# Verify deployment health
node scripts/rollback-plan.js --verify https://your-app.onrender.com
```

## Continuous Monitoring

### Setting Up Monitoring

1. **Error Tracking (Sentry)**
   ```javascript
   // Already configured in the app
   // Set NEXT_PUBLIC_SENTRY_DSN in environment
   ```

2. **Uptime Monitoring**
   - Use the health check monitor in continuous mode
   - Set up external services (UptimeRobot, Pingdom)

3. **Performance Monitoring**
   - Web Vitals tracking (built into Next.js)
   - Custom performance marks

### Monitoring Dashboard

Create a simple monitoring dashboard:

```bash
# Start local monitoring server
node scripts/monitoring-dashboard.js
```

Access at `http://localhost:3001` to view:
- Real-time health status
- Performance metrics
- Error rates
- Deployment history

### Alert Configuration

Configure alerts for critical issues:

1. **Health Check Failures**
   - More than 2 consecutive failures
   - Any critical endpoint down

2. **Performance Degradation**
   - Response time > 5 seconds
   - Error rate > 1%

3. **Security Issues**
   - Failed authentication attempts
   - Suspicious traffic patterns

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   ```bash
   # Check Node version
   node --version

   # Clear cache and reinstall
   rm -rf node_modules .next
   npm ci
   npm run build
   ```

2. **Environment Variable Issues**
   ```bash
   # Validate environment setup
   node scripts/check-env.js

   # Test with production variables
   NODE_ENV=production npm run build
   ```

3. **Performance Issues**
   ```bash
   # Analyze bundle
   npm run build -- --analyze

   # Check for large dependencies
   npm list --depth=0
   ```

### Debugging Health Checks

1. **Manual Endpoint Testing**
   ```bash
   # Test specific endpoint
   curl -I https://your-app.onrender.com/api/health

   # Check with full headers
   curl -v https://your-app.onrender.com/
   ```

2. **Browser Console Checks**
   - Open DevTools
   - Check Network tab for failed requests
   - Review Console for JavaScript errors

3. **Server Logs**
   - Check deployment platform logs
   - Review build output
   - Monitor runtime errors

### Emergency Procedures

1. **Complete Site Down**
   ```bash
   # Immediate rollback
   npm run rollback:execute

   # Choose option 1 (Platform rollback)
   ```

2. **Partial Functionality Loss**
   ```bash
   # Check specific services
   node scripts/service-check.js

   # Deploy hotfix if needed
   git checkout -b hotfix/emergency
   # Make minimal fix
   git push origin hotfix/emergency
   ```

3. **Performance Emergency**
   ```bash
   # Enable maintenance mode
   # (Configure in your deployment platform)

   # Scale up resources
   # Deploy performance fix
   ```

## Best Practices

1. **Always Validate Before Deployment**
   ```bash
   npm run validate:deployment
   ```

2. **Create Checkpoints**
   ```bash
   npm run rollback:checkpoint
   ```

3. **Monitor After Deployment**
   ```bash
   npm run health:monitor https://your-app.onrender.com
   ```

4. **Document Issues**
   - Keep deployment log
   - Note any warnings
   - Update runbooks

5. **Regular Testing**
   - Run performance baseline weekly
   - Test rollback procedures monthly
   - Update monitoring thresholds

## Quick Reference

### Essential Commands

```bash
# Pre-deployment
npm run validate:deployment          # Full validation
npm run rollback:checkpoint         # Create checkpoint

# Deployment verification
npm run health:check <url>          # Single health check
npm run performance:baseline <url>  # Performance test

# Monitoring
npm run health:monitor <url>        # Continuous monitoring

# Emergency
npm run rollback:execute            # Execute rollback
```

### File Outputs

- `validation-report.json` - Pre-deployment validation results
- `health-check-report.json` - Health check results
- `performance-baseline.json` - Performance test results
- `rollback-plan.json` - Rollback configuration
- `.rollback-checkpoint.json` - Deployment checkpoint

### Support Contacts

- **Render Support**: support@render.com
- **Vercel Support**: support@vercel.com
- **Railway Support**: team@railway.app
- **Team Chat**: [Your team channel]

---

*Last Updated: [Current Date]*
*Version: 1.0*
