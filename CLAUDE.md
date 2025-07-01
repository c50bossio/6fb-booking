# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🛡️ SAFETY FIRST - Critical Guidelines

### Before Starting ANY Work:
1. **Create a git branch**: `git checkout -b feature/description-YYYYMMDD`
2. **Run pre-work checklist**: `./scripts/pre-work-checklist.sh`
3. **Check current state**: `git status` and ensure working directory is clean
4. **Create a safety snapshot**: `./scripts/create-snapshot.sh`

### During Development:
1. **Commit frequently**: After each logical change (every 15-30 minutes)
2. **Test incrementally**: Run relevant tests after each change
3. **Stay focused**: Complete one task at a time from the todo list
4. **Validate changes**: Use `git diff` to review before committing

### If Something Goes Wrong:
1. **Quick revert**: `./scripts/quick-revert.sh` (reverts uncommitted changes)
2. **Branch recovery**: `./scripts/recover-branch.sh` (goes back to main)
3. **Full restore**: `./scripts/restore-snapshot.sh [snapshot-name]`

### Task Management Rules:
1. **ALWAYS use TodoWrite/TodoRead** for task tracking
2. **Break complex tasks** into items of 30 minutes or less
3. **Mark tasks in_progress** before starting
4. **Mark tasks completed** immediately when done
5. **One task at a time** - never have multiple in_progress

### Code Modification Boundaries:
1. **Frontend changes**: Only modify files in `/frontend` directory
2. **Backend changes**: Only modify files in `/backend` directory
3. **Database changes**: ALWAYS create a migration, never modify schema directly
4. **Config changes**: Test in development first, document in this file
5. **Dependencies**: Run tests after any package additions

### Testing Requirements:
- Backend: Run `pytest` before marking any backend task complete
- Frontend: Run `npm test` before marking any frontend task complete
- Full stack: Run `./scripts/test-integration.sh` for cross-system changes
- **Note**: Demo mode has been removed. Authentication is required to access the platform.

## Project Overview

6FB Booking Platform is a comprehensive booking and business management system for barber shops, built on the Six Figure Barber methodology. It features:

- **Backend**: FastAPI (Python) with SQLAlchemy ORM, PostgreSQL/SQLite database
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and Radix UI
- **Integrations**: Stripe Connect, Google Calendar, SendGrid, Twilio
- **Deployment**: Render (current production), supports Docker, Railway, Vercel

## Common Development Commands

### Backend Development

```bash
# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.template .env  # Edit with your values

# Run backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Database operations
alembic upgrade head              # Apply all migrations
alembic revision -m "description" # Create new migration
alembic downgrade -1              # Rollback last migration

# Run tests
pytest                           # Run all tests
pytest tests/unit/              # Run unit tests only
pytest -k "test_auth"           # Run specific test pattern
pytest -v --tb=short            # Verbose with short traceback

# Performance testing
python scripts/basic_performance_test.py      # Database performance
python scripts/api_performance_test.py        # API performance
python scripts/comprehensive_performance_test.py  # Full suite
```

### Frontend Development

```bash
# Setup frontend
cd frontend
npm install

# Run frontend server
npm run dev          # Development server on http://localhost:3000
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check

# Run tests
npm test             # Run test suite
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Extension testing
npm run test:extensions    # Test browser extension compatibility
npm run debug:extensions   # Debug extension issues
```

### Production Deployment

```bash
# Current production URLs
Backend: https://sixfb-backend.onrender.com
Docs: https://sixfb-backend.onrender.com/docs
Health: https://sixfb-backend.onrender.com/health

# Deploy to Render (auto-deploys on git push)
git push origin main

# Create admin user in production (via Render Shell)
python -c "from models.user import User; from passlib.context import CryptContext; from config.database import SessionLocal; db = SessionLocal(); pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); user = User(email='admin@6fb.com', first_name='Admin', last_name='User', hashed_password=pwd_context.hash('admin123'), role='super_admin', is_active=True); db.add(user); db.commit(); print('Admin user created!')"
```

## High-Level Architecture

### Backend Architecture (FastAPI + SQLAlchemy)

```
backend/
├── main.py                 # FastAPI app entry point, middleware, routers
├── config/
│   ├── database.py        # Database connection, session management
│   ├── settings.py        # Pydantic settings from environment variables
│   └── environment.py     # Environment-specific configurations
├── models/                 # SQLAlchemy ORM models
│   ├── user.py           # User model with roles and permissions
│   ├── appointment.py    # Appointment scheduling
│   ├── barber.py         # Barber profiles and settings
│   ├── client.py         # Client management
│   ├── payment.py        # Payment processing records
│   └── booking.py        # Public booking functionality
├── api/v1/                # API route handlers
│   ├── auth.py           # JWT authentication endpoints
│   ├── appointments.py   # Appointment CRUD and scheduling
│   ├── analytics.py      # Business analytics and 6FB metrics
│   └── endpoints/        # Additional endpoint modules
├── services/              # Business logic layer
│   ├── analytics_service.py     # 6FB methodology calculations
│   ├── notification_service.py  # Email/SMS notifications
│   ├── payment_service.py       # Stripe/payment processing
│   └── google_calendar_service.py # Calendar sync
├── middleware/            # Request/response processing
│   ├── security.py       # Security headers, rate limiting
│   └── error_handling.py # Global exception handling
└── utils/                 # Shared utilities
    ├── security.py       # Password hashing, token validation
    └── encryption.py     # Data encryption for PII
```

### Frontend Architecture (Next.js 14 + TypeScript)

```
frontend/
├── src/
│   ├── app/              # Next.js 14 app directory
│   │   ├── (auth)/      # Auth-required pages
│   │   ├── (public)/    # Public pages
│   │   ├── api/         # API route handlers
│   │   └── layout.tsx   # Root layout with providers
│   ├── components/       # Reusable React components
│   │   ├── modals/      # Modal components (booking, appointments)
│   │   ├── analytics/   # Analytics dashboard components
│   │   └── booking/     # Booking flow components
│   ├── lib/             # Utilities and API clients
│   │   ├── api/         # API client functions
│   │   └── utils/       # Helper functions
│   └── hooks/           # Custom React hooks
└── public/              # Static assets
```

### Key Design Patterns

1. **Authentication Flow**:
   - JWT tokens with refresh capability
   - Role-based access control (RBAC) with permissions
   - Secure password hashing with bcrypt
   - Rate limiting on auth endpoints

2. **Database Strategy**:
   - Repository pattern with services layer
   - Optimized queries with eager loading
   - Database-agnostic with SQLAlchemy ORM
   - Performance indexes on key fields

3. **API Design**:
   - RESTful endpoints with consistent naming
   - Pydantic models for validation
   - Comprehensive error handling
   - OpenAPI/Swagger documentation

4. **Frontend State Management**:
   - React Query for server state
   - Context API for auth state
   - Local storage for preferences
   - Optimistic updates for better UX

5. **Security Implementation**:
   - Environment-based configuration
   - CORS with strict origins in production
   - Security headers (CSP, HSTS, etc.)
   - Input validation and sanitization
   - SQL injection prevention via ORM

### Integration Points

1. **Stripe Connect**:
   - OAuth flow for barber onboarding
   - Payment intent creation for bookings
   - Webhook handling for payment events
   - Transfer and payout management

2. **Google Calendar**:
   - OAuth2 authentication flow
   - Two-way sync for appointments
   - Availability checking
   - Event creation and updates

3. **Notification System**:
   - SendGrid for transactional emails
   - Twilio for SMS notifications
   - Template-based messaging
   - Queued delivery with retry logic

### Performance Optimizations

1. **Database**: 65% performance improvement via:
   - Strategic indexes on foreign keys and date fields
   - Query optimization with proper joins
   - Connection pooling configuration
   - Batch operations where applicable

2. **API Response Times**:
   - Sub-200ms average response time
   - Caching strategy with Redis (optional)
   - Pagination on list endpoints
   - Efficient serialization

3. **Frontend Performance**:
   - Static generation where possible
   - Image optimization with Next.js
   - Code splitting by route
   - Progressive enhancement

### Production Configuration

- **Environment Variables**: See `.env.template` for complete list
- **Database**: PostgreSQL recommended for production
- **Hosting**: Currently on Railway for production, also supports Render and Docker
- **Monitoring**: Sentry integration for error tracking
- **Security Keys**: Generate with `python -c 'import secrets; print(secrets.token_urlsafe(64))'`

## 🚨 Common Pitfalls to Avoid

1. **Database Migrations**:
   - NEVER modify existing migrations
   - ALWAYS create new migrations for schema changes
   - Test migrations on a copy of production data

2. **API Changes**:
   - Maintain backwards compatibility
   - Version new endpoints (/api/v2/) rather than breaking v1
   - Update OpenAPI schema after changes

3. **Environment Variables**:
   - NEVER commit .env files
   - ALWAYS use .env.template as reference
   - Document new variables in this file

4. **Payment Integration**:
   - Test with Stripe test keys only
   - NEVER log payment details
   - Always use idempotency keys

5. **Authentication**:
   - Don't modify JWT token structure without migration plan
   - Keep token expiry times consistent
   - Test role-based access thoroughly

## 📋 Pre-Work Checklist

Before starting any work, ensure:
- [ ] Git working directory is clean (`git status`)
- [ ] On latest main branch (`git pull origin main`)
- [ ] Created feature branch (`git checkout -b feature/...`)
- [ ] Environment variables loaded (`.env` file exists)
- [ ] Dependencies installed (backend: `pip install -r requirements.txt`, frontend: `npm install`)
- [ ] Tests passing (backend: `pytest`, frontend: `npm test`)
- [ ] Development servers can start successfully

## 🔄 Recovery Procedures

### Quick Fixes:
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all uncommitted changes
git checkout -- .

# Remove untracked files
git clean -fd

# Reset to main branch state
git fetch origin
git reset --hard origin/main
```

### Emergency Procedures:
```bash
# Full nuclear option - reset everything
git reset --hard HEAD
git clean -xfd

# Restore from snapshot
./scripts/restore-snapshot.sh

# Rollback deployment
./scripts/rollback-deployment.sh
```

## 📊 Project State Tracking

### Check Project Health:
```bash
# Backend health
cd backend && python scripts/health-check.py

# Frontend health
cd frontend && npm run validate-build

# Full system check
./scripts/full-system-check.sh
```

### Current Known Issues:
- None at this time (update this section when issues are discovered)

### Recent Major Changes:
- [Date] - Description of change
- Keep last 5 major changes listed here

## 🎯 Task Prioritization Guide

1. **Critical (Fix immediately)**:
   - Production down
   - Security vulnerabilities
   - Data loss risks
   - Payment failures

2. **High (Fix within 24h)**:
   - Major feature broken
   - Performance degradation
   - Integration failures

3. **Medium (Fix within week)**:
   - Minor bugs
   - UI/UX improvements
   - Documentation updates

4. **Low (Backlog)**:
   - Nice-to-have features
   - Code refactoring
   - Test coverage improvements

## 🧭 Function Reference Map

### Authentication & Authorization
- **Backend**: `backend/api/v1/auth.py`, `backend/utils/security.py`
- **Frontend**: `frontend/src/lib/auth.ts`, `frontend/src/hooks/useAuth.ts`
- **Middleware**: `backend/middleware/security.py`

### Payment Processing
- **Backend**: `backend/services/payment_service.py`, `backend/api/v1/endpoints/payments.py`
- **Frontend**: `frontend/src/lib/stripe.ts`, `frontend/src/components/payment/`
- **Webhooks**: `backend/api/v1/endpoints/webhooks.py`

### Booking System
- **Backend**: `backend/api/v1/bookings.py`, `backend/services/booking_service.py`
- **Frontend**: `frontend/src/components/booking/`, `frontend/src/app/(public)/book/`
- **Models**: `backend/models/booking.py`, `backend/models/appointment.py`

### Analytics & Reporting
- **Backend**: `backend/services/analytics_service.py`, `backend/api/v1/analytics.py`
- **Frontend**: `frontend/src/components/analytics/`, `frontend/src/app/(auth)/analytics/`

### Notifications
- **Backend**: `backend/services/notification_service.py`
- **Email**: `backend/services/email_service.py` (SendGrid)
- **SMS**: `backend/services/sms_service.py` (Twilio)

### Calendar Integration
- **Backend**: `backend/services/google_calendar_service.py`
- **Frontend**: `frontend/src/components/calendar/`
- **Sync**: `backend/api/v1/endpoints/calendar.py`

## 🛡️ Verification Protocol

### Before Implementing ANY Feature:

1. **Search for existing implementations**:
   ```bash
   # Search for similar features
   grep -r "feature_name" backend/ frontend/
   
   # Find related components
   find . -name "*feature*" -type f
   
   # Check for existing patterns
   rg "pattern" --type py --type ts
   ```

2. **Verify dependencies**:
   ```bash
   # Backend dependencies
   cat backend/requirements.txt | grep package_name
   
   # Frontend dependencies
   cat frontend/package.json | grep package_name
   ```

3. **Check file existence before reading**:
   ```bash
   # Verify file exists
   ls -la path/to/file
   
   # Check directory structure
   tree -L 2 backend/services/
   ```

4. **Read actual function signatures**:
   ```bash
   # Don't guess - read the actual code
   head -50 backend/services/payment_service.py
   
   # Check imports to understand dependencies
   grep "^import\|^from" backend/services/payment_service.py
   ```

## 🚫 Do NOT Assume

1. **Package Availability**:
   - ALWAYS check `requirements.txt` or `package.json`
   - NEVER assume a library is installed
   - Verify exact version if version-specific features needed

2. **File Locations**:
   - Use search tools (`grep`, `find`, `rg`) first
   - Don't guess directory structure
   - Verify with `ls` before reading

3. **Function Signatures**:
   - Read the actual function definition
   - Check parameter types and return values
   - Look for docstrings and type hints

4. **API Endpoints**:
   - Check `backend/main.py` for router includes
   - Verify exact endpoint paths in router files
   - Don't assume REST conventions without checking

## 🔍 Common Patterns & Conventions

### API Calls (Frontend)
```typescript
// ALWAYS use the api client functions
import { apiClient } from '@/lib/api';

// DON'T use fetch directly
// ❌ fetch('/api/endpoint')
// ✅ apiClient.get('/endpoint')
```

### State Management
```typescript
// Server state: React Query
import { useQuery } from '@tanstack/react-query';

// Auth state: Context API
import { useAuth } from '@/hooks/useAuth';

// Local state: useState for UI-only state
```

### Error Handling
```python
# Backend: Use FastAPI's HTTPException
from fastapi import HTTPException
raise HTTPException(status_code=400, detail="Error message")

# Frontend: Use error boundaries and try-catch
try {
  await apiClient.post('/endpoint', data);
} catch (error) {
  handleApiError(error);
}
```

### Database Operations
```python
# Always use the service layer
from services.user_service import UserService

# Don't access models directly in API endpoints
# ❌ db.query(User).filter(...)
# ✅ UserService.get_user_by_email(email)
```

## 📝 Context Maintenance Tips

1. **Use specific file references**:
   ```
   "Looking at backend/services/payment_service.py:45-67, 
   I see the refund method signature..."
   ```

2. **Reference previous decisions**:
   ```
   "As established earlier when we reviewed the auth flow,
   we're using JWT tokens with..."
   ```

3. **Maintain task continuity**:
   ```
   "Continuing with task #3 from our todo list: 
   implementing the email notification template..."
   ```

4. **Checkpoint after complex operations**:
   ```
   "Summary of changes so far:
   1. Added refund method to payment service
   2. Created new API endpoint
   3. Next: Update frontend to call new endpoint"
   ```

## 🤖 Hallucination Prevention Guidelines

### 1. **Always Verify Before Acting**
- Check if a file/function exists before referencing it
- Read actual code instead of assuming implementations
- Use search tools to find correct locations
- Verify package installation before importing

### 2. **Maintain Explicit Context**
- Reference specific file paths and line numbers
- Quote actual code when discussing implementations
- Keep a running summary of changes made
- Use TodoWrite to track multi-step processes

### 3. **Ask When Uncertain**
Instead of guessing:
- "I need to check the exact location of the payment service"
- "Let me verify the function signature before proceeding"
- "I'll search for existing implementations first"

### 4. **Use Verification Commands**
```bash
# Before reading a file
ls -la path/to/file

# Before using a function
grep -n "function_name" file.py

# Before importing a package
cat requirements.txt | grep package

# To understand structure
find . -name "*.py" | grep service
```

### 5. **Common Hallucination Triggers to Avoid**
- ❌ "This should be in the utils folder" (verify first)
- ❌ "The function probably takes these parameters" (read the actual code)
- ❌ "Next.js typically uses..." (check this specific project)
- ✅ "Let me check where this is implemented"
- ✅ "I'll verify the exact function signature"

### 6. **Recovery from Confusion**
If context is lost:
1. Use `TodoRead` to check current task
2. Review recent file changes with `git diff`
3. Re-read the main files being modified
4. Ask user for clarification rather than guessing

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
