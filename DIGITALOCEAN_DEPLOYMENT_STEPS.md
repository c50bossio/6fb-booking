# DigitalOcean Deployment Steps for 6FB Platform

## 📋 Pre-Flight Checklist

- [x] Generated secure production keys
- [x] Created .env.production file
- [x] Created app.yaml deployment config
- [ ] Create DigitalOcean account
- [ ] Push code to GitHub
- [ ] Get Stripe production keys

## 🚀 Step-by-Step Deployment

### 1. Create DigitalOcean Account
1. Go to https://www.digitalocean.com
2. Sign up (you'll get $200 credit for 60 days)
3. Verify your email
4. Add payment method (won't be charged during credit period)

### 2. Push Your Code to GitHub
```bash
# Initialize git if not already done
cd /Users/bossio/6fb-booking
git init
git add .
git commit -m "Initial commit - 6FB Platform ready for deployment"

# Create repository on GitHub
# Go to https://github.com/new
# Name: 6fb-booking
# Private repository recommended

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/6fb-booking.git
git branch -M main
git push -u origin main
```

### 3. Create App in DigitalOcean

#### Option A: Using the Web Interface (Easier)
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Choose "GitHub" as source
4. Authorize DigitalOcean to access your GitHub
5. Select your `6fb-booking` repository
6. DigitalOcean will auto-detect the Dockerfiles
7. Review the app components:
   - Backend service
   - Frontend service
   - PostgreSQL database
   - Redis database
8. Click "Next" through the screens
9. On the "Environment Variables" screen, add these for the backend:
   ```
   STRIPE_SECRET_KEY=sk_live_... (your production key)
   STRIPE_PUBLISHABLE_KEY=pk_live_... (your production key)
   ```
10. Review and click "Create Resources"

#### Option B: Using the CLI
```bash
# Install DigitalOcean CLI
brew install doctl  # macOS
# or download from: https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init
# Enter your API token from: https://cloud.digitalocean.com/account/api/tokens

# Create the app
cd /Users/bossio/6fb-booking
doctl apps create --spec deploy/app.yaml

# Get your app ID
doctl apps list

# Deploy
doctl apps create-deployment [APP-ID]
```

### 4. Configure Your Domain

1. In DigitalOcean App Platform:
   - Go to Settings → Domains
   - Add domain: `6fbmentorship.com`
   - Add domain: `www.6fbmentorship.com`

2. DigitalOcean will show you DNS records like:
   ```
   Type: CNAME
   Name: @
   Value: your-app.ondigitalocean.app
   ```

3. At your domain registrar (GoDaddy, Namecheap, etc.):
   - Add the CNAME records
   - Or point nameservers to DigitalOcean:
     - ns1.digitalocean.com
     - ns2.digitalocean.com
     - ns3.digitalocean.com

4. Wait 15-30 minutes for DNS propagation

### 5. Post-Deployment Setup

Once deployed, you need to:

1. **Initialize the database:**
```bash
# Get your app ID
doctl apps list

# Open console to backend
doctl apps console [APP-ID] --component backend

# In the console:
cd /app
alembic upgrade head
python scripts/create_admin.py
```

2. **Configure Stripe Webhooks:**
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://6fbmentorship.com/api/webhooks/stripe`
   - Select events:
     - payment_intent.succeeded
     - payment_intent.failed
     - customer.subscription.created
     - customer.subscription.updated
     - customer.subscription.deleted
   - Copy the webhook secret
   - Update in DigitalOcean app environment variables

3. **Test Everything:**
   - Visit https://6fbmentorship.com
   - Login with admin credentials
   - Send a test email
   - Process a test payment
   - Create a test appointment

### 6. Monitor Your App

1. **DigitalOcean Dashboard:**
   - https://cloud.digitalocean.com/apps/[APP-ID]
   - View logs, metrics, alerts

2. **Set up alerts:**
   - App Platform → Settings → Alerts
   - Enable email notifications

3. **View logs:**
```bash
doctl apps logs [APP-ID] --follow
```

## 🎉 Launch Checklist

- [ ] Site loads at https://6fbmentorship.com
- [ ] SSL certificate active (padlock icon)
- [ ] Admin login works
- [ ] Email sending works
- [ ] Payment processing works (test mode first)
- [ ] Database backups enabled
- [ ] Monitoring alerts configured

## 📞 Need Help?

1. **DigitalOcean Support**: Available 24/7 via chat
2. **Check logs**: `doctl apps logs [APP-ID]`
3. **Common issues**:
   - Database connection: Check DATABASE_URL format
   - Domain not working: Wait for DNS propagation
   - App not starting: Check logs for errors

## 🚀 You're Live!

Once everything is working:
1. Switch Stripe to live mode
2. Remove any test data
3. Start onboarding your first barbershops!

Remember to monitor costs - you have $200 credit for 60 days.
