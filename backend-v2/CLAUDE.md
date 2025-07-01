# CLAUDE.md - Backend V2 Specific Guidelines

This file provides guidance to Claude Code when working with the backend-v2 implementation.

## 🧪 Testing Requirements (CRITICAL)

### Test-First Development Approach
1. **Write tests BEFORE implementation** for all new features
2. **Run existing tests** before modifying any code
3. **Ensure all tests pass** before marking any task complete
4. **Follow TDD cycle**: Red → Green → Refactor

### Test Commands for V2 System
```bash
# Essential test commands
cd backend-v2

# Run all tests with coverage
pytest --cov=. --cov-report=term-missing

# Run specific test categories
pytest tests/unit/              # Unit tests only
pytest tests/integration/       # Integration tests
pytest tests/e2e/              # End-to-end tests

# Run tests for specific module
pytest tests/unit/test_auth.py
pytest -k "test_booking"       # Pattern matching

# Quick test run (fail fast)
pytest -x --tb=short          # Stop on first failure

# Test with different configurations
pytest --env=test             # Test environment
pytest --env=dev              # Development environment

# Parallel test execution
pytest -n auto                # Use all CPU cores

# Generate test report
pytest --html=test-report.html --self-contained-html
```

### Testing Strategy References
- **Comprehensive Strategy**: See `TESTING_STRATEGY.md` for detailed testing approach
- **Quick Checklist**: Use `TEST_CHECKLIST.md` before completing features
- **Test Categories**: Unit, Integration, E2E, Performance, Security

### Test Coverage Requirements
- **Minimum Coverage**: 80% for all new code
- **Critical Paths**: 95% coverage for auth, payments, bookings
- **Integration Tests**: Required for all API endpoints
- **E2E Tests**: Required for complete user flows

## 🛡️ V2 Safety Protocols

### Before ANY Code Changes:
```bash
# V2 specific pre-work checklist
cd backend-v2
python utils/duplication_detector.py      # Check for duplicates
python utils/registry_manager.py list     # Review existing features
pytest --collect-only                     # Verify test discovery
git status                               # Clean working directory
```

### During Development:
1. **Check duplication first**: Use registry before adding features
2. **Write test first**: Follow TDD approach
3. **Run tests frequently**: After every significant change
4. **Validate with tools**: Use duplication detector regularly
5. **Update registry**: After successful feature migration

### Feature Completion Checklist:
- [ ] All tests written and passing
- [ ] No duplicate implementations
- [ ] Feature registered in registry
- [ ] Performance tests passing
- [ ] Security tests passing
- [ ] Documentation updated

## 📂 V2 Project Structure

```
backend-v2/
├── tests/                    # Comprehensive test suite
│   ├── unit/                # Unit tests for individual components
│   ├── integration/         # API integration tests
│   ├── e2e/                # End-to-end user flow tests
│   ├── performance/         # Load and performance tests
│   └── conftest.py         # Pytest configuration and fixtures
├── utils/                   # V2 specific utilities
│   ├── duplication_detector.py  # Prevent code duplication
│   ├── registry_manager.py      # Feature registry management
│   └── test_helpers.py          # Testing utilities
├── core/                    # Core business logic (clean architecture)
├── api/                     # FastAPI routes and endpoints
├── models/                  # SQLAlchemy models
├── services/               # Business services layer
└── config/                 # Configuration management
```

## 🔄 V2 Migration Workflow

1. **Check Registry First**
   ```bash
   python utils/registry_manager.py check [feature_name]
   ```

2. **Write Tests**
   - Create test file in appropriate directory
   - Write failing tests for expected behavior
   - Follow test naming convention: `test_[feature]_[scenario].py`

3. **Implement Feature**
   - Use clean architecture principles
   - Single implementation only (no variants)
   - Follow existing patterns

4. **Verify Tests Pass**
   ```bash
   pytest tests/[feature_area]/ -v
   ```

5. **Register Feature**
   ```bash
   python utils/registry_manager.py add [feature] [category] [path] [description]
   ```

## 🚨 V2 Specific Rules

1. **NO Feature Variants**: One implementation per feature
2. **Test Coverage Required**: No feature complete without tests
3. **Registry Compliance**: All features must be registered
4. **Clean Architecture**: Maintain separation of concerns
5. **Performance First**: Test performance impact of changes

## 🔧 Common V2 Tasks

### Adding a New Endpoint
```bash
# 1. Check if similar exists
python utils/registry_manager.py search [endpoint_name]

# 2. Create test first
touch tests/integration/test_[endpoint_name].py

# 3. Run test (should fail)
pytest tests/integration/test_[endpoint_name].py

# 4. Implement endpoint
# ... code implementation ...

# 5. Verify tests pass
pytest tests/integration/test_[endpoint_name].py -v

# 6. Register endpoint
python utils/registry_manager.py add [endpoint_name] api "api/v2/endpoints/[file].py" "[description]"
```

### Debugging Test Failures
```bash
# Verbose output
pytest -vv tests/failing_test.py

# Debug with pdb
pytest --pdb tests/failing_test.py

# Show local variables on failure
pytest -l tests/failing_test.py

# Generate detailed HTML report
pytest --html=debug-report.html --self-contained-html tests/failing_test.py
```

## 📋 Quick Reference

### Must Read Documents:
- `TESTING_STRATEGY.md` - Comprehensive testing approach
- `TEST_CHECKLIST.md` - Pre-completion checklist
- `STREAMLINED_WORKFLOW.md` - Overall development workflow
- `../PROTECTED_FILES.md` - Files that should not be modified

### Key Commands:
```bash
# Before starting work
python utils/duplication_detector.py
pytest --collect-only

# During development
pytest -x --tb=short              # Quick test run
python utils/registry_manager.py check [feature]

# Before completing feature
pytest --cov=[module] --cov-report=term-missing
python utils/registry_manager.py add [feature] [details]
```

### Emergency Recovery:
```bash
# If tests are failing after changes
git stash                        # Save current changes
pytest                           # Verify tests pass on clean state
git stash pop                    # Restore changes
pytest --lf                      # Run last failed tests only
```

---
Last updated: 2025-06-28