# 6FB Booking Platform - Deployment Platforms

## Current Deployment Strategy

### ✅ **Primary Production Platform: Railway**
- **Production URL**: https://web-production-92a6c.up.railway.app
- **Domain**: https://bookedbarber.com
- **Status**: Active and Primary
- **Use Case**: Main production deployment

### ✅ **Alternative Platforms Supported**
- **Render**: Supported for backup/staging deployments
- **Docker**: Container deployments for any cloud provider
- **Local Development**: localhost for development and testing

### ❌ **Deprecated Platforms**
- **Vercel**: No longer used as of June 2025
  - Removed from CORS origins
  - Removed from OAuth redirect URIs
  - All Vercel-specific configurations removed

## Environment Configuration

### Current CORS Origins (Updated):
```
http://localhost:3000,http://localhost:3001,https://bookedbarber.com,https://web-production-92a6c.up.railway.app
```

### Google Calendar OAuth Redirect URIs:
```
http://localhost:8000/api/v1/google-calendar/oauth/callback
https://bookedbarber.com/api/v1/google-calendar/oauth/callback
https://web-production-92a6c.up.railway.app/api/v1/google-calendar/oauth/callback
```

## Platform-Specific Notes

### Railway Deployment
- **Advantages**: Easy deployment, good PostgreSQL integration, environment management
- **Configuration**: Uses Railway-specific environment variables
- **Domain**: Custom domain (bookbarber.com) points to Railway deployment

### Docker Support
- Dockerfile available for container deployments
- Works with any cloud provider that supports containers
- Environment variables passed through container runtime

### Local Development
- Uses localhost:3000 (frontend) and localhost:8000 (backend)
- SQLite database for development
- All OAuth redirects configured for local testing

---
**Last Updated**: June 25, 2025
**Note**: Always update this file when changing deployment platforms or configurations.