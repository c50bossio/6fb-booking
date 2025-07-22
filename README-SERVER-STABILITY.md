# BookedBarber V2 - Server Stability Guide

This guide provides comprehensive solutions for localhost:3000 stability issues.

## 🎯 Quick Solutions

### Immediate Fix (30 seconds)
```bash
# Stop everything and restart clean
cd /Users/bossio/6fb-booking
./scripts/dev-server.sh clean
```

### Emergency Reset (2 minutes)
```bash
# Full stabilization (creates monitoring and cleanup automation)
cd /Users/bossio/6fb-booking
./scripts/stabilize-dev-server.sh
```

## 🚀 Daily Usage Commands

### From Project Root
```bash
# Start stable development environment
./scripts/dev-server.sh start         # or just: ./scripts/dev-server.sh

# Check if servers are running properly  
./scripts/dev-server.sh status

# Clean restart (clears caches)
./scripts/dev-server.sh clean

# Stop all development servers
./scripts/dev-server.sh stop

# Restart servers
./scripts/dev-server.sh restart
```

### From Frontend Directory
```bash
cd backend-v2/frontend-v2

# Stable development commands (uses monitoring)
npm run dev:stable                    # Start with auto-monitoring
npm run dev:clean                     # Clean restart
npm run dev:status                    # Check server health
npm run dev:stop                      # Stop development servers

# Server management
npm run server:monitor                # Start with enhanced monitoring
npm run server:stabilize              # Full environment stabilization

# Traditional commands (still work)
npm run dev                           # Regular Next.js dev server
```

## 🔧 Root Causes Fixed

### 1. Multiple Process Conflicts
**Problem**: Multiple Next.js processes running simultaneously  
**Solution**: Automated process cleanup before starting

### 2. Corrupted Build Cache
**Problem**: .next directory corruption causing webpack errors  
**Solution**: Intelligent cache cleanup when issues detected

### 3. Missing Dependencies  
**Problem**: Import errors for missing files crashing the server  
**Solution**: Automatic creation of missing stub files

### 4. Process Cleanup on Exit
**Problem**: Orphaned processes after terminal closure  
**Solution**: Shell exit traps and automated cleanup hooks

### 5. Port Conflicts
**Problem**: EADDRINUSE errors when ports are occupied  
**Solution**: Port conflict detection and automatic cleanup

## 🛡️ Automated Prevention

### Claude Code Hooks
The system includes automated hooks that run during development:

- **Pre-session cleanup**: Cleans orphaned processes before work starts
- **Dependency validation**: Creates missing dependencies after file edits  
- **Server health monitoring**: Restarts unhealthy servers automatically
- **Session cleanup**: Cleans up processes when Claude Code exits

### Health Monitoring
When using `npm run dev:stable` or `npm run server:monitor`:
- Automatically restarts if server crashes
- Monitors for unresponsive servers
- Prevents multiple process conflicts
- Provides real-time health status

## 📊 Troubleshooting

### Check Server Status
```bash
# Quick status check
./scripts/dev-server.sh status

# Detailed port information
npm run ports

# View server logs
tail -f /tmp/frontend.log
tail -f /tmp/backend.log
```

### Common Error Solutions

#### "EADDRINUSE: address already in use"
```bash
# Automated fix
./scripts/dev-server.sh stop
./scripts/dev-server.sh start
```

#### "Cannot find module" webpack errors
```bash
# Clean restart with dependency validation
./scripts/dev-server.sh clean
```

#### Server starts but pages don't load
```bash
# Check health and restart if needed
./scripts/dev-server.sh status
npm run server:monitor
```

#### Multiple "next dev" processes
```bash
# Kill all conflicting processes
pkill -f "next dev"
./scripts/dev-server.sh start
```

## 🔄 Migration from Old Workflow

### Before (Unstable)
```bash
cd backend-v2/frontend-v2
npm run dev                    # Often crashes/conflicts
```

### After (Stable)  
```bash
# Option 1: From project root (recommended)
./scripts/dev-server.sh

# Option 2: From frontend directory
cd backend-v2/frontend-v2
npm run dev:stable
```

## 🎯 Performance Improvements

### Faster Startup
- **Pre-flight checks**: Validates environment before starting
- **Smart caching**: Only clears cache when necessary
- **Process detection**: Avoids conflicts with existing servers

### Better Reliability
- **Health monitoring**: Detects and fixes issues automatically
- **Graceful recovery**: Restarts failed servers without manual intervention
- **Dependency validation**: Prevents import errors from crashing server

### Enhanced Development Experience
- **Status reporting**: Clear feedback on server health
- **One-command solutions**: Simple commands for complex operations
- **Automated cleanup**: No more manual process killing

## 🚀 Next Steps

1. **Use the stable commands**: Replace `npm run dev` with `npm run dev:stable`
2. **Regular cleanup**: Run `./scripts/dev-server.sh clean` when issues arise
3. **Monitor health**: Use `./scripts/dev-server.sh status` to check server state
4. **Report issues**: New stability problems will be addressed in future updates

## 📝 Advanced Configuration

### Customizing Monitoring
Edit `/Users/bossio/6fb-booking/backend-v2/frontend-v2/scripts/monitor-server.js`:
- Adjust restart limits
- Modify health check intervals
- Customize recovery strategies

### Extending Cleanup Hooks
Add new hooks in `/Users/bossio/6fb-booking/.claude/scripts/`:
- Custom dependency validation
- Additional server monitoring
- Environment-specific cleanup

---

**Your localhost:3000 is now stabilized with comprehensive automation!** 🎉

Use `./scripts/dev-server.sh` for all development needs.