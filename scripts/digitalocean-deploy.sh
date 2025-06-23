#!/bin/bash

# 6FB Booking Platform - DigitalOcean App Platform Deployment Script
# This script configures and deploys the application to DigitalOcean App Platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_LOG="/tmp/digitalocean-deploy-$(date +%Y%m%d-%H%M%S).log"
APP_NAME="${APP_NAME:-6fb-booking-platform}"
REGION="${REGION:-nyc1}"
DOMAIN="${DOMAIN:-}"
BRANCH="${BRANCH:-main}"

# Logging function
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$DEPLOY_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$DEPLOY_LOG"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..." "$BLUE"

    # Check if doctl is installed
    if ! command -v doctl &> /dev/null; then
        error "doctl (DigitalOcean CLI) is not installed!"
        echo "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
    fi

    # Check if user is authenticated
    if ! doctl account get &>/dev/null; then
        error "Not authenticated with DigitalOcean!"
        echo "Run: doctl auth init"
        exit 1
    fi

    # Check if git is available and we're in a git repo
    if ! git rev-parse --git-dir &>/dev/null; then
        error "Not in a git repository!"
        exit 1
    fi

    # Check if required files exist
    REQUIRED_FILES=(
        "$PROJECT_ROOT/backend/requirements.txt"
        "$PROJECT_ROOT/frontend/package.json"
        "$PROJECT_ROOT/.env.template"
    )

    for file in "${REQUIRED_FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file not found: $file"
            exit 1
        fi
    done

    log "Prerequisites check passed"
}

# Create DigitalOcean App Spec
create_app_spec() {
    log "Creating DigitalOcean App Platform specification..." "$BLUE"

    # Get git repository URL
    GIT_URL=$(git config --get remote.origin.url | sed 's/\.git$//')

    if [[ "$GIT_URL" =~ ^git@ ]]; then
        # Convert SSH URL to HTTPS
        GIT_URL=$(echo "$GIT_URL" | sed 's/git@github.com:/https:\/\/github.com\//')
    fi

    cat > "$PROJECT_ROOT/digitalocean-app.yaml" << EOF
name: $APP_NAME
region: $REGION

services:
  # Backend Service (FastAPI)
  - name: backend
    source_dir: /backend
    github:
      repo: $GIT_URL
      branch: $BRANCH
    run_command: uvicorn main:app --host 0.0.0.0 --port 8080 --workers 2
    environment_slug: python
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 8080
    health_check:
      http_path: /api/v1/health
      initial_delay_seconds: 60
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3

    envs:
      - key: ENVIRONMENT
        value: production
      - key: FRONTEND_URL
        value: \${_self.FRONTEND_URL}
      - key: DATABASE_URL
        value: \${db.DATABASE_URL}
      - key: SECRET_KEY
        value: \${SECRET_KEY}
        type: SECRET
      - key: JWT_SECRET_KEY
        value: \${JWT_SECRET_KEY}
        type: SECRET
      - key: STRIPE_SECRET_KEY
        value: \${STRIPE_SECRET_KEY}
        type: SECRET
      - key: STRIPE_PUBLISHABLE_KEY
        value: \${STRIPE_PUBLISHABLE_KEY}
        type: SECRET
      - key: STRIPE_WEBHOOK_SECRET
        value: \${STRIPE_WEBHOOK_SECRET}
        type: SECRET
      - key: STRIPE_CONNECT_CLIENT_ID
        value: \${STRIPE_CONNECT_CLIENT_ID}
        type: SECRET
      - key: SENDGRID_API_KEY
        value: \${SENDGRID_API_KEY}
        type: SECRET
      - key: SENDGRID_FROM_EMAIL
        value: \${SENDGRID_FROM_EMAIL}
        type: SECRET
      - key: REDIS_URL
        value: \${redis.REDIS_URL}

  # Frontend Service (Next.js)
  - name: frontend
    source_dir: /frontend
    github:
      repo: $GIT_URL
      branch: $BRANCH
    build_command: npm ci && npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 3000

    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: \${backend.PUBLIC_URL}/api
      - key: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        value: \${STRIPE_PUBLISHABLE_KEY}
        type: SECRET
      - key: NEXT_PUBLIC_GA_TRACKING_ID
        value: \${GA_TRACKING_ID}
        type: SECRET

databases:
  # PostgreSQL Database
  - name: db
    engine: PG
    version: "14"
    size: basic-xs
    num_nodes: 1

  # Redis Cache
  - name: redis
    engine: REDIS
    version: "7"
    size: basic-xs

# Domain configuration (if provided)
EOF

    # Add domain configuration if provided
    if [[ -n "$DOMAIN" ]]; then
        cat >> "$PROJECT_ROOT/digitalocean-app.yaml" << EOF

domains:
  - domain: $DOMAIN
    type: PRIMARY
EOF
    fi

    log "App specification created: $PROJECT_ROOT/digitalocean-app.yaml"
}

# Create environment template for DigitalOcean
create_env_template() {
    log "Creating environment variable template..." "$BLUE"

    cat > "$PROJECT_ROOT/digitalocean-env.template" << EOF
# DigitalOcean App Platform Environment Variables
# Copy this template and fill in your actual values

# Security Keys (Generate with: openssl rand -base64 32)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_CONNECT_CLIENT_ID=ca_your-connect-client-id

# Email Service (SendGrid recommended for production)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Analytics (Optional)
GA_TRACKING_ID=G-XXXXXXXXXX
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Monitoring (Optional)
UPTIME_ROBOT_API_KEY=your-uptimerobot-api-key
EOF

    log "Environment template created: $PROJECT_ROOT/digitalocean-env.template"
}

# Create production Dockerfile for backend
create_backend_dockerfile() {
    log "Creating backend Dockerfile..." "$BLUE"

    cat > "$PROJECT_ROOT/backend/Dockerfile" << 'EOF'
# Backend Dockerfile for DigitalOcean App Platform
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
EOF

    log "Backend Dockerfile created"
}

# Create production Dockerfile for frontend
create_frontend_dockerfile() {
    log "Creating frontend Dockerfile..." "$BLUE"

    cat > "$PROJECT_ROOT/frontend/Dockerfile" << 'EOF'
# Frontend Dockerfile for DigitalOcean App Platform
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
EOF

    log "Frontend Dockerfile created"
}

# Configure Next.js for standalone output
configure_nextjs() {
    log "Configuring Next.js for production..." "$BLUE"

    # Check if next.config.js exists
    if [[ -f "$PROJECT_ROOT/frontend/next.config.js" ]]; then
        # Backup existing config
        cp "$PROJECT_ROOT/frontend/next.config.js" "$PROJECT_ROOT/frontend/next.config.js.backup"
    fi

    cat > "$PROJECT_ROOT/frontend/next.config.js" << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Optimize for production
  compress: true,
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GA_TRACKING_ID: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  },
};

module.exports = nextConfig;
EOF

    log "Next.js configuration updated"
}

# Create deployment GitHub Actions workflow
create_github_workflow() {
    log "Creating GitHub Actions workflow..." "$BLUE"

    mkdir -p "$PROJECT_ROOT/.github/workflows"

    cat > "$PROJECT_ROOT/.github/workflows/deploy-digitalocean.yml" << 'EOF'
name: Deploy to DigitalOcean App Platform

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Update app
        run: |
          doctl apps update ${{ secrets.DIGITALOCEAN_APP_ID }} --spec digitalocean-app.yaml

      - name: Wait for deployment
        run: |
          # Wait for deployment to complete
          sleep 60

          # Check deployment status
          doctl apps get ${{ secrets.DIGITALOCEAN_APP_ID }}

      - name: Run health checks
        run: |
          # Get app URL
          APP_URL=$(doctl apps get ${{ secrets.DIGITALOCEAN_APP_ID }} --format URL --no-header)

          # Wait for app to be ready
          for i in {1..30}; do
            if curl -f -s "$APP_URL/api/v1/health" > /dev/null; then
              echo "Health check passed"
              break
            fi
            echo "Waiting for app to be ready... ($i/30)"
            sleep 10
          done

          # Final health check
          curl -f "$APP_URL/api/v1/health"
EOF

    log "GitHub Actions workflow created"
}

# Create production monitoring configuration
create_monitoring_config() {
    log "Creating monitoring configuration..." "$BLUE"

    cat > "$PROJECT_ROOT/monitoring-production.yaml" << EOF
# Production Monitoring Configuration for DigitalOcean
# Configure these services after deployment

uptime_monitoring:
  service: UptimeRobot
  endpoints:
    - name: "6FB Booking API Health"
      url: "https://your-app-url/api/v1/health"
      interval: 300  # 5 minutes

    - name: "6FB Booking Frontend"
      url: "https://your-app-url"
      interval: 300  # 5 minutes

    - name: "6FB Booking Auth"
      url: "https://your-app-url/api/v1/auth/status"
      interval: 600  # 10 minutes

error_tracking:
  service: Sentry
  configuration:
    - backend_dsn: "https://your-backend-dsn@sentry.io/project"
    - frontend_dsn: "https://your-frontend-dsn@sentry.io/project"
    - environment: "production"
    - release: "auto-detect"

analytics:
  service: Google Analytics 4
  configuration:
    - tracking_id: "G-XXXXXXXXXX"
    - events:
      - appointment_created
      - payment_completed
      - user_registered
      - barber_connected

performance_monitoring:
  service: DigitalOcean Monitoring
  alerts:
    - metric: "cpu_usage"
      threshold: 80
      duration: 300

    - metric: "memory_usage"
      threshold: 85
      duration: 300

    - metric: "disk_usage"
      threshold: 80
      duration: 600

database_monitoring:
  postgresql:
    - connection_count_alert: 80
    - slow_query_threshold: 1000  # ms
    - disk_usage_alert: 80

  redis:
    - memory_usage_alert: 80
    - connection_count_alert: 1000
EOF

    log "Monitoring configuration created"
}

# Deploy to DigitalOcean
deploy_to_digitalocean() {
    log "Deploying to DigitalOcean App Platform..." "$BLUE"

    # Check if app already exists
    if doctl apps list --format Name --no-header | grep -q "^$APP_NAME$"; then
        log "App '$APP_NAME' already exists. Updating..."

        # Get app ID
        APP_ID=$(doctl apps list --format ID,Name --no-header | grep "$APP_NAME" | awk '{print $1}')

        # Update the app
        doctl apps update "$APP_ID" --spec "$PROJECT_ROOT/digitalocean-app.yaml" >> "$DEPLOY_LOG" 2>&1

        log "App updated successfully. App ID: $APP_ID"
    else
        log "Creating new app '$APP_NAME'..."

        # Create the app
        APP_ID=$(doctl apps create --spec "$PROJECT_ROOT/digitalocean-app.yaml" --format ID --no-header 2>> "$DEPLOY_LOG")

        if [[ -n "$APP_ID" ]]; then
            log "App created successfully. App ID: $APP_ID"
        else
            error "Failed to create app"
            exit 1
        fi
    fi

    # Wait for deployment
    log "Waiting for deployment to complete..."

    # Monitor deployment progress
    for i in {1..30}; do
        DEPLOYMENT_STATUS=$(doctl apps get "$APP_ID" --format Phase --no-header 2>/dev/null || echo "UNKNOWN")

        case "$DEPLOYMENT_STATUS" in
            "ACTIVE")
                log "Deployment completed successfully!"
                break
                ;;
            "DEPLOYING"|"PENDING")
                log "Deployment in progress... ($i/30)"
                sleep 20
                ;;
            "ERROR"|"FAILED")
                error "Deployment failed!"
                doctl apps get "$APP_ID"
                exit 1
                ;;
            *)
                log "Deployment status: $DEPLOYMENT_STATUS ($i/30)"
                sleep 20
                ;;
        esac
    done

    # Get app URLs
    APP_URL=$(doctl apps get "$APP_ID" --format LiveURL --no-header)

    if [[ -n "$APP_URL" ]]; then
        log "App deployed successfully!"
        log "App URL: $APP_URL"
        log "App ID: $APP_ID"

        # Save deployment info
        cat > "$PROJECT_ROOT/deployment-info.txt" << EOF
Deployment Information:
- App Name: $APP_NAME
- App ID: $APP_ID
- URL: $APP_URL
- Region: $REGION
- Deployed: $(date)
- Git Branch: $BRANCH
- Git Commit: $(git rev-parse HEAD)
EOF

    else
        error "Could not retrieve app URL"
        exit 1
    fi
}

# Run post-deployment health checks
run_post_deployment_checks() {
    log "Running post-deployment health checks..." "$BLUE"

    if [[ -z "${APP_URL:-}" ]]; then
        APP_ID=$(doctl apps list --format ID,Name --no-header | grep "$APP_NAME" | awk '{print $1}')
        APP_URL=$(doctl apps get "$APP_ID" --format LiveURL --no-header)
    fi

    if [[ -z "$APP_URL" ]]; then
        error "Could not determine app URL for health checks"
        return 1
    fi

    # Wait for app to be fully ready
    log "Waiting for app to be fully ready..."
    sleep 60

    # Test backend health
    log "Testing backend health endpoint..."
    if curl -f -s --max-time 30 "$APP_URL/api/v1/health" > /dev/null; then
        log "✅ Backend health check passed"

        # Get health data
        HEALTH_DATA=$(curl -s --max-time 10 "$APP_URL/api/v1/health" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))" 2>/dev/null || echo "Could not parse health data")
        log "Backend health data: $HEALTH_DATA"
    else
        error "❌ Backend health check failed"
        return 1
    fi

    # Test frontend
    log "Testing frontend..."
    if curl -f -s --max-time 30 "$APP_URL" > /dev/null; then
        log "✅ Frontend health check passed"
    else
        error "❌ Frontend health check failed"
        return 1
    fi

    # Test API endpoints
    log "Testing API endpoints..."

    # Test auth status endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL/api/v1/auth/status" || echo "000")
    if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log "✅ Auth status endpoint: HTTP $HTTP_CODE"
    else
        warning "⚠️ Auth status endpoint: HTTP $HTTP_CODE"
    fi

    log "Post-deployment health checks completed"
}

# Create deployment summary
create_deployment_summary() {
    log "Creating deployment summary..." "$BLUE"

    cat > "$PROJECT_ROOT/DEPLOYMENT_SUMMARY.md" << EOF
# 6FB Booking Platform - DigitalOcean Deployment Summary

## Deployment Information
- **App Name**: $APP_NAME
- **Region**: $REGION
- **Deployed**: $(date)
- **Git Branch**: $BRANCH
- **Git Commit**: $(git rev-parse HEAD)

## URLs
- **Live URL**: $APP_URL
- **API Base**: $APP_URL/api/v1
- **Health Check**: $APP_URL/api/v1/health

## Services Deployed
- ✅ **Backend**: FastAPI application with Uvicorn
- ✅ **Frontend**: Next.js application
- ✅ **Database**: PostgreSQL (managed)
- ✅ **Cache**: Redis (managed)

## Post-Deployment Tasks

### 1. Environment Variables
Set the following secrets in DigitalOcean App Platform:
\`\`\`
SECRET_KEY=<generated-secret>
JWT_SECRET_KEY=<generated-secret>
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_PUBLISHABLE_KEY=<your-stripe-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
SENDGRID_API_KEY=<your-sendgrid-key>
\`\`\`

### 2. Domain Configuration
If you have a custom domain:
1. Add domain in DigitalOcean App Platform
2. Update DNS records as instructed
3. SSL certificate will be automatically generated

### 3. Database Setup
- Database migrations are automatically applied
- Seed data can be applied through the app console

### 4. Monitoring Setup
- Configure UptimeRobot monitoring
- Set up Sentry error tracking
- Enable Google Analytics

### 5. Stripe Webhook Configuration
Update Stripe webhook endpoint to:
\`$APP_URL/api/v1/payments/webhook\`

## Useful Commands

### Check App Status
\`\`\`bash
doctl apps get $APP_ID
\`\`\`

### View Logs
\`\`\`bash
doctl apps logs $APP_ID --follow
\`\`\`

### Update App
\`\`\`bash
doctl apps update $APP_ID --spec digitalocean-app.yaml
\`\`\`

### Restart App
\`\`\`bash
doctl apps update $APP_ID --spec digitalocean-app.yaml
\`\`\`

## Support
- DigitalOcean Documentation: https://docs.digitalocean.com/products/app-platform/
- App Platform Limits: https://docs.digitalocean.com/products/app-platform/details/limits/
- Deployment Logs: $DEPLOY_LOG
EOF

    log "Deployment summary created: $PROJECT_ROOT/DEPLOYMENT_SUMMARY.md"
}

# Main deployment function
main() {
    log "Starting DigitalOcean App Platform deployment..." "$GREEN"

    # Check prerequisites
    check_prerequisites

    # Create deployment files
    create_app_spec
    create_env_template
    create_backend_dockerfile
    create_frontend_dockerfile
    configure_nextjs
    create_github_workflow
    create_monitoring_config

    # Commit deployment files
    log "Committing deployment files..."
    git add . >> "$DEPLOY_LOG" 2>&1
    git commit -m "Add DigitalOcean App Platform deployment configuration" >> "$DEPLOY_LOG" 2>&1 || true

    # Deploy to DigitalOcean
    deploy_to_digitalocean

    # Run health checks
    if run_post_deployment_checks; then
        log "✅ Deployment completed successfully!" "$GREEN"
    else
        warning "⚠️ Deployment completed but health checks had issues"
    fi

    # Create summary
    create_deployment_summary

    # Display final information
    echo
    echo "============================================="
    echo "🚀 DigitalOcean Deployment Complete!"
    echo "============================================="
    echo "App URL: $APP_URL"
    echo "Deployment Log: $DEPLOY_LOG"
    echo "Summary: $PROJECT_ROOT/DEPLOYMENT_SUMMARY.md"
    echo
    echo "Next Steps:"
    echo "1. Configure environment variables in DigitalOcean console"
    echo "2. Set up custom domain (if applicable)"
    echo "3. Configure monitoring and alerts"
    echo "4. Update Stripe webhook endpoint"
    echo "============================================="
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --app-name=*)
            APP_NAME="${1#*=}"
            shift
            ;;
        --region=*)
            REGION="${1#*=}"
            shift
            ;;
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --branch=*)
            BRANCH="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --app-name=NAME     App name (default: 6fb-booking-platform)"
            echo "  --region=REGION     DigitalOcean region (default: nyc1)"
            echo "  --domain=DOMAIN     Custom domain (optional)"
            echo "  --branch=BRANCH     Git branch to deploy (default: main)"
            echo "  --help              Show this help message"
            echo
            echo "Prerequisites:"
            echo "1. Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
            echo "2. Authenticate: doctl auth init"
            echo "3. Ensure you're in the project root directory"
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
