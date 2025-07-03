# CLAUDE.md - BookedBarber V2 Project Guide

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the BookedBarber V2 codebase.

## 🎯 Project Overview

**BookedBarber V2** - OWN THE CHAIR. OWN THE BRAND.

BookedBarber is a comprehensive booking and business management platform for barber shops, built on the Six Figure Barber methodology. This platform empowers barbers to manage their business, maximize revenue, and build their brand.

### Key Features
- **Smart Booking System**: Real-time availability, automated scheduling, and client management
- **Payment Processing**: Integrated Stripe Connect for seamless payments and automated payouts
- **Business Analytics**: Track revenue, client retention, and growth metrics based on 6FB methodology
- **Calendar Integration**: Two-way sync with Google Calendar
- **Client Communications**: Automated SMS/email reminders and marketing campaigns
- **Multi-location Support**: Manage multiple shops from a single dashboard
- **Google My Business Integration**: Automated review management and SEO-optimized responses
- **Advanced Marketing Suite**: Email/SMS campaigns, conversion tracking, ROI analytics
- **Digital Advertising Hub**: Google Ads and Meta pixel integration with attribution tracking
- **Integration Management**: Centralized hub for all third-party service connections

### Technology Stack
- **Backend**: FastAPI (Python 3.9+) with SQLAlchemy ORM
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and shadcn/ui
- **Database**: PostgreSQL (production) / SQLite (development)
- **Integrations**: Stripe Connect, Google Calendar API, SendGrid, Twilio
- **Marketing APIs**: Google My Business API, Google Tag Manager, Meta Business SDK
- **Analytics**: Enhanced conversion tracking, multi-touch attribution
- **Review Management**: Automated response system with SEO optimization
- **Deployment**: Render (primary), supports Railway, Vercel, Docker
- **Monitoring**: Sentry, custom health checks, performance tracking

## 🛡️ CRITICAL SAFETY PROTOCOLS

### Before Starting ANY Work
```bash
# 1. Ensure clean working directory
git status

# 2. Create feature branch
git checkout -b feature/description-YYYYMMDD

# 3. Run pre-work checklist
./scripts/pre-work-checklist.sh

# 4. Create safety snapshot
./scripts/create-snapshot.sh
```

### During Development
1. **Commit Frequency**: Every 15-30 minutes or after each logical change
2. **Test Continuously**: Run tests after every significant change
3. **Focus**: Complete one task at a time from TodoList
4. **Review**: Always `git diff` before committing

### Emergency Recovery
```bash
# Quick revert uncommitted changes
./scripts/quick-revert.sh

# Return to main branch
./scripts/recover-branch.sh

# Full restore from snapshot
./scripts/restore-snapshot.sh [snapshot-name]
```

## 🚀 Marketing Enhancement Features (2025-07-02)

### Integration Priority Order
1. **Google My Business** - Critical for local SEO and review management
2. **Conversion Tracking** - GTM and Meta Pixel for ROI measurement
3. **Review Automation** - SEO-optimized responses following Google guidelines
4. **Integration Settings** - Centralized management hub

### New API Endpoints
- `/api/v1/integrations/*` - Integration management
- `/api/v1/reviews/*` - Review fetching and responses
- `/api/v1/marketing/gmb/*` - Google My Business operations
- `/api/v1/tracking/*` - Conversion and analytics tracking

### Testing Requirements for Marketing Features
- OAuth flow testing with mock providers
- Review response template validation
- Conversion event tracking accuracy
- Integration health monitoring

## 📁 Project Structure

```
BookedBarber-V2/
├── backend-v2/              # V2 Backend (FastAPI) - ACTIVE
│   ├── main.py             # Application entry point
│   ├── api/v1/             # API endpoints
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic
│   ├── config/             # Configuration
│   └── frontend-v2/        # V2 Frontend (Next.js) - ACTIVE
│       ├── app/            # Next.js 14 app directory
│       ├── components/     # React components
│       ├── lib/            # Utilities and API clients
│       └── public/         # Static assets
├── backend/                # V1 Backend - DEPRECATED (DO NOT MODIFY)
├── frontend/               # V1 Frontend - DEPRECATED (DO NOT MODIFY)
├── docs/                   # Documentation
├── scripts/                # Automation scripts
└── monitoring/             # Monitoring configuration
```

### ⚠️ IMPORTANT: V2 ONLY
- **ONLY** modify files in `/backend-v2/` and `/backend-v2/frontend-v2/`
- **NEVER** touch V1 directories (`/backend/` and `/frontend/`)
- All new features must be implemented in V2

## 🚀 Quick Start

### Backend Setup
```bash
cd backend-v2
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.template .env     # Configure your environment
alembic upgrade head      # Run database migrations
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd backend-v2/frontend-v2
npm install
cp .env.local.example .env.local  # Configure environment
npm run dev
```

### Full Stack Development
```bash
# Use the convenience script
./scripts/start-dev-session.sh

# Or run both servers in parallel
./scripts/start-servers.sh
```

## 🏗️ Architecture Overview

### Backend Architecture (FastAPI + SQLAlchemy)
```
backend-v2/
├── main.py                 # FastAPI app, middleware, routers
├── api/v1/                 # RESTful API endpoints
│   ├── auth.py            # Authentication (JWT)
│   ├── appointments.py    # Booking management
│   ├── payments.py        # Stripe integration
│   └── analytics.py       # Business metrics
├── models/                 # Database models
│   ├── user.py           # User/roles/permissions
│   ├── appointment.py    # Booking data
│   └── payment.py        # Transaction records
├── services/              # Business logic layer
│   ├── booking_service.py
│   ├── payment_service.py
│   └── notification_service.py
└── middleware/            # Security, logging, error handling
```

### Frontend Architecture (Next.js 14 + TypeScript)
```
frontend-v2/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Protected routes
│   ├── (public)/         # Public routes
│   └── api/              # API route handlers
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── booking/          # Booking-specific
├── lib/                   # Utilities
│   ├── api/              # API client
│   └── utils/            # Helpers
└── hooks/                 # Custom React hooks
```

## 📋 Development Guidelines

### Task Management
1. **ALWAYS** use TodoWrite/TodoRead for tracking
2. Break tasks into 30-minute chunks
3. Mark as `in_progress` when starting
4. Mark as `completed` immediately when done
5. Only ONE task `in_progress` at a time

### Code Standards
- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode, explicit types
- **Testing**: Minimum 80% coverage
- **Commits**: Conventional commits format
- **Documentation**: Update docs with code

### Testing Requirements
```bash
# Backend tests (required before task completion)
cd backend-v2 && pytest

# Frontend tests (required before task completion)
cd backend-v2/frontend-v2 && npm test

# Integration tests (for cross-system changes)
./scripts/test-integration.sh
```

## 🔍 Browser Debugging & MCP Integration

### Browser Logs MCP Server
BookedBarber V2 includes a custom MCP server for real-time browser debugging that eliminates manual log copying.

#### Features
- **Real-time Console Monitoring**: Automatic capture of console.log, errors, warnings
- **Network Request Tracking**: Monitor API calls, failed requests, response times  
- **JavaScript Error Analysis**: Stack traces with source locations
- **Multi-tab Support**: Switch monitoring between browser tabs
- **Advanced Filtering**: Filter by log level, time range, URL patterns, HTTP status

#### Setup (One-time)
```bash
# 1. Install dependencies
pip install -r browser-logs-mcp-requirements.txt

# 2. Start Chrome with debugging (every development session)
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb

# 3. MCP server is already configured in Claude Desktop
# Check ~/.config/claude-desktop/config.json
```

#### Usage with Claude
```bash
# Connect to browser
connect_to_browser

# Get recent console errors  
get_console_logs level="error" since_minutes=5

# Monitor failed API requests
get_network_requests status_code=404 since_minutes=10

# Watch live activity during development
watch_logs_live duration_seconds=30

# Get JavaScript errors with stack traces
get_javascript_errors since_minutes=15

# Switch between tabs
get_browser_tabs
switch_tab tab_id="ABC123"
```

#### Common Debugging Workflows

**API Debugging:**
```bash
# 1. Open frontend and trigger API call
# 2. Get recent network activity
get_network_requests url_pattern="localhost:8000" since_minutes=2

# 3. Check for errors
get_console_logs level="error" since_minutes=2
```

**CORS Issues:**
```bash
# Real-time CORS monitoring
watch_logs_live duration_seconds=60 include_network=true

# Check specific CORS failures
get_network_requests status_code=0 since_minutes=5
```

**Performance Analysis:**
```bash
# Monitor during performance testing
watch_logs_live duration_seconds=120

# Check for slow requests
get_network_requests since_minutes=5
```

#### Integration with Development Workflow
- **Before debugging**: `connect_to_browser`
- **During development**: Use `watch_logs_live` for real-time monitoring
- **After changes**: `get_console_logs` and `get_network_requests` for validation
- **Error investigation**: `get_javascript_errors` with stack traces

#### Chrome Debug Mode Script
```bash
# Convenience script (create if needed)
./scripts/start-chrome-debug.sh

# Or manual command
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-6fb \
  --disable-web-security \
  --no-first-run
```

## 🔐 Security Protocols

### Environment Variables
- **NEVER** commit `.env` files
- Use `.env.template` as reference
- Generate secure keys: `python -c 'import secrets; print(secrets.token_urlsafe(64))'`
- Rotate keys quarterly

### Authentication
- JWT tokens with refresh capability
- Role-based access control (RBAC)
- Rate limiting on auth endpoints
- Secure password requirements

### Payment Security
- PCI compliance via Stripe
- No direct card handling
- Webhook signature verification
- Idempotency keys for all transactions

## 🌐 API Reference

### Base URL
- Development: `http://localhost:8000`
- Production: `https://api.bookedbarber.com`

### Authentication
```http
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Appointments
```http
GET    /api/v1/appointments
POST   /api/v1/appointments
GET    /api/v1/appointments/{id}
PUT    /api/v1/appointments/{id}
DELETE /api/v1/appointments/{id}
```

### Payments
```http
POST   /api/v1/payments/create-intent
POST   /api/v1/payments/confirm
GET    /api/v1/payments/history
POST   /api/v1/webhooks/stripe
```

## 📊 Database Schema

### Core Tables
- **users**: Authentication and roles
- **barbers**: Barber profiles and settings
- **clients**: Client information
- **appointments**: Booking records
- **payments**: Transaction history
- **services**: Service catalog
- **locations**: Multi-location support

### Migrations
```bash
# Create new migration
alembic revision -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Static files built
- [ ] SSL certificates active
- [ ] Monitoring enabled
- [ ] Backup strategy in place

### Render Deployment
```bash
# Backend
git push origin main  # Auto-deploys via webhook

# Frontend
cd backend-v2/frontend-v2
npm run build
# Deploy via Render dashboard
```

### Docker Deployment
```bash
docker-compose up -d
```

## 🎨 Brand Guidelines

### Logo Usage
- **Location**: `/Users/bossio/Downloads/224381543/Logo Files/png/`
- **Variants**: Black, White, Color (with/without background)
- **Implementation**: Copy to `frontend-v2/public/logos/`

### Design System
- **Primary Color**: #000000 (Black)
- **Secondary Color**: #FFD700 (Gold)
- **Font**: Inter (headings), system-ui (body)
- **Spacing**: 8px grid system

## 🛠️ Troubleshooting

### Common Issues
1. **Database Connection**: Check `.env` DATABASE_URL
2. **CORS Errors**: Verify allowed origins in settings
3. **Auth Failures**: Check JWT secret configuration
4. **Payment Issues**: Verify Stripe webhook endpoint

### Debug Commands
```bash
# Check system health
./scripts/health-check.sh

# View logs
docker-compose logs -f

# Database console
python manage.py dbshell
```

## 📚 Additional Resources

### Documentation
- [Getting Started Guide](./docs/GETTING_STARTED.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Six Figure Barber Methodology](./docs/BUSINESS/SIX_FIGURE_BARBER.md)

### Support
- GitHub Issues: [Report bugs and request features]
- Documentation: [Comprehensive guides and tutorials]
- Community: [Join our Discord server]

## 🤖 AI Assistant Guidelines

### Verification Protocol
1. **Always verify** file existence before reading
2. **Check dependencies** in requirements.txt/package.json
3. **Read actual code** instead of assuming
4. **Use search tools** to find implementations

### Context Maintenance
- Reference files with line numbers
- Quote actual code when discussing
- Maintain task continuity with todos
- Summarize changes after complex operations

### Hallucination Prevention
- ❌ "This should be in utils" → ✅ "Let me check where this is"
- ❌ "The function probably..." → ✅ "Reading the function signature"
- ❌ "Next.js typically..." → ✅ "Checking this project's implementation"

---

## 🚀 Production Scalability Requirements

### Current Capacity
- **Concurrent Users**: ~100-200 (current setup)
- **Target Capacity**: 10,000+ concurrent users
- **Database Connections**: Need connection pooling for 1000+ connections
- **Geographic Coverage**: Multi-region deployment required

### Critical Infrastructure Gaps

#### 1. Database Optimization
- **Connection Pooling**: Configure pgBouncer with appropriate pool sizes
- **Read Replicas**: Set up PostgreSQL read replicas for scaling reads
- **Indexes**: Add missing indexes on foreign keys and commonly queried fields
- **Query Optimization**: Implement query analysis and optimization

#### 2. Caching Layer
- **Redis Cluster**: Deploy for API response caching and session management
- **Cache Strategy**: Implement with proper TTLs and invalidation
- **CDN**: Configure CloudFlare/Fastly for static assets and edge caching

#### 3. Background Processing
- **Celery + Redis/RabbitMQ**: For async email/SMS processing
- **Job Monitoring**: Implement retry mechanisms and monitoring
- **Task Routing**: Configure priority queues for different operations

#### 4. Security & Compliance
- **Multi-tenancy**: Implement location-based access control
- **Rate Limiting**: Add distributed rate limiting with Redis
- **Legal Docs**: Terms of Service, Privacy Policy (GDPR/CCPA compliant)
- **Data Privacy**: Implement data export/deletion for compliance

#### 5. Monitoring & Operations
- **Error Tracking**: Deploy Sentry for frontend and backend
- **APM**: DataDog or New Relic for application performance monitoring
- **Logging**: ELK stack for centralized log aggregation
- **Customer Support**: Implement ticket system and help documentation

### Production Deployment Requirements

#### Infrastructure as Code
```yaml
# Required Terraform modules:
- PostgreSQL RDS with read replicas
- Redis ElastiCache cluster
- EKS/Kubernetes cluster
- CloudFront CDN
- Application Load Balancer
- Auto-scaling groups
```

#### Kubernetes Configuration
```yaml
# Required manifests:
- Deployment with HPA (Horizontal Pod Autoscaler)
- Service with health checks
- ConfigMaps for environment config
- Secrets for sensitive data
- Ingress with SSL termination
```

#### Performance Benchmarks
- API Response Time: < 200ms (p95)
- Database Query Time: < 50ms (p95)
- Static Asset Load: < 100ms (with CDN)
- Uptime SLA: 99.9%
- Error Rate: < 0.01%

### Production Readiness Checklist

#### Phase 1: Security & Legal (Week 1-2)
- [ ] Draft and review Terms of Service
- [ ] Create Privacy Policy (GDPR/CCPA compliant)
- [ ] Implement multi-tenancy access control
- [ ] Add rate limiting to payment endpoints
- [ ] Move credentials to secure vault (AWS Secrets Manager)

#### Phase 2: Infrastructure (Week 3-4)
- [ ] Configure database connection pooling
- [ ] Deploy Redis cluster
- [ ] Set up Celery workers
- [ ] Configure CDN
- [ ] Implement caching layer

#### Phase 3: Operations (Week 5-6)
- [ ] Deploy monitoring stack (Sentry, APM)
- [ ] Set up centralized logging
- [ ] Create support system
- [ ] Run load testing
- [ ] Document SLAs

#### Phase 4: High Availability (Week 7-8)
- [ ] Create Kubernetes manifests
- [ ] Implement auto-scaling
- [ ] Set up multi-region deployment
- [ ] Configure disaster recovery
- [ ] Verify backup procedures

### Cost Estimates
```
Monthly Infrastructure Costs (AWS/GCP):
- Database (RDS with replicas): $500-1000
- Redis Cache: $100-500
- Kubernetes Cluster: $500-1000
- CDN (CloudFlare Pro): $200
- Monitoring (DataDog): $500-1000
- Total: ~$2,000-4,000/month
```

### Load Testing Requirements
Before production launch, system must pass:
- 10,000 concurrent users
- 1,000 requests/second
- 100,000 daily active users
- Zero data loss under load
- < 1 second page load time globally

## Version History
- **v2.2.0** (2025-07-02): Added production scalability requirements and roadmap
- **v2.1.0** (2025-07-02): Added marketing enhancement features (GMB, conversion tracking, review automation)
- **v2.0.0** (2025-01-02): Complete platform rewrite with FastAPI/Next.js
- **v1.0.0** (2024-06-01): Initial release (deprecated)

Last Updated: 2025-07-02