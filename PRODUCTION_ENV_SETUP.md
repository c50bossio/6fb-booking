# Production Environment Setup Guide

## Required Environment Variables

### Backend (backend-v2/.env.production)

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Security
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# CORS (add your frontend domains)
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com

# Optional
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Frontend (frontend-v2/.env.production)

```env
# API URL (your backend URL)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Optional
NEXT_PUBLIC_APP_NAME="6FB Booking"
```

## Step-by-Step Deployment

### 1. Deploy Backend First (Render)

1. Fork/push the code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Name**: `6fb-booking-backend`
   - **Root Directory**: `backend-v2`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - Click "Environment" tab
   - Add each variable from the backend .env.production above
   - Generate SECRET_KEY: `openssl rand -hex 32`
7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)
9. Note your backend URL: `https://your-app.onrender.com`

### 2. Create Database (Render)

1. In Render Dashboard, click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `6fb-booking-db`
   - **Database**: `sixfb`
   - **User**: `sixfb_user`
   - **Region**: Same as your backend
   - **Plan**: Free tier is fine to start
3. Click "Create Database"
4. Copy the Internal Database URL
5. Go to your backend service → Environment
6. Update DATABASE_URL with the Internal Database URL

### 3. Deploy Frontend (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Go to frontend-v2 directory: `cd frontend-v2`
3. Run: `vercel`
4. Follow prompts:
   - Login/create account
   - Confirm project settings
   - Set as production deployment
5. When prompted for environment variables, add:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
6. Deployment will complete in 2-3 minutes
7. Note your frontend URL: `https://your-app.vercel.app`

### 4. Update CORS Settings

1. Go to Render Dashboard → Your Backend Service
2. Click "Environment" tab
3. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://your-app.vercel.app
   ```
4. Backend will auto-redeploy

### 5. Initialize Database

1. In Render Dashboard → Your Backend Service
2. Click "Shell" tab
3. Run:
   ```bash
   python
   >>> from database import engine
   >>> from models import Base
   >>> Base.metadata.create_all(bind=engine)
   >>> exit()
   ```
4. Create admin user:
   ```bash
   python create_admin_user.py
   ```

### 6. Test Your Deployment

1. Visit your frontend URL
2. Login with admin@6fb.com / admin123
3. Try booking an appointment
4. Use test card: 4242 4242 4242 4242

## Custom Domain Setup

### Frontend (Vercel)
1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `booking.yourdomain.com`)
3. Follow DNS configuration instructions

### Backend (Render)
1. In Render Dashboard → Your Service → Settings
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Configure DNS as instructed

## Monitoring & Logs

### Backend Logs (Render)
- Dashboard → Your Service → Logs
- Real-time logging available

### Frontend Logs (Vercel)
- Dashboard → Your Project → Functions → Logs
- Client-side errors in browser console

## Troubleshooting

### CORS Errors
- Ensure ALLOWED_ORIGINS includes your frontend URL
- Check for trailing slashes
- Verify protocol (http vs https)

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check if database is running (Render Dashboard)
- Ensure same region for backend and database

### Authentication Issues
- Verify SECRET_KEY is set correctly
- Check token expiration (15 minutes)
- Ensure frontend is sending Authorization header

### Payment Issues
- Verify Stripe keys (test vs live)
- Check webhook configuration if using webhooks
- Ensure HTTPS for production

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong SECRET_KEY (32+ characters)
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Set up proper CORS origins
- [ ] Use production Stripe keys
- [ ] Enable rate limiting if needed
- [ ] Set up monitoring/alerts
- [ ] Regular backups of database

## Scaling Considerations

### When you need to scale:
- **Backend**: Upgrade Render plan for more resources
- **Database**: Upgrade to paid PostgreSQL plan
- **Frontend**: Vercel auto-scales

### Performance optimizations:
- Enable caching headers
- Use CDN for static assets
- Optimize database queries
- Add Redis for session storage (later)

## Support

- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Stripe**: https://stripe.com/docs

This setup will handle thousands of bookings per day on the free tiers!