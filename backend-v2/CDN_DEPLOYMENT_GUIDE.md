# CDN Deployment Guide - BookedBarber V2

This guide covers CDN (Content Delivery Network) setup and deployment for global static asset delivery, improving page load times and user experience worldwide.

## 🌍 CDN Overview

BookedBarber V2 supports three major CDN providers:
- **CloudFlare** (Recommended) - Global network with advanced optimization
- **Amazon CloudFront** - AWS-native solution with deep AWS integration  
- **Fastly** - Real-time edge computing and instant cache purging

## 🚀 Quick Setup

### 1. Environment Configuration

Copy and configure environment templates:

```bash
# Backend CDN configuration
cp backend-v2/.env.template backend-v2/.env
# Edit CDN_PROVIDER and provider-specific credentials

# Frontend CDN configuration  
cp backend-v2/frontend-v2/.env.local.template backend-v2/frontend-v2/.env.local
# Edit NEXT_PUBLIC_CDN_PROVIDER and domain settings
```

### 2. Install CDN Script Dependencies

```bash
cd backend-v2
pip install -r requirements-cdn.txt
```

### 3. Validate Configuration

```bash
cd backend-v2/frontend-v2
npm run cdn:validate
```

## 🔧 Provider-Specific Setup

### CloudFlare Setup (Recommended)

1. **Get Credentials**:
   - Login to [CloudFlare Dashboard](https://dash.cloudflare.com/)
   - Navigate to your domain → Overview → Zone ID (copy)
   - Go to My Profile → API Tokens → Create Token
   - Use "Custom token" with Zone:Edit permissions

2. **Environment Variables**:
   ```bash
   # Backend (.env)
   CDN_PROVIDER=cloudflare
   CLOUDFLARE_ZONE_ID=your_zone_id_here
   CLOUDFLARE_API_TOKEN=your_api_token_here
   CLOUDFLARE_DOMAIN=cdn.bookedbarber.com
   
   # Frontend (.env.local)
   NEXT_PUBLIC_CDN_PROVIDER=cloudflare
   NEXT_PUBLIC_CLOUDFLARE_DOMAIN=cdn.bookedbarber.com
   ```

3. **DNS Configuration**:
   ```
   # Add CNAME record in CloudFlare DNS
   cdn.bookedbarber.com → bookedbarber.com (Proxied: Yes)
   ```

### Amazon CloudFront Setup

1. **Create Distribution**:
   - Login to [AWS CloudFront Console](https://console.aws.amazon.com/cloudfront/)
   - Create Distribution → Web
   - Origin Domain Name: your-app.bookedbarber.com
   - Cache Behaviors: Configure for /_next/static/* paths

2. **Environment Variables**:
   ```bash
   # Backend (.env)
   CDN_PROVIDER=cloudfront
   CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
   CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   
   # Frontend (.env.local)
   NEXT_PUBLIC_CDN_PROVIDER=cloudfront
   NEXT_PUBLIC_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
   ```

### Fastly Setup

1. **Create Service**:
   - Login to [Fastly Console](https://www.fastly.com/)
   - Create Service → Web Application
   - Origin: bookedbarber.com
   - Domain: your-cdn-domain.fastly.com

2. **Environment Variables**:
   ```bash
   # Backend (.env)
   CDN_PROVIDER=fastly
   FASTLY_API_TOKEN=your_api_token
   FASTLY_SERVICE_ID=your_service_id
   FASTLY_DOMAIN=bookedbarber.global.ssl.fastly.net
   
   # Frontend (.env.local)
   NEXT_PUBLIC_CDN_PROVIDER=fastly
   NEXT_PUBLIC_FASTLY_DOMAIN=bookedbarber.global.ssl.fastly.net
   ```

## 📦 Deployment Workflow

### Standard Deployment

```bash
cd backend-v2/frontend-v2

# 1. Build with CDN optimization
npm run build:cdn

# Or manual steps:
npm run build
npm run cdn:deploy
```

### Development Workflow

```bash
# Check CDN status
npm run cdn:status

# Validate configuration
npm run cdn:validate

# Purge specific files
npm run cdn:purge -- --paths /images/logo.png /_next/static/chunks/*

# Purge all cache
npm run cdn:purge
```

### Staging Deployment

```bash
# Configure staging CDN
NEXT_PUBLIC_CDN_PROVIDER=cloudflare
NEXT_PUBLIC_CLOUDFLARE_DOMAIN=cdn-staging.bookedbarber.com

# Deploy to staging
npm run build
npm run cdn:deploy
```

### Production Deployment

```bash
# Configure production CDN
NEXT_PUBLIC_CDN_PROVIDER=cloudflare
NEXT_PUBLIC_CLOUDFLARE_DOMAIN=cdn.bookedbarber.com

# Deploy to production
NODE_ENV=production npm run build:production
npm run cdn:deploy
```

## 🛠️ Advanced Configuration

### Cache TTL Settings

Configure cache duration in `.env`:

```bash
# Static assets (JS, CSS, fonts)
CDN_TTL_STATIC=31536000    # 1 year

# Images and media
CDN_TTL_IMAGES=604800      # 1 week

# Dynamic content (APIs, pages)
CDN_TTL_DYNAMIC=300        # 5 minutes
```

### Geographic Edge Locations

Optimize for your user base:

```bash
# Global coverage
CDN_EDGE_LOCATIONS=us-east,us-west,eu-west,ap-southeast

# US-focused
CDN_EDGE_LOCATIONS=us-east,us-west,us-central

# Europe-focused  
CDN_EDGE_LOCATIONS=eu-west,eu-central,eu-north
```

### Custom Domain Setup

1. **Add CNAME Record**:
   ```
   cdn.bookedbarber.com → your-cdn-provider-domain.com
   ```

2. **SSL Certificate**:
   - CloudFlare: Automatic (Universal SSL)
   - CloudFront: Request AWS Certificate Manager cert
   - Fastly: Upload or use Let's Encrypt

3. **Verify Configuration**:
   ```bash
   curl -I https://cdn.bookedbarber.com/_next/static/chunks/main.js
   # Should return CDN headers (CF-Cache-Status, X-Cache, etc.)
   ```

## 🔍 Monitoring and Debugging

### CDN Status Check

```bash
# Check specific assets
npm run cdn:status -- --paths /_next/static/chunks/main.js /images/logo.png

# Response includes:
# - Cache status (HIT, MISS, STALE)
# - Age and expiration
# - Last modified timestamp
```

### Performance Testing

```bash
# Test global performance
curl -w "%{time_total}" https://cdn.bookedbarber.com/_next/static/chunks/main.js

# Test from different locations using online tools:
# - WebPageTest.org
# - GTmetrix.com
# - Pingdom.com
```

### Cache Analysis

```javascript
// Frontend CDN utilities usage
import { useCDN, getCDNStatus } from '@/lib/cdn-utils'

function DebugPanel() {
  const cdn = useCDN()
  
  return (
    <div>
      <h3>CDN Status</h3>
      <pre>{JSON.stringify(cdn.getStatus(), null, 2)}</pre>
      
      <h3>Asset URLs</h3>
      <p>Logo: {cdn.getImageURL('/images/logo.png')}</p>
      <p>Main JS: {cdn.getStaticURL('/_next/static/chunks/main.js')}</p>
    </div>
  )
}
```

## 🚨 Troubleshooting

### Common Issues

1. **CDN Not Serving Assets**:
   ```bash
   # Check DNS resolution
   nslookup cdn.bookedbarber.com
   
   # Test direct access
   curl -I https://cdn.bookedbarber.com
   
   # Verify CDN configuration
   npm run cdn:validate
   ```

2. **Cache Not Purging**:
   ```bash
   # Check credentials
   npm run cdn:validate
   
   # Manual purge with verbose output
   python scripts/cdn-deploy.py purge --paths /* --dry-run
   ```

3. **Mixed Content Errors**:
   - Ensure all CDN domains use HTTPS
   - Check SSL certificate validity
   - Verify Content Security Policy headers

4. **Performance Not Improved**:
   - Check cache headers are set correctly
   - Verify assets are being served from CDN
   - Test from multiple geographic locations
   - Consider edge location configuration

### Debug Commands

```bash
# Comprehensive CDN test
cd backend-v2
python scripts/cdn-deploy.py validate && \
python scripts/cdn-deploy.py status --paths / /_next/static/chunks/main.js

# Frontend debugging
cd frontend-v2
node -e "
const { getCDNStatus } = require('./lib/cdn-utils')
console.log(JSON.stringify(getCDNStatus(), null, 2))
"
```

## 📈 Performance Optimization

### Best Practices

1. **Asset Optimization**:
   - Use Next.js Image component for automatic optimization
   - Enable WebP/AVIF formats in CDN settings
   - Compress static assets before deployment

2. **Cache Strategy**:
   - Long TTL for static assets (1 year)
   - Medium TTL for images (1 week) 
   - Short TTL for dynamic content (5 minutes)

3. **Geographic Distribution**:
   - Configure edge locations near your users
   - Use regional CDN providers for specific markets
   - Consider multi-CDN setup for critical applications

### Performance Metrics

Target metrics with CDN enabled:
- **First Contentful Paint**: < 1.5s globally
- **Largest Contentful Paint**: < 2.5s globally  
- **Asset Load Time**: < 100ms for cached resources
- **Cache Hit Rate**: > 95% for static assets

## 🔐 Security Considerations

### CDN Security Headers

Ensure CDN forwards security headers:

```bash
# Required headers
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: origin-when-cross-origin
Content-Security-Policy: default-src 'self' *.bookedbarber.com
```

### Access Control

1. **API Key Management**:
   - Use least-privilege API tokens
   - Rotate credentials quarterly
   - Monitor API usage for anomalies

2. **Domain Validation**:
   - Restrict CDN to serve only your domains
   - Configure hotlink protection
   - Monitor for unauthorized usage

## 📊 Cost Management

### Cost Optimization

1. **Usage Monitoring**:
   - Track bandwidth usage by region
   - Monitor cache hit rates
   - Set up billing alerts

2. **Efficient Configuration**:
   - Use appropriate TTL settings
   - Enable compression at CDN level
   - Optimize image formats and sizes

### Cost Estimates

Monthly costs for 100GB bandwidth:
- **CloudFlare**: $20-50 (Pro plan)
- **CloudFront**: $8-15 (standard pricing)
- **Fastly**: $50-100 (usage-based)

## 🚀 Next Steps

After CDN setup:

1. **Monitor Performance**: Use web performance tools to validate improvements
2. **Set Up Alerts**: Configure monitoring for CDN uptime and performance
3. **Optimize Content**: Review and optimize assets based on CDN analytics
4. **Scale Planning**: Plan for traffic growth and geographic expansion

## 📚 Additional Resources

- [Next.js CDN Guide](https://nextjs.org/docs/basic-features/static-file-serving)
- [CloudFlare Workers](https://workers.cloudflare.com/) for edge computing
- [AWS CloudFront Best Practices](https://aws.amazon.com/cloudfront/best-practices/)
- [Fastly Edge Computing](https://www.fastly.com/products/edge-compute/serverless)

---

**Generated by**: Claude Code  
**Last Updated**: 2025-07-23  
**Version**: BookedBarber V2