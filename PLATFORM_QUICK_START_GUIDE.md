# 6FB Booking Platform - Quick Start Guide

Welcome to the Six Figure Barber Booking Platform! This guide will help you get started quickly with your deployed platform.

## 🌐 Platform URLs

- **Frontend**: `https://your-frontend-url.com`
- **Backend API**: `https://sixfb-backend.onrender.com`
- **API Documentation**: `https://sixfb-backend.onrender.com/docs`
- **Health Check**: `https://sixfb-backend.onrender.com/health`

## 🚀 Getting Started in 5 Minutes

### Step 1: Create Your Admin Account

1. **Via Render Shell** (Recommended):
   ```bash
   cd backend
   python scripts/create_admin_user.py
   ```

2. **Quick Command** (for testing):
   ```python
   python -c "from models.user import User; from passlib.context import CryptContext; from config.database import SessionLocal; db = SessionLocal(); pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); user = User(email='admin@yourdomain.com', first_name='Admin', last_name='User', hashed_password=pwd_context.hash('YourSecurePassword123!'), role='super_admin', is_active=True); db.add(user); db.commit(); print('Admin user created!')"
   ```

### Step 2: Load Initial Data

Run this in Render Shell to set up your services and locations:
```bash
cd backend
python scripts/load_initial_data.py
```

This will create:
- 10 default services (haircuts, beard trims, etc.)
- 2 sample locations
- Optional sample barber profiles

### Step 3: Access Admin Dashboard

1. Navigate to: `https://your-frontend-url.com/login`
2. Log in with your admin credentials
3. You'll see the admin dashboard with:
   - Analytics overview
   - Appointment management
   - Barber management
   - Client management
   - Settings

## 👨‍💼 Admin Functions

### Managing Barbers

1. **Add a Barber**:
   - Go to Dashboard → Barbers
   - Click "Add New Barber"
   - Fill in details and set working hours
   - Assign to a location

2. **Barber Permissions**:
   - View their own appointments
   - Update availability
   - Process payments (if enabled)

### Managing Services

1. **Add/Edit Services**:
   - Go to Settings → Services
   - Add service name, duration, price
   - Set category (haircut, beard, combo, etc.)
   - Enable/disable as needed

### Managing Locations

1. **Configure Locations**:
   - Go to Settings → Locations
   - Set business hours
   - Configure booking rules
   - Set timezone

## 💈 Barber Portal

### For Your Barbers:

1. **Login**: `https://your-frontend-url.com/barber/login`
2. **Features**:
   - View daily schedule
   - Manage appointments
   - Track earnings
   - Update availability
   - Sync with Google Calendar

### Onboarding New Barbers:

1. Create their account in admin panel
2. Send them login credentials
3. They complete profile setup
4. Connect Stripe account (for payments)
5. Set their working hours

## 🧑 Client Booking Flow

### Public Booking Page

Clients can book at: `https://your-frontend-url.com/book`

1. **Select Location** → Choose from available locations
2. **Select Service** → Pick service and see pricing
3. **Select Barber** → Choose preferred barber or "Any Available"
4. **Select Time** → Pick from available slots
5. **Enter Details** → Name, email, phone
6. **Confirm** → Review and book (payment if required)

### Booking Confirmation

Clients receive:
- Instant booking confirmation
- Email with details
- SMS reminder (if configured)
- Add to calendar option

## 📊 Analytics Dashboard

### Key Metrics:

1. **6FB Score**: Overall business performance (0-100)
2. **Revenue Tracking**:
   - Daily/weekly/monthly views
   - Service breakdown
   - Barber performance

3. **Client Insights**:
   - Retention rate
   - Booking patterns
   - Popular services

4. **Operational Metrics**:
   - Utilization rate
   - No-show rate
   - Average ticket value

## 🔧 Essential Configurations

### 1. Payment Setup (Stripe)

1. Log into Stripe Dashboard
2. Get your API keys
3. Add to Render environment variables:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
4. Configure webhook endpoint:
   ```
   https://sixfb-backend.onrender.com/api/v1/webhooks/stripe
   ```

### 2. Email Notifications (SendGrid)

1. Create SendGrid account
2. Verify sender domain
3. Create email templates
4. Add API key to Render:
   ```
   SENDGRID_API_KEY=SG...
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

### 3. SMS Notifications (Twilio)

1. Create Twilio account
2. Get phone number
3. Add credentials to Render:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1...
   ```

### 4. Google Calendar Sync

1. Create Google Cloud project
2. Enable Calendar API
3. Create OAuth2 credentials
4. Add to Render:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

## 📱 Mobile Experience

The platform is fully responsive:
- Clients can book on any device
- Barbers can manage schedule on tablets
- Admin dashboard works on mobile

## 🆘 Troubleshooting

### Common Issues:

1. **Can't log in**:
   - Check email/password
   - Verify account is active
   - Clear browser cache

2. **Bookings not showing**:
   - Refresh the page
   - Check date filters
   - Verify barber availability

3. **Email not sending**:
   - Check SendGrid configuration
   - Verify sender domain
   - Check spam folder

4. **Payment issues**:
   - Verify Stripe keys
   - Check webhook configuration
   - Review Stripe logs

### Getting Help:

1. **API Docs**: `https://sixfb-backend.onrender.com/docs`
2. **Logs**: Check Render dashboard logs
3. **Health Check**: `https://sixfb-backend.onrender.com/health`

## 🎯 Next Steps

1. **Week 1**:
   - [ ] Add all your barbers
   - [ ] Configure your services
   - [ ] Test the booking flow
   - [ ] Set up payment processing

2. **Week 2**:
   - [ ] Train your barbers
   - [ ] Configure email templates
   - [ ] Set up SMS reminders
   - [ ] Launch to select clients

3. **Month 1**:
   - [ ] Monitor analytics
   - [ ] Gather feedback
   - [ ] Optimize booking rules
   - [ ] Plan feature additions

## 💡 Pro Tips

1. **Set Working Hours Carefully**: Barber availability drives the booking calendar
2. **Use Buffer Times**: Add 5-10 min between appointments for cleanup
3. **Monitor No-Shows**: Use deposits for chronic no-show clients
4. **Leverage Analytics**: Check your 6FB score weekly
5. **Automate Reminders**: Reduce no-shows with SMS/email reminders

## 🎉 Launch Checklist

Before going live:
- [ ] Admin account created
- [ ] Services configured with accurate pricing
- [ ] At least one location active
- [ ] At least one barber available
- [ ] Test booking works end-to-end
- [ ] Payment processing tested (if using)
- [ ] Email notifications working
- [ ] Custom domain configured

---

**Ready to grow your barbershop to six figures? Let's get started!** 💈✨

For technical support, check the [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md) or [API Documentation](https://sixfb-backend.onrender.com/docs).
