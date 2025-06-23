# 🚨 RENDER DEPLOYMENT QUICK FIX GUIDE

## IMMEDIATE STEPS TO GET DEPLOYED (10 minutes)

### Option 1: Use the Fixed Dockerfile (RECOMMENDED)
1. In Render Dashboard:
   - Go to your service settings
   - Change Docker Path to: `./backend/Dockerfile.render`
   - Click "Save Changes"
   - Trigger manual deploy

### Option 2: Quick Dashboard Fixes
1. **Environment Variables** - Add these NOW in Render Dashboard:
   ```
   PYTHONPATH=/app
   PORT=8000
   ENVIRONMENT=production
   JWT_SECRET_KEY=your-secret-key-here
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CORS_ORIGINS=*
   ```

2. **Start Command** - Change to:
   ```bash
   ./start-render.sh
   ```
   Or if that fails:
   ```bash
   sh -c "python main.py || uvicorn main:app --host 0.0.0.0 --port 8000"
   ```

### Option 3: Render Shell Emergency Fix
1. Open Render Shell from dashboard
2. Run these commands:
   ```bash
   # Download and run patch script
   curl -O https://raw.githubusercontent.com/yourusername/6fb-booking/main/backend/render-patch.py
   python render-patch.py

   # Or manually:
   pip install uvicorn[standard] fastapi sqlalchemy
   export PYTHONPATH=/app
   python main.py
   ```

### Option 4: Manual Build Command Override
In Render Dashboard, set:
- **Build Command**:
  ```bash
  pip install -r requirements.txt && chmod +x start-render.sh
  ```
- **Start Command**:
  ```bash
  ./start-render.sh
  ```

### Option 5: Use render.yaml (Blueprint)
1. Copy the `render.yaml` to your repo root
2. In Render Dashboard:
   - New > Blueprint
   - Connect your repo
   - It will auto-configure everything

## EMERGENCY FALLBACK
If nothing works, create a minimal service:
1. In Render Shell:
   ```bash
   cat > emergency_start.py << 'EOF'
   from fastapi import FastAPI
   import uvicorn
   import os

   app = FastAPI()

   @app.get("/")
   def root():
       return {"status": "running", "message": "6FB Booking Backend"}

   @app.get("/health")
   def health():
       return {"status": "healthy"}

   if __name__ == "__main__":
       port = int(os.environ.get("PORT", 8000))
       uvicorn.run(app, host="0.0.0.0", port=port)
   EOF

   python emergency_start.py
   ```

## DATABASE URL FIX
If you see database errors:
1. In Environment Variables, ensure DATABASE_URL starts with `postgresql://` not `postgres://`
2. Or add this env var:
   ```
   DATABASE_URL_OVERRIDE=postgresql://...your-connection-string...
   ```

## VERIFICATION
Once deployed, test:
```bash
curl https://your-app.onrender.com/health
```

## NEXT STEPS AFTER DEPLOYMENT
1. Monitor logs for any errors
2. Test all API endpoints
3. Set up proper monitoring
4. Configure custom domain if needed

---
**Need more help?** The patch script (`render-patch.py`) will diagnose and fix most issues automatically!
