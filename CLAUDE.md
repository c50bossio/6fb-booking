# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

**BookedBarber V2** - A comprehensive barbershop management platform built on the Six Figure Barber methodology. This platform empowers barbers to manage their business, maximize revenue, and build their brand.

**CRITICAL**: All development decisions must align with Six Figure Barber Program principles focused on revenue optimization, client value creation, business efficiency, professional growth, and scalability.

## 📁 Architecture & Structure

### Technology Stack
- **Backend**: FastAPI (Python 3.9+) with SQLAlchemy ORM
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (production) / SQLite (development)
- **Integrations**: Stripe Connect, Google Calendar, SendGrid, Twilio
- **Deployment**: Render, Docker, supports Railway and Vercel

### Directory Structure
```
/backend-v2/              # V2 Backend (FastAPI) - ACTIVE ONLY
├── main.py              # Application entry point
├── api/v1/              # API endpoints (migrating to v2)
├── api/v2/              # New V2 API endpoints (preferred)
├── models/              # SQLAlchemy database models
├── services/            # Business logic layer
├── routers/             # FastAPI route handlers
├── middleware/          # Security, logging, error handling
├── tests/               # Comprehensive test suite
└── frontend-v2/         # V2 Frontend (Next.js) - ACTIVE ONLY
    ├── app/             # Next.js 14 app directory
    ├── components/      # React components
    ├── lib/             # Utilities and API clients
    └── hooks/           # Custom React hooks
```

**⚠️ CRITICAL**: Only modify files in `backend-v2/` and `backend-v2/frontend-v2/`. Never touch V1 directories.

## 🚀 Development Commands

### Backend Commands
```bash
cd backend-v2

# Development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Database migrations
alembic upgrade head                    # Apply migrations
alembic revision -m "description"       # Create new migration

# Testing
pytest                                  # Run all tests
pytest --cov=. --cov-report=term-missing  # With coverage
pytest tests/unit/                      # Unit tests only
pytest tests/integration/               # Integration tests
pytest -x --tb=short                   # Fail fast mode
```

### Frontend Commands
```bash
cd backend-v2/frontend-v2

# Development
npm run dev                             # Development server (port 3000)
npm run staging                         # Staging server (port 3001)

# Building & Testing
npm run build                           # Production build (with linting)
npm run lint                            # ESLint check
npm run lint:fix                        # Auto-fix linting issues
npm test                                # Run Jest tests
npm run test:e2e                        # Playwright E2E tests

# TypeScript checking (debugging only)
npx tsc --noEmit                        # Check types without building
```

### Full Stack Development
```bash
# Process management (recommended)
cd backend-v2
npm run dev                             # Start both backend and frontend

# Manual parallel startup
cd backend-v2 && uvicorn main:app --reload &
cd backend-v2/frontend-v2 && npm run dev &
```

## 🛡️ Critical Safety Protocols

### Mandatory Verification System
**NEVER claim functionality works without automated verification:**

```bash
# These hooks run automatically after code changes:
# Frontend changes → .claude/scripts/verify-frontend.sh
# Analytics changes → .claude/scripts/verify-analytics.sh  
# Backend changes → .claude/scripts/verify-api.sh
```

### Browser Debugging Requirements
**MANDATORY for all frontend debugging:**

```bash
# ALWAYS start debugging with browser connection
connect_to_browser

# Monitor in real-time during development
watch_logs_live duration_seconds=30

# Check for errors after changes
get_console_logs level="error" since_minutes=5
get_network_requests since_minutes=5
```

Chrome must be running with debugging:
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb
```

### Protected Files Policy
Check `/Users/bossio/6fb-booking/PROTECTED_FILES.md` before modifying any file. Create new files instead of modifying existing ones when possible.

### Version Control Requirements
- **API Endpoints**: Use `/api/v2/` for all new endpoints (v1 deprecated)
- **Authentication**: All endpoints must use V2 auth (`/api/v2/auth/*`)
- **Testing**: Write tests before implementation (TDD approach)
- **Linting**: Never disable ESLint or bypass linting in frontend builds

## 🚨 Common Issues & Solutions

### Server Management
```bash
# Kill conflicting processes
pkill -f "next dev" && pkill -f "npm run dev"

# Clean corrupted build cache
rm -rf backend-v2/frontend-v2/.next

# Emergency server cleanup
./.claude/scripts/cleanup-all-servers.sh
```

### API Version Issues
When encountering 401/422 errors, check for V1 vs V2 API mismatches:
```bash
# Fix V1 API calls
grep -r "/api/v1/" frontend-v2/ --include="*.ts" --include="*.tsx"
sed -i 's|/api/v1/|/api/v2/|g' path/to/file.ts
```

### Authentication Loops
Caused by mixed API versions. Ensure:
- Login uses `/api/v2/auth/login`
- User validation uses `/api/v2/auth/me`
- All auth requests use consistent V2 endpoints

## 🤖 Sub-Agent Automation System

The codebase includes a proactive sub-agent automation system that automatically triggers specialized agents:

### Control Commands
```bash
# Check automation status
python3 .claude/scripts/sub-agent-control.py status

# Start/stop automation
python3 .claude/scripts/sub-agent-control.py start
python3 .claude/scripts/sub-agent-control.py stop

# Enable/disable specific agents
python3 .claude/scripts/sub-agent-control.py enable-agent debugger
python3 .claude/scripts/sub-agent-control.py disable-agent code-reviewer
```

### Automated Triggers
- **Debugger Agent**: Test failures, HTTP errors, JavaScript console errors
- **Code Reviewer**: Security file changes, large commits, critical branch merges
- **Data Scientist**: Database performance issues, analytics failures
- **General Purpose**: Multi-system failures, complex integration issues

The system includes comprehensive safety mechanisms with rate limiting, emergency stops, and resource protection.

## 📊 Testing Strategy

### Test Requirements
- **Minimum Coverage**: 80% for all new code
- **Critical Paths**: 95% coverage for auth, payments, bookings
- **Test-First Development**: Write failing tests before implementation

### Test Categories
```bash
pytest tests/unit/              # Fast unit tests
pytest tests/integration/       # API integration tests
pytest tests/e2e/              # End-to-end user flows
pytest tests/performance/       # Load and performance tests
pytest tests/security/          # Security validation tests
```

### Frontend Testing
```bash
npm test                        # Jest unit tests
npm run test:e2e               # Playwright E2E tests
npm run test:coverage          # Coverage report
```

## 🔐 Security & Compliance

### Environment Variables
- Never commit `.env` files
- Use `.env.template` as reference
- Generate secure keys: `python -c 'import secrets; print(secrets.token_urlsafe(64))'`

### Payment Security
- PCI compliance via Stripe Connect
- Webhook signature verification required
- Idempotency keys for all transactions

### Authentication
- JWT tokens with refresh capability
- Role-based access control (RBAC)
- Multi-Factor Authentication (MFA) support
- Rate limiting on auth endpoints

## 🚀 Deployment

### Environment Management
- **Development**: `localhost:3000` (frontend), `localhost:8000` (backend)
- **Staging**: `localhost:3001` (frontend), `localhost:8001` (backend)
- **Production**: Auto-deployment via Render from `production` branch

### Deployment Process
```bash
# Standard workflow
git checkout staging && git pull origin staging
git checkout -b feature/description-YYYYMMDD

# Deploy to staging
gh pr create --base staging --title "Feature: Description"

# Deploy to production (after staging validation)
gh pr create --base production --title "Release: Description"
```

### Docker Development
```bash
# Recommended development approach
docker-compose up -d                   # Start all services
docker-compose logs --follow           # Monitor logs
docker-compose down                    # Stop services
```

## 🎯 Key Business Rules

### Six Figure Barber Methodology Alignment
Every feature must support:
1. **Revenue Optimization**: Helps barbers increase income
2. **Client Value Creation**: Enhances client experience and relationships
3. **Business Efficiency**: Improves time and resource utilization
4. **Professional Growth**: Supports barber's brand and business development
5. **Scalability**: Enables business expansion and growth

### Anti-Patterns to Avoid
- Features that compete on price rather than value
- Anything that commoditizes barbering services
- Functionality that reduces client relationship quality
- Features that compromise premium positioning

## 📚 Documentation References

- **Primary Business Reference**: `SIX_FIGURE_BARBER_METHODOLOGY.md`
- **API Documentation**: `http://localhost:8000/docs` (development)
- **Sub-Agent Guide**: `.claude/SUB_AGENT_AUTOMATION_GUIDE.md`
- **Protected Files**: `PROTECTED_FILES.md`
- **Testing Strategy**: `TESTING_STRATEGY.md`

## 🔧 IDE Integration Recommendations

### Recommended Development Environment
**GitHub Codespaces** (eliminates all server conflicts and port issues):
- Automatic dependency installation
- Isolated cloud environment
- Professional Docker management
- Zero "works on my machine" issues
- Setup guide: `.devcontainer/CODESPACES_SETUP_GUIDE.md`

### Local Development Alternative
If using local development, ensure:
- Node.js 18+, Python 3.9+
- Chrome with debugging port 9222
- Docker for containerized services
- PM2 for process management: `npm run pm2:install`

---

Last Updated: 2025-07-25
Version: 2.2.0