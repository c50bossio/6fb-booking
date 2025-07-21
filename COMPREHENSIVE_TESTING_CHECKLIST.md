# 📋 Comprehensive Testing Checklist for 6FB Booking

**Based on project documentation analysis and gap assessment**

This document consolidates ALL testing requirements found in the project documentation and provides clear implementation guidance for developers working with Claude Code.

---

## 🚨 **MANDATORY TESTING PROTOCOL**

### ⚡ **Before Claiming ANY Work Complete**
**ALL of these items MUST be checked off:**

- [ ] **Backend tests passing**: `cd backend-v2 && pytest` (0 errors, 80%+ coverage)
- [ ] **Frontend tests passing**: `cd backend-v2/frontend-v2 && npm test` (0 errors)  
- [ ] **Linting passing**: `npm run lint` and `npx tsc --noEmit` (0 errors)
- [ ] **Browser logs clean**: No JavaScript errors in production build
- [ ] **API integration verified**: All endpoints responding correctly
- [ ] **Manual testing completed**: Feature works end-to-end with real data

---

## 🎯 **TESTING REQUIREMENTS BY CATEGORY**

### 1. **Coverage Requirements**
- **Backend**: 80% minimum coverage, 95% for critical paths (auth, payments, booking)
- **Frontend**: 80% minimum coverage for components and utilities
- **Integration**: 100% coverage for user flows (booking → payment → confirmation)
- **E2E**: Complete user journey testing with Puppeteer automation

### 2. **Browser Logs MCP (Mandatory for Frontend)**
**NEVER debug frontend issues without browser logs MCP connection**

#### Setup Verification:
- [ ] Chrome running with `--remote-debugging-port=9222`
- [ ] Browser logs MCP server configured and running
- [ ] Dependencies installed: `pip install -r browser-logs-mcp-requirements.txt`

#### Required Usage:
- [ ] **Before debugging**: `connect_to_browser`
- [ ] **For errors**: `get_javascript_errors since_minutes=15`
- [ ] **For API issues**: `get_network_requests status_code=404 since_minutes=10`
- [ ] **During testing**: `watch_logs_live duration_seconds=60`

### 3. **Puppeteer E2E Testing**
**Comprehensive automation for critical user flows**

#### Test Categories (All Required):
- [ ] **Auth Flow**: Registration, login, logout, password reset
- [ ] **Booking Flow**: Service selection, time slot, payment, confirmation
- [ ] **Dashboard Testing**: Barber dashboard, client dashboard, admin panel
- [ ] **Mobile Responsive**: All features work on mobile/tablet/desktop
- [ ] **Performance**: Page load times <2 seconds, API responses <500ms
- [ ] **Error Handling**: Graceful failures, proper error messages

#### Commands:
```bash
# Run full E2E suite
cd backend-v2/frontend-v2 && npm run test:e2e

# Run specific flows
node test_login_puppeteer.js
node check_calendar_puppeteer.js
node test_review_system_puppeteer.js
```

### 4. **Manual Testing Requirements**
**Human verification of automated tests**

#### Cross-Browser Testing (Required):
- [ ] **Chrome** (latest version)
- [ ] **Firefox** (latest version) 
- [ ] **Safari** (latest version)
- [ ] **Edge** (latest version)

#### Device Testing (Required):
- [ ] **Desktop** (1920x1080, 1366x768)
- [ ] **Tablet** (768x1024, 1024x768)
- [ ] **Mobile** (375x667, 414x896, 360x640)

#### User Journey Testing:
- [ ] **Guest booking**: Complete appointment booking without account
- [ ] **Account creation**: Post-booking account signup flow
- [ ] **Client dashboard**: View, edit, reschedule appointments
- [ ] **Payment processing**: Card on file, payment methods, receipts
- [ ] **SMS/Email notifications**: Reminders, confirmations, updates

### 5. **Real Data Testing (Staging Environment)**
**Production-like testing with realistic data**

#### Staging Setup:
- [ ] **Database**: PostgreSQL with realistic test data (NOT production data)
- [ ] **Environment**: staging.bookedbarber.com or local staging
- [ ] **API Keys**: Live keys for Stripe, SendGrid, Twilio (test modes)
- [ ] **Volume testing**: 100+ fake appointments, users, transactions

#### Data Requirements:
- [ ] **Users**: 50+ fake barbers, 200+ fake clients
- [ ] **Appointments**: Various states (pending, confirmed, completed, cancelled)
- [ ] **Payments**: Multiple payment methods, refunds, failed payments
- [ ] **Notifications**: SMS and email delivery testing
- [ ] **Calendar sync**: Google Calendar integration testing

### 6. **Backend ↔ Frontend Integration**
**End-to-end API and UI integration verification**

#### API Integration Tests:
- [ ] **Authentication**: JWT token flow, refresh tokens, logout
- [ ] **Booking System**: Create, read, update, delete appointments
- [ ] **Payment Processing**: Stripe Connect integration, webhooks
- [ ] **Calendar Sync**: Google Calendar API bidirectional sync
- [ ] **Notifications**: SMS/email triggers and delivery
- [ ] **File Upload**: Image handling for profiles, service photos

#### WebSocket Testing:
- [ ] **Real-time updates**: Appointment status changes
- [ ] **Calendar sync**: Live calendar updates
- [ ] **Notifications**: Real-time notification delivery

### 7. **Security Testing**
**Verify security measures and compliance**

#### Authentication & Authorization:
- [ ] **SQL Injection**: Test API endpoints for injection vulnerabilities
- [ ] **XSS Protection**: Verify user input sanitization
- [ ] **CSRF Protection**: Test token validation
- [ ] **Rate Limiting**: API endpoint rate limiting functional
- [ ] **Session Management**: Proper token expiration and refresh

#### Data Privacy:
- [ ] **GDPR Compliance**: Data export, deletion requests
- [ ] **PCI Compliance**: No card data stored, Stripe compliance
- [ ] **HIPAA Considerations**: Client data protection (if applicable)

### 8. **Performance Testing**
**Ensure scalability and responsiveness**

#### Load Testing:
- [ ] **Concurrent Users**: 100+ users booking simultaneously
- [ ] **Database Performance**: Complex queries <50ms response
- [ ] **API Response Times**: <200ms for standard endpoints
- [ ] **Static Asset Delivery**: <100ms with CDN
- [ ] **Memory Usage**: No memory leaks during long sessions

#### Scalability Testing:
- [ ] **Database Connections**: Connection pooling under load
- [ ] **Background Tasks**: Email/SMS queuing and processing
- [ ] **Caching**: Redis cache hit rates >90%

---

## 🔧 **TESTING WORKFLOWS**

### Pre-Work Testing Checklist
**Before starting ANY development task:**

1. [ ] Clean git status: `git status` shows no uncommitted changes
2. [ ] Tests passing: `./scripts/parallel-tests.sh` completes successfully
3. [ ] Linting clean: `npm run lint` passes without errors
4. [ ] Browser logs MCP ready: Chrome debugging port available
5. [ ] Development servers running: Backend (8000), Frontend (3000)

### Development Testing Workflow
**During feature implementation:**

1. [ ] **Write tests FIRST** (TDD approach): Red → Green → Refactor
2. [ ] **Run tests after each change**: Quick feedback loop
3. [ ] **Use browser logs MCP**: Real-time debugging during development
4. [ ] **Test incrementally**: Don't wait until feature complete
5. [ ] **Fix linting immediately**: Never accumulate technical debt

### Completion Criteria Checklist
**Before marking ANY task as complete:**

1. [ ] **Unit tests**: All new code has unit test coverage
2. [ ] **Integration tests**: API endpoints tested with realistic data
3. [ ] **E2E tests**: Complete user flow tested with Puppeteer
4. [ ] **Manual verification**: Human testing on multiple browsers
5. [ ] **Performance check**: No regressions in page load times
6. [ ] **Security scan**: No new vulnerabilities introduced
7. [ ] **Documentation updated**: README, API docs, inline comments
8. [ ] **Feature registered**: Added to feature registry for future reference

---

## 🚨 **HOOK-BASED VERIFICATION SYSTEM**

### Automatic Verification (Cannot Be Bypassed)
The project includes automated hooks that verify functionality:

#### Frontend Changes:
- **Trigger**: Editing `*.tsx`, `*.ts`, `*.js` files in frontend-v2/
- **Action**: Connects to browser, checks for JavaScript errors, verifies pages load
- **Blocking**: Cannot proceed if pages don't load successfully

#### Backend Changes:
- **Trigger**: Editing routers/, services/, models/ files  
- **Action**: Tests API endpoints, validates parameters, checks error handling
- **Blocking**: Prevents completion if API endpoints fail

#### Analytics Changes:
- **Trigger**: Editing analytics-related files
- **Action**: Tests data processing, validates calculations, checks for toFixed() errors
- **Blocking**: Ensures analytics pages display data correctly

### Hook Bypass (Emergency Only)
```bash
# Only for critical fixes when hooks incorrectly block
export CLAUDE_BYPASS_HOOKS=true
# Remember to unset after emergency work
unset CLAUDE_BYPASS_HOOKS
```

---

## 📊 **TESTING METRICS & SUCCESS CRITERIA**

### Code Quality Metrics:
- **Test Coverage**: Backend 80%+, Frontend 80%+, Critical paths 95%+
- **Linting**: Zero warnings or errors in production builds
- **TypeScript**: Zero type errors, strict mode enabled
- **Bundle Size**: Frontend bundle <500KB gzipped

### Performance Metrics:
- **Page Load**: <2 seconds on 3G connection
- **API Response**: <200ms for standard endpoints, <500ms for complex queries
- **Database Queries**: <50ms for standard operations
- **Memory Usage**: <100MB baseline, no leaks over 24 hours

### User Experience Metrics:
- **Accessibility**: WCAG AA compliance, contrast ratios >3:1
- **Mobile Responsiveness**: All features work on 360px+ screens
- **Browser Compatibility**: 99%+ feature parity across Chrome, Firefox, Safari, Edge
- **Error Handling**: Graceful degradation, user-friendly error messages

### Production Readiness:
- **Functionality**: 95%+ feature completion before deployment
- **Security**: Zero high/critical vulnerabilities in security scans
- **Monitoring**: Health checks, error tracking, performance monitoring active
- **Documentation**: Complete API documentation, user guides, troubleshooting

---

## 🛠️ **TESTING TOOLS & COMMANDS**

### Backend Testing:
```bash
# Full test suite with coverage
cd backend-v2 && python -m pytest --cov=. --cov-report=html

# Specific test categories
pytest tests/unit/          # Unit tests only
pytest tests/integration/   # Integration tests only  
pytest tests/e2e/          # End-to-end tests only

# Performance testing
pytest tests/performance/ -v --tb=short
```

### Frontend Testing:
```bash
# Full test suite with coverage
cd backend-v2/frontend-v2 && npm test -- --coverage

# Specific test types
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # Puppeteer E2E tests
npm run test:visual       # Visual regression tests
```

### Combined Testing:
```bash
# Run all tests in parallel
./scripts/parallel-tests.sh

# Pre-commit testing
./scripts/pre-commit-tests.sh

# Staging environment tests
./scripts/staging-tests.sh
```

### Browser Logs MCP:
```bash
# Setup Chrome debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb

# Connect to browser (in Claude)
connect_to_browser

# Common debugging commands
get_console_logs level="error" since_minutes=5
get_network_requests status_code=404 since_minutes=10
watch_logs_live duration_seconds=30 include_network=true
```

---

## 🚨 **CRITICAL FAILURE CONDITIONS**

### Never Mark Work Complete If:
- [ ] **Tests failing**: Any test failures in backend or frontend
- [ ] **Linting errors**: ESLint, TypeScript, or Python linting failures
- [ ] **JavaScript errors**: Console errors in production builds
- [ ] **API failures**: 404/500 errors from backend endpoints
- [ ] **Performance regressions**: Page load times increased >20%
- [ ] **Security vulnerabilities**: New vulnerabilities introduced
- [ ] **Accessibility failures**: WCAG violations or contrast issues
- [ ] **Browser incompatibility**: Features broken in target browsers

### Escalation Process:
1. **Fix immediately**: If possible to resolve quickly
2. **Document blocker**: Create detailed issue with reproduction steps
3. **Seek help**: Ask for guidance on complex issues
4. **Never skip**: Don't mark complete with known issues

---

## 📚 **TESTING RESOURCES & DOCUMENTATION**

### Project-Specific Guides:
- `backend-v2/tests/README.md` - Backend testing guide
- `backend-v2/frontend-v2/__tests__/README.md` - Frontend testing guide  
- `BROWSER_LOGS_MCP_SETUP.md` - Browser debugging setup
- `PUPPETEER_ANALYSIS_README.md` - E2E testing guide

### External Resources:
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Puppeteer API Documentation](https://pptr.dev/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Quick References:
- **Test Coverage Reports**: `backend-v2/htmlcov/index.html`
- **Frontend Coverage**: `backend-v2/frontend-v2/coverage/lcov-report/index.html`
- **Hook Logs**: `.claude/hooks.log`
- **Browser Logs**: Chrome DevTools → Console/Network tabs

---

## ✅ **SUCCESS INDICATORS**

### You'll Know Testing Is Adequate When:
- [ ] All automated tests pass consistently
- [ ] Manual testing reveals no critical issues  
- [ ] Performance metrics meet all targets
- [ ] Security scans show no vulnerabilities
- [ ] Feature works identically across all target browsers
- [ ] Real users can complete core workflows without assistance
- [ ] Error handling provides clear guidance for recovery
- [ ] System gracefully handles edge cases and failures

### Ready for Production When:
- [ ] 95%+ functionality implemented and tested
- [ ] Load testing passes with expected user volumes
- [ ] Security audit completed with no critical findings
- [ ] Documentation complete for users and developers
- [ ] Monitoring and alerting configured
- [ ] Rollback plan tested and ready
- [ ] Team trained on new features and troubleshooting

---

**Remember: Testing is not optional. A feature without comprehensive testing is not complete.**

*This checklist ensures the documented testing requirements are followed and the 95%+ production readiness standard is met.*