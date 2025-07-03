#!/usr/bin/env python3
"""
Production Environment Setup for BookedBarber V2
Creates production-ready environment configurations safely
"""

import os
import sys
import secrets
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class ProductionEnvironmentSetup:
    def __init__(self):
        self.base_dir = Path.cwd()
        self.backend_dir = self.base_dir
        self.frontend_dir = self.base_dir / "frontend-v2"
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def generate_secure_secret(self, length: int = 64) -> str:
        """Generate cryptographically secure secret"""
        return secrets.token_urlsafe(length)
    
    def backup_existing_files(self):
        """Backup existing environment files"""
        print("📦 Creating backups of existing environment files...")
        
        backup_dir = self.base_dir / f"env_backups_{self.timestamp}"
        backup_dir.mkdir(exist_ok=True)
        
        # Backend files to backup
        backend_files = [".env", ".env.local", ".env.production"]
        for file in backend_files:
            src = self.backend_dir / file
            if src.exists():
                dst = backup_dir / f"backend_{file}"
                dst.write_text(src.read_text())
                print(f"   ✅ Backed up: backend/{file}")
        
        # Frontend files to backup
        frontend_files = [".env.local", ".env.production"]
        for file in frontend_files:
            src = self.frontend_dir / file
            if src.exists():
                dst = backup_dir / f"frontend_{file}"
                dst.write_text(src.read_text())
                print(f"   ✅ Backed up: frontend-v2/{file}")
        
        print(f"📁 Backups saved to: {backup_dir}")
        return backup_dir
    
    def create_production_backend_env(self) -> str:
        """Create production backend environment file"""
        print("🏭 Creating production backend environment...")
        
        # Generate secure secrets
        jwt_secret = self.generate_secure_secret(64)
        webhook_secret = f"whsec_{self.generate_secure_secret(32)}"
        
        production_env = f'''# =============================================================================
# 6FB BOOKING PLATFORM V2 - PRODUCTION ENVIRONMENT
# =============================================================================
# Created: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
# IMPORTANT: Fill in actual production values before deployment!

# =============================================================================
# CORE APPLICATION SETTINGS
# =============================================================================
ENVIRONMENT=production
LOG_LEVEL=WARNING
DEBUG=false
APP_NAME=6FB Booking API v2
APP_VERSION=2.0.0

# =============================================================================
# SECURITY & AUTHENTICATION
# =============================================================================
# CRITICAL: This is a generated secure key - keep it secret!
SECRET_KEY={jwt_secret}

# JWT Settings
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_ROUNDS=12

# =============================================================================
# DATABASE CONFIGURATION (PRODUCTION)
# =============================================================================
# TODO: Replace with your production PostgreSQL connection
# Format: postgresql://username:password@hostname:5432/database_name
DATABASE_URL=postgresql://REPLACE_WITH_PRODUCTION_DATABASE_URL

# Production database pool settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
DB_POOL_PRE_PING=true

# =============================================================================
# STRIPE PAYMENT CONFIGURATION (PRODUCTION)
# =============================================================================
# TODO: Replace with your LIVE Stripe keys from https://dashboard.stripe.com/apikeys
# CRITICAL: Use LIVE keys (sk_live_..., pk_live_...) for production!
STRIPE_SECRET_KEY=REPLACE_WITH_LIVE_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=REPLACE_WITH_LIVE_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET={webhook_secret}

# Stripe Connect for barber payouts
STRIPE_CONNECT_CLIENT_ID=REPLACE_WITH_STRIPE_CONNECT_CLIENT_ID

# =============================================================================
# PRODUCTION DOMAINS & CORS
# =============================================================================
# TODO: Replace with your actual production domains
ALLOWED_ORIGINS=https://app.bookedbarber.com,https://bookedbarber.com,https://www.bookedbarber.com

# =============================================================================
# GOOGLE SERVICES (PRODUCTION)
# =============================================================================
# TODO: Set up production Google Cloud project and credentials
GOOGLE_CLIENT_ID=REPLACE_WITH_PRODUCTION_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_WITH_PRODUCTION_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.bookedbarber.com/api/calendar/callback

# =============================================================================
# EMAIL CONFIGURATION (PRODUCTION)
# =============================================================================
# TODO: Set up production SendGrid account
SENDGRID_API_KEY=REPLACE_WITH_PRODUCTION_SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=noreply@bookedbarber.com
SENDGRID_FROM_NAME=BookedBarber

# =============================================================================
# SMS CONFIGURATION (PRODUCTION)
# =============================================================================
# TODO: Set up production Twilio account
TWILIO_ACCOUNT_SID=REPLACE_WITH_PRODUCTION_TWILIO_SID
TWILIO_AUTH_TOKEN=REPLACE_WITH_PRODUCTION_TWILIO_TOKEN
TWILIO_PHONE_NUMBER=REPLACE_WITH_PRODUCTION_TWILIO_PHONE

# =============================================================================
# REDIS CONFIGURATION (PRODUCTION)
# =============================================================================
# TODO: Set up production Redis instance (recommended: Redis Cloud or AWS ElastiCache)
REDIS_URL=REPLACE_WITH_PRODUCTION_REDIS_URL
REDIS_MAX_CONNECTIONS=50
REDIS_SOCKET_TIMEOUT=5

# =============================================================================
# MONITORING & ERROR TRACKING (PRODUCTION)
# =============================================================================
# TODO: Set up Sentry project for production
SENTRY_DSN=REPLACE_WITH_PRODUCTION_SENTRY_DSN
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=0.8
SENTRY_TRACES_SAMPLE_RATE=0.05
SENTRY_PROFILES_SAMPLE_RATE=0.02

# =============================================================================
# RATE LIMITING (PRODUCTION)
# =============================================================================
RATE_LIMIT_PER_MINUTE=60
AUTH_RATE_LIMIT_PER_MINUTE=5

# =============================================================================
# NOTIFICATION SETTINGS (PRODUCTION)
# =============================================================================
APPOINTMENT_REMINDER_HOURS=[24,2]
NOTIFICATION_RETRY_ATTEMPTS=5
NOTIFICATION_RETRY_DELAY_SECONDS=300

# =============================================================================
# FEATURE FLAGS (PRODUCTION)
# =============================================================================
ENABLE_GOOGLE_CALENDAR=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
ENABLE_WEBHOOKS=true

# =============================================================================
# PRODUCTION SECURITY
# =============================================================================
SECURE_SSL_REDIRECT=true
SECURE_HSTS_SECONDS=31536000
SECURE_CONTENT_TYPE_NOSNIFF=true
SECURE_BROWSER_XSS_FILTER=true
SECURE_COOKIE_HTTPONLY=true
SECURE_COOKIE_SECURE=true
SECURE_COOKIE_SAMESITE=Lax

# =============================================================================
# BACKUP CONFIGURATION (PRODUCTION)
# =============================================================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# =============================================================================
# DEPLOYMENT PLATFORM VARIABLES
# =============================================================================
# These will be set automatically by your deployment platform
# Uncomment and set if using specific platforms:

# Railway
# PORT=8000

# Render
# RENDER_SERVICE_ID=your-service-id

# AWS/Google Cloud/Azure
# CLOUD_SQL_CONNECTION_NAME=your-connection-name

# =============================================================================
# IMPORTANT PRODUCTION NOTES
# =============================================================================
# 1. Replace ALL "REPLACE_WITH_..." placeholders with actual values
# 2. Never commit this file to version control
# 3. Use environment variable injection in your deployment platform
# 4. Test all external service connections before going live
# 5. Monitor logs and error rates after deployment
# 6. Set up health checks and monitoring alerts
# 7. Configure database backups and disaster recovery
# 8. Enable SSL/TLS for all external communications
# 9. Regularly rotate secrets and API keys
# 10. Review and audit access logs periodically
'''
        
        prod_env_file = self.backend_dir / ".env.production"
        prod_env_file.write_text(production_env)
        print(f"   ✅ Created: {prod_env_file}")
        
        return str(prod_env_file)
    
    def create_production_frontend_env(self) -> str:
        """Create production frontend environment file"""
        print("🖥️ Creating production frontend environment...")
        
        production_env = f'''# =============================================================================
# 6FB BOOKING PLATFORM V2 - FRONTEND PRODUCTION ENVIRONMENT
# =============================================================================
# Created: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
# IMPORTANT: Fill in actual production values before deployment!

# =============================================================================
# CORE CONFIGURATION (PRODUCTION)
# =============================================================================
NODE_ENV=production

# TODO: Replace with your actual production URLs
NEXT_PUBLIC_API_URL=https://api.bookedbarber.com
NEXT_PUBLIC_APP_URL=https://app.bookedbarber.com

# =============================================================================
# STRIPE CONFIGURATION (PRODUCTION)
# =============================================================================
# TODO: Replace with your LIVE Stripe publishable key
# Get from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REPLACE_WITH_LIVE_STRIPE_PUBLISHABLE_KEY

# =============================================================================
# ANALYTICS & TRACKING (PRODUCTION)
# =============================================================================
# TODO: Set up production analytics accounts
NEXT_PUBLIC_GA_MEASUREMENT_ID=REPLACE_WITH_PRODUCTION_GA_ID
NEXT_PUBLIC_GTM_ID=REPLACE_WITH_PRODUCTION_GTM_ID
NEXT_PUBLIC_META_PIXEL_ID=REPLACE_WITH_PRODUCTION_META_PIXEL_ID

# =============================================================================
# ERROR TRACKING & MONITORING (SENTRY)
# =============================================================================
# TODO: Set up production Sentry project
NEXT_PUBLIC_SENTRY_DSN=REPLACE_WITH_PRODUCTION_SENTRY_DSN
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Production-optimized sampling rates
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE=0.05

# Disable session replay in production (privacy)
NEXT_PUBLIC_SENTRY_ENABLE_REPLAY=false

# =============================================================================
# SENTRY BUILD CONFIGURATION
# =============================================================================
# TODO: Set up for source map uploads
SENTRY_ORG=REPLACE_WITH_SENTRY_ORG
SENTRY_PROJECT=REPLACE_WITH_SENTRY_PROJECT
SENTRY_AUTH_TOKEN=REPLACE_WITH_SENTRY_AUTH_TOKEN
SENTRY_UPLOAD_SOURCE_MAPS=true
SENTRY_AUTO_RELEASE=true

# =============================================================================
# GOOGLE SERVICES (PRODUCTION)
# =============================================================================
# TODO: Set up production Google services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=REPLACE_WITH_PRODUCTION_GOOGLE_MAPS_KEY
NEXT_PUBLIC_GOOGLE_BUSINESS_ENABLED=true
NEXT_PUBLIC_GOOGLE_RESERVE_ENABLED=true

# =============================================================================
# FEATURE FLAGS (PRODUCTION)
# =============================================================================
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CALENDAR_INTEGRATION=true
NEXT_PUBLIC_ENABLE_SMS_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_EMAIL_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
NEXT_PUBLIC_ENABLE_ADMIN_PANEL=true

# Disable development features
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_ENABLE_DEVTOOLS=false

# =============================================================================
# PRODUCTION BRANDING
# =============================================================================
NEXT_PUBLIC_BUSINESS_NAME=BookedBarber
NEXT_PUBLIC_BUSINESS_EMAIL=info@bookedbarber.com
NEXT_PUBLIC_BUSINESS_PHONE=+1-555-BARBER-1

# =============================================================================
# PERFORMANCE CONFIGURATION (PRODUCTION)
# =============================================================================
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_API_RETRY_ATTEMPTS=2
NEXT_PUBLIC_API_RETRY_DELAY=2000
NEXT_PUBLIC_IMAGE_OPTIMIZATION=true

# =============================================================================
# SECURITY CONFIGURATION (PRODUCTION)
# =============================================================================
NEXT_PUBLIC_CSP_ENABLED=true
NEXT_PUBLIC_SECURITY_HEADERS=true

# =============================================================================
# TIMEZONE CONFIGURATION
# =============================================================================
NEXT_PUBLIC_DEFAULT_TIMEZONE=America/New_York

# =============================================================================
# BUILD CONFIGURATION
# =============================================================================
BUILD_ENV=production
BUILD_VERSION=2.0.0
ANALYZE=false

# =============================================================================
# THIRD-PARTY INTEGRATIONS (PRODUCTION)
# =============================================================================
# TODO: Set up production accounts for these services
NEXT_PUBLIC_INTERCOM_APP_ID=REPLACE_WITH_PRODUCTION_INTERCOM_ID
NEXT_PUBLIC_HOTJAR_ID=REPLACE_WITH_PRODUCTION_HOTJAR_ID
NEXT_PUBLIC_MIXPANEL_TOKEN=REPLACE_WITH_PRODUCTION_MIXPANEL_TOKEN

# =============================================================================
# IMPORTANT PRODUCTION NOTES
# =============================================================================
# 1. Replace ALL "REPLACE_WITH_..." placeholders with actual values
# 2. Never commit this file to version control
# 3. All NEXT_PUBLIC_ variables are exposed to the browser
# 4. Use build-time environment injection for sensitive build variables
# 5. Test all integrations in staging before production deployment
# 6. Monitor Core Web Vitals and performance metrics
# 7. Set up proper domain SSL certificates
# 8. Configure CDN for static assets
# 9. Enable compression and caching headers
# 10. Test cross-browser compatibility before deployment
'''
        
        prod_env_file = self.frontend_dir / ".env.production"
        prod_env_file.write_text(production_env)
        print(f"   ✅ Created: {prod_env_file}")
        
        return str(prod_env_file)
    
    def create_environment_switcher(self):
        """Create scripts to easily switch between environments"""
        print("🔄 Creating environment switching tools...")
        
        # Backend environment switcher
        backend_switcher = '''#!/bin/bash
# Environment Switcher for BookedBarber V2 Backend
# Usage: ./switch_env.sh [development|production|staging]

set -e

ENVIRONMENT=${1:-development}
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Switching to $ENVIRONMENT environment..."

case $ENVIRONMENT in
    development)
        if [ -f "$BACKEND_DIR/.env.development" ]; then
            cp "$BACKEND_DIR/.env.development" "$BACKEND_DIR/.env"
        elif [ -f "$BACKEND_DIR/.env" ]; then
            echo "✅ Using existing .env file for development"
        else
            echo "❌ No development environment file found"
            exit 1
        fi
        ;;
    production)
        if [ -f "$BACKEND_DIR/.env.production" ]; then
            cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
            echo "⚠️  PRODUCTION MODE: Ensure all secrets are configured!"
        else
            echo "❌ No production environment file found"
            exit 1
        fi
        ;;
    staging)
        if [ -f "$BACKEND_DIR/.env.staging" ]; then
            cp "$BACKEND_DIR/.env.staging" "$BACKEND_DIR/.env"
        else
            echo "❌ No staging environment file found"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, production, staging"
        exit 1
        ;;
esac

echo "✅ Environment switched to: $ENVIRONMENT"
echo "📁 Active environment file: $BACKEND_DIR/.env"

# Validate the environment
if [ -f "$BACKEND_DIR/scripts/validate_environment.py" ]; then
    echo "🔍 Validating environment configuration..."
    python "$BACKEND_DIR/scripts/validate_environment.py"
fi
'''
        
        switcher_file = self.backend_dir / "switch_env.sh"
        switcher_file.write_text(backend_switcher)
        switcher_file.chmod(0o755)
        print(f"   ✅ Created: {switcher_file}")
        
        # Frontend environment switcher
        frontend_switcher = '''#!/bin/bash
# Environment Switcher for BookedBarber V2 Frontend
# Usage: ./switch_env.sh [development|production|staging]

set -e

ENVIRONMENT=${1:-development}
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Switching frontend to $ENVIRONMENT environment..."

case $ENVIRONMENT in
    development)
        if [ -f "$FRONTEND_DIR/.env.local" ]; then
            echo "✅ Using existing .env.local for development"
        else
            echo "❌ No development environment file (.env.local) found"
            exit 1
        fi
        ;;
    production)
        if [ -f "$FRONTEND_DIR/.env.production" ]; then
            # Copy to .env.local for Next.js
            cp "$FRONTEND_DIR/.env.production" "$FRONTEND_DIR/.env.local"
            echo "⚠️  PRODUCTION MODE: Frontend configured for production!"
        else
            echo "❌ No production environment file found"
            exit 1
        fi
        ;;
    staging)
        if [ -f "$FRONTEND_DIR/.env.staging" ]; then
            cp "$FRONTEND_DIR/.env.staging" "$FRONTEND_DIR/.env.local"
        else
            echo "❌ No staging environment file found"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, production, staging"
        exit 1
        ;;
esac

echo "✅ Frontend environment switched to: $ENVIRONMENT"
echo "📁 Active environment file: $FRONTEND_DIR/.env.local"
'''
        
        frontend_switcher_file = self.frontend_dir / "switch_env.sh"
        frontend_switcher_file.write_text(frontend_switcher)
        frontend_switcher_file.chmod(0o755)
        print(f"   ✅ Created: {frontend_switcher_file}")
    
    def create_deployment_checklist(self):
        """Create production deployment checklist"""
        print("📋 Creating production deployment checklist...")
        
        checklist = f'''# 🚀 BookedBarber V2 Production Deployment Checklist

Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## 🔒 Pre-Deployment Security Checklist

### Backend Environment Variables
- [ ] Replace `REPLACE_WITH_PRODUCTION_DATABASE_URL` with actual PostgreSQL connection
- [ ] Replace `REPLACE_WITH_LIVE_STRIPE_SECRET_KEY` with live Stripe secret key
- [ ] Replace `REPLACE_WITH_LIVE_STRIPE_PUBLISHABLE_KEY` with live Stripe publishable key
- [ ] Replace `REPLACE_WITH_PRODUCTION_SENDGRID_API_KEY` with production SendGrid key
- [ ] Replace `REPLACE_WITH_PRODUCTION_TWILIO_SID` with production Twilio SID
- [ ] Replace `REPLACE_WITH_PRODUCTION_REDIS_URL` with production Redis URL
- [ ] Replace `REPLACE_WITH_PRODUCTION_SENTRY_DSN` with production Sentry DSN
- [ ] Verify `SECRET_KEY` is the generated secure key (64 characters)
- [ ] Update `ALLOWED_ORIGINS` with actual production domains

### Frontend Environment Variables
- [ ] Replace `REPLACE_WITH_LIVE_STRIPE_PUBLISHABLE_KEY` with live Stripe publishable key
- [ ] Replace `NEXT_PUBLIC_API_URL` with production API URL
- [ ] Replace `NEXT_PUBLIC_APP_URL` with production app URL
- [ ] Replace all Google service API keys with production keys
- [ ] Replace analytics IDs (GA, GTM, Meta Pixel) with production IDs
- [ ] Replace Sentry DSN with production DSN

## 🗄️ Database Preparation

- [ ] Set up production PostgreSQL database
- [ ] Run database migrations: `alembic upgrade head`
- [ ] Create database backups schedule
- [ ] Test database connection from production environment
- [ ] Set up database monitoring and alerts

## 🏗️ Infrastructure Setup

### Required Services
- [ ] PostgreSQL database (AWS RDS, Google Cloud SQL, or similar)
- [ ] Redis instance (Redis Cloud, AWS ElastiCache, or similar)
- [ ] Email service (SendGrid, AWS SES, or similar)
- [ ] SMS service (Twilio, AWS SNS, or similar)
- [ ] Error tracking (Sentry)
- [ ] Domain and SSL certificates

### Platform Configuration
- [ ] Configure deployment platform (Railway, Render, Vercel, etc.)
- [ ] Set up environment variables in deployment platform
- [ ] Configure automatic deployments from Git
- [ ] Set up health checks and monitoring
- [ ] Configure CDN for static assets (if applicable)

## 🧪 Testing Checklist

### Pre-Deployment Testing
- [ ] Run all backend tests: `pytest`
- [ ] Run all frontend tests: `npm test`
- [ ] Run integration tests
- [ ] Test payment flows with Stripe test mode
- [ ] Test email and SMS notifications
- [ ] Test Google Calendar integration
- [ ] Verify CORS settings with production domains

### Staging Environment Testing
- [ ] Deploy to staging environment first
- [ ] Test complete booking flow end-to-end
- [ ] Test payment processing
- [ ] Test user registration and authentication
- [ ] Test admin panel functionality
- [ ] Test mobile responsiveness
- [ ] Performance testing under load

## 🔍 Production Validation

### Post-Deployment Checks
- [ ] Verify health endpoints: `/health` and `/docs`
- [ ] Test user registration and login
- [ ] Create test booking and verify complete flow
- [ ] Test payment processing with small amount
- [ ] Verify email and SMS notifications work
- [ ] Check error tracking in Sentry
- [ ] Monitor application logs for errors
- [ ] Test SSL certificate and security headers

### Performance Monitoring
- [ ] Set up application performance monitoring
- [ ] Configure database performance monitoring
- [ ] Set up uptime monitoring
- [ ] Configure error rate alerts
- [ ] Monitor Core Web Vitals
- [ ] Set up backup and disaster recovery testing

## 🚨 Security Hardening

- [ ] Enable HTTPS everywhere (HSTS headers)
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Enable security headers (CSP, X-Frame-Options, etc.)
- [ ] Audit and rotate all secrets and API keys
- [ ] Set up intrusion detection
- [ ] Configure firewall rules
- [ ] Enable database encryption at rest

## 📈 Business Continuity

- [ ] Set up automated database backups
- [ ] Document disaster recovery procedures
- [ ] Create monitoring dashboards
- [ ] Set up alert notifications for critical issues
- [ ] Document scaling procedures
- [ ] Create incident response playbook
- [ ] Train team on production monitoring

## 🎯 Go-Live Checklist

### Final Steps
- [ ] Schedule maintenance window
- [ ] Notify users of go-live (if applicable)
- [ ] Switch DNS to production environment
- [ ] Monitor application closely for first 24 hours
- [ ] Have rollback plan ready
- [ ] Team on standby for immediate support

### Post Go-Live
- [ ] Monitor error rates and performance
- [ ] Verify all integrations working correctly
- [ ] Check payment processing
- [ ] Monitor user feedback
- [ ] Update documentation
- [ ] Schedule post-deployment review

## 📞 Emergency Contacts

- [ ] Set up on-call rotation
- [ ] Document emergency procedures
- [ ] Create escalation matrix
- [ ] Set up communication channels (Slack, PagerDuty, etc.)

---

## ⚡ Quick Commands

### Environment Validation
```bash
# Backend
python scripts/validate_environment.py .env.production

# Frontend
cd frontend-v2 && npm run build
```

### Environment Switching
```bash
# Switch to production
./switch_env.sh production

# Switch back to development
./switch_env.sh development
```

### Database Migration
```bash
alembic upgrade head
```

### Production Health Check
```bash
curl https://api.bookedbarber.com/health
```

---
**Remember**: Production deployment is a critical process. Double-check everything and have a rollback plan ready!
'''
        
        checklist_file = self.base_dir / "PRODUCTION_DEPLOYMENT_CHECKLIST.md"
        checklist_file.write_text(checklist)
        print(f"   ✅ Created: {checklist_file}")
    
    def run_setup(self):
        """Run the complete production environment setup"""
        print("🚀 Setting up production environment for BookedBarber V2")
        print("=" * 60)
        
        try:
            # Step 1: Backup existing files
            backup_dir = self.backup_existing_files()
            
            # Step 2: Create production environment files
            backend_env = self.create_production_backend_env()
            frontend_env = self.create_production_frontend_env()
            
            # Step 3: Create environment switching tools
            self.create_environment_switcher()
            
            # Step 4: Create deployment checklist
            self.create_deployment_checklist()
            
            print("\n" + "=" * 60)
            print("✅ PRODUCTION ENVIRONMENT SETUP COMPLETE!")
            print("=" * 60)
            
            print(f"\n📁 Files Created:")
            print(f"   • {backend_env}")
            print(f"   • {frontend_env}")
            print(f"   • {self.base_dir}/switch_env.sh")
            print(f"   • {self.frontend_dir}/switch_env.sh")
            print(f"   • {self.base_dir}/PRODUCTION_DEPLOYMENT_CHECKLIST.md")
            
            print(f"\n💾 Backups Saved To:")
            print(f"   • {backup_dir}")
            
            print(f"\n⚠️  IMPORTANT NEXT STEPS:")
            print(f"   1. Review and fill in ALL 'REPLACE_WITH_...' placeholders in production files")
            print(f"   2. Never commit .env.production files to version control")
            print(f"   3. Test thoroughly in staging before production deployment")
            print(f"   4. Follow the production deployment checklist")
            
            print(f"\n🔧 Quick Commands:")
            print(f"   • Validate current environment: python scripts/validate_environment.py")
            print(f"   • Switch to production: ./switch_env.sh production")
            print(f"   • Switch to development: ./switch_env.sh development")
            print(f"   • Validate production config: python scripts/validate_environment.py .env.production")
            
            print(f"\n🎉 Your development environment remains unchanged and working!")
            
        except Exception as e:
            print(f"\n❌ Setup failed: {str(e)}")
            sys.exit(1)

def main():
    """Main setup function"""
    setup = ProductionEnvironmentSetup()
    setup.run_setup()

if __name__ == "__main__":
    main()