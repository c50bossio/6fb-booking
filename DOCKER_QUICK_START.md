# 🐳 Docker Quick Start Guide for BookedBarber V2

## Overview

BookedBarber V2 is fully containerized using Docker and Docker Compose, providing a consistent development and deployment experience across all environments. This guide covers everything you need to know about working with Docker in this project.

## 📋 Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (usually included with Docker Desktop)
- **Git** for cloning the repository
- At least 4GB RAM available for containers

### Installation Links
- [Docker Desktop for Mac](https://docs.docker.com/docker-for-mac/install/)
- [Docker Desktop for Windows](https://docs.docker.com/docker-for-windows/install/)
- [Docker Engine for Linux](https://docs.docker.com/engine/install/)

## 🚀 Quick Start Commands

### Development Setup (Recommended)
```bash
# Clone and navigate to project
git clone https://github.com/yourusername/bookedbarber-v2.git
cd bookedbarber-v2/backend-v2

# Quick development setup with SQLite
./docker-dev-start.sh

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Full Production Setup
```bash
# Full production setup with PostgreSQL, Redis, and Nginx
./docker-start.sh

# Additional services available:
# Database: postgresql://localhost:5432
# Redis Cache: redis://localhost:6379
# Load Balancer: http://localhost:80
```

### Stop Services
```bash
# Stop all Docker services
./docker-stop.sh

# Or manually
docker-compose down
```

## 📦 Docker Compose Files

The project includes multiple Docker Compose configurations:

### 1. `docker-compose.yml` (Main Production)
- **Services**: Frontend, Backend, PostgreSQL, Redis, Nginx
- **Use Case**: Full production-like environment
- **Command**: `./docker-start.sh` or `docker-compose up`

### 2. `docker-compose.dev.yml` (Development)
- **Services**: Frontend, Backend (SQLite-based)
- **Use Case**: Lightweight development
- **Command**: `./docker-dev-start.sh` or `docker-compose -f docker-compose.dev.yml up`

### 3. `docker-compose.staging.yml` (Staging)
- **Services**: All services with staging configurations
- **Use Case**: Testing and staging environment
- **Command**: `docker-compose -f docker-compose.staging.yml up`

## 🛠️ Development Workflow

### Starting Development
```bash
# 1. Start containers
cd backend-v2
./docker-dev-start.sh

# 2. Verify containers are running
docker-compose ps

# 3. View logs
docker-compose logs --follow

# 4. Open application
open http://localhost:3000
```

### Making Code Changes
- **Frontend**: Hot reload enabled - changes reflect immediately
- **Backend**: Auto-restart enabled - API updates on file save
- **Database**: Persistent volume maintains data between restarts

### Testing in Docker
```bash
# Run backend tests
docker-compose exec backend pytest

# Run frontend tests
docker-compose exec frontend npm test

# Run tests with coverage
docker-compose exec backend pytest --cov=. --cov-report=html
docker-compose exec frontend npm run test:coverage

# Run specific test files
docker-compose exec backend pytest tests/unit/test_auth.py
docker-compose exec frontend npm test components/Calendar
```

### Database Management
```bash
# Access database container
docker-compose exec postgres psql -U postgres -d bookedbarber

# Run migrations
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision -m "description"

# View database logs
docker-compose logs postgres
```

## 🔧 Container Management

### Viewing Container Status
```bash
# List running containers
docker-compose ps

# View all containers (including stopped)
docker ps -a

# View container resource usage
docker stats
```

### Container Logs
```bash
# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs --follow

# View last 50 lines
docker-compose logs --tail=50 backend
```

### Executing Commands in Containers
```bash
# Shell into backend container
docker-compose exec backend bash

# Shell into frontend container
docker-compose exec frontend bash

# Run one-off commands
docker-compose exec backend python manage.py create-test-user
docker-compose exec frontend npm run lint
docker-compose exec backend pip install new-package
```

### Container Debugging
```bash
# Inspect container configuration
docker inspect backend-v2_backend_1

# View container filesystem
docker-compose exec backend ls -la /app

# Check environment variables
docker-compose exec backend env

# Monitor container processes
docker-compose exec backend ps aux
```

## 🌐 Environment Configurations

### Development Environment
```yaml
# docker-compose.dev.yml highlights
services:
  backend:
    environment:
      - DATABASE_URL=sqlite:///./dev.db
      - DEBUG=true
    volumes:
      - ./:/app  # Live code mounting
  frontend:
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend-v2:/app  # Hot reload support
```

### Production Environment
```yaml
# docker-compose.yml highlights
services:
  postgres:
    environment:
      - POSTGRES_DB=bookedbarber
      - POSTGRES_USER=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    volumes:
      - redis_data:/data
  nginx:
    ports:
      - "80:80"
      - "443:443"
```

## 🗄️ Data Persistence

### Volume Management
```bash
# List all volumes
docker volume ls

# Inspect volume
docker volume inspect backend-v2_postgres_data

# Backup database volume
docker run --rm -v backend-v2_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore database volume
docker run --rm -v backend-v2_postgres_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/postgres_backup.tar.gz -C /data
```

### Development Data
- **SQLite**: Stored in project directory (`dev.db`)
- **Uploads**: Mounted volume preserves file uploads
- **Logs**: Available in container and can be mounted to host

### Production Data
- **PostgreSQL**: Persistent volume `postgres_data`
- **Redis**: Persistent volume `redis_data`
- **Static Files**: Nginx serves from mounted volume

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Error: "Port 3000 is already allocated"
# Solution: Stop conflicting services
lsof -ti:3000 | xargs kill -9
docker-compose down
./docker-dev-start.sh
```

#### 2. Containers Won't Start
```bash
# Check Docker daemon
docker --version
docker ps

# Clean up Docker system
docker system prune -f

# Rebuild containers
docker-compose down
docker-compose up --build
```

#### 3. Database Connection Issues
```bash
# Check PostgreSQL container
docker-compose logs postgres

# Verify database exists
docker-compose exec postgres psql -U postgres -l

# Reset database
docker-compose down -v  # Removes volumes
docker-compose up
```

#### 4. Frontend Build Errors
```bash
# Clear Node modules
docker-compose exec frontend rm -rf node_modules
docker-compose exec frontend npm install

# Rebuild frontend container
docker-compose up --build frontend
```

#### 5. Backend Import Errors
```bash
# Check Python dependencies
docker-compose exec backend pip list

# Reinstall requirements
docker-compose exec backend pip install -r requirements.txt

# Check Python path
docker-compose exec backend python -c "import sys; print(sys.path)"
```

### Performance Issues

#### Slow Container Startup
```bash
# Pre-pull images
docker-compose pull

# Use build cache
docker-compose build --pull

# Allocate more resources in Docker Desktop
# Settings > Resources > Advanced > Memory: 4GB+
```

#### File Sync Issues (Mac/Windows)
```bash
# Use delegate mount for better performance
volumes:
  - ./:/app:delegated  # Mac
  - ./:/app:cached     # Alternative option
```

## 🔒 Security Best Practices

### Development Security
- Use `.env` files for sensitive configuration (not committed to git)
- Regularly update base images: `docker-compose pull`
- Scan images for vulnerabilities: `docker scan backend-v2_backend`

### Production Security
- Use specific image tags instead of `latest`
- Run containers as non-root user
- Enable Docker Content Trust: `export DOCKER_CONTENT_TRUST=1`
- Use secrets management for production credentials

## 📊 Monitoring and Logs

### Health Checks
```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect --format='{{.State.Health}}' backend-v2_backend_1
```

### Log Management
```bash
# Rotate logs to prevent disk space issues
docker-compose logs --tail=1000 > app.log

# Use external log management
# Configure log drivers in docker-compose.yml:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Docker Build and Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and test
        run: |
          cd backend-v2
          docker-compose -f docker-compose.dev.yml up -d
          docker-compose exec -T backend pytest
          docker-compose exec -T frontend npm test
```

## 📚 Additional Resources

### Documentation References
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)

### Project-Specific Docs
- `DOCKER_DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `CONTAINER_ORCHESTRATION_SUMMARY.md` - Kubernetes and production scaling
- `backend-v2/CLAUDE.md` - Development workflow with Docker
- `README.md` - General project information

## 🆘 Getting Help

### Quick Debug Commands
```bash
# System information
docker version
docker-compose version
docker system df
docker system events

# Container inspection
docker-compose config  # Validate compose file
docker-compose ps       # Service status
docker-compose top      # Running processes
```

### Support Channels
- Check existing issues in project repository
- Review Docker logs first: `docker-compose logs --tail=100`
- Include system info when reporting issues: `docker version && docker-compose version`

---

**Last Updated**: July 2025
**Docker Version Tested**: 20.10+
**Docker Compose Version**: 2.0+