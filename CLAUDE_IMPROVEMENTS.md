# CLAUDE.md Improvements Analysis

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State Analysis

The existing CLAUDE.md files are comprehensive but could benefit from these improvements:

## 1. **Enhanced Build & Test Commands**

### Current Commands (Good)
```bash
# Backend tests (required before task completion)
cd backend-v2 && pytest

# Frontend tests (required before task completion)
cd backend-v2/frontend-v2 && npm test
```

### Suggested Improvements
```bash
# Essential Development Commands
cd backend-v2

# Backend Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000   # Development server
pytest --cov=. --cov-report=term-missing               # Run tests with coverage
pytest -x --tb=short                                   # Quick test run (fail fast)
pytest tests/unit/                                     # Unit tests only
pytest tests/integration/                              # Integration tests only
alembic upgrade head                                   # Apply database migrations
alembic revision -m "description"                      # Create new migration

# Frontend Development  
cd frontend-v2
npm run dev                                            # Development server
npm run build                                          # Production build
npm run lint                                           # ESLint check
npm run lint:fix                                       # Auto-fix linting issues
npm test                                               # Run tests
npm run test:coverage                                  # Run tests with coverage

# Docker Development (Recommended)
docker-compose up -d                                   # Start all services
docker-compose logs --follow                           # View logs
docker-compose exec backend bash                       # Shell into backend
docker-compose exec frontend bash                      # Shell into frontend
docker-compose down                                    # Stop all services

# Multi-environment Support
npm run staging                                        # Start staging on port 3001
uvicorn main:app --reload --port 8001 --env-file .env.staging  # Staging backend
```

## 2. **Architecture Deep Dive**

### Current Architecture Overview (Good)
The existing CLAUDE.md has basic architecture but could be enhanced with:

### Suggested Architecture Details
```
BookedBarber V2 - Modern Monorepo Architecture

backend-v2/                    # FastAPI Backend (Python 3.9+)
├── main.py                   # FastAPI app with middleware stack
├── routers/                  # API endpoints (70+ routers)
│   ├── auth.py              # JWT authentication
│   ├── appointments.py      # Core booking logic
│   ├── payments.py          # Stripe Connect integration
│   ├── analytics.py         # Business intelligence
│   └── unified_analytics.py # Consolidated analytics
├── services/                # Business logic layer (80+ services)
│   ├── booking_service.py   # Core booking orchestration
│   ├── payment_service.py   # Payment processing
│   ├── google_calendar_service.py  # Calendar sync
│   └── ai_providers/        # AI integration framework
├── models/                  # SQLAlchemy ORM models
├── middleware/              # Security, logging, multi-tenancy
├── tests/                   # Comprehensive test suite
│   ├── unit/               # Fast isolated tests
│   ├── integration/        # API integration tests
│   └── e2e/               # End-to-end workflows
└── frontend-v2/            # Next.js 14 Frontend
    ├── app/                # App Router (Next.js 14)
    │   ├── (auth)/        # Protected routes
    │   ├── (public)/      # Public routes
    │   └── api/           # API route handlers
    ├── components/         # React components
    │   ├── ui/            # shadcn/ui components
    │   └── booking/       # Booking-specific UI
    └── lib/               # Utilities and API clients

Key Architectural Patterns:
- Clean Architecture: Services → Models → Database
- API-First Design: RESTful APIs with OpenAPI docs
- Multi-tenancy: Location-based data isolation
- Event-Driven: Background tasks with Celery + Redis
- Real-time: WebSocket support for live updates
```

## 3. **Development Workflow Enhancement**

### Current Workflow (Basic)
The existing workflow is good but could include:

### Suggested Enhanced Workflow
```bash
# Complete Development Setup (First Time)
git clone <repository>
cd 6fb-booking/backend-v2

# Method 1: Docker (Recommended)
docker-compose up -d
# Access: Frontend http://localhost:3000, Backend http://localhost:8000

# Method 2: Manual Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.template .env
alembic upgrade head

cd frontend-v2
npm install
cp .env.local.example .env.local
npm run dev

# Daily Development Workflow
git checkout staging && git pull origin staging
git checkout -b feature/feature-name-YYYYMMDD

# Make changes...
pytest                        # Run backend tests
npm test                      # Run frontend tests
git add . && git commit -m "feat: description"
git push origin feature/feature-name-YYYYMMDD

# Deploy to Staging
gh pr create --base staging --title "Feature: Description"
# After staging validation:
gh pr create --base production --title "Release: Description"
```

## 4. **Testing Strategy Details**

### Current Testing (Basic Mention)
The existing CLAUDE.md mentions testing but could be enhanced:

### Suggested Testing Strategy
```bash
# Testing Pyramid Strategy

# Unit Tests (Fast, Many)
pytest tests/unit/                    # Service layer tests
pytest tests/unit/test_auth.py        # Authentication tests
pytest tests/unit/test_booking.py     # Booking logic tests

# Integration Tests (Medium Speed, Medium Coverage)
pytest tests/integration/             # API endpoint tests
pytest tests/integration/test_payment_flow.py  # Payment integration

# E2E Tests (Slow, Critical Paths)
pytest tests/e2e/                     # Full user workflows
npm run test:e2e                      # Frontend E2E with Playwright

# Performance Tests
pytest tests/performance/             # Load testing
ab -n 100 -c 10 http://localhost:8000/api/v2/appointments/

# Security Tests
pytest tests/security/                # Security validation
npm audit                            # Frontend security audit

# Coverage Requirements
pytest --cov=. --cov-report=html     # Generate coverage report
# Minimum: 80% overall, 95% for critical paths (auth, payments, bookings)
```

## 5. **Common Development Tasks**

### Suggested Task Reference
```bash
# Adding a New API Endpoint
# 1. Create test first (TDD)
touch tests/integration/test_new_endpoint.py
pytest tests/integration/test_new_endpoint.py --tb=short

# 2. Implement endpoint
# Edit routers/new_feature.py
# Add to main.py router includes

# 3. Verify tests pass
pytest tests/integration/test_new_endpoint.py -v

# Adding a New React Component
# 1. Create component with TypeScript
touch frontend-v2/components/NewComponent.tsx

# 2. Add to component exports
# Edit frontend-v2/components/index.ts

# 3. Write component tests
touch frontend-v2/components/__tests__/NewComponent.test.tsx
npm test NewComponent

# Database Schema Changes
# 1. Create migration
alembic revision -m "add new table"

# 2. Edit generated migration file
# 3. Apply migration
alembic upgrade head

# 4. Update models
# Edit models/new_model.py
```

## 6. **Troubleshooting Guide Enhancement**

### Current Troubleshooting (Good but Basic)
The existing guide covers server conflicts but could include:

### Suggested Enhanced Troubleshooting
```bash
# Common Issues & Solutions

# 1. Database Connection Issues
ERROR: sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) database is locked
SOLUTION: 
- Check for hanging processes: ps aux | grep python
- Kill processes: pkill -f uvicorn
- Delete lock file: rm 6fb_booking.db-wal

# 2. Frontend Build Failures
ERROR: Module not found: Can't resolve '@/components/SomeComponent'
SOLUTION:
- Check import paths in components/
- Verify TypeScript paths in tsconfig.json
- Clear Next.js cache: rm -rf .next

# 3. API Authentication Errors
ERROR: 401 Unauthorized
SOLUTION:
- Check JWT_SECRET_KEY in .env
- Verify token format in browser dev tools
- Test auth endpoint: curl -X POST http://localhost:8000/api/v2/auth/login

# 4. Docker Container Issues
ERROR: Container exits immediately
SOLUTION:
- Check logs: docker-compose logs backend
- Verify environment variables: docker-compose config
- Rebuild: docker-compose up --build

# 5. Port Conflicts
ERROR: EADDRINUSE: address already in use :::3000
SOLUTION:
- Find process: lsof -i :3000
- Kill process: kill -9 <PID>
- Use alternative ports: npm run staging (port 3001)
```

## 7. **Performance Guidelines**

### Suggested Addition
```bash
# Performance Best Practices

# Backend Performance
- Use async/await for I/O operations
- Implement Redis caching for expensive queries
- Add database indexes for frequently queried fields
- Use connection pooling for database connections
- Profile with: pytest --profile tests/performance/

# Frontend Performance  
- Use Next.js Image optimization
- Implement code splitting with dynamic imports
- Cache API responses with React Query
- Profile with: npm run build:analyze
- Monitor bundle size: npm run build && ls -la .next/static/chunks/

# Database Performance
- Add indexes: CREATE INDEX idx_appointments_date ON appointments(appointment_date);
- Monitor query performance: EXPLAIN ANALYZE SELECT ...
- Use read replicas for analytics queries
```

## 8. **Security Guidelines**

### Suggested Addition
```bash
# Security Checklist

# Environment Security
- Never commit .env files
- Rotate API keys quarterly
- Use HTTPS in production
- Validate all input parameters

# Authentication Security
- Implement rate limiting on auth endpoints
- Use secure JWT tokens with short expiry
- Implement MFA for admin accounts
- Log all authentication attempts

# API Security
- Validate request schemas with Pydantic
- Implement CORS properly
- Use CSRF protection
- Sanitize all user inputs

# Frontend Security
- Escape all user-generated content
- Use Content Security Policy headers
- Validate all form inputs
- Implement proper error boundaries
```

## Summary of Improvements

The existing CLAUDE.md is very comprehensive. The main improvements would be:

1. **More detailed build/test commands** with specific examples
2. **Enhanced architecture documentation** showing the complete project structure
3. **Step-by-step development workflows** for common tasks
4. **Comprehensive troubleshooting guide** with actual error messages and solutions
5. **Performance and security guidelines** for production readiness

The current file already excellently covers:
- Six Figure Barber methodology integration
- Browser debugging with MCP
- Docker development workflows
- Safety protocols and verification hooks
- Deployment processes

These improvements would make the CLAUDE.md even more valuable for development work.