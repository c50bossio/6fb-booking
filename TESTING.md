# BookedBarber V2 Testing Guide

This guide provides comprehensive instructions for running tests in the BookedBarber V2 platform.

## Quick Start

Run all tests in parallel:
```bash
./scripts/parallel-tests.sh
```

## Backend Testing (FastAPI + pytest)

### Directory Structure
```
backend-v2/
├── tests/
│   ├── conftest.py          # Test configuration and fixtures
│   ├── factories.py         # Test data factories
│   ├── test_*.py           # Test modules
│   └── ...
├── pytest.ini              # pytest configuration
└── ...
```

### Running Backend Tests

#### All Tests
```bash
cd backend-v2
python -m pytest
```

#### With Coverage
```bash
cd backend-v2
python -m pytest --cov=. --cov-report=html
```

#### Specific Test Categories

**Unit Tests Only:**
```bash
python -m pytest tests/ -m unit -v
```

**Integration Tests Only:**
```bash
python -m pytest tests/ -m integration -v
```

**API Tests Only:**
```bash
python -m pytest tests/ -m api -v
```

**Authentication Tests:**
```bash
python -m pytest tests/ -k auth -v
```

**Payment Tests:**
```bash
python -m pytest tests/ -k "payment or stripe" -v
```

**Booking System Tests:**
```bash
python -m pytest tests/ -k booking -v
```

**Google Calendar Tests:**
```bash
python -m pytest tests/ -k calendar -v
```

**Marketing Integration Tests:**
```bash
python -m pytest tests/ -k "marketing or gmb or review" -v
```

### Test Markers

The following markers are available in `pytest.ini`:

- `slow`: Marks tests as slow (deselect with `-m "not slow"`)
- `integration`: Marks tests as integration tests
- `gdpr`: Marks tests as GDPR compliance tests
- `privacy`: Marks tests as privacy-related tests
- `unit`: Marks tests as unit tests
- `api`: Marks tests as API tests
- `auth`: Marks tests as authentication tests

### Coverage Requirements

- Minimum coverage threshold: **80%**
- Coverage reports generated in:
  - Terminal: Shows missing lines
  - HTML: `htmlcov/index.html`
  - XML: `coverage.xml`

## Frontend Testing (Next.js + Jest)

### Directory Structure
```
backend-v2/frontend-v2/
├── __tests__/              # Test files
│   ├── components/         # Component tests
│   ├── hooks/             # Hook tests
│   ├── lib/               # Library tests
│   └── ...
├── jest.config.js         # Jest configuration
├── jest.setup.js          # Test setup
└── ...
```

### Running Frontend Tests

#### All Tests
```bash
cd backend-v2/frontend-v2
npm test
```

#### Watch Mode (Development)
```bash
npm test -- --watch
```

#### With Coverage
```bash
npm test -- --coverage
```

#### Update Snapshots
```bash
npm test -- --updateSnapshot
```

#### Specific Test Files
```bash
npm test LoginPage.test.tsx
```

#### Pattern Matching
```bash
npm test -- --testNamePattern="should render"
```

### Coverage Requirements

- Minimum thresholds (configured in `jest.config.js`):
  - Branches: 50%
  - Functions: 50%
  - Lines: 50%
  - Statements: 50%

### Test Categories

**Component Tests:**
- Located in `__tests__/components/`
- Test React components in isolation
- Use React Testing Library

**Hook Tests:**
- Located in `__tests__/hooks/`
- Test custom React hooks
- Use `@testing-library/react-hooks`

**API Client Tests:**
- Located in `__tests__/lib/`
- Test API client functions
- Mock fetch/axios calls

**Integration Tests:**
- Located in `tests/e2e/`
- Test full user flows
- Use Playwright for browser automation

## E2E Testing

### Playwright Tests
```bash
cd backend-v2/frontend-v2
npm run test:e2e
```

### Manual Browser Tests
Various browser test scripts are available:
```bash
node test-auth-flow.js
node test-calendar-comprehensive.js
node test-mobile-ui.js
```

## Test Organization Best Practices

### Backend Test Structure
```python
# tests/test_feature.py
import pytest
from fastapi.testclient import TestClient

@pytest.mark.unit
def test_unit_functionality():
    """Test individual functions"""
    pass

@pytest.mark.integration
def test_integration_flow(client: TestClient):
    """Test API endpoints"""
    pass

@pytest.mark.api
def test_api_endpoint(client: TestClient):
    """Test specific API behavior"""
    pass
```

### Frontend Test Structure
```typescript
// __tests__/Component.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<Component />)
    await user.click(screen.getByRole('button'))
    // assertions
  })
})
```

## Troubleshooting

### Backend Test Issues

**ModuleNotFoundError:**
```bash
# Install missing dependencies
pip install -r requirements.txt
```

**Database Connection Errors:**
```bash
# Ensure test database is created
export DATABASE_URL="sqlite:///./test.db"
```

**Fixture Errors:**
- Check `conftest.py` for fixture definitions
- Ensure test database is clean between runs

### Frontend Test Issues

**Module Resolution Errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

**Transform Errors:**
- Check `jest.config.js` transform settings
- Ensure babel presets are correct

**Snapshot Mismatches:**
- Review changes carefully
- Update if changes are intentional
- Use `npm test -- -u` to update all

### Common Issues

1. **Tests hanging:** Check for unhandled promises or open connections
2. **Flaky tests:** Add proper waits and assertions
3. **Coverage gaps:** Run coverage report to identify untested code
4. **Slow tests:** Use markers to separate unit/integration tests

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Pushes to main branch
- Nightly schedules

### Pre-commit Hooks
Install pre-commit hooks:
```bash
pre-commit install
```

This runs:
- Linting (flake8, ESLint)
- Type checking (mypy, TypeScript)
- Fast unit tests

## Performance Testing

### Load Testing
```bash
cd backend-v2
python performance_test_simplified.py
```

### Benchmark Suite
```bash
python run_performance_benchmark.py
```

## Security Testing

### Security Audit
```bash
python security_audit_comprehensive.py
```

### Vulnerability Scanning
```bash
# Backend
pip install safety
safety check

# Frontend
npm audit
```

## Best Practices

1. **Write tests first** (TDD approach)
2. **Keep tests focused** - one assertion per test when possible
3. **Use descriptive names** - test names should explain what they test
4. **Mock external services** - don't hit real APIs in tests
5. **Clean up after tests** - ensure no side effects
6. **Run tests frequently** - before committing code
7. **Maintain test coverage** - aim for >80% coverage
8. **Review test failures** - don't ignore or skip failing tests

## Additional Resources

- [pytest documentation](https://docs.pytest.org/)
- [Jest documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

Last Updated: 2025-07-03