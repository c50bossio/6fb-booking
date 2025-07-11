# Server Management Scripts

This directory contains scripts to help manage the BookedBarber V2 development environment and prevent common issues like port conflicts and multiple server instances.

## 🚀 Quick Start

For most situations, just run:
```bash
./scripts/start-dev-clean.sh
```

This will handle everything automatically: cleanup, dependency checks, and server startup.

## 📁 Available Scripts

### 1. `check-ports.sh`
**Purpose**: Check which processes are using development ports

```bash
./scripts/check-ports.sh
```

**What it does:**
- Checks ports 3000, 3001, 8000, 8001, 5432, 6379, 9222
- Shows which processes are using each port
- Detects multiple Next.js instances (common cause of errors)
- Provides kill commands for each process

**When to use:**
- Before starting development
- When you get "port already in use" errors
- When you see "Internal Server Error" or missing UI components

### 2. `kill-ports.sh`
**Purpose**: Safely terminate processes on development ports

```bash
./scripts/kill-ports.sh
```

**What it does:**
- Kills all Next.js and npm dev processes
- Kills all uvicorn and FastAPI processes
- Clears specific ports (3000, 3001, 8000, 8001)
- Optionally clears Next.js cache

**When to use:**
- When ports are blocked
- Before starting a fresh development session
- When you have zombie processes

### 3. `start-dev-clean.sh`
**Purpose**: Comprehensive startup script that handles all common issues

```bash
./scripts/start-dev-clean.sh
```

**What it does:**
- Runs pre-flight checks (Node.js, Python, npm)
- Kills existing processes automatically
- Clears caches (.next, node_modules/.cache, __pycache__)
- Checks and installs dependencies if needed
- Sets up environment files (.env, .env.local)
- Applies database migrations
- Starts both frontend and backend servers
- Uses tmux if available for better session management

**When to use:**
- Starting a new development session
- After pulling new code
- When experiencing any development issues

### 4. `diagnose-dev-issues.sh`
**Purpose**: Diagnostic tool to identify common development problems

```bash
./scripts/diagnose-dev-issues.sh
```

**What it does:**
- Checks for multiple server instances
- Verifies port availability
- Detects cache corruption
- Validates environment files
- Checks dependencies
- Monitors system resources
- Scans logs for common error patterns
- Provides specific fixes for each issue

**When to use:**
- When something isn't working right
- Before asking for help
- For routine health checks

## 🔧 Common Issues and Solutions

### Issue: "Internal Server Error" or Missing Buttons/Components
**Cause**: Multiple Next.js processes running
**Solution**: 
```bash
./scripts/kill-ports.sh
./scripts/start-dev-clean.sh
```

### Issue: Port 3000/8000 Already in Use
**Cause**: Previous server didn't shut down properly
**Solution**:
```bash
./scripts/check-ports.sh  # See what's using the port
./scripts/kill-ports.sh   # Kill the processes
```

### Issue: Next.js Build Errors or Stale UI
**Cause**: Corrupted cache
**Solution**:
```bash
rm -rf ../frontend-v2/.next
./scripts/start-dev-clean.sh
```

### Issue: "Cannot find module" Errors
**Cause**: Missing or corrupted dependencies
**Solution**:
```bash
cd ../frontend-v2
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Best Practices

1. **Always use `start-dev-clean.sh` for starting development**
   - It handles all the common issues automatically
   - Ensures a consistent development environment

2. **Run `diagnose-dev-issues.sh` when things go wrong**
   - Provides specific information about what's broken
   - Suggests targeted fixes

3. **Use tmux for better session management**
   - Install: `brew install tmux` (macOS) or `sudo apt install tmux` (Linux)
   - Keeps all services organized in one terminal

4. **Clean shutdown**
   - If using tmux: `Ctrl+C` in each window, then `tmux kill-session -t bookedbarber`
   - If not using tmux: `Ctrl+C` in the terminal or run `./scripts/kill-ports.sh`

## 🔍 Monitoring

While development servers are running:

**With tmux:**
- `tmux attach -t bookedbarber` - Attach to session
- `Ctrl+b, n` - Next window
- `Ctrl+b, p` - Previous window
- `Ctrl+b, d` - Detach (servers keep running)

**Without tmux:**
- Backend logs: `tail -f ../../backend.log`
- Frontend logs: `tail -f ../../frontend.log`

## 📝 Environment Variables

Make sure these files exist:
- `/backend-v2/.env` - Backend configuration
- `/backend-v2/frontend-v2/.env.local` - Frontend configuration

The scripts will create them from templates if missing, but you'll need to configure them.

## 🚨 Emergency Commands

If all else fails:

```bash
# Nuclear option - kill everything
pkill -f node
pkill -f npm  
pkill -f uvicorn
pkill -f python

# Clear all caches
rm -rf ../frontend-v2/.next
rm -rf ../frontend-v2/node_modules/.cache
find .. -name "__pycache__" -type d -exec rm -rf {} +

# Fresh start
./scripts/start-dev-clean.sh
```

## 💡 Tips

- The scripts use color-coded output:
  - 🟢 Green = Success
  - 🟡 Yellow = Warning
  - 🔴 Red = Error
  - 🔵 Blue = Information
  - 🔷 Cyan = Action

- Scripts are designed to be safe and won't delete any code
- They only clean temporary files and kill development processes
- Always check `diagnose-dev-issues.sh` output before running cleanup