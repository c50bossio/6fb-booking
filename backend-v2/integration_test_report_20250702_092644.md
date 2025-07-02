# Integration Features Test Report

Generated: 2025-07-02 09:26:44

## Summary

- **Backend Tests**: 0/5 passed
- **Frontend Tests**: 0/2 passed  
- **Health Checks**: 2/4 healthy
- **Total Duration**: 2.51s

## Backend Test Results

### test_integration_api.py
- **Status**: ❌ FAILED
- **Duration**: 0.26s
- **Error**: /Users/bossio/.pyenv/versions/3.12.7/lib/python3.12/site-packages/_pytest/config/__init__.py:331: PluggyTeardownRaisedWarning: A plugin raised an exception during an old-style hookwrapper teardown.
Pl...

### test_gmb_service.py
- **Status**: ❌ FAILED
- **Duration**: 0.19s
- **Error**: /Users/bossio/.pyenv/versions/3.12.7/lib/python3.12/site-packages/_pytest/config/__init__.py:331: PluggyTeardownRaisedWarning: A plugin raised an exception during an old-style hookwrapper teardown.
Pl...

### test_oauth_flows.py
- **Status**: ❌ FAILED
- **Duration**: 0.19s
- **Error**: /Users/bossio/.pyenv/versions/3.12.7/lib/python3.12/site-packages/_pytest/config/__init__.py:331: PluggyTeardownRaisedWarning: A plugin raised an exception during an old-style hookwrapper teardown.
Pl...

### test_integration_models.py
- **Status**: ❌ FAILED
- **Duration**: 0.19s
- **Error**: /Users/bossio/.pyenv/versions/3.12.7/lib/python3.12/site-packages/_pytest/config/__init__.py:331: PluggyTeardownRaisedWarning: A plugin raised an exception during an old-style hookwrapper teardown.
Pl...

### test_reviews_setup.py
- **Status**: ❌ FAILED
- **Duration**: 0.19s
- **Error**: /Users/bossio/.pyenv/versions/3.12.7/lib/python3.12/site-packages/_pytest/config/__init__.py:331: PluggyTeardownRaisedWarning: A plugin raised an exception during an old-style hookwrapper teardown.
Pl...

## Frontend Test Results

### components/integrations/IntegrationCard.test.tsx
- **Status**: ❌ FAILED
- **Duration**: 0.82s
- **Error**: FAIL components/integrations/IntegrationCard.test.tsx
  ● Test suite failed to run

    Cannot find module 'vitest' from 'components/integrations/IntegrationCard.test.tsx'

       9 | import { toast }...

### lib/api/integrations.test.ts
- **Status**: ❌ FAILED
- **Duration**: 0.67s
- **Error**: FAIL lib/api/integrations.test.ts
  ● Test suite failed to run

    Cannot find module 'vitest' from 'lib/api/integrations.test.ts'

       6 | import { describe, it, expect, beforeEach, afterEach, vi...

## System Health Check

### Database Models
- **Status**: ✅ HEALTHY

### API Endpoints
- **Status**: ❌ UNHEALTHY
- **Issue**: Router import failed: cannot import name 'encrypt_value' from 'utils.encryption' (/Users/bossio/6fb-booking/backend-v2/utils/encryption.py)

### Service Classes
- **Status**: ❌ UNHEALTHY
- **Issue**: Service import failed: cannot import name 'encrypt_value' from 'utils.encryption' (/Users/bossio/6fb-booking/backend-v2/utils/encryption.py)

### Frontend Components
- **Status**: ✅ HEALTHY

## Test Coverage Areas

### Backend Tests
- ✅ Integration API endpoints (OAuth, CRUD, health checks)
- ✅ GMB service with mocked APIs
- ✅ OAuth flow security and validation
- ✅ Database models and relationships
- ✅ Error handling and edge cases

### Frontend Tests  
- ✅ IntegrationCard component functionality
- ✅ API client methods and error handling
- ✅ User interaction flows
- ✅ Loading states and UI feedback

### Integration Areas Tested
- OAuth initiation and callback flows
- Token management and refresh
- API credential validation
- Health monitoring systems
- Review synchronization
- Error recovery mechanisms

## Recommendations

- ⚠️ Some tests are failing - review error logs and fix issues
- ⚠️ Some system components are unhealthy - check imports and dependencies
