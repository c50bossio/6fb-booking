# Puppeteer E2E Test Suite for BookedBarber V2

Comprehensive end-to-end testing suite using Puppeteer for automated browser testing.

## Test Suites

### 1. Authentication Flow Tests (`auth-flow-test.js`)
- Valid login testing
- Invalid login handling
- Logout functionality  
- Session persistence
- Protected route access
- Password reset flow

### 2. Registration Flow Tests (`registration-flow-test.js`)
- Complete registration journey
- Form validation testing
- Stripe payment integration
- Payment failure handling
- Duplicate email validation
- Organization creation

### 3. Booking Flow Tests (`booking-flow-test.js`)
- Complete booking process
- Service and time selection
- Payment processing
- Booking cancellation
- Booking rescheduling
- Form validation

### 4. Dashboard Tests (`dashboard-test.js`)
- Admin dashboard functionality
- Barber dashboard features
- Client dashboard interface
- Data loading verification
- Responsive design
- Interactive elements

### 5. Mobile Responsiveness Tests (`mobile-responsive-test.js`)
- Device layout testing
- Mobile navigation
- Touch interactions
- Responsive forms
- Image optimization
- Orientation changes

### 6. Performance Tests (`performance-test.js`)
- Page load times
- API response times
- Lazy loading
- Memory usage
- Resource optimization
- Runtime performance

### 7. Error Handling Tests (`error-handling-test.js`)
- 404 page testing
- API error handling
- Network failure recovery
- Form error states
- Error boundaries
- Accessibility compliance

## Setup and Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- BookedBarber V2 backend running on `http://localhost:8000`
- BookedBarber V2 frontend running on `http://localhost:3000`

### Installation
```bash
# Puppeteer is already installed as part of the project
# If needed, install manually:
npm install puppeteer

# For development dependencies:
npm install --save-dev puppeteer
```

## Running Tests

### Quick Start
```bash
# Run all tests in headless mode
node tests/e2e/puppeteer/run-all-tests.js

# Run tests with browser visible
node tests/e2e/puppeteer/run-all-tests.js --headed

# Run only quick tests
node tests/e2e/puppeteer/run-all-tests.js --quick

# Run specific test suite
node tests/e2e/puppeteer/run-all-tests.js auth
```

### Individual Test Suites
```bash
# Authentication tests
node tests/e2e/puppeteer/auth-flow-test.js

# Registration tests
node tests/e2e/puppeteer/registration-flow-test.js

# Booking tests
node tests/e2e/puppeteer/booking-flow-test.js

# Dashboard tests
node tests/e2e/puppeteer/dashboard-test.js

# Mobile responsiveness
node tests/e2e/puppeteer/mobile-responsive-test.js

# Performance tests
node tests/e2e/puppeteer/performance-test.js

# Error handling tests
node tests/e2e/puppeteer/error-handling-test.js
```

### Package.json Scripts
Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:e2e": "node tests/e2e/puppeteer/run-all-tests.js",
    "test:e2e:headed": "node tests/e2e/puppeteer/run-all-tests.js --headed",
    "test:e2e:quick": "node tests/e2e/puppeteer/run-all-tests.js --quick",
    "test:e2e:auth": "node tests/e2e/puppeteer/auth-flow-test.js",
    "test:e2e:registration": "node tests/e2e/puppeteer/registration-flow-test.js",
    "test:e2e:booking": "node tests/e2e/puppeteer/booking-flow-test.js",
    "test:e2e:dashboard": "node tests/e2e/puppeteer/dashboard-test.js",
    "test:e2e:mobile": "node tests/e2e/puppeteer/mobile-responsive-test.js",
    "test:e2e:performance": "node tests/e2e/puppeteer/performance-test.js",
    "test:e2e:errors": "node tests/e2e/puppeteer/error-handling-test.js"
  }
}
```

## Configuration

### Environment Variables
```bash
# Test URLs
TEST_BASE_URL=http://localhost:3000
TEST_API_URL=http://localhost:8000

# Test behavior
TEST_HEADLESS=true
TEST_SLOW_MO=0
TEST_TIMEOUT=30000

# Screenshots and reports
TEST_SCREENSHOTS=true
```

### Test Data
The tests use the following test credentials:

#### Admin User
- Email: `admin.test@bookedbarber.com`
- Password: `AdminTest123`

#### Test Users (Auto-generated)
- Format: `test.user.YYYYMMDDHHmmss@bookedbarber.com`
- Password: `TestPassword123!`

#### Stripe Test Cards
- Success: `4242424242424242`
- Declined: `4000000000000002`
- Insufficient Funds: `4000000000009995`

## Output and Reporting

### Screenshots
- Saved to `./test-screenshots/`
- Named with test and timestamp
- Includes error states and key interactions

### Test Reports
- JSON reports saved to `./test-reports/`
- Comprehensive test results
- Performance metrics
- Error details and recommendations

### Console Output
- Real-time test progress
- Detailed step-by-step results
- Performance metrics
- Error summaries

## Debugging

### Common Issues

#### Server Not Running
```bash
# Check if servers are running
curl http://localhost:8000/api/v1/health
curl http://localhost:3000

# Start servers if needed
cd backend-v2 && uvicorn main:app --reload
cd backend-v2/frontend-v2 && npm run dev
```

#### Browser Issues
```bash
# Run with visible browser for debugging
node tests/e2e/puppeteer/run-all-tests.js --headed

# Add debugging pauses in code
await page.waitForTimeout(5000); // Wait 5 seconds
```

#### Test Data Issues
```bash
# Create test users if needed
cd backend-v2 && python create_test_admin.py
```

### Debugging Mode
```javascript
// Add to any test file for debugging
const CONFIG = {
    ...CONFIG,
    headless: false,
    slowMo: 250,
    timeout: 60000
};
```

## Best Practices

### Writing Tests
1. Use the shared utilities in `test-utils.js`
2. Take screenshots at key points
3. Check for console errors
4. Verify both success and error states
5. Test mobile responsiveness

### Test Data
1. Use generated test users for isolation
2. Clean up test data after runs
3. Use test Stripe cards only
4. Avoid hardcoded timing dependencies

### Performance
1. Run tests in parallel when possible
2. Use headless mode for CI/CD
3. Skip non-essential animations
4. Clear cache between critical tests

## Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run test:e2e:quick
```

### CI Environment Variables
```bash
TEST_HEADLESS=true
TEST_SCREENSHOTS=false
TEST_TIMEOUT=60000
```

## Troubleshooting

### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 tests/e2e/puppeteer/run-all-tests.js
```

### Timeout Issues
```bash
# Increase timeout for slow networks
export TEST_TIMEOUT=60000
```

### Docker Support
```dockerfile
# Add to Dockerfile for CI
RUN apt-get update && apt-get install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
    libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
    libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
    libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
    libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation \
    libappindicator1 libnss3 lsb-release xdg-utils wget
```

## Contributing

### Adding New Tests
1. Follow the existing test structure
2. Use the `TestResult` class for consistency
3. Include proper error handling
4. Add screenshots for visual validation
5. Update this README with new test descriptions

### Code Style
- Use async/await consistently
- Include descriptive console output
- Handle errors gracefully
- Follow the existing naming conventions
- Add JSDoc comments for complex functions

---

For more information, see the individual test files and the BookedBarber V2 documentation.