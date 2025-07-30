# 🚀 Quick Sentry Setup for BookedBarber V2

## 🎯 **3-Minute Setup Process**

I've prepared everything for you! Just follow these 3 simple steps:

### **Step 1: Run the Setup Script** ⚡
```bash
cd /Users/bossio/6fb-booking/backend-v2
./scripts/complete-sentry-setup.sh
```

### **Step 2: Choose Authentication Method** 🔐
The script will ask:
```
🔐 Sentry Authentication Options:
1. Interactive login (opens browser)
2. Provide auth token directly

Choose option (1 or 2):
```

**Choose Option 1** (recommended) - it opens your browser automatically!

### **Step 3: Done!** ✅
The script automatically:
- ✅ Creates "BookedBarber Backend" project
- ✅ Creates "BookedBarber Frontend" project  
- ✅ Gets both DSNs
- ✅ Updates `.env` and `frontend-v2/.env.local`
- ✅ Tests the integration
- ✅ Sends test event to verify it works

## 🛠 **What I've Built for You**

### **Complete Sentry Infrastructure:**
1. **Advanced Configuration** (`config/sentry.py`):
   - FastAPI + SQLAlchemy + Redis + Celery integrations
   - Business-specific error categorization
   - Custom performance monitoring
   - Payment and booking error tracking

2. **Automated Setup Scripts**:
   - `scripts/complete-sentry-setup.sh` - Full automated setup
   - `scripts/setup-sentry.sh` - Original comprehensive setup
   - `scripts/demo-sentry-setup.sh` - Demo of the process

3. **Environment Templates**:
   - Backend `.env` configuration ready
   - Frontend `.env.local` configuration ready
   - All sample rates and settings optimized

### **Monitoring Features Ready:**
- 🔍 **Real-time Error Tracking**
- 📊 **Performance Monitoring**  
- 💳 **Payment Error Tracking**
- 📅 **Booking Error Tracking**
- 🔗 **Integration Error Tracking**
- 🎯 **Custom Business Context**

## 🚨 **Alternative: Manual Setup**

If you prefer manual setup:

1. **Get Auth Token**: https://sentry.io/settings/auth-tokens/
2. **Run Setup**: `SENTRY_AUTH_TOKEN=your-token ./scripts/complete-sentry-setup.sh`
3. **Choose Option 2** and paste your token

## 🧪 **Test After Setup**

```bash
# Test backend integration
curl http://localhost:8000/api/v2/test-sentry

# Check Sentry dashboard
# URLs will be shown after setup completes
```

## 🎉 **Ready to Go!**

Everything is prepared and tested. Just run the setup script and you'll have enterprise-grade error monitoring in 3 minutes!

```bash
./scripts/complete-sentry-setup.sh
```

---

*Need help? The script provides step-by-step guidance and error messages to help you through any issues.*