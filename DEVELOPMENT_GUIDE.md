# 6FB Development Environment - Complete Setup

## 🎯 Bulletproof Development Setup

Your FastAPI + Next.js development environment now includes:

- **Auto-restart on file changes** for both servers
- **Background process management** with PID tracking
- **Health monitoring** and status checks
- **Clean shutdown** and restart capabilities
- **Persistent servers** that survive terminal navigation

## 🚀 Quick Start Commands

```bash
# Start both servers (auto-restart enabled)
bash dev-manager.sh start

# Check server status anytime
bash dev-status.sh

# Stop all servers cleanly
bash dev-stop.sh

# Restart individual servers
bash dev-restart.sh backend    # or 'be'
bash dev-restart.sh frontend   # or 'fe'
```

## 📋 Available Scripts

### Main Development Manager (`dev-manager.sh`)
The central command for managing your development environment:

```bash
bash dev-manager.sh start           # Start all servers
bash dev-manager.sh stop            # Stop all servers
bash dev-manager.sh restart         # Restart all servers
bash dev-manager.sh status          # Show detailed status
bash dev-manager.sh health          # Run health checks
bash dev-manager.sh logs [service]  # Show logs (backend|frontend|all)
bash dev-manager.sh restart-be      # Restart backend only
bash dev-manager.sh restart-fe      # Restart frontend only
```

### Quick Status Check (`dev-status.sh`)
Fast status overview without full details:
```bash
bash dev-status.sh
```

### Clean Shutdown (`dev-stop.sh`)
Gracefully stops all development servers:
```bash
bash dev-stop.sh
```

### Selective Restart (`dev-restart.sh`)
Restart individual services:
```bash
bash dev-restart.sh backend     # Restart backend only
bash dev-restart.sh frontend    # Restart frontend only
bash dev-restart.sh all         # Restart both (default)
```

## 🔧 Technical Details

### Backend Auto-Restart
- **Engine**: Python `watchdog` library
- **Monitors**: All `.py` files in backend directories
- **Debounce**: 1-second delay to prevent restart loops
- **Process**: Graceful shutdown with SIGTERM, force kill after 5s

### Frontend Auto-Restart
- **Engine**: `nodemon` for Next.js
- **Monitors**: All files in `src/` directory
- **Extensions**: `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.scss`
- **Command**: `npm run dev:nodemon` (added to package.json)

### Process Management
- **PID Files**: Stored in `/tmp/6fb-dev/`
- **Logs**: Stored in `./logs/` directory
- **Port Management**: Automatic cleanup of stuck processes
- **Background**: Servers run detached with `nohup`

## 🌐 Server URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| Backend API | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/docs | Swagger documentation |
| Health Check | http://localhost:8000/health | Backend health endpoint |

## 📁 File Structure

```
6fb-booking/
├── dev-manager.sh          # Main development manager
├── dev-status.sh           # Quick status check
├── dev-stop.sh             # Clean shutdown
├── dev-restart.sh          # Selective restart
├── backend-v2/
│   ├── dev_watcher.py      # Python auto-restart script
│   └── main.py             # FastAPI app
├── backend-v2/frontend-v2/
│   ├── package.json        # Updated with nodemon script
│   └── src/                # Watched directory
└── logs/                   # Server logs
    ├── backend.log
    └── frontend.log
```

## 🔍 Monitoring & Debugging

### Check Server Health
```bash
# Quick status
bash dev-status.sh

# Detailed status with health checks
bash dev-manager.sh status

# Run health check only
bash dev-manager.sh health
```

### View Logs
```bash
# All logs (last 25 lines each)
bash dev-manager.sh logs

# Backend logs only (last 50 lines)
bash dev-manager.sh logs backend

# Frontend logs only (last 50 lines)
bash dev-manager.sh logs frontend

# Live tail logs
tail -f logs/backend.log
tail -f logs/frontend.log
```

### Manual Process Management
```bash
# Check what's running on ports
lsof -i:3000  # Frontend
lsof -i:8000  # Backend

# Kill processes if scripts fail
kill $(lsof -ti:3000)  # Kill frontend
kill $(lsof -ti:8000)  # Kill backend
```

## 🚨 Troubleshooting

### Servers Won't Start
1. Check if ports are already in use: `bash dev-manager.sh status`
2. Stop any existing processes: `bash dev-stop.sh`
3. Try starting again: `bash dev-manager.sh start`

### Auto-Restart Not Working
- **Backend**: Check that `watchdog` is installed: `pip list | grep watchdog`
- **Frontend**: Check that `nodemon` is installed: `npm list nodemon`

### Servers Stop Unexpectedly
1. Check logs: `bash dev-manager.sh logs`
2. Look for error messages in output
3. Verify environment variables are set correctly

### Port Conflicts
```bash
# Find what's using your ports
lsof -i:3000
lsof -i:8000

# Force kill if needed
bash dev-stop.sh
```

## 💡 Development Workflow

### Starting Work
```bash
cd 6fb-booking
bash dev-manager.sh start
# ✅ Both servers running with auto-restart
```

### During Development
- Edit files normally - servers auto-restart on changes
- Check status: `bash dev-status.sh`
- View logs if needed: `bash dev-manager.sh logs`

### If a Server Crashes
```bash
# Restart just the problematic server
bash dev-restart.sh backend   # or frontend
```

### Ending Work Session
```bash
bash dev-stop.sh
# ✅ Clean shutdown of all servers
```

## 🔄 Migration from Old Script

Your old `start-dev-session.sh` is preserved, but the new system offers:

- ✅ **Background processes** (no terminal windows needed)
- ✅ **Auto-restart** on file changes
- ✅ **Process monitoring** with health checks
- ✅ **Clean shutdown** capabilities
- ✅ **Individual server restart** without affecting the other
- ✅ **Persistent operation** (survives terminal closing)

## 🎉 Success Indicators

When everything is working correctly, you should see:

```bash
bash dev-status.sh
```
```
🔍 6FB Development Status
==========================
✅ Backend: Running & Healthy (http://localhost:8000)
✅ Frontend: Running & Healthy (http://localhost:3000)

🔗 Quick Links:
   App: http://localhost:3000
   API: http://localhost:8000
   Docs: http://localhost:8000/docs
```

Your development environment is now bulletproof! 🚀
