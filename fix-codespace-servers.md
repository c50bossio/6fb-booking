# Fix Codespace Development Servers

## Issue Detected
Your Codespace shows "Services Down" because the development servers aren't running.

## Quick Fix Commands (Run in your Codespace)

### Option 1: Docker Development (Recommended)
```bash
# In your Codespace terminal
cd /workspaces/6fb-barber-onboarding/backend-v2
./docker-dev-start.sh
```

### Option 2: Manual Server Startup
```bash
# Start backend
cd /workspaces/6fb-barber-onboarding/backend-v2
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &

# Start frontend (new terminal)
cd /workspaces/6fb-barber-onboarding/backend-v2/frontend-v2
npm run dev
```

### Option 3: Use the suggested command
```bash
# From the error message
npm run dev:clean
```

## Expected Result
After running the commands, the health box should show:
- Green checkmarks ✅
- "0ms" response times
- "Last check: [current time]"

## If Still Having Issues
1. Check container status: `docker ps`
2. View logs: `docker-compose logs`
3. Check ports: `curl localhost:8000/health`