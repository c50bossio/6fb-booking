# Deploying the Clean Version to Your Existing Infrastructure

Since you already have Render and Railway set up, here's how to deploy the new clean version:

## Option 1: Deploy Alongside Existing (Recommended for Testing)

### Backend on Render
1. Create a **new** Render web service:
   - Name it something like `6fb-backend-v2`
   - Point to the `backend-v2` directory
   - This lets you test without breaking the existing system

2. Create a **new** PostgreSQL database:
   - Name: `6fb-v2-db`
   - Keep your existing database untouched

3. Environment variables for the new service:
   ```
   DATABASE_URL=<new-database-url>
   SECRET_KEY=<generate-new-one>
   STRIPE_SECRET_KEY=<your-existing-key>
   STRIPE_PUBLISHABLE_KEY=<your-existing-key>
   ALLOWED_ORIGINS=https://your-frontend-v2.vercel.app
   ```

### Frontend on Vercel/Railway
1. Deploy frontend-v2 as a new app:
   ```bash
   cd frontend-v2
   vercel --prod  # Creates new Vercel app
   ```
   
2. Set environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://6fb-backend-v2.onrender.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-key>
   ```

## Option 2: Replace Existing Deployment

### If you want to completely replace the old system:

1. **Backup existing data first**:
   ```sql
   -- Connect to your existing database
   pg_dump your_existing_db > backup_$(date +%Y%m%d).sql
   ```

2. **Update your existing Render service**:
   - Change root directory from `backend` to `backend-v2`
   - Update build command: `pip install -r requirements.txt`
   - Update start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Keep existing DATABASE_URL to preserve data

3. **Deploy frontend**:
   - If using Railway for frontend, update to point to `frontend-v2`
   - If using Vercel, create new deployment or update existing

## Database Migration Strategy

Since the new system has simpler models, you have two options:

### Option A: Fresh Start (Recommended)
- Use new database
- Manually migrate critical data only
- Start clean without legacy issues

### Option B: Migrate Existing Data
```python
# Create a migration script: migrate_data.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Connect to old database
old_engine = create_engine(os.getenv("OLD_DATABASE_URL"))
OldSession = sessionmaker(bind=old_engine)

# Connect to new database  
new_engine = create_engine(os.getenv("DATABASE_URL"))
NewSession = sessionmaker(bind=new_engine)

# Migrate users
old_session = OldSession()
new_session = NewSession()

# Example: Migrate users
old_users = old_session.execute("SELECT email, first_name, last_name, hashed_password FROM users WHERE is_active = true")
for user in old_users:
    new_session.execute(
        "INSERT INTO users (email, full_name, hashed_password, role) VALUES (:email, :name, :password, 'user')",
        {
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}",
            "password": user.hashed_password
        }
    )
new_session.commit()
```

## Quick Deployment Commands

### For Render (if you have Render CLI):
```bash
# Deploy backend
cd backend-v2
render up

# The CLI will ask you to select/create services
```

### For Railway:
```bash
# Deploy backend
cd backend-v2
railway up

# Deploy frontend
cd ../frontend-v2
railway up
```

## Testing the New Deployment

1. **Health Check**:
   ```bash
   curl https://your-backend-v2.onrender.com/health
   ```

2. **Create Admin User**:
   ```bash
   # In Render/Railway console
   python create_admin_user.py
   ```

3. **Test Login**:
   - Go to your new frontend URL
   - Login with admin@6fb.com / admin123
   - Test booking flow

## Switching Traffic

Once you've tested and are ready to switch:

1. **Update DNS** (if using custom domain):
   - Point domain to new frontend
   - Update API domain to new backend

2. **Update Frontend Environment**:
   - Change `NEXT_PUBLIC_API_URL` to new backend

3. **Monitor for Issues**:
   - Watch logs in Render/Railway dashboard
   - Check for any 500 errors
   - Monitor successful bookings

## Rollback Plan

If something goes wrong:

1. **Quick Rollback**:
   - Render: Use "Rollback" button in dashboard
   - Railway: Redeploy previous commit

2. **DNS Rollback**:
   - Point domains back to old services

The beauty of deploying alongside is you can test thoroughly before switching!