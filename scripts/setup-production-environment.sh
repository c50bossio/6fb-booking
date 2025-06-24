#!/bin/bash

# =============================================================================
# 6FB Booking Platform - Production Environment Setup
# =============================================================================
# This script helps set up the production environment for the financial dashboard

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 6FB Booking - Production Environment Setup${NC}"
echo "=============================================="

# Function to generate secure keys
generate_secret_key() {
    python3 -c "import secrets; print(secrets.token_urlsafe(64))"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

# Generate production environment file
echo -e "${BLUE}🔧 Setting up production environment...${NC}"

PROD_ENV_FILE="$PROJECT_ROOT/backend/.env.production.generated"

cat > "$PROD_ENV_FILE" << EOF
# =============================================================================
# 6FB Booking Platform - Production Environment Configuration
# Generated: $(date)
# =============================================================================

# Core Application Settings
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=$(generate_secret_key)
JWT_SECRET_KEY=$(generate_secret_key)
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration
# Replace with your production PostgreSQL URL
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
POSTGRES_DB=6fb_booking_prod
POSTGRES_USER=6fb_user
POSTGRES_PASSWORD=$(generate_secret_key | head -c 32)

# Frontend URLs
FRONTEND_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# CORS Configuration
ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com

# Stripe Configuration (Production Keys)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Email Configuration (SendGrid)
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@your-domain.com
FROM_NAME="Six Figure Barber Platform"

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=+1YOUR_TWILIO_PHONE

# Google Calendar Integration
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.your-domain.com/api/v1/auth/google/callback

# Security Settings
RATE_LIMIT_PER_MINUTE=100
AUTH_RATE_LIMIT_PER_MINUTE=5
API_RATE_LIMIT_PER_MINUTE=200
MAX_REQUEST_SIZE=10485760
SECURITY_KEY=$(generate_secret_key)

# Monitoring & Error Tracking
SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
SENTRY_ENVIRONMENT=production

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379/0

# Performance Settings
ENABLE_QUERY_LOGGING=false
ENABLE_PERFORMANCE_MONITORING=true
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30

# Financial Dashboard Settings
DEMO_MODE_ENABLED=true
FINANCIAL_REPORTING_ENABLED=true
PAYOUT_PROCESSING_ENABLED=true

# File Upload Settings
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,csv,xlsx

# Backup Settings
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30

EOF

echo -e "${GREEN}✅ Production environment file created: $PROD_ENV_FILE${NC}"

# Generate frontend environment
FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/.env.production.generated"

cat > "$FRONTEND_ENV_FILE" << EOF
# 6FB Booking Frontend - Production Environment
# Generated: $(date)

NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Build Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# CDN Configuration (Optional)
CDN_URL=https://cdn.your-domain.com
NEXT_PUBLIC_CDN_URL=https://cdn.your-domain.com

EOF

echo -e "${GREEN}✅ Frontend environment file created: $FRONTEND_ENV_FILE${NC}"

# Create production deployment checklist
CHECKLIST_FILE="$PROJECT_ROOT/PRODUCTION_DEPLOYMENT_CHECKLIST.md"

cat > "$CHECKLIST_FILE" << EOF
# 6FB Booking - Production Deployment Checklist

## Pre-Deployment

### Environment Configuration
- [ ] Copy .env.production.generated to .env.production
- [ ] Update DATABASE_URL with real PostgreSQL connection
- [ ] Add real Stripe production keys
- [ ] Configure SendGrid API key
- [ ] Set up custom domain URLs
- [ ] Configure CORS origins

### Database Setup
- [ ] Create production PostgreSQL database
- [ ] Run database migrations: \`alembic upgrade head\`
- [ ] Create production admin user
- [ ] Seed initial data (service categories, etc.)

### Third-Party Services
- [ ] Stripe account in production mode
- [ ] SendGrid account with verified domain
- [ ] Sentry project for error tracking
- [ ] Domain registration and DNS setup
- [ ] SSL certificate configuration

## Deployment

### Backend Deployment
- [ ] Deploy to hosting provider (Render, Railway, etc.)
- [ ] Configure environment variables
- [ ] Set up health checks
- [ ] Configure auto-scaling (if applicable)
- [ ] Test API endpoints

### Frontend Deployment
- [ ] Deploy to Vercel/Netlify
- [ ] Configure custom domain
- [ ] Set up CDN (if applicable)
- [ ] Test all pages and functionality

### Security
- [ ] Enable HTTPS/SSL
- [ ] Configure security headers
- [ ] Set up rate limiting
- [ ] Enable CORS protection
- [ ] Configure firewall rules

## Post-Deployment

### Testing
- [ ] Test user registration/login
- [ ] Test financial dashboard with demo data
- [ ] Test payment processing
- [ ] Test email notifications
- [ ] Test mobile responsiveness

### Monitoring
- [ ] Set up uptime monitoring
- [ ] Configure error alerting
- [ ] Set up performance monitoring
- [ ] Create status page
- [ ] Set up backup monitoring

### Documentation
- [ ] Update README with production URLs
- [ ] Create user onboarding guide
- [ ] Document admin procedures
- [ ] Create troubleshooting guide

## Business Launch

### Customer Onboarding
- [ ] Create demo accounts for sales
- [ ] Prepare sales materials
- [ ] Train customer support
- [ ] Set up payment processing
- [ ] Create pricing plans

### Marketing
- [ ] Update website with new features
- [ ] Create feature announcement
- [ ] Prepare social media content
- [ ] Set up analytics tracking

EOF

echo -e "${GREEN}✅ Production deployment checklist created: $CHECKLIST_FILE${NC}"

# Create quick deployment scripts
echo -e "${BLUE}🔧 Creating deployment scripts...${NC}"

# Backend deployment script
cat > "$PROJECT_ROOT/scripts/deploy-backend.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🚀 Deploying 6FB Backend to Production..."

# Build and deploy backend
cd "$(dirname "$0")/../backend"

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start production server
echo "✅ Backend deployment complete!"
echo "Start with: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4"
EOF

# Frontend deployment script
cat > "$PROJECT_ROOT/scripts/deploy-frontend.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🚀 Deploying 6FB Frontend to Production..."

# Build and deploy frontend
cd "$(dirname "$0")/../frontend"

# Install dependencies
npm install

# Build for production
npm run build

echo "✅ Frontend deployment complete!"
echo "Deploy the .next folder to your hosting provider"
EOF

chmod +x "$PROJECT_ROOT/scripts/deploy-backend.sh"
chmod +x "$PROJECT_ROOT/scripts/deploy-frontend.sh"

echo -e "${GREEN}✅ Deployment scripts created${NC}"

# Summary
echo ""
echo -e "${GREEN}🎉 Production Environment Setup Complete!${NC}"
echo "=============================================="
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Review and customize the generated environment files:"
echo "   - $PROD_ENV_FILE"
echo "   - $FRONTEND_ENV_FILE"
echo ""
echo "2. Set up your hosting providers:"
echo "   - Backend: Render, Railway, or AWS"
echo "   - Frontend: Vercel, Netlify, or AWS"
echo "   - Database: PostgreSQL on your hosting provider"
echo ""
echo "3. Configure third-party services:"
echo "   - Stripe (production mode)"
echo "   - SendGrid (email delivery)"
echo "   - Sentry (error tracking)"
echo ""
echo "4. Follow the deployment checklist:"
echo "   - $CHECKLIST_FILE"
echo ""
echo -e "${BLUE}💡 Pro Tips:${NC}"
echo "- Test everything in staging environment first"
echo "- Keep your API keys secure and never commit them"
echo "- Set up monitoring and alerting before launch"
echo "- Have a rollback plan ready"
echo ""
echo -e "${GREEN}Your financial dashboard is ready for production! 🚀${NC}"
EOF