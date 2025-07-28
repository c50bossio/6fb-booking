# 🔥 Docker Live Code Sync Guide - BookedBarber V2

## Overview

BookedBarber V2 now has **enhanced Docker volume mounts** that enable **real-time code synchronization** between your host machine and Docker containers. This means **changes reflect immediately** without rebuilding containers.

## 🚀 Quick Start

### Option 1: Development Script (Recommended)
```bash
# Start with live sync
./docker-dev-live.sh start

# Show logs
./docker-dev-live.sh logs

# Test sync functionality
./docker-dev-live.sh test-sync

# Stop environment
./docker-dev-live.sh stop
```

### Option 2: Direct Docker Compose
```bash
# Updated production setup with better volume mounts
docker-compose up -d

# Development setup with optimized sync
docker-compose -f docker-compose.dev.yml up -d
```

## 🔥 Live Sync Features

### Backend (FastAPI)
- ✅ **Python code changes** → Automatic uvicorn reload
- ✅ **Configuration changes** → Instant environment updates
- ✅ **New files/modules** → Immediately available in container
- ✅ **Database changes** → SQLite/PostgreSQL data persisted

### Frontend (Next.js)
- ✅ **React component changes** → Fast Refresh (< 1 second)
- ✅ **TypeScript changes** → Automatic type checking
- ✅ **CSS/Tailwind changes** → Instant style updates
- ✅ **New pages/components** → Hot module replacement

## 📂 Volume Mount Configuration

### Current Setup (docker-compose.yml)
```yaml
backend:
  volumes:
    # 🔥 LIVE CODE SYNC - Changes reflect immediately
    - .:/app
    # Preserve container node_modules
    - /app/node_modules
    # Data directories
    - ./logs:/app/logs
    - ./uploads:/app/uploads
    - .:/app/shared

frontend:
  volumes:
    # 🔥 LIVE CODE SYNC - Changes reflect immediately
    - ./frontend-v2:/app
    # Preserve container node_modules
    - /app/node_modules
    # Next.js cache
    - frontend_cache:/app/.next
    # Static assets
    - ./frontend-v2/public:/app/public
```

## 🧪 Testing Live Sync

### Verify Backend Sync
```bash
# Make a change to any Python file
echo "# Test sync - $(date)" >> routers/health.py

# Check container logs - should see uvicorn reload
docker-compose logs backend --follow

# Clean up
git checkout routers/health.py
```

### Verify Frontend Sync
```bash
# Make a change to any React component
echo "// Test sync - $(date)" >> frontend-v2/app/page.tsx

# Check browser - should see instant update
# Check container logs - should see Fast Refresh
docker-compose logs frontend --follow

# Clean up
git checkout frontend-v2/app/page.tsx
```

## 🛠️ Development Workflow

### Daily Development
1. **Start environment**: `./docker-dev-live.sh start`
2. **Make code changes** in your IDE
3. **Changes reflect immediately** in containers
4. **No rebuilding required** for code changes
5. **Stop when done**: `./docker-dev-live.sh stop`

### When to Rebuild
You only need to rebuild containers when:
- ❌ **Dependencies change** (package.json, requirements.txt)
- ❌ **Dockerfile changes**
- ❌ **Environment variables change**
- ❌ **Container configuration changes**

```bash
# Rebuild when needed
./docker-dev-live.sh rebuild
```

## 📊 Performance Benefits

### Before (Copy-based)
- ❌ Code changes require container rebuild (2-5 minutes)
- ❌ Lost development state on every change
- ❌ Slow iteration cycle
- ❌ Debugging difficult across container boundary

### After (Volume-based)
- ✅ Code changes reflect immediately (< 1 second)
- ✅ Preserved development state
- ✅ Fast iteration cycle
- ✅ Native debugging experience

## 🔧 Troubleshooting

### Common Issues

#### 1. Changes Not Reflecting
**Symptoms**: Code changes don't appear in container
**Solution**:
```bash
# Check volume mounts
docker-compose exec backend ls -la /app
docker-compose exec frontend ls -la /app

# Restart if needed
./docker-dev-live.sh restart
```

#### 2. Port Conflicts
**Symptoms**: `EADDRINUSE` errors
**Solution**:
```bash
# Script handles this automatically
./docker-dev-live.sh start

# Or manually
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

#### 3. Permission Issues
**Symptoms**: Files created in container can't be edited on host
**Solution**:
```bash
# Fix permissions (macOS/Linux)
sudo chown -R $(whoami):$(whoami) .

# Or reset container user permissions
docker-compose down
docker-compose up -d
```

#### 4. Node Modules Conflicts
**Symptoms**: Module resolution errors
**Solution**:
```bash
# Volume excludes preserve container node_modules
# Delete local node_modules if conflicts occur
rm -rf frontend-v2/node_modules
./docker-dev-live.sh restart
```

### Health Checks

#### Check Container Status
```bash
# All containers
docker-compose ps

# Service health
./docker-dev-live.sh status
```

#### Check Volume Mounts
```bash
# Backend mount
docker-compose exec backend python -c "import os; print('Python files:', [f for f in os.listdir('.') if f.endswith('.py')][:5])"

# Frontend mount
docker-compose exec frontend node -e "console.log('Package.json exists:', require('fs').existsSync('package.json'))"
```

#### Check Live Reload
```bash
# Backend (should show uvicorn with --reload)
docker-compose exec backend ps aux | grep uvicorn

# Frontend (should show next dev)
docker-compose exec frontend ps aux | grep next
```

## 🚀 Advanced Usage

### Multiple Environments
```bash
# Development with live sync
docker-compose -f docker-compose.dev.yml up -d

# Production simulation
docker-compose up -d

# Staging environment
docker-compose -f docker-compose.staging.yml up -d
```

### Debugging in Containers
```bash
# Backend shell
./docker-dev-live.sh shell-backend
# Or: docker-compose exec backend bash

# Frontend shell
./docker-dev-live.sh shell-frontend
# Or: docker-compose exec frontend bash

# Python debugging
docker-compose exec backend python -m pdb main.py

# Node debugging
docker-compose exec frontend npm run dev -- --inspect
```

### Custom Development Setup
```bash
# Override specific services
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Scale services
docker-compose up -d --scale backend=2

# Resource limits
docker-compose up -d --memory="4g" --cpus="2.0"
```

## 📋 Best Practices

### File Organization
- ✅ **Keep source code changes** outside container
- ✅ **Let container handle** dependencies and builds
- ✅ **Use .dockerignore** to exclude unnecessary files
- ✅ **Preserve container-specific** files (node_modules, .next)

### Development Workflow
- ✅ **Start containers once** per development session
- ✅ **Make changes freely** without rebuilding
- ✅ **Use container shells** for debugging
- ✅ **Monitor logs** for real-time feedback

### Resource Management
- ✅ **Stop containers** when not developing
- ✅ **Use development compose** for lighter setup
- ✅ **Clean up unused** volumes and images regularly
- ✅ **Monitor resource usage** during development

```bash
# Clean up resources
docker system prune -f
docker volume prune -f
```

## 🎯 Success Metrics

### Performance Indicators
- **Backend reload time**: < 2 seconds
- **Frontend refresh time**: < 1 second
- **File sync latency**: < 100ms
- **Container startup time**: < 30 seconds

### Functionality Checklist
- [ ] Backend Python changes trigger uvicorn reload
- [ ] Frontend React changes trigger Fast Refresh
- [ ] New files appear immediately in containers
- [ ] Database changes persist across restarts
- [ ] Log files accessible from host machine
- [ ] Debugging works seamlessly

## 🔗 Quick Reference

### Essential Commands
```bash
./docker-dev-live.sh start    # Start with live sync
./docker-dev-live.sh logs     # Monitor logs
./docker-dev-live.sh status   # Check health
./docker-dev-live.sh stop     # Stop cleanly
```

### URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### File Locations
- **Development script**: `./docker-dev-live.sh`
- **Development compose**: `docker-compose.dev.yml`
- **Production compose**: `docker-compose.yml`
- **Backend source**: `/app` (in backend container)
- **Frontend source**: `/app` (in frontend container)

---

## 🎉 Result: Instant Development Feedback

With this setup, you get the **best of both worlds**:
- **Native development speed** with instant file changes
- **Containerized consistency** with identical environments
- **Professional deployment** using the same Docker setup

Make any code change and watch it appear instantly in your running application! 🚀