# GDPR Compliance Test Suite Guide

This guide covers the comprehensive test suite for GDPR compliance and cookie consent functionality.

## Overview

The GDPR test suite ensures that our cookie consent and privacy management system meets all legal requirements and provides a robust user experience. The suite includes:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test complete workflows and API interactions  
- **End-to-End Tests**: Test user journeys through real browser automation
- **Compliance Validation**: Automated checks against GDPR requirements

## Test Structure

```
backend-v2/
├── tests/
│   └── test_privacy_api.py          # Backend API unit tests
├── frontend-v2/
│   ├── __tests__/
│   │   ├── components/
│   │   │   ├── CookieConsent.test.tsx     # Cookie banner tests
│   │   │   └── PrivacyDashboard.test.tsx  # Privacy dashboard tests
│   │   └── hooks/
│   │       └── useCookieConsent.test.ts   # Hook logic tests
│   └── tests/
│       └── e2e/
│           └── gdpr-compliance.spec.ts    # End-to-end tests
├── test_gdpr_compliance.py         # Integration tests
├── validate_gdpr_compliance.py     # Compliance validation script
└── run_gdpr_tests.py              # Test runner script
```

## Running Tests

### Quick Commands

```bash
# Backend - Run all GDPR unit tests
cd backend-v2
python -m pytest tests/test_privacy_api.py -v

# Frontend - Run GDPR component tests
cd backend-v2/frontend-v2
npm run test:gdpr

# E2E - Run end-to-end GDPR tests
cd backend-v2/frontend-v2
npm run test:e2e:gdpr

# Integration - Run complete workflow tests
cd backend-v2
python -m pytest test_gdpr_compliance.py -v

# Validation - Check GDPR compliance
cd backend-v2
python validate_gdpr_compliance.py --verbose

# All Tests - Run comprehensive test suite
cd backend-v2
python run_gdpr_tests.py --verbose --report gdpr_test_report.json
```

### Advanced Options

```bash
# Run with coverage
python -m pytest tests/test_privacy_api.py --cov=models.consent --cov=routers.privacy --cov-report=html

# Run integration tests with markers
python -m pytest test_gdpr_compliance.py -m "integration" -v

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed -- tests/e2e/gdpr-compliance.spec.ts

# Run compliance validation with custom endpoints
python validate_gdpr_compliance.py --api-url http://localhost:8000 --db-url sqlite:///test.db
```

## Test Categories

### 1. Backend Unit Tests (`test_privacy_api.py`)

Tests the privacy API endpoints:
- ✅ Cookie consent storage and retrieval
- ✅ User consent management (grant/withdraw)
- ✅ Bulk consent operations
- ✅ Data export requests
- ✅ Account deletion
- ✅ Privacy status reporting
- ✅ Audit trail logging
- ✅ Error handling and validation

**Key Test Classes:**
- `TestCookieConsentAPI` - Cookie preference management
- `TestConsentAPI` - Legal consent operations
- `TestDataExportAPI` - GDPR data portability
- `TestAccountDeletionAPI` - Right to erasure
- `TestPrivacyStatusAPI` - Privacy dashboard data

### 2. Frontend Component Tests

#### CookieConsent Component (`CookieConsent.test.tsx`)
Tests the cookie banner and preferences modal:
- ✅ Banner display logic
- ✅ User interactions (accept/reject/customize)
- ✅ Preferences modal functionality
- ✅ Accessibility compliance
- ✅ State management
- ✅ Error handling

#### PrivacyDashboard Component (`PrivacyDashboard.test.tsx`)
Tests the privacy management interface:
- ✅ Privacy status display
- ✅ Cookie preference management
- ✅ Data export functionality
- ✅ Consent history
- ✅ Account deletion
- ✅ Legal information links

#### useCookieConsent Hook (`useCookieConsent.test.ts`)
Tests the consent management logic:
- ✅ LocalStorage integration
- ✅ API communication
- ✅ State synchronization
- ✅ Consent persistence
- ✅ Error recovery

### 3. Integration Tests (`test_gdpr_compliance.py`)

Tests complete GDPR workflows:
- ✅ End-to-end consent flows
- ✅ Cookie preference persistence
- ✅ Data export generation
- ✅ Consent withdrawal effects
- ✅ Audit trail completeness
- ✅ Concurrent operation handling

**Key Test Classes:**
- `TestGDPRComplianceIntegration` - Complete compliance flows
- `TestCookiePreferencePersistence` - Cross-session persistence
- `TestConsentAuditTrail` - Audit logging validation
- `TestGDPRComplianceValidation` - Legal requirement checks

### 4. End-to-End Tests (`gdpr-compliance.spec.ts`)

Tests real user journeys:
- ✅ Cookie banner interactions
- ✅ Preferences modal workflows
- ✅ Privacy dashboard usage
- ✅ Registration consent flows
- ✅ Cross-page persistence
- ✅ Accessibility compliance
- ✅ Mobile responsiveness
- ✅ Performance validation

### 5. Compliance Validation (`validate_gdpr_compliance.py`)

Automated GDPR compliance checks:
- ✅ Database structure validation
- ✅ API endpoint completeness
- ✅ Data handling practices
- ✅ Cookie consent implementation
- ✅ Audit trail requirements
- ✅ Data export capabilities
- ✅ Legal compliance verification
- ✅ Security assessment

## Test Data and Fixtures

### Backend Fixtures (pytest)
- `test_user` - Standard test user
- `test_admin` - Admin user with elevated permissions
- `auth_headers` - Authentication headers for API calls
- `async_client` - HTTP client for API testing

### Frontend Fixtures (Jest)
- Mock `useCookieConsent` hook
- Mock API endpoints
- Mock localStorage
- Mock browser APIs (Blob, URL, etc.)

### Integration Test Data
- Sample consent records
- Cookie preference variations
- Audit trail entries
- Export request scenarios

## Continuous Integration

### GitHub Actions Workflow (`.github/workflows/gdpr-tests.yml`)

The CI pipeline runs:
1. **Backend GDPR Tests** (Python 3.9, 3.10, 3.11)
2. **Frontend GDPR Tests** (Node 18, 20)
3. **E2E GDPR Tests** (Playwright)
4. **Compliance Validation**
5. **Comprehensive Test Suite**

### Triggers
- Push to main/develop branches
- Pull requests
- Weekly scheduled runs
- Manual workflow dispatch

### Artifacts
- Test coverage reports
- Compliance validation reports
- E2E test screenshots/videos
- Comprehensive test summaries

## Coverage Requirements

### Backend Coverage Targets
- `models.consent` - 90%+ coverage
- `routers.privacy` - 95%+ coverage
- `schemas_new.privacy` - 85%+ coverage

### Frontend Coverage Targets
- `components/CookieConsent.tsx` - 90%+ coverage
- `components/PrivacyDashboard.tsx` - 85%+ coverage
- `hooks/useCookieConsent.ts` - 95%+ coverage

## Compliance Checklist

### GDPR Requirements Validated
- ✅ Lawful basis for processing
- ✅ Consent management (grant/withdraw)
- ✅ Data minimization
- ✅ Purpose limitation
- ✅ Storage limitation
- ✅ Accuracy
- ✅ Integrity and confidentiality
- ✅ Accountability

### Cookie Law Compliance
- ✅ Clear consent mechanism
- ✅ Granular cookie categories
- ✅ Easy withdrawal
- ✅ Pre-checked boxes forbidden
- ✅ Cookie expiry management

### Data Subject Rights
- ✅ Right to information
- ✅ Right of access
- ✅ Right to rectification
- ✅ Right to erasure
- ✅ Right to restrict processing
- ✅ Right to data portability
- ✅ Right to object
- ✅ Rights related to automated decision making

## Troubleshooting

### Common Test Issues

**Backend Tests Failing:**
```bash
# Check database connection
python -c "from database import engine; print('DB OK')"

# Verify environment
echo $TESTING
cat .env

# Run with verbose output
python -m pytest tests/test_privacy_api.py -v -s
```

**Frontend Tests Failing:**
```bash
# Clear jest cache
npm test -- --clearCache

# Run specific test file
npm test -- CookieConsent.test.tsx

# Check mock setup
npm test -- --verbose
```

**E2E Tests Failing:**
```bash
# Install browsers
npx playwright install

# Run in headed mode
npm run test:e2e:headed

# Check screenshots
ls test-results/
```

**Compliance Validation Issues:**
```bash
# Check API server
curl http://localhost:8000/health

# Run with debug info
python validate_gdpr_compliance.py --verbose

# Check database state
python -c "from models.consent import *; print('Models loaded')"
```

### Test Environment Setup

**Backend Environment:**
```bash
cd backend-v2
cp .env.template .env
echo "TESTING=true" >> .env
echo "DATABASE_URL=sqlite:///test.db" >> .env
pip install -r requirements.txt
```

**Frontend Environment:**
```bash
cd backend-v2/frontend-v2
npm install
cp .env.local.example .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local
```

## Maintenance

### Adding New Tests

1. **Backend Unit Test:**
   ```python
   # Add to tests/test_privacy_api.py
   async def test_new_privacy_feature(self, async_client, auth_headers):
       response = await async_client.post("/api/v2/privacy/new-feature", 
                                         headers=auth_headers)
       assert response.status_code == 200
   ```

2. **Frontend Component Test:**
   ```typescript
   // Add to __tests__/components/
   it('handles new privacy feature', async () => {
       render(<PrivacyComponent />)
       await user.click(screen.getByRole('button', { name: 'New Feature' }))
       expect(screen.getByText('Feature Response')).toBeInTheDocument()
   })
   ```

3. **E2E Test:**
   ```typescript
   // Add to tests/e2e/gdpr-compliance.spec.ts
   test('new privacy feature workflow', async ({ page }) => {
       await page.goto('/privacy')
       await page.click('text=New Feature')
       await expect(page.locator('text=Success')).toBeVisible()
   })
   ```

### Updating Compliance Checks

Modify `validate_gdpr_compliance.py` to add new validation rules:

```python
async def validate_new_requirement(self):
    """Validate new GDPR requirement"""
    # Implementation
    self.add_result("New Requirement", "PASS", "Requirement met")
```

### Performance Monitoring

Monitor test performance:
```bash
# Backend test timing
python -m pytest tests/test_privacy_api.py --durations=10

# Frontend test timing
npm test -- --verbose --silent=false

# E2E test timing
npm run test:e2e -- --reporter=line
```

## Support

For test-related issues:
1. Check this guide first
2. Review test logs and error messages
3. Verify environment setup
4. Run tests in isolation to identify issues
5. Check for recent changes that might affect tests

The GDPR test suite is critical for maintaining legal compliance. All tests should pass before merging changes that affect privacy functionality.