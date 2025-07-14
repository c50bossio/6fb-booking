# BookedBarber V2 - Staging Environment Guide

## 🎯 Overview

The staging environment allows you to test BookedBarber V2 with live customers while maintaining a separate development environment. This setup enables real-world testing and client demonstrations without affecting your development work.

## 🚀 Quick Start

### Start Staging Environment
```bash
./start-staging-environment.sh
```

### Check Status
```bash
./check-staging-status.sh
```

### Stop Staging Environment
```bash
./stop-staging-environment.sh
```

## 📊 Environment Details

### Ports
- **Backend**: `localhost:8001`
- **Frontend**: `localhost:3001`
- **API Documentation**: `localhost:8001/docs`

### Database
- **File**: `staging_6fb_booking.db`
- **Type**: SQLite (optimized for staging)
- **Size**: ~1.8MB with test data

### Configuration Files
- **Backend**: `.env.staging`
- **Frontend**: `frontend-v2/.env.staging`

## 🔐 Test Accounts

All accounts use password: `staging123!`

### Admin Accounts
- `admin@staging.bookedbarber.com` - Super Admin
- `owner@staging.bookedbarber.com` - Shop Owner

### Staff Accounts
- `barber@staging.bookedbarber.com` - Barber
- `barber1@staging.bookedbarber.com` - Barber 1
- `barber2@staging.bookedbarber.com` - Barber 2
- `barber3@staging.bookedbarber.com` - Barber 3

### Client Accounts
- `client@staging.bookedbarber.com` - Client
- `client1@staging.bookedbarber.com` - Client 1
- `client2@staging.bookedbarber.com` - Client 2
- `client3@staging.bookedbarber.com` - Client 3

## 🛠️ Management Scripts

### Primary Scripts
- `start-staging-environment.sh` - Start complete staging environment
- `stop-staging-environment.sh` - Stop staging environment
- `check-staging-status.sh` - Check environment status
- `troubleshoot-staging.sh` - Diagnose and fix issues
- `reset-staging-database.sh` - Reset database with fresh data

### Individual Component Scripts
- `start-staging-backend.sh` - Start backend only
- `frontend-v2/start-staging-frontend.sh` - Start frontend only

## 🔧 Configuration

### Backend Environment (.env.staging)
```env
ENVIRONMENT=staging
DATABASE_URL=sqlite:///./staging_6fb_booking.db
PORT=8001
FRONTEND_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
```

### Frontend Environment (frontend-v2/.env.staging)
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_DEMO_MODE=true
```

## 💳 Payment Processing

### Stripe Configuration
- **Mode**: Test mode (safe for staging)
- **Payment Processing**: Fully functional with test cards
- **Webhook Endpoint**: `localhost:8001/api/v1/webhooks/stripe`

### Test Cards
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires 3D Secure**: `4000 0027 6000 3184`

## 📱 Features Available

### Core Features
- ✅ User authentication and registration
- ✅ Appointment booking and management
- ✅ Payment processing with Stripe
- ✅ Calendar integration
- ✅ SMS/Email notifications
- ✅ Business analytics
- ✅ Marketing automation
- ✅ Review management
- ✅ Multi-user role support

### Staging-Specific Features
- ✅ Demo mode indicators
- ✅ Test data visualization
- ✅ Debug panels
- ✅ Enhanced logging
- ✅ Staging banner

## 🌐 External Services

### Configured Services
- **Stripe**: Test mode payment processing
- **Email**: SendGrid (staging configuration)
- **SMS**: Twilio (staging configuration)
- **Calendar**: Google Calendar (staging OAuth)
- **Analytics**: Google Analytics (staging ID)

### Service Endpoints
- **Google My Business**: Staging OAuth flow
- **Meta Pixel**: Staging pixel tracking
- **Conversion Tracking**: Test conversion events

## 📈 Performance & Monitoring

### Resource Usage
- **Memory**: ~200MB (backend + frontend)
- **CPU**: Low usage during normal operation
- **Disk**: 1.8MB database size

### Monitoring
- **Health Check**: `localhost:8001/health`
- **API Status**: `localhost:8001/docs`
- **Frontend Status**: `localhost:3001`

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
./stop-staging-environment.sh
./troubleshoot-staging.sh --fix
```

#### Database Issues
```bash
./reset-staging-database.sh
```

#### Configuration Problems
```bash
./troubleshoot-staging.sh
```

#### Process Management
```bash
# Check what's running
./check-staging-status.sh

# Kill all staging processes
./stop-staging-environment.sh

# Clean restart
./start-staging-environment.sh
```

### Log Locations
- **Backend Logs**: tmux session `staging:backend`
- **Frontend Logs**: tmux session `staging:frontend`
- **Combined Logs**: tmux session `staging:monitor`

### Debug Mode
```bash
# Enable debug logging
export DEBUG=true

# Start with verbose output
./start-staging-environment.sh
```

## 🚀 Production Readiness

### From Staging to Production
1. **Test thoroughly** in staging environment
2. **Validate all features** with real user workflows
3. **Check payment processing** with test transactions
4. **Verify external integrations** (email, SMS, calendar)
5. **Scale to production** infrastructure when ready

### Production Deployment
- **Database**: Migrate to PostgreSQL
- **Infrastructure**: Cloud hosting (Railway, Render, etc.)
- **SSL**: Enable HTTPS
- **Monitoring**: Production-grade monitoring
- **Backup**: Automated backup strategy

## 📋 Development Workflow

### Parallel Development
1. **Development**: `localhost:3000/8000`
2. **Staging**: `localhost:3001/8001`
3. **Switch contexts** as needed

### Feature Testing
1. **Develop** in development environment
2. **Test** in staging environment
3. **Demo** to clients in staging
4. **Deploy** to production when ready

### Database Management
- **Development**: `6fb_booking.db`
- **Staging**: `staging_6fb_booking.db`
- **Isolated data** for testing

## 🌟 Best Practices

### Development
- Keep staging environment running during client demos
- Use staging for integration testing
- Test payment flows with staging Stripe keys
- Validate email/SMS flows with staging services

### Security
- Use test API keys in staging
- Don't store sensitive data in staging
- Regular security updates
- Monitor staging logs for issues

### Performance
- Monitor resource usage
- Optimize database queries
- Test under load
- Profile application performance

## 📞 Support

### Getting Help
1. **Check logs** in tmux sessions
2. **Run troubleshooter** `./troubleshoot-staging.sh`
3. **Review configuration** files
4. **Test connectivity** with curl commands

### Emergency Recovery
```bash
# Complete reset
./stop-staging-environment.sh
./reset-staging-database.sh
./start-staging-environment.sh
```

---

## 📝 Summary

The staging environment provides a complete BookedBarber V2 platform ready for:
- ✅ **Real customer bookings** and payments
- ✅ **Client demonstrations** and testing
- ✅ **Feature validation** before production
- ✅ **Integration testing** with external services
- ✅ **Performance testing** under load

**Ready for immediate use with live customers!**

Last Updated: 2025-07-14
Version: BookedBarber V2 Staging Environment v1.0