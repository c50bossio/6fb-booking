# Deploy New Clean Version Alongside Existing System

This guide will help you deploy the new clean version without touching your existing production system.

## Step 1: Deploy Backend-v2 to Render

### 1.1 Create New Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (same repo is fine)
4. Configure the new service:
   ```
   Name: 6fb-backend-v2
   Root Directory: backend-v2
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### 1.2 Create New Database

1. Click **"New +"** → **"PostgreSQL"**
2. Configure:
   ```
   Name: 6fb-v2-db
   Database: sixfb_v2
   User: sixfb_v2_user
   ```
3. Wait for database to be created
4. Copy the "Internal Database URL"

### 1.3 Configure Environment Variables

In your new backend service, add these environment variables:

```bash
DATABASE_URL=<paste-internal-database-url-from-step-1.2>
SECRET_KEY=<generate-new-one-below>
STRIPE_SECRET_KEY=<your-existing-stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<your-existing-stripe-publishable-key>
ALLOWED_ORIGINS=http://localhost:3000,https://6fb-frontend-v2.vercel.app
ENVIRONMENT=production
```

To generate a new SECRET_KEY:
```bash
openssl rand -hex 32
```

### 1.4 Deploy and Initialize

1. Click **"Create Web Service"**
2. Wait for first deployment (~5 minutes)
3. Once deployed, go to **"Shell"** tab and run:
   ```bash
   # Create database tables
   python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
   
   # Create admin user
   python create_admin_user.py
   ```
4. Note your backend URL: `https://6fb-backend-v2.onrender.com`

## Step 2: Deploy Frontend-v2 to Vercel

### 2.1 Install Vercel CLI (if needed)
```bash
npm i -g vercel
```

### 2.2 Deploy Frontend

```bash
cd frontend-v2
vercel
```

When prompted:
1. Set up and deploy: **Y**
2. Which scope: Select your account
3. Link to existing project: **N** (create new)
4. Project name: **6fb-frontend-v2**
5. Directory: **./** (current directory)
6. Override settings: **N**

### 2.3 Configure Environment Variables

When deployment finishes, set production environment variables:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://6fb-backend-v2.onrender.com

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production  
# Enter: your-stripe-publishable-key
```

### 2.4 Redeploy with Environment Variables

```bash
vercel --prod
```

Note your frontend URL: `https://6fb-frontend-v2.vercel.app`

## Step 3: Update CORS on Backend

1. Go to Render Dashboard → Your Backend-v2 Service
2. Click **"Environment"** tab
3. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   http://localhost:3000,https://6fb-frontend-v2.vercel.app
   ```
4. Save (service will auto-redeploy)

## Step 4: Test Your New System

### 4.1 Basic Tests

1. **Visit Frontend**: https://6fb-frontend-v2.vercel.app
2. **Login**: admin@6fb.com / admin123
3. **Book Appointment**:
   - Click "Book Appointment"
   - Select service
   - Pick date and time
   - Pay with test card: 4242 4242 4242 4242
4. **View Dashboard**: Should see your booking

### 4.2 API Health Check

```bash
# Check backend health
curl https://6fb-backend-v2.onrender.com/health

# Check API docs
open https://6fb-backend-v2.onrender.com/docs
```

## Step 5: Compare with Existing System

Now you have both systems running:

| Component | Old System | New System |
|-----------|------------|------------|
| Backend | 6fb-backend.onrender.com | 6fb-backend-v2.onrender.com |
| Frontend | Your existing URL | 6fb-frontend-v2.vercel.app |
| Database | Existing DB | Fresh new DB |
| Code | 100,000+ lines | <2,000 lines |

## Step 6: Testing Checklist

- [ ] Can create account
- [ ] Can login/logout
- [ ] Can view available time slots
- [ ] Can book appointment
- [ ] Can process payment
- [ ] Can view bookings in dashboard
- [ ] Mobile responsive
- [ ] Fast page loads (<100ms)
- [ ] No console errors

## Step 7: Load Testing (Optional)

```bash
# Simple load test
ab -n 100 -c 10 https://6fb-backend-v2.onrender.com/health
```

## Migration Options (When Ready)

### Option A: Gradual Migration
1. Add "Try New Version" link on old system
2. Run both for a while
3. Migrate users gradually

### Option B: Data Migration
```python
# Sample migration script
# Copy critical data from old to new system
# See migrate_users.py example
```

### Option C: Full Switch
1. Export data from old system
2. Import to new system
3. Update DNS/domains
4. Redirect old URLs

## Monitoring

### Render Dashboard
- Real-time logs
- CPU/Memory usage
- Request metrics

### Vercel Dashboard  
- Deployment status
- Function logs
- Analytics

## Rollback Plan

If anything goes wrong:
1. Your old system is untouched
2. Just stop using the v2 URLs
3. No data loss risk

## Success Metrics

The new system should be:
- ✅ 10x faster (page loads <100ms)
- ✅ 95% less code
- ✅ Zero provider nesting
- ✅ No WebSocket issues
- ✅ Clean error messages
- ✅ Simple to understand

## Questions?

Your new clean system is now running alongside the old one. Test thoroughly and switch when ready!