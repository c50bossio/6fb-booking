# 📅 Calendar Booking System - Comprehensive Testing Guide

This guide explains how to run end-to-end tests for the BookedBarber calendar booking system.

## 🚀 Quick Start

```bash
# Run all calendar tests
node run_calendar_tests.js
```

## 📋 Prerequisites

### 1. Start Required Services

```bash
# Terminal 1: Backend API
cd backend-v2
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload

# Terminal 2: Frontend Application
cd backend-v2/frontend-v2
npm run dev

# Terminal 3: Notification Worker
cd backend-v2
python workers/simple_notification_processor.py

# Terminal 4: Redis (Optional but recommended)
redis-server
```

### 2. Environment Configuration

Ensure your `.env` file has:
```env
# Notification Settings (for testing)
SENDGRID_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Test Mode
TESTING=true
BYPASS_CAPTCHA=true
```

## 🧪 Test Suites

### 1. **E2E Complete Flow Test** (`test_calendar_e2e_complete.js`)

Tests the complete user journey:
- ✅ Guest booking flow
- ✅ Service selection
- ✅ Date and time slot selection
- ✅ Guest information form
- ✅ Booking confirmation
- ✅ Barber dashboard login
- ✅ Calendar view switching
- ✅ Appointment management
- ✅ Mobile responsiveness
- ✅ Accessibility compliance
- ✅ Performance metrics

### 2. **Feature-Specific Tests** (`test_calendar_features.js`)

Tests individual features:
- 🛡️ Rate limiting (3 attempts for guests)
- 🔒 Double-booking prevention
- 📧 Notification delivery
- 🌍 Timezone handling
- 💰 Cancellation & refunds
- 🔄 Recurring appointments
- ♿ Accessibility features
- 📱 Mobile optimizations

## 📊 Test Output

### Console Output
- Real-time test progress
- Success/failure indicators
- Performance metrics
- Error details

### Generated Files
- `calendar-test-report.json` - Detailed test results
- `feature-test-results.json` - Feature test specifics
- `test-screenshots/` - Visual captures
- `test-report.json` - Individual test reports

## 🔍 Running Individual Tests

```bash
# Run only E2E tests
node test_calendar_e2e_complete.js

# Run only feature tests
node test_calendar_features.js

# Run with headless browser (faster)
HEADLESS=true node run_calendar_tests.js
```

## 🎯 What Gets Tested

### Client-Side Journey
1. Navigate to booking page
2. Select service (Haircut, Shave, etc.)
3. Choose date from calendar
4. Pick available time slot
5. Fill guest information
6. Submit booking
7. Receive confirmation
8. Get email/SMS notifications

### Barber-Side Features
1. Login to dashboard
2. View calendar (day/week/month)
3. Create walk-in appointments
4. Reschedule appointments
5. Cancel appointments
6. Manage availability
7. View analytics

### System Features
- **Security**: Rate limiting, CAPTCHA, input validation
- **Performance**: Load times, API response times
- **Reliability**: Error handling, retry logic
- **Accessibility**: WCAG compliance, keyboard navigation
- **Mobile**: Touch gestures, responsive design

## 🐛 Troubleshooting

### Common Issues

1. **"Services not running"**
   - Ensure backend is on port 8000
   - Ensure frontend is on port 3000
   - Check `localhost` vs `127.0.0.1`

2. **"No time slots available"**
   - Create barber availability first
   - Check business hours configuration
   - Ensure date is not in the past

3. **"Notifications not sending"**
   - Verify SendGrid/Twilio credentials
   - Check notification worker is running
   - Look at `notification_processor.log`

4. **"Screenshots not saving"**
   - Check write permissions
   - Ensure `test-screenshots/` directory exists

### Debug Mode

```bash
# Run with debug output
DEBUG=true node run_calendar_tests.js

# Keep browser open after tests
KEEP_BROWSER=true node test_calendar_e2e_complete.js
```

## 📈 Performance Benchmarks

Expected results:
- Page load: < 2 seconds
- API responses: < 200ms
- First contentful paint: < 1.5s
- Time to interactive: < 3s
- Accessibility score: > 90

## 🔄 Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/calendar-tests.yml
name: Calendar System Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: node run_calendar_tests.js
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: test-screenshots
          path: test-screenshots/
```

## 📝 Interpreting Results

### Success Indicators
- ✅ All tests passed
- 📸 Screenshots match expected UI
- ⏱️ Performance within budgets
- 📧 Notifications delivered
- 🔒 Security measures active

### Failure Analysis
1. Check `calendar-test-report.json`
2. Review screenshots in order
3. Look for console errors
4. Check API response codes
5. Verify service health

## 🎉 Success Criteria

The calendar system is considered fully functional when:
- 100% of E2E tests pass
- 90%+ of feature tests pass
- No critical security issues
- Performance meets benchmarks
- Accessibility compliant
- Mobile experience smooth

---

For issues or improvements, please update the test suites in:
- `/backend-v2/test_calendar_e2e_complete.js`
- `/backend-v2/test_calendar_features.js`