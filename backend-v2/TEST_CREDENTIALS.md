# 🔐 Test Credentials and Procedures

## Test Environment Setup

### Prerequisites
1. **Backend Server**: Running on `http://localhost:8000`
2. **Frontend Server**: Running on `http://localhost:3000`
3. **Database**: Migrations applied (`alembic upgrade head`)
4. **Environment**: `.env` file configured with test Stripe keys

### Starting Test Servers
```bash
# Option 1: Use convenience script
./scripts/start-dev-session.sh

# Option 2: Start manually
# Terminal 1 - Backend
cd backend-v2
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd backend-v2/frontend-v2
npm run dev
```

## Test User Credentials

### Admin User (Pre-created)
- **Email**: `admin.test@bookedbarber.com`
- **Password**: `AdminTest123`
- **Role**: Admin
- **Purpose**: Testing admin functionality

### Dynamic Test Users
Each test run creates a unique user with timestamp:
- **Email Format**: `test.user.YYYYMMDDHHmmss@bookedbarber.com`
- **Password**: `TestPassword123!`
- **Business Name**: `Test Barbershop YYYYMMDDHHmmss`

## Stripe Test Cards

### Successful Payment Cards
```
4242 4242 4242 4242    # Visa - Always succeeds
4000 0582 6000 0005    # Visa debit - Always succeeds
5555 5555 4444 4442    # Mastercard - Always succeeds
```

### Error Testing Cards
```
4000 0000 0000 0002    # Card declined
4000 0000 0000 9995    # Insufficient funds
4000 0000 0000 0069    # Expired card
4000 0000 0000 0127    # Processing error
4000 0000 0000 0119    # Authentication required
```

### Card Details for Testing
- **Expiry**: Any future date (e.g., 12/34)
- **CVV**: Any 3 digits (e.g., 123)
- **ZIP**: Any valid ZIP (e.g., 42424)

## Running Tests

### 1. Full Registration Journey Test
```bash
cd backend-v2
python test_registration_journey.py
```

This tests:
- Complete registration flow with organization creation
- Onboarding status updates
- Trial subscription activation
- Organization-based analytics
- Payment status checks

### 2. API Endpoint Tests
```bash
cd backend-v2
python test_login_and_dashboard.py
```

This tests:
- Authentication flow
- Dashboard endpoints
- Data retrieval APIs

### 3. Frontend Component Tests
```bash
cd backend-v2/frontend-v2
npm test
```

### 4. Integration Tests with Pytest
```bash
cd backend-v2
pytest -v tests/
```

### 5. Test with Coverage
```bash
# Backend coverage
cd backend-v2
pytest --cov=. --cov-report=html tests/

# Frontend coverage
cd backend-v2/frontend-v2
npm test -- --coverage
```

## Test Scenarios

### Registration Flow Testing
1. **Happy Path**
   - Use valid test card (4242...)
   - Complete all 5 steps
   - Verify organization creation
   - Check trial activation

2. **Payment Failures**
   - Use declined card (4000...0002)
   - Verify error message display
   - Test recovery flow
   - Retry with valid card

3. **Validation Testing**
   - Invalid email formats
   - Weak passwords
   - Missing required fields
   - Business name duplicates

### Onboarding Flow Testing
1. **Complete Onboarding**
   - Update profile information
   - Configure services
   - Set availability
   - Skip onboarding option

2. **Partial Completion**
   - Complete some steps
   - Verify progress tracking
   - Resume from last step

### Trial Management Testing
1. **Trial Status**
   - Check days remaining
   - Usage percentage
   - Feature restrictions
   - Expiration warnings

2. **Trial Expiration**
   - Simulate expired trial
   - Verify upgrade prompts
   - Test payment flow

## Manual Testing Checklist

### Registration Journey
- [ ] All form validations work correctly
- [ ] Stripe Elements loads properly
- [ ] Error messages display clearly
- [ ] Success redirects to dashboard
- [ ] Welcome email received

### Dashboard Features
- [ ] Analytics data displays correctly
- [ ] No console errors in browser
- [ ] Responsive on mobile devices
- [ ] Loading states work properly
- [ ] Error boundaries catch failures

### Payment Flows
- [ ] Card validation works
- [ ] Declined cards show proper errors
- [ ] Recovery flow functions correctly
- [ ] Subscription updates properly
- [ ] Receipts generated

## Debugging Failed Tests

### Common Issues

1. **API Connection Failed**
   ```bash
   # Check if backend is running
   curl http://localhost:8000/api/v1/health
   ```

2. **Database Errors**
   ```bash
   # Reset database
   cd backend-v2
   alembic downgrade base
   alembic upgrade head
   python create_test_admin.py
   ```

3. **Stripe Errors**
   - Verify test keys in `.env`
   - Check Stripe webhook configuration
   - Ensure test mode is active

4. **Frontend Build Issues**
   ```bash
   cd backend-v2/frontend-v2
   rm -rf node_modules .next
   npm install
   npm run build
   ```

## Test Data Cleanup

### After Testing
```bash
# Remove test database entries
cd backend-v2
python scripts/cleanup_test_data.py

# Or manually in database
DELETE FROM users WHERE email LIKE 'test.user.%@bookedbarber.com';
DELETE FROM organizations WHERE name LIKE 'Test Barbershop %';
```

## Environment Variables for Testing

### Required in `.env`:
```env
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Test Mode
ENVIRONMENT=development
DEBUG=true

# Test Database (optional)
TEST_DATABASE_URL=sqlite:///./test.db
```

## Continuous Integration

### GitHub Actions Test Command
```yaml
- name: Run Tests
  run: |
    cd backend-v2
    cp .env.template .env
    python -m pytest
    python test_registration_journey.py
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Database Locked
```bash
# Reset SQLite database
cd backend-v2
rm 6fb_booking.db
alembic upgrade head
python create_test_admin.py
```

### Stripe Webhook Issues
- Use Stripe CLI for local testing
- Configure webhook endpoint: `/api/v1/webhooks/stripe`
- Sign webhooks with test secret

---

**Note**: Always use test credentials and test cards in development. Never use real payment information in test environments.