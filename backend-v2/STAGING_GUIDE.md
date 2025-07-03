# 🚀 BookedBarber V2 Staging Environment Guide

**Complete guide to using the staging environment for safe testing and team collaboration**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Port Configuration](#port-configuration)
4. [Quick Start](#quick-start)
5. [Environment Management](#environment-management)
6. [Testing Workflows](#testing-workflows)
7. [Team Collaboration](#team-collaboration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## 🌍 Overview

### What is the Staging Environment?

Staging is a **production-like environment** that allows you to:
- ✅ Test new features safely before production
- ✅ Run development and staging simultaneously 
- ✅ Demonstrate features to stakeholders
- ✅ Validate database migrations
- ✅ Compare old vs new functionality side-by-side

### Environment Types

| Environment | Frontend | Backend | Database | Purpose |
|-------------|----------|---------|----------|---------|
| **Development** | `localhost:3000` | `localhost:8000` | `6fb_booking.db` | Daily development |
| **Staging (Local)** | `localhost:3001` | `localhost:8001` | `staging_6fb_booking.db` | Safe testing |
| **Staging (Cloud)** | `staging.bookedbarber.com` | `api-staging.bookedbarber.com` | PostgreSQL | Team demos |
| **Production** | `bookedbarber.com` | `api.bookedbarber.com` | PostgreSQL | Live customers |

---

## ⚙️ Environment Setup

### Prerequisites

1. **Docker & Docker Compose** (for containerized staging)
2. **Node.js & npm** (for frontend)
3. **Python 3.9+** (for backend)
4. **Redis** (for caching)

### Environment Files

#### Staging Environment File (`.env.staging`)
Located at: `/backend-v2/.env.staging`

**Key staging configurations:**
```bash
ENVIRONMENT=staging
PORT=8001
DATABASE_URL=sqlite:///./staging_6fb_booking.db
REDIS_URL=redis://localhost:6379/1
DEBUG=false
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8001
```

#### Template Available
Use `.env.staging.template` as reference for cloud staging setup.

---

## 🔧 Port Configuration

### Why Different Ports?

Staging uses **different ports** so you can:
- Run development and staging **simultaneously**
- **Compare environments** side-by-side
- **Test migrations** without stopping development
- **Switch contexts** quickly

### Port Assignments

```bash
# Development Environment
Frontend: localhost:3000
Backend:  localhost:8000
Redis:    Database 0

# Staging Environment  
Frontend: localhost:3001
Backend:  localhost:8001
Redis:    Database 1
```

### Port Conflict Resolution

```bash
# Check what's using ports
lsof -i :3000  # Development frontend
lsof -i :3001  # Staging frontend
lsof -i :8000  # Development backend
lsof -i :8001  # Staging backend

# Kill staging processes if needed
lsof -ti:3001 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start staging environment with Docker
cd backend-v2
docker-compose -f docker-compose.staging.yml up -d

# Verify containers are running
docker-compose -f docker-compose.staging.yml ps

# Access staging
# Frontend: http://localhost:3001
# Backend:  http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Option 2: Manual Startup

```bash
# Terminal 1: Start staging backend
cd backend-v2
uvicorn main:app --reload --port 8001 --env-file .env.staging

# Terminal 2: Start staging frontend  
cd backend-v2/frontend-v2
npm run staging  # Runs on port 3001
```

### Option 3: Parallel Development + Staging

```bash
# Start development environment (Terminal 1 & 2)
cd backend-v2
uvicorn main:app --reload --port 8000  # Development backend

cd backend-v2/frontend-v2
npm run dev  # Development frontend (port 3000)

# Start staging environment (Terminal 3 & 4)
cd backend-v2
uvicorn main:app --reload --port 8001 --env-file .env.staging  # Staging backend

cd backend-v2/frontend-v2
npm run staging  # Staging frontend (port 3001)
```

### First-Time Database Setup

```bash
# Create staging database and run migrations
cd backend-v2
ENV_FILE=.env.staging alembic upgrade head

# Populate with test data (if script exists)
ENV_FILE=.env.staging python scripts/populate_staging_data.py
```

---

## 🎛️ Environment Management

### Management Scripts (Coming Soon)

#### Start/Stop Scripts
```bash
# Start staging environment
./scripts/start-staging.sh

# Stop staging environment
./scripts/stop-staging.sh

# Restart staging environment
./scripts/restart-staging.sh
```

#### Data Management Scripts
```bash
# Reset staging database
./scripts/reset-staging.sh

# Backup staging data
./scripts/backup-staging.sh

# Import fresh test data
./scripts/seed-staging.sh
```

#### Environment Status Scripts
```bash
# Show environment status
npm run env

# Check port availability
./scripts/check-ports.sh

# Show running environments
./scripts/show-environments.sh
```

### Package.json Scripts

Add to `frontend-v2/package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "staging": "next dev -p 3001",
    "env": "node scripts/show-environment.js",
    "ports": "node scripts/check-ports.js"
  }
}
```

---

## 🧪 Testing Workflows

### Feature Development Workflow

1. **Develop in Development Environment**
   ```bash
   # Work on feature in development
   npm run dev  # Frontend: localhost:3000
   uvicorn main:app --reload  # Backend: localhost:8000
   ```

2. **Test in Staging Environment**
   ```bash
   # Test feature in staging
   npm run staging  # Frontend: localhost:3001
   uvicorn main:app --reload --port 8001 --env-file .env.staging
   ```

3. **Compare Environments**
   ```bash
   # Open both in different browser tabs
   # Development: localhost:3000
   # Staging:     localhost:3001
   ```

### Database Migration Testing

```bash
# 1. Create migration in development
alembic revision -m "add new feature table"

# 2. Test migration in staging first
ENV_FILE=.env.staging alembic upgrade head

# 3. Verify staging works correctly
# Test at localhost:3001

# 4. Apply to development if staging succeeds
alembic upgrade head
```

### Integration Testing

```bash
# Test API endpoints in staging
curl http://localhost:8001/api/v1/health
curl http://localhost:8001/api/v1/appointments
curl http://localhost:8001/docs  # API documentation

# Test frontend functionality
# Visit: http://localhost:3001
```

---

## 👥 Team Collaboration

### Local Staging (Team Members)

Each team member can run local staging for personal testing:

```bash
# Each developer runs their own local staging
git pull origin main
docker-compose -f docker-compose.staging.yml up -d
# Access: localhost:3001
```

### Cloud Staging (Shared Environment)

When cloud staging is deployed:

```bash
# Shared team staging environment
Frontend: https://staging.bookedbarber.com
Backend:  https://api-staging.bookedbarber.com
API Docs: https://api-staging.bookedbarber.com/docs
```

#### Team Access Workflow

1. **Developers**: Use local staging for feature testing
2. **QA Team**: Use cloud staging for acceptance testing  
3. **Stakeholders**: Use cloud staging for demos
4. **Clients**: Use cloud staging for previews

### Demo Preparation

```bash
# 1. Ensure staging is updated
git checkout main && git pull

# 2. Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# 3. Seed with demo data
./scripts/seed-demo-data.sh

# 4. Verify all features work
# Test booking flow, payments, etc.

# 5. Share staging URL
echo "Demo ready at: http://localhost:3001"
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: Port Already in Use
```bash
# Symptoms
Error: EADDRINUSE :::3001

# Solution
lsof -ti:3001 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

#### Issue: Database Connection Error
```bash
# Symptoms
"No such file or directory: staging_6fb_booking.db"

# Solution
cd backend-v2
ENV_FILE=.env.staging alembic upgrade head
```

#### Issue: Environment Variables Not Loading
```bash
# Symptoms
Using development config in staging

# Solution
# Ensure .env.staging exists and is properly configured
ls -la .env.staging
ENV_FILE=.env.staging python -c "from config import settings; print(settings.environment)"
```

#### Issue: Redis Connection Error
```bash
# Symptoms
"Connection refused" on Redis

# Solution
# Start Redis if not running
redis-server

# Or use Docker Redis
docker run -d -p 6379:6379 redis:alpine
```

#### Issue: Frontend Won't Start on Port 3001
```bash
# Symptoms
"Port 3001 is already in use"

# Solution 1: Kill process using port
lsof -ti:3001 | xargs kill -9

# Solution 2: Use different port
npm run staging -- -p 3002
```

### Docker Issues

#### Container Won't Start
```bash
# Check container status
docker-compose -f docker-compose.staging.yml ps

# View container logs
docker-compose -f docker-compose.staging.yml logs backend
docker-compose -f docker-compose.staging.yml logs frontend

# Restart containers
docker-compose -f docker-compose.staging.yml restart
```

#### Database Container Issues
```bash
# Check database logs
docker-compose -f docker-compose.staging.yml logs db

# Connect to database container
docker-compose -f docker-compose.staging.yml exec db psql -U staging_user -d bookedbarber_staging
```

### Performance Issues

#### Slow Staging Performance
```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Clean up Docker
docker system prune -f
```

---

## ✅ Best Practices

### Environment Isolation

1. **Always use different ports** (3000/8000 vs 3001/8001)
2. **Use separate databases** (`6fb_booking.db` vs `staging_6fb_booking.db`)
3. **Use different Redis databases** (DB 0 vs DB 1)
4. **Use test credentials** (Stripe test keys, staging SendGrid)

### Development Workflow

1. **Develop in development environment** first
2. **Test in staging** before any deployment
3. **Keep staging up-to-date** with latest changes
4. **Reset staging data** regularly to stay clean

### Team Coordination

1. **Communicate staging usage** (avoid conflicts)
2. **Document staging changes** for team awareness
3. **Use staging for demos** instead of development
4. **Keep staging stable** for important demos

### Data Management

1. **Never use production data** in staging
2. **Create realistic test data** for staging
3. **Reset staging database** when needed
4. **Backup staging data** before major changes

### Security

1. **Use test credentials only** in staging
2. **Don't commit staging environment files** to git
3. **Regularly rotate staging credentials**
4. **Monitor staging for security issues**

---

## 📚 Related Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete development guidelines with environment reference
- **[docker-compose.staging.yml](./docker-compose.staging.yml)** - Staging container configuration
- **[.env.staging.template](./.env.staging.template)** - Staging environment template
- **[terraform/environments/staging/](../terraform/environments/staging/)** - Cloud staging infrastructure

---

## 🆘 Need Help?

### Quick Commands Reference

```bash
# Check environment status
npm run env

# Start staging quickly
docker-compose -f docker-compose.staging.yml up -d

# Access staging
open http://localhost:3001  # Frontend
open http://localhost:8001/docs  # API docs

# Stop staging
docker-compose -f docker-compose.staging.yml down

# Reset staging database  
rm staging_6fb_booking.db
ENV_FILE=.env.staging alembic upgrade head
```

### Common URLs

- **Staging Frontend**: http://localhost:3001
- **Staging Backend**: http://localhost:8001
- **Staging API Docs**: http://localhost:8001/docs
- **Development Frontend**: http://localhost:3000
- **Development Backend**: http://localhost:8000

---

*Last updated: 2025-07-03*
*For questions or issues, check the troubleshooting section above or refer to CLAUDE.md*