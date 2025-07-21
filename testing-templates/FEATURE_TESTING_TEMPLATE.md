# 🧪 Feature Testing Template

**Use this template for every new feature to ensure comprehensive testing coverage**

## Feature Information
- **Feature Name**: _[Name of the feature being implemented]_
- **Developer**: _[Your name]_
- **Date**: _[Implementation date]_
- **Branch**: _[Feature branch name]_

---

## 📋 **PRE-IMPLEMENTATION TESTING CHECKLIST**

### Before Writing Any Code:
- [ ] **Feature verification**: Confirmed feature doesn't already exist
- [ ] **Requirements clear**: Feature requirements documented and understood
- [ ] **Test plan created**: Test scenarios identified and documented
- [ ] **Environment ready**: Development environment set up and tested
- [ ] **Browser logs MCP**: Chrome debugging ready (`--remote-debugging-port=9222`)

---

## 🎯 **TEST-DRIVEN DEVELOPMENT (TDD) CHECKLIST**

### Write Tests FIRST (Red → Green → Refactor):

#### Backend Tests:
- [ ] **Unit tests written**: Test individual functions/methods
- [ ] **Service tests written**: Test business logic layer
- [ ] **API endpoint tests written**: Test HTTP endpoints
- [ ] **Integration tests written**: Test database interactions
- [ ] **Edge case tests written**: Test error conditions and boundary cases

#### Frontend Tests:
- [ ] **Component tests written**: Test React component rendering
- [ ] **Hook tests written**: Test custom React hooks
- [ ] **Utility tests written**: Test helper functions
- [ ] **Integration tests written**: Test component interactions
- [ ] **API client tests written**: Test frontend API calls

---

## 🧪 **UNIT TESTING CHECKLIST**

### Backend Unit Tests (`backend-v2/tests/unit/test_[feature].py`):
```python
# Template structure
import pytest
from unittest.mock import Mock, patch
from services.[feature]_service import [Feature]Service

class Test[Feature]Service:
    def test_[function]_success(self):
        # Test successful operation
        pass
    
    def test_[function]_validation_error(self):
        # Test input validation
        pass
    
    def test_[function]_not_found(self):
        # Test resource not found
        pass
```

- [ ] **Successful operations**: Happy path scenarios
- [ ] **Validation errors**: Invalid input handling
- [ ] **Not found scenarios**: Missing resource handling  
- [ ] **Permission errors**: Unauthorized access handling
- [ ] **Database errors**: Connection and query failures
- [ ] **External API failures**: Third-party service errors

### Frontend Unit Tests (`backend-v2/frontend-v2/__tests__/components/[Feature].test.tsx`):
```typescript
// Template structure
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import [Feature]Component from '@/components/[Feature]'

describe('[Feature]Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  const renderWithProvider = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <[Feature]Component {...props} />
      </QueryClientProvider>
    )
  }
  
  test('renders correctly', () => {
    // Test component rendering
  })
  
  test('handles user interactions', async () => {
    // Test user interactions
  })
})
```

- [ ] **Component rendering**: Initial render state
- [ ] **Props handling**: Different prop combinations
- [ ] **User interactions**: Click, input, form submission
- [ ] **State changes**: Component state updates
- [ ] **Error states**: Error boundary and error display
- [ ] **Loading states**: Loading indicators and skeletons

---

## 🔗 **INTEGRATION TESTING CHECKLIST**

### API Integration Tests (`backend-v2/tests/integration/test_[feature]_api.py`):
```python
# Template structure
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_[endpoint]_integration():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/[endpoint]", json={...})
        assert response.status_code == 200
```

- [ ] **API endpoints**: All REST endpoints tested
- [ ] **Authentication**: JWT token validation
- [ ] **Authorization**: Role-based access control
- [ ] **Request validation**: Input parameter validation
- [ ] **Response format**: Correct JSON structure
- [ ] **Error responses**: Proper HTTP status codes
- [ ] **Database persistence**: Data correctly saved/retrieved

### Frontend Integration Tests (`backend-v2/frontend-v2/__tests__/integration/[feature].test.tsx`):
- [ ] **API integration**: Frontend ↔ Backend communication
- [ ] **Form submission**: Complete form workflows
- [ ] **Navigation**: Routing and page transitions
- [ ] **Authentication flow**: Login/logout integration
- [ ] **Real-time updates**: WebSocket or polling integration
- [ ] **Third-party integration**: External API interactions

---

## 🎭 **END-TO-END (E2E) TESTING CHECKLIST**

### Puppeteer E2E Tests (`backend-v2/test_[feature]_puppeteer.js`):
```javascript
// Template structure
const puppeteer = require('puppeteer');

describe('[Feature] E2E Tests', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });
  
  test('complete [feature] workflow', async () => {
    // Test complete user journey
  });
  
  afterAll(async () => {
    await browser.close();
  });
});
```

- [ ] **Complete user journey**: End-to-end workflow tested
- [ ] **Authentication required**: Login flow if needed
- [ ] **Form interactions**: Fill out forms and submit
- [ ] **Navigation**: Page transitions and routing
- [ ] **Data persistence**: Verify data saved correctly
- [ ] **Error handling**: Test error scenarios
- [ ] **Mobile responsive**: Test on different screen sizes

---

## 🔍 **MANUAL TESTING CHECKLIST**

### Cross-Browser Testing:
- [ ] **Chrome** (latest): Full functionality verified
- [ ] **Firefox** (latest): Full functionality verified  
- [ ] **Safari** (latest): Full functionality verified
- [ ] **Edge** (latest): Full functionality verified

### Device Testing:
- [ ] **Desktop** (1920x1080): Responsive design verified
- [ ] **Tablet** (768x1024): Touch interactions work
- [ ] **Mobile** (375x667): Mobile-optimized experience

### User Journey Testing:
- [ ] **Happy path**: Main use case works correctly
- [ ] **Edge cases**: Boundary conditions handled
- [ ] **Error scenarios**: Graceful error handling
- [ ] **Performance**: Acceptable load times (<2 seconds)

---

## 🌐 **BROWSER LOGS MCP TESTING CHECKLIST**

### Setup Verification:
- [ ] **Chrome debugging active**: `lsof -i :9222` shows Chrome
- [ ] **MCP connection working**: `connect_to_browser` succeeds
- [ ] **Console logs accessible**: `get_console_logs` returns data
- [ ] **Network monitoring active**: `get_network_requests` works

### During Feature Testing:
- [ ] **Real-time monitoring**: `watch_logs_live duration_seconds=60`
- [ ] **Error detection**: `get_javascript_errors since_minutes=10`
- [ ] **API call verification**: `get_network_requests since_minutes=5`
- [ ] **Performance monitoring**: Network timing and resource loading

### After Implementation:
- [ ] **Zero console errors**: No JavaScript errors in production build
- [ ] **API calls successful**: All network requests return 200-299 status
- [ ] **No performance warnings**: No slow script warnings
- [ ] **Clean resource loading**: All assets load successfully

---

## 🚀 **PERFORMANCE TESTING CHECKLIST**

### Load Testing:
- [ ] **Single user performance**: Feature responds <500ms
- [ ] **Multiple users**: 10+ concurrent users handled
- [ ] **Database performance**: Queries execute <50ms
- [ ] **Memory usage**: No memory leaks detected
- [ ] **CPU usage**: Acceptable resource consumption

### Frontend Performance:
- [ ] **Bundle size**: Feature doesn't increase bundle >10%
- [ ] **Render performance**: Components render <100ms
- [ ] **Interaction response**: User interactions respond <100ms
- [ ] **Image optimization**: Images properly compressed and sized

---

## 🔒 **SECURITY TESTING CHECKLIST**

### Input Validation:
- [ ] **SQL injection**: API endpoints protected from SQL injection
- [ ] **XSS protection**: User input properly sanitized
- [ ] **CSRF protection**: Forms include CSRF tokens
- [ ] **Input length limits**: Maximum input lengths enforced
- [ ] **Data type validation**: Input types properly validated

### Authentication & Authorization:
- [ ] **Authentication required**: Protected endpoints require auth
- [ ] **Role-based access**: Proper permission checking
- [ ] **Token validation**: JWT tokens properly validated
- [ ] **Session management**: Sessions expire appropriately

### Data Protection:
- [ ] **Sensitive data**: No secrets exposed in client
- [ ] **API key protection**: API keys properly secured
- [ ] **HTTPS enforcement**: All requests use HTTPS in production
- [ ] **Data encryption**: Sensitive data encrypted at rest

---

## 📊 **ACCESSIBILITY TESTING CHECKLIST**

### WCAG AA Compliance:
- [ ] **Contrast ratios**: Text contrast ≥4.5:1, large text ≥3:1
- [ ] **Keyboard navigation**: All features accessible via keyboard
- [ ] **Screen reader support**: Proper ARIA labels and roles
- [ ] **Focus indicators**: Visible focus indicators for interactive elements
- [ ] **Alt text**: Images have descriptive alt text

### Usability:
- [ ] **Error messages**: Clear, actionable error messages
- [ ] **Loading states**: Appropriate loading indicators
- [ ] **Success feedback**: Clear confirmation messages
- [ ] **Form validation**: Real-time validation feedback

---

## 🎯 **COMPLETION CRITERIA**

### Code Quality:
- [ ] **Test coverage**: ≥80% backend, ≥80% frontend
- [ ] **Linting clean**: Zero ESLint/TypeScript/Python linting errors
- [ ] **Type safety**: All TypeScript types properly defined
- [ ] **Code review**: Code reviewed by team member

### Testing Complete:
- [ ] **All test categories**: Unit, integration, E2E, manual testing done
- [ ] **Browser compatibility**: Works across all target browsers
- [ ] **Device compatibility**: Works on all target devices  
- [ ] **Performance verified**: Meets performance requirements
- [ ] **Security verified**: No security vulnerabilities introduced

### Documentation:
- [ ] **Feature documentation**: Usage instructions documented
- [ ] **API documentation**: Endpoints documented in OpenAPI
- [ ] **Test documentation**: Test scenarios and expected results
- [ ] **Troubleshooting guide**: Common issues and solutions

---

## 🔄 **POST-DEPLOYMENT MONITORING**

### Monitoring Setup:
- [ ] **Error tracking**: Sentry monitoring configured
- [ ] **Performance monitoring**: APM tracking configured  
- [ ] **User analytics**: Usage tracking implemented
- [ ] **Health checks**: Monitoring endpoints configured

### Success Metrics:
- [ ] **Error rate**: <0.1% error rate in production
- [ ] **Performance**: 95% of requests <200ms response time
- [ ] **User satisfaction**: Positive user feedback
- [ ] **Adoption rate**: Feature used by target percentage of users

---

## 📝 **TESTING NOTES**

### Issues Encountered:
_Document any issues found during testing and their resolutions_

### Performance Observations:
_Note any performance characteristics or optimization opportunities_

### User Feedback:
_Record user feedback and suggestions for improvement_

### Future Improvements:
_List potential enhancements or optimizations for future iterations_

---

**Template Completion Date**: _[Date when all testing completed]_
**Feature Ready for Production**: _[Yes/No and justification]_