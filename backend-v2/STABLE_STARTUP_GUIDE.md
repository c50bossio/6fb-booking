# 🚀 Stable Development Environment Guide

## Quick Start

```bash
# Navigate to backend-v2 directory
cd /Users/bossio/6fb-booking/backend-v2

# Start everything (recommended)
./start_stable.sh

# Monitor status (optional)
./monitor.sh

# Stop everything
./stop_all.sh
```

## 🛠️ Available Scripts

### `./start_stable.sh`
**Comprehensive startup with crash prevention**
- ✅ Kills previous processes
- ✅ Cleans all caches (Next.js, npm, Python)
- ✅ Verifies ports are free
- ✅ Starts backend with TESTING=true
- ✅ Starts frontend with clean environment
- ✅ Runs integration tests
- ✅ Provides success confirmation

### `./monitor.sh` 
**Real-time system monitoring**
- 📊 Live health checks every 10 seconds
- 🔍 Process information (PID, CPU, memory)
- 📈 Recent log activity
- ⚠️ Crash detection and alerts

### `./stop_all.sh`
**Clean shutdown**
- 🛑 Graceful termination (SIGTERM)
- 🔨 Force kill if needed (SIGKILL)
- 🧹 Process cleanup by name
- ✅ Verification of clean shutdown

### `test_integration.py`
**Integration testing**
- 🔗 Backend-frontend connectivity
- 🏥 Health check verification
- 📚 API documentation accessibility
- ⚙️ Environment configuration validation

## 🎯 URLs After Startup

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend** | http://localhost:8000 | API server |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |
| **Health Check** | http://localhost:8000/health | Service status |

## 🚨 Troubleshooting

### Frontend Won't Start
```bash
# Check logs
tail -20 frontend.log

# Manual restart
cd frontend-v2
rm -rf .next
npm run dev
```

### Backend Issues
```bash
# Check logs  
tail -20 backend.log

# Manual restart
TESTING=true uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Port Conflicts
```bash
# See what's using ports
lsof -ti:3000,8000

# Force kill everything
./stop_all.sh
```

### Cache Issues
```bash
# Full cache clear
rm -rf frontend-v2/.next
npm cache clean --force
find . -name "__pycache__" -delete
```

## 🔄 Recovery Procedures

### If Everything Crashes
1. Run `./stop_all.sh` 
2. Wait 5 seconds
3. Run `./start_stable.sh`

### If Only Frontend Crashes
1. `pkill -f "npm run dev"`
2. `cd frontend-v2 && npm run dev`

### If Only Backend Crashes  
1. `pkill -f uvicorn`
2. `TESTING=true uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

## 📊 Success Indicators

After running `./start_stable.sh`, you should see:
```
✅ Backend started successfully
✅ Frontend started successfully  
✅ Backend health check: OK
✅ Frontend accessibility: OK
✅ API docs accessible: OK
✅ Environment configuration: OK
🎉 All integration tests passed!
```

## 🏗️ Architecture Notes

- **Backend**: FastAPI with SQLAlchemy, running in development mode
- **Frontend**: Next.js 14 with hot reloading
- **Security**: Disabled in development (TESTING=true)
- **Ports**: 8000 (backend), 3000 (frontend)
- **Logs**: `backend.log`, `frontend.log`

## 🚀 Development Workflow

1. **Start**: `./start_stable.sh`
2. **Code**: Make your changes
3. **Monitor**: `./monitor.sh` (optional)
4. **Test**: Services auto-reload on changes
5. **Stop**: `./stop_all.sh` when done

---
*Last updated: June 30, 2025*
*Both services now running stably on ports 3000 and 8000*