# Test Checklist for 6FB Booking Backend v2

## Pre-Feature Completion Checklist

### 🔍 Quick Commands
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run tests matching pattern
pytest -k "booking"

# Run with verbose output
pytest -v
```

---

## ✅ Backend API Testing

### Core Functionality
- [ ] All new endpoints have corresponding tests
- [ ] Authentication/authorization is tested
- [ ] Input validation is tested (valid and invalid cases)
- [ ] Error responses return correct status codes
- [ ] Database operations are tested (CRUD)
- [ ] Business logic edge cases are covered

### API Specific
- [ ] Request/response schemas match OpenAPI spec
- [ ] Pagination works correctly (if applicable)
- [ ] Filtering/sorting works as expected
- [ ] Rate limiting is tested (if implemented)
- [ ] CORS headers are correct

### Performance
- [ ] API responds within acceptable time (<200ms for simple queries)
- [ ] Database queries are optimized (no N+1 problems)
- [ ] Bulk operations handle large datasets

---

## 🎨 Frontend Testing (if applicable)

### Component Testing
- [ ] New components have unit tests
- [ ] Props validation is tested
- [ ] User interactions work correctly
- [ ] Error states are handled
- [ ] Loading states are displayed

### Integration
- [ ] API calls work correctly
- [ ] Error handling from API is proper
- [ ] Authentication flow works
- [ ] Form submissions are validated

---

## 🔗 Integration Testing

### End-to-End Flows
- [ ] Complete user journey works (signup → login → action → logout)
- [ ] Booking flow works end-to-end
- [ ] Payment processing completes successfully
- [ ] Email notifications are sent
- [ ] Calendar sync works (if enabled)

### External Services
- [ ] Stripe webhooks are handled correctly
- [ ] Email service integration works
- [ ] SMS notifications send (if applicable)
- [ ] Third-party APIs respond as expected

---

## 🖱️ Manual Testing

### User Experience
- [ ] Feature works as described in requirements
- [ ] UI is responsive on mobile/tablet/desktop
- [ ] No console errors in browser
- [ ] Forms have proper validation messages
- [ ] Success/error messages are clear

### Cross-Browser
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge

### Security
- [ ] No sensitive data in console logs
- [ ] API keys not exposed in frontend
- [ ] SQL injection attempts fail
- [ ] XSS attempts are blocked
- [ ] CSRF protection works

---

## 🚨 If Tests Fail

1. **Read the error message carefully**
   - Note the test name and line number
   - Check the assertion that failed

2. **Common fixes:**
   - Update test data/fixtures
   - Fix the implementation (not the test!)
   - Check for environment differences
   - Ensure database is in clean state

3. **Debug commands:**
   ```bash
   # Run single test with print statements
   pytest -s tests/test_file.py::test_name
   
   # Run with debugger
   pytest --pdb tests/test_file.py::test_name
   
   # Show local variables on failure
   pytest -l
   ```

---

## 📝 When to Update Tests

### Always update tests when:
- [ ] Adding new features/endpoints
- [ ] Changing business logic
- [ ] Modifying database schema
- [ ] Updating API contracts
- [ ] Fixing bugs (add regression test)

### Test maintenance:
- [ ] Remove obsolete tests
- [ ] Update test data to match reality
- [ ] Refactor duplicate test code
- [ ] Keep tests fast and focused

---

## 🎯 Final Checks

Before marking feature complete:
- [ ] All automated tests pass
- [ ] Coverage hasn't decreased significantly
- [ ] Manual testing completed
- [ ] No new security vulnerabilities
- [ ] Performance is acceptable
- [ ] Documentation is updated
- [ ] Code is reviewed (if team setting)

### Quick Validation
```bash
# Run this before pushing
pytest && echo "✅ All tests passed!"

# Check coverage
pytest --cov=app --cov-report=term-missing
```

---

## 📌 Important Notes

1. **Never skip tests** - If pressed for time, write basic tests at minimum
2. **Test the unhappy path** - Error cases are as important as success cases
3. **Keep tests independent** - Each test should run in isolation
4. **Use fixtures** - Don't repeat test setup code
5. **Test data should be realistic** - Use production-like data

### Red Flags 🚩
- Commenting out failing tests
- Modifying tests to make them pass
- Tests that only pass in specific order
- Tests that pass locally but fail in CI
- Extremely slow tests (>1 second each)

---

**Remember**: A feature isn't done until it's tested! 🧪