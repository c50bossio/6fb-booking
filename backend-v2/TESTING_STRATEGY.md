# 🧪 Testing Strategy for BookedBarber V2

## Philosophy: Build on Solid Foundations

> "Test early, test often, never build on cracked foundations."

Testing is not an afterthought - it's an integral part of our development process. Every feature must be thoroughly tested before we build upon it.

## Testing Pyramid

```
        E2E Tests
       /    |    \
      Integration 
     /     |     \
    Unit Tests
   /      |      \
  Foundation
```

### 1. Unit Tests (70% of tests)
- Test individual functions, methods, and components
- Fast, isolated, and numerous
- Mock external dependencies
- Run in milliseconds

### 2. Integration Tests (20% of tests)
- Test interactions between components
- API endpoint tests with real database
- Frontend component integration
- Run in seconds

### 3. End-to-End Tests (10% of tests)
- Test complete user workflows
- Real browser, real API, real database
- Critical user journeys only
- Run in minutes

## When to Test

### ✅ ALWAYS Test:
1. **After implementing a new feature** - Write tests immediately
2. **Before marking a task complete** - Tests AND linting must pass
3. **Before building dependent features** - Ensure foundation is solid
4. **After fixing bugs** - Prevent regression
5. **Before deploying** - All tests AND linting must pass

### 🚫 NEVER:
1. Skip tests to "save time" - Technical debt compounds
2. Comment out failing tests - Fix them instead
3. Test only the happy path - Edge cases matter
4. Ignore flaky tests - They indicate real problems

## Test Coverage Requirements

### Minimum Coverage:
- **Overall**: 80% code coverage
- **Critical paths**: 95% (auth, payments, bookings)
- **New features**: 90% before marking complete
- **Bug fixes**: 100% for the specific fix

### Coverage Commands:
```bash
# Backend coverage
cd backend-v2
pytest --cov=. --cov-report=html tests/

# Frontend coverage
cd frontend-v2
npm test -- --coverage
```

## Writing Tests

### Backend Test Structure:
```python
# tests/test_feature.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestFeatureName:
    """Group related tests in classes"""
    
    def test_happy_path(self):
        """Test the expected successful scenario"""
        response = client.post("/api/v2/endpoint", json={"data": "value"})
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_validation_error(self):
        """Test input validation"""
        response = client.post("/api/v2/endpoint", json={"invalid": "data"})
        assert response.status_code == 422
    
    def test_authentication_required(self):
        """Test auth protection"""
        response = client.get("/api/v2/protected")
        assert response.status_code == 401
```

### Frontend Test Structure:
```typescript
// __tests__/Component.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Component } from '@/components/Component'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
  
  it('handles user interaction', async () => {
    render(<Component />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(api.someFunction).toHaveBeenCalled()
    })
  })
  
  it('displays error state', () => {
    render(<Component error="Test error" />)
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })
})
```

## Test Categories

### 1. Authentication Tests
- Login/logout flows
- Token refresh
- Password reset
- Registration
- Protected route access

### 2. Business Logic Tests
- Booking rules
- Availability calculations
- Pricing logic
- Cancellation policies

### 3. Integration Tests
- Database operations
- External API calls (Stripe, email)
- File uploads
- WebSocket connections

### 4. Performance Tests
- Response time < 200ms for GET
- Response time < 500ms for POST
- Concurrent user handling
- Database query optimization

## Test Data Management

### Fixtures:
```python
# tests/fixtures.py
@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(email="test@example.com", name="Test User")
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def auth_headers(test_user):
    """Get auth headers for test user"""
    token = create_access_token({"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}
```

### Test Database:
- Use separate test database
- Reset between test runs
- Use transactions for isolation
- Never use production data

## Continuous Integration

### Pre-commit Checks:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        types: [python]
        pass_filenames: false
```

### GitHub Actions:
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Backend Tests
        run: |
          cd backend-v2
          pip install -r requirements.txt
          pytest
      - name: Run Frontend Tests
        run: |
          cd frontend-v2
          npm install
          npm test
```

## Testing Checklist

Before marking any feature complete:

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] **All linting passes** (ESLint + TypeScript)
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] Code coverage meets requirements

### Linting Requirements
- [ ] `npm run lint` passes with no errors
- [ ] `npx tsc --noEmit` passes (TypeScript compilation)
- [ ] No ESLint disable comments without justification
- [ ] All imports properly organized and used

## Common Testing Patterns

### 1. Test User Authentication:
```python
def test_authenticated_endpoint(auth_headers):
    response = client.get("/api/v2/protected", headers=auth_headers)
    assert response.status_code == 200
```

### 2. Test Validation:
```python
@pytest.mark.parametrize("invalid_data", [
    {"email": "invalid"},  # Invalid email
    {"password": "short"},  # Too short
    {"name": ""},          # Empty name
])
def test_validation_errors(invalid_data):
    response = client.post("/api/v2/register", json=invalid_data)
    assert response.status_code == 422
```

### 3. Test Async Operations:
```typescript
it('handles async operations', async () => {
  const mockData = { id: 1, name: 'Test' }
  jest.mocked(api.fetchData).mockResolvedValue(mockData)
  
  render(<AsyncComponent />)
  
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

## Debugging Failed Tests

### 1. Check test isolation:
- Tests should not depend on order
- Each test should set up its own data
- Clean up after each test

### 2. Verify test data:
- Print/log actual vs expected
- Check database state
- Verify API responses

### 3. Common issues:
- Timezone differences
- Async timing issues
- Environment variables
- Database transactions

## Test Maintenance

### Regular Tasks:
1. **Weekly**: Review and fix flaky tests
2. **Monthly**: Update test data and fixtures
3. **Quarterly**: Audit test coverage
4. **Yearly**: Refactor test suite structure

### Red Flags:
- Tests frequently commented out
- Coverage decreasing over time
- Tests taking > 5 minutes to run
- Flaky tests ignored

## Resources

### Testing Libraries:
- **Backend**: pytest, pytest-asyncio, pytest-cov
- **Frontend**: Jest, React Testing Library, MSW
- **E2E**: Playwright, Cypress

### Best Practices:
- [Testing Best Practices](https://testingjavascript.com/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [React Testing](https://testing-library.com/docs/react-testing-library/intro/)

---

Remember: **A feature without tests is not complete.**