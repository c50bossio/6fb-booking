# BookedBarber V2 - Docker Deployment Guide

## 🎯 Production-Ready Docker Architecture

This guide covers the complete Docker Compose setup that solves networking connectivity issues and provides a production-ready deployment architecture.

## 🏗️ Architecture Overview

### Multi-Service Architecture
- **PostgreSQL Database**: Persistent data storage with health checks
- **Redis Cache**: Session management and caching layer  
- **FastAPI Backend**: Business logic API with service discovery
- **Next.js Frontend**: React application with container-to-container communication
- **Nginx Load Balancer**: Reverse proxy with SSL termination and rate limiting

### Service Discovery
All services communicate via Docker service names (e.g., `backend:8000`, `postgres:5432`) instead of `localhost`, solving the networking connectivity issues you experienced.

## 🚀 Quick Start

### Development Environment (Recommended for Testing)
```bash
# Quick development setup with SQLite
./docker-dev-start.sh
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

**Test Credentials:**
- Email: `admin@bookedbarber.com`
- Password: `admin123`

### Production Environment
```bash
# Full production setup with PostgreSQL, Redis, and Nginx
./docker-start.sh
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000  
- Load Balancer: http://localhost:80
- Database: postgresql://localhost:5432
- Redis: redis://localhost:6379

## 📋 Prerequisites

1. **Docker Desktop**: Install from [docker.com](https://docker.com)
2. **Docker Compose**: Usually included with Docker Desktop
3. **Git**: For cloning the repository

### Verify Installation
```bash
docker --version
docker-compose --version
```

## 🔧 Configuration Files

### Docker Compose Files
- `docker-compose.yml`: Production setup with PostgreSQL, Redis, Nginx
- `docker-compose.dev.yml`: Development setup with SQLite
- `.env.docker`: Docker-specific environment variables

### Startup Scripts
- `docker-start.sh`: Production deployment with health checks
- `docker-dev-start.sh`: Development environment startup
- `docker-stop.sh`: Graceful shutdown with cleanup options

### Nginx Configuration
- `nginx/nginx.conf`: Main Nginx configuration with rate limiting
- `nginx/conf.d/default.conf`: Additional configurations and SSL setup

## 🛠️ Service Configuration

### Backend Service (FastAPI)
- **Container Name**: `bookedbarber-backend`
- **Internal Port**: 8000
- **External Port**: 8000
- **Database**: PostgreSQL (production) / SQLite (development)
- **Cache**: Redis (production only)
- **Health Check**: `/health` endpoint

### Frontend Service (Next.js)
- **Container Name**: `bookedbarber-frontend`  
- **Internal Port**: 3000
- **External Port**: 3000
- **API Communication**: `http://backend:8000` (service discovery)
- **Build Target**: Production optimized

### Database Service (PostgreSQL)
- **Container Name**: `bookedbarber-postgres`
- **Internal Port**: 5432
- **External Port**: 5432
- **Database**: `bookedbarber_v2`
- **User**: `bookedbarber`
- **Health Check**: `pg_isready`

### Cache Service (Redis)
- **Container Name**: `bookedbarber-redis`
- **Internal Port**: 6379
- **External Port**: 6379
- **Persistence**: Volume mounted
- **Health Check**: `redis-cli ping`

## 🔐 Security Features

### Network Isolation
- Custom Docker network (`bookedbarber-network`)
- Service-to-service communication via internal DNS
- Isolated subnet (172.20.0.0/16)

### Rate Limiting (Nginx)
- API endpoints: 10 requests/second
- Authentication: 5 requests/minute
- Burst capacity with overflow handling

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Referrer-Policy: strict-origin-when-cross-origin

### Environment Security
- Separate environment files for different stages
- No secrets in container images
- Environment variable validation

## 📊 Monitoring & Health Checks

### Automated Health Checks
- **PostgreSQL**: Connection test every 10 seconds
- **Redis**: Ping test every 10 seconds  
- **Backend**: HTTP health endpoint every 30 seconds
- **Frontend**: HTTP connectivity every 30 seconds

### Service Dependencies
Services start in dependency order:
1. PostgreSQL & Redis
2. Backend (waits for database)
3. Frontend (waits for backend)
4. Nginx (waits for frontend & backend)

### Logging
- Centralized log collection in `./logs` directory
- Nginx access and error logs
- Application logs with structured format
- Container logs via `docker-compose logs`

## 🔄 Development Workflow

### Hot Reload Development
```bash
# Start development environment with hot reload
./docker-dev-start.sh

# View logs in real-time
docker-compose -f docker-compose.dev.yml logs -f

# Restart specific service
docker-compose -f docker-compose.dev.yml restart backend
```

### Production Testing
```bash
# Start full production stack
./docker-start.sh

# Run health checks
curl http://localhost:8000/health
curl http://localhost:3000

# Stop all services
./docker-stop.sh
```

## 🐛 Troubleshooting

### Common Issues

#### "Failed to connect to server" Error
**Cause**: Frontend trying to reach backend via `localhost` instead of service name
**Solution**: Verify `.env.production` uses `http://backend:8000`

#### "Docker daemon not running"
**Cause**: Docker Desktop not started
**Solution**: Start Docker Desktop application

#### "Port already in use"
**Cause**: Previous containers still running
**Solution**: Run `./docker-stop.sh` or `docker-compose down`

#### "Build failed" 
**Cause**: Missing Dockerfile or dependencies
**Solution**: Check Dockerfile exists in backend and frontend directories

### Debugging Commands
```bash
# Check running containers
docker ps

# View service logs
docker-compose logs backend
docker-compose logs frontend

# Execute commands in container
docker-compose exec backend bash
docker-compose exec frontend sh

# Check network connectivity
docker-compose exec frontend curl http://backend:8000/health

# Reset everything
docker-compose down --volumes --remove-orphans
docker system prune -f
```

## 📈 Performance Optimization

### Production Optimizations
- Multi-stage Docker builds for smaller images
- Nginx reverse proxy with caching
- Connection pooling and keep-alive
- Gzip compression for static assets
- Health checks with appropriate timeouts

### Resource Limits
```yaml
# Add to service definitions for production
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## 🔄 Deployment Environments

### Development
- SQLite database for simplicity
- Hot reload enabled
- Debug mode enabled
- Test credentials pre-configured

### Staging
- PostgreSQL database
- Production-like configuration
- Real external service integration
- Performance monitoring

### Production
- Optimized Docker images
- SSL/TLS termination
- Advanced monitoring
- Backup and recovery procedures

## 🎯 Testing the ShareBookingModal

Once the containers are running:

1. **Access Frontend**: http://localhost:3000
2. **Login**: Use admin@bookedbarber.com / admin123
3. **Navigate**: Look for the link button in the header (🔗)
4. **Test Modal**: Click to open ShareBookingModal
5. **Verify Features**:
   - All 8 sharing options visible
   - Modal height shows all content
   - Click outside to close
   - QR code generation works
   - Link customization works

## 🚀 Next Steps

1. **Test the current setup** with the development environment
2. **Configure external services** (Stripe, Google, SendGrid) with real keys
3. **Set up SSL certificates** for production domain
4. **Configure monitoring** (Sentry, analytics)
5. **Set up CI/CD pipeline** for automated deployments

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)

---

**Ready to test!** Run `./docker-dev-start.sh` to start the development environment and test the ShareBookingModal functionality.