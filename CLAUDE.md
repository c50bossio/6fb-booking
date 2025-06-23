# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Hosting**: Currently on Render, supports Docker/Railway/Vercel
- **Monitoring**: Sentry integration for error tracking
- **Security Keys**: Generate with `python -c 'import secrets; print(secrets.token_urlsafe(64))'`
