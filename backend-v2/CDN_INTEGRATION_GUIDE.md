# CDN Integration Guide - BookedBarber V2

## Overview

BookedBarber V2 includes comprehensive CDN (Content Delivery Network) integration for global static asset delivery, image optimization, and performance enhancement. This guide covers setup, configuration, and usage across different environments.

## Features

### 🚀 Core CDN Features
- **Multi-Provider Support**: CloudFlare, CloudFront, Fastly
- **Automatic Asset Optimization**: Images, CSS, JavaScript, fonts
- **Global Edge Caching**: Reduced latency worldwide
- **Cache Management**: Programmatic purging and warming
- **Performance Analytics**: Real-time CDN metrics
- **Image Optimization**: Dynamic resizing, format conversion, quality adjustment
- **Security**: Hotlink protection, CORS configuration, rate limiting

### 📊 Analytics & Monitoring
- Cache hit rates and performance metrics
- Bandwidth savings tracking
- Response time monitoring
- Geographic performance breakdown
- Asset-level analytics

## Quick Start

### 1. Environment Setup

Create environment files with CDN configuration:

**Backend (.env):**
```bash
# CDN Configuration
CDN_PROVIDER=cloudflare
CDN_ENABLED=true
CDN_URL=https://cdn.bookedbarber.com

# CloudFlare Settings
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_DOMAIN=cdn.bookedbarber.com
```

**Frontend (.env.local):**
```bash
# CDN Configuration
NEXT_PUBLIC_CDN_PROVIDER=cloudflare
NEXT_PUBLIC_CLOUDFLARE_DOMAIN=cdn.bookedbarber.com
NEXT_PUBLIC_ENVIRONMENT=production
```

### 2. Automated Setup

Use the setup script for automated configuration:

```bash
# Development with CloudFlare
python scripts/setup-cdn.py --env development --provider cloudflare

# Production with CloudFront
python scripts/setup-cdn.py --env production --provider cloudfront

# Staging with validation only
python scripts/setup-cdn.py --env staging --provider fastly --validate-only
```

### 3. Basic Usage

**Frontend (React/Next.js):**
```typescript
import { getCDNUrl, getOptimizedImageUrl } from '@/lib/cdn-utils'

// Static asset URLs
const logoUrl = getCDNUrl('/images/logo.svg')

// Optimized images
const heroImage = getOptimizedImageUrl('/images/hero.jpg', {
  width: 1200,
  height: 600,
  format: 'webp',
  quality: 90
})

// Responsive images
const srcSet = generateResponsiveSrcSet('/images/product.jpg', [400, 800, 1200])
```

**Backend (Python/FastAPI):**
```python
from services.cdn_service import cdn_service

# Get CDN URLs
cdn_url = cdn_service.get_asset_url('/css/main.css', 'static')

# Image optimization
async with cdn_service as cdn:
    optimized_url = await cdn.optimize_image(
        '/images/photo.jpg',
        width=500,
        height=300,
        format='webp'
    )

# Cache management
await cdn.purge_cache(['/css/main.css', '/js/app.js'])
```

## Provider-Specific Configuration

### CloudFlare

**Setup Requirements:**
- CloudFlare account with domain
- API token with Zone:Edit permissions
- Zone ID from CloudFlare dashboard

**Configuration:**
```bash
CDN_PROVIDER=cloudflare
CLOUDFLARE_ZONE_ID=abc123def456
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_DOMAIN=cdn.yourdomain.com
```

**Features:**
- Image Resizing (automatic WebP/AVIF conversion)
- Edge caching with custom TTLs
- Real-time analytics
- DDoS protection
- Free tier available

### Amazon CloudFront

**Setup Requirements:**
- AWS account with CloudFront access
- Distribution ID
- IAM user with CloudFront permissions

**Configuration:**
```bash
CDN_PROVIDER=cloudfront
CLOUDFRONT_DISTRIBUTION_ID=E123ABCDEF456
CLOUDFRONT_DOMAIN=d123456789.cloudfront.net
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

**Features:**
- Lambda@Edge for custom processing
- Geographic restrictions
- SSL/TLS certificates
- Real-time logs
- AWS ecosystem integration

### Fastly

**Setup Requirements:**
- Fastly account
- Service ID
- API token

**Configuration:**
```bash
CDN_PROVIDER=fastly
FASTLY_SERVICE_ID=abc123def456
FASTLY_API_TOKEN=your_token_here
FASTLY_DOMAIN=bookedbarber.global.ssl.fastly.net
```

**Features:**
- Instant purging
- Edge computing (VCL)
- Image Optimizer
- Real-time analytics
- Advanced caching rules

## API Endpoints

### CDN Status
```http
GET /api/v2/cdn/status
```
Returns CDN health and configuration status.

### Analytics
```http
GET /api/v2/cdn/analytics?days=7
```
Retrieve CDN performance metrics.

### Cache Management
```http
POST /api/v2/cdn/purge
Content-Type: application/json

{
  "paths": ["/css/main.css", "/js/app.js"],
  "tags": ["css", "javascript"]
}
```

### Image Optimization
```http
POST /api/v2/cdn/optimize-image
Content-Type: application/json

{
  "image_url": "/images/hero.jpg",
  "width": 800,
  "height": 400,
  "format": "webp",
  "quality": 85
}
```

### Asset URL Generation
```http
GET /api/v2/cdn/asset-url?path=/images/logo.png&asset_type=static
```

## Performance Optimization

### Image Optimization Best Practices

1. **Use Modern Formats**: WebP/AVIF for better compression
2. **Responsive Images**: Generate multiple sizes for different devices
3. **Quality Settings**: Balance quality vs file size (75-85 typically optimal)
4. **Lazy Loading**: Load images as needed
5. **Critical Images**: Preload above-the-fold images

```typescript
// Optimal image configuration
const imageConfig = {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 85,
  fit: 'cover'
}
```

### Caching Strategy

**Static Assets (1 year):**
- CSS, JavaScript files
- Fonts, icons
- Images (with versioning)

**Dynamic Content (5-10 minutes):**
- API responses
- User-specific content
- Frequently changing data

**Tracking/Analytics (1 hour):**
- Tracking pixels
- Analytics scripts
- Marketing tags

### Critical Asset Preloading

```typescript
// Preload critical assets
preloadCriticalAssets([
  { href: '/fonts/inter-var.woff2', as: 'font', crossorigin: true },
  { href: '/css/critical.css', as: 'style' },
  { href: '/images/hero.webp', as: 'image' }
])
```

## Monitoring & Analytics

### Performance Monitoring

The CDN integration includes automatic performance monitoring:

```typescript
import { cdnPerformanceMonitor } from '@/lib/cdn-utils'

// Get performance summary
const summary = cdnPerformanceMonitor.getPerformanceSummary()
console.log(`Average load time: ${summary.avgLoadTime}ms`)
console.log(`Cache hit rate: ${summary.cacheHitRate}`)
```

### Health Checks

Regular health checks ensure CDN availability:

```typescript
import { checkCDNHealth } from '@/lib/cdn-utils'

const health = await checkCDNHealth()
if (!health.healthy) {
  console.warn(`CDN issue: ${health.error}`)
}
```

### Analytics Dashboard

Access real-time CDN analytics:

```bash
# View CDN status
curl -H "Authorization: Bearer $API_TOKEN" \
  https://api.bookedbarber.com/api/v2/cdn/status

# Get performance metrics
curl -H "Authorization: Bearer $API_TOKEN" \
  https://api.bookedbarber.com/api/v2/cdn/analytics?days=7
```

## Troubleshooting

### Common Issues

**1. CDN URLs not working**
- Verify environment variables are set
- Check CDN provider credentials
- Ensure domain/distribution is active

**2. Images not optimizing**
- Confirm image optimization is enabled
- Check supported formats in provider settings
- Verify image URLs are accessible

**3. Cache not purging**
- Validate API credentials have purge permissions
- Check rate limits on purge requests
- Verify paths are correct (include leading slash)

**4. Slow performance**
- Check CDN health status
- Monitor cache hit rates
- Verify edge locations serve your geography

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Backend
CDN_DEBUG=true

# Frontend
NEXT_PUBLIC_CDN_DEBUG=true
```

### Health Check Script

```bash
#!/bin/bash
# Check CDN health
curl -f https://cdn.bookedbarber.com/health-check || echo "CDN health check failed"

# Test image optimization
curl -f "https://cdn.bookedbarber.com/cdn-cgi/image/w=100,f=webp/images/test.jpg" || echo "Image optimization failed"
```

## Security Considerations

### CORS Configuration
```javascript
// Allowed origins for CDN assets
const corsOrigins = [
  'https://bookedbarber.com',
  'https://staging.bookedbarber.com',
  'https://app.bookedbarber.com'
]
```

### Hotlink Protection
Prevent unauthorized usage of your CDN resources:

```bash
CDN_HOTLINK_PROTECTION=true
CDN_ALLOWED_REFERRERS=bookedbarber.com,*.bookedbarber.com
```

### Rate Limiting
Configure rate limits to prevent abuse:

```bash
CDN_RATE_LIMIT_ENABLED=true
CDN_RATE_LIMIT_PER_MINUTE=1000
```

## Production Deployment

### Pre-deployment Checklist
- [ ] CDN provider account configured
- [ ] Domain/distribution created and active
- [ ] SSL certificates installed
- [ ] Environment variables set in production
- [ ] DNS records updated (if using custom domain)
- [ ] Cache warming completed
- [ ] Health checks passing
- [ ] Analytics configured

### Deployment Script

```bash
#!/bin/bash
# Production CDN deployment

# 1. Validate configuration
python scripts/setup-cdn.py --env production --provider cloudflare --validate-only

# 2. Deploy CDN configuration
python scripts/setup-cdn.py --env production --provider cloudflare

# 3. Warm cache with critical assets
curl -X POST -H "Authorization: Bearer $API_TOKEN" \
  https://api.bookedbarber.com/api/v2/cdn/warm-cache

# 4. Verify deployment
python scripts/verify-cdn-deployment.py --env production
```

### Rollback Procedure

If issues arise with CDN deployment:

```bash
# 1. Disable CDN in environment
export CDN_PROVIDER=disabled

# 2. Restart services
./scripts/restart-services.sh

# 3. Verify local asset serving
curl -f https://bookedbarber.com/images/logo.svg
```

## Cost Optimization

### Traffic Patterns
- Monitor bandwidth usage
- Optimize cache hit rates
- Use appropriate TTL settings
- Implement efficient purging strategies

### Provider Comparison
| Feature | CloudFlare | CloudFront | Fastly |
|---------|------------|------------|--------|
| Free Tier | ✅ Yes | ❌ No | ❌ No |
| Image Optimization | ✅ Included | ⚠️ Extra cost | ⚠️ Extra cost |
| Real-time Analytics | ✅ Yes | ⚠️ Extra cost | ✅ Yes |
| Edge Computing | ✅ Workers | ✅ Lambda@Edge | ✅ VCL |
| Instant Purge | ✅ Yes | ❌ Up to 15min | ✅ Yes |

## Support & Resources

### Documentation Links
- [CloudFlare Docs](https://developers.cloudflare.com/)
- [CloudFront Docs](https://docs.aws.amazon.com/cloudfront/)
- [Fastly Docs](https://docs.fastly.com/)

### Internal Resources
- Configuration: `config/cdn_config.py`
- Service: `services/cdn_service.py`
- Frontend Utils: `lib/cdn-utils.ts`
- API Router: `routers/cdn.py`
- Setup Script: `scripts/setup-cdn.py`

### Getting Help
1. Check health status: `/api/v2/cdn/status`
2. Review logs for errors
3. Validate configuration with setup script
4. Contact CDN provider support if needed

---

**Last Updated**: 2025-07-23  
**Version**: 2.0.0  
**Compatibility**: BookedBarber V2 (FastAPI + Next.js)