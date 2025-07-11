# BookBarber.com Deployment Guide 🚀

## Overview
This guide will help you deploy the BookBarber platform to your custom domain `bookbarber.com`. The platform is now configured for production deployment.

## ✅ What's Already Configured

### Frontend Configuration
- ✅ **Domain**: Configured for `bookbarber.com`
- ✅ **Environment Variables**: Production settings in `.env.production`
- ✅ **Next.js Config**: Optimized for production deployment
- ✅ **Security Headers**: CSP and security headers configured
- ✅ **Image Optimization**: Domain allowlist updated

### Backend Configuration
- ✅ **Deployment Script**: Complete production deployment script (`backend-v2/deploy.sh`)
- ✅ **Environment Template**: Ready for production configuration
- ✅ **Database Setup**: Automated migration and setup
- ✅ **SSL Ready**: Nginx and SSL certificate automation

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Frontend)
**Pros**: Easy setup, automatic SSL, great Next.js integration
**Best for**: Frontend hosting with serverless backend

#### Steps:
1. **Connect to Vercel**:
   ```bash
   npm install -g vercel
   cd frontend
   vercel login
   vercel --prod
   ```

2. **Configure Custom Domain**:
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add `bookbarber.com` and `www.bookbarber.com`
   - Configure DNS as instructed by Vercel

3. **Environment Variables**:
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.production`
   - **IMPORTANT**: Update Stripe keys to production values

### Option 2: Render (Full Stack)
**Pros**: Can host both frontend and backend, PostgreSQL included
**Best for**: Complete stack deployment

#### Frontend Deployment:
1. **Connect GitHub to Render**
2. **Create Static Site**:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `backend-v2/frontend-v2/out` or `backend-v2/frontend-v2/.next`
   - Custom Domain: `bookbarber.com`

#### Backend Deployment:
1. **Create Web Service**:
   - Runtime: Python 3
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Custom Domain: `api.bookbarber.com`

### Option 3: DigitalOcean/AWS/VPS
**Pros**: Full control, custom configuration
**Best for**: Enterprise deployment with custom requirements

#### Using the Automated Script:
```bash
cd backend
chmod +x deploy.sh
DOMAIN=bookbarber.com ./deploy.sh
```

## 🔧 DNS Configuration

### Required DNS Records:
```
# Main domain
A     bookbarber.com          → Your-Server-IP
A     www.bookbarber.com      → Your-Server-IP

# API subdomain (if separate)
A     api.bookbarber.com      → Your-Backend-Server-IP

# Email (optional)
MX    bookbarber.com          → Your-Email-Provider
TXT   bookbarber.com          → "v=spf1 include:your-email-provider.com ~all"
```

### Cloudflare Configuration (Recommended):
1. **Add Domain to Cloudflare**
2. **Update Nameservers** at your domain registrar
3. **SSL Settings**: Full (Strict)
4. **Always Use HTTPS**: On
5. **HSTS**: Enabled

## 🔐 Security Checklist

### Production Keys Required:
```bash
# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# JWT Secret (Generate new for production)
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")

# Database URL (Production)
DATABASE_URL=postgresql://user:pass@host:5432/bookbarber_prod
```

### Security Headers Verification:
- ✅ HTTPS enforced
- ✅ CSP headers configured
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy configured

## 📧 Email Configuration

### Recommended Providers:
1. **SendGrid** (Recommended):
   ```bash
   SMTP_SERVER=smtp.sendgrid.net
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=your_sendgrid_api_key
   FROM_EMAIL=noreply@bookbarber.com
   ```

2. **Mailgun**:
   ```bash
   SMTP_SERVER=smtp.mailgun.org
   SMTP_USERNAME=your_mailgun_username
   SMTP_PASSWORD=your_mailgun_password
   FROM_EMAIL=noreply@bookbarber.com
   ```

## 🔍 Monitoring & Analytics

### Recommended Integrations:
1. **Google Analytics**:
   ```bash
   NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
   ```

2. **Sentry (Error Tracking)**:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project
   ```

3. **PostHog (Product Analytics)**:
   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=phc_your_key
   ```

## 🧪 Testing Your Deployment

### Frontend Tests:
```bash
# Check if site loads
curl -I https://bookbarber.com

# Check security headers
curl -I https://bookbarber.com | grep -E "(X-Frame|X-Content|CSP)"

# Check SSL
curl -I https://bookbarber.com | grep -i "strict-transport"
```

### Backend Tests:
```bash
# Health check
curl https://api.bookbarber.com/health

# API documentation
curl https://api.bookbarber.com/docs

# Stripe webhook
curl -X POST https://api.bookbarber.com/api/v1/webhooks/stripe
```

## 🚀 Go-Live Checklist

### Pre-Launch:
- [ ] Domain DNS configured and propagated
- [ ] SSL certificate active
- [ ] Production environment variables set
- [ ] Stripe production keys configured
- [ ] Email service configured and tested
- [ ] Database migrations applied
- [ ] Security headers verified
- [ ] Error tracking configured

### Post-Launch:
- [ ] Monitor logs for errors
- [ ] Test complete booking flow
- [ ] Verify payment processing
- [ ] Test email notifications
- [ ] Check analytics tracking
- [ ] Set up automated backups
- [ ] Configure monitoring alerts

## 🔧 Maintenance Commands

### Update Deployment:
```bash
# Frontend (Vercel)
cd frontend && vercel --prod

# Backend (if using VPS)
cd backend && git pull && ./deploy.sh
```

### Database Backup:
```bash
cd backend && ./backup.sh
```

### View Logs:
```bash
# Production logs
sudo journalctl -u bookbarber-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

## 🆘 Support & Troubleshooting

### Common Issues:

1. **Domain Not Resolving**:
   - Check DNS propagation: `dig bookbarber.com`
   - Verify nameservers with registrar

2. **SSL Certificate Issues**:
   - Check certificate status: `curl -I https://bookbarber.com`
   - Renew Let's Encrypt: `sudo certbot renew`

3. **API Connection Issues**:
   - Verify backend is running: `sudo systemctl status bookbarber-api`
   - Check CORS settings in backend configuration

4. **Payment Issues**:
   - Verify Stripe webhook URL: `https://bookbarber.com/api/v1/webhooks/stripe`
   - Check Stripe dashboard for webhook status

### Emergency Rollback:
```bash
# If issues occur, quickly rollback to previous version
git checkout previous-stable-commit
./deploy.sh
```

---

## 🎉 Congratulations!

Your BookBarber platform is now configured for production deployment at `bookbarber.com`!

**Next Steps**:
1. Choose your deployment method above
2. Configure DNS and SSL
3. Update production API keys
4. Test thoroughly before go-live
5. Set up monitoring and alerts

**Need Help?** Contact support at the email configured in your environment variables.
