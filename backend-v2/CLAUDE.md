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

## 🚨 SERVER CRASH RECOVERY PROTOCOL

### **Emergency Server Recovery (Critical Issues)**

When the frontend development server crashes or becomes unresponsive:

#### **Phase 1: Immediate Assessment**
```bash
# Check server status
ps aux | grep "next dev" | grep -v grep
lsof -i :3000 :8000

# Check recent error patterns
tail -n 50 frontend-v2/server_output.log | grep -E "(Error|Failed|Cannot find)"
```

#### **Phase 2: Process Cleanup**
```bash
# Kill all Node.js processes
pkill -f "next dev"
pkill -f "npm run dev"

# Force kill if needed
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Clear process locks
rm -f frontend-v2/dev-server.pid frontend-v2/frontend.pid
```

#### **Phase 3: Cache Cleanup**
```bash
# Remove corrupted build cache
rm -rf frontend-v2/.next
rm -rf frontend-v2/node_modules/.cache
rm -rf frontend-v2/tsconfig.tsbuildinfo

# Clear npm cache if needed
npm cache clean --force
```

#### **Phase 4: Dependency Validation**
```bash
# Use automated hook to check dependencies
.claude/scripts/validate-dependencies.sh frontend-v2/components/UnifiedCalendar.tsx

# Or manually check for missing imports
find frontend-v2/components -name "*.tsx" -exec grep -l "import.*@/" {} \; | head -5
```

### **Common Server Crash Patterns**

#### **1. Missing Import Dependencies**
**Symptoms:**
- `Error: Cannot find module './9774.js'`
- Webpack module resolution errors
- Pages return 404 despite existing

**Resolution:**
```bash
# Find missing dependencies
grep -r "import.*@/lib/" frontend-v2/components/ | grep -E "(touch-utils|appointment-conflicts|calendar-constants)"

# Create missing files with basic exports
touch frontend-v2/lib/touch-utils.ts
touch frontend-v2/lib/appointment-conflicts.ts
touch frontend-v2/hooks/useCalendarAccessibility.ts
touch frontend-v2/hooks/useResponsive.ts
touch frontend-v2/lib/calendar-constants.ts
touch frontend-v2/styles/calendar-animations.css
```

#### **2. Circular Import Dependencies**
**Symptoms:**
- Server starts but pages fail to load
- Webpack compilation hangs
- Memory usage spikes

**Resolution:**
```bash
# Use automated detection
.claude/scripts/detect-import-cycles.sh frontend-v2/components/UnifiedCalendar.tsx

# Manual check for circular imports
grep -r "import.*UnifiedCalendar" frontend-v2/app/
grep -r "import.*CalendarWeekView" frontend-v2/components/
```

#### **3. TypeScript Compilation Errors**
**Symptoms:**
- Build fails with type errors
- Components not rendering
- Hot reload stops working

**Resolution:**
```bash
# Test compilation
npx tsc --noEmit --skipLibCheck frontend-v2/components/UnifiedCalendar.tsx

# Check for common issues
grep -E "(any\[\]|object\[\]|Function)" frontend-v2/components/UnifiedCalendar.tsx
```

#### **4. Multiple Server Conflicts**
**Symptoms:**
- `EADDRINUSE` port conflicts
- Multiple processes running
- Inconsistent behavior

**Resolution:**
```bash
# Use comprehensive cleanup
.claude/scripts/cleanup-all-servers.sh

# Manual cleanup
pkill -f "next dev" && sleep 2
cd frontend-v2 && npm run dev
```

### **Rapid Recovery Commands**

#### **Quick Fix (Under 60 seconds)**
```bash
# One-liner emergency recovery
cd frontend-v2 && pkill -f "next dev"; rm -rf .next; npm run dev
```

#### **Complete Reset (Under 5 minutes)**
```bash
# Full environment reset
cd frontend-v2
pkill -f "next dev"
rm -rf .next node_modules/.cache tsconfig.tsbuildinfo
npm cache clean --force
npm install
npm run dev
```

#### **Dependency Recovery**
```bash
# Create minimal missing dependencies
echo "export {};" > lib/touch-utils.ts
echo "export {};" > lib/appointment-conflicts.ts
echo "export const useCalendarAccessibility = () => ({});" > hooks/useCalendarAccessibility.ts
echo "export const useResponsive = () => ({});" > hooks/useResponsive.ts
echo "export {};" > lib/calendar-constants.ts
touch styles/calendar-animations.css
```

### **Prevention with Claude Hooks**

The frontend now has automated prevention hooks at `.claude/hooks.json`:

- **`dependency_validation`**: Blocks edits if imports don't exist
- **`server_stability_check`**: Tests compilation after component creation  
- **`build_cache_monitor`**: Detects corrupted cache states
- **`import_cycle_detection`**: Prevents circular import issues

#### **Hook Override (Emergency Only)**
```bash
# Bypass hooks for critical fixes
export CLAUDE_BYPASS_HOOKS=true
# Remember to unset after emergency work
unset CLAUDE_BYPASS_HOOKS
```

### **Server Health Monitoring**

#### **Real-time Server Status**
```bash
# Monitor server health
watch "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"

# Watch error logs
tail -f frontend-v2/server_output.log | grep -E "(Error|Failed|Warning)"
```

#### **Performance Indicators**
- **Normal**: Server starts in <5 seconds
- **Warning**: Server takes >10 seconds to start
- **Critical**: Server fails to start or crashes within 1 minute

### **Escalation Procedures**

#### **If Standard Recovery Fails:**
1. **Check for filesystem issues**: `df -h` and `ls -la frontend-v2/`
2. **Verify Node.js version**: `node --version` (should be 18+)
3. **Check system resources**: `htop` or `top`
4. **Review recent changes**: `git log --oneline -10`
5. **Consider environment variables**: Check `.env.local` for corruption

#### **Nuclear Option (Last Resort)**
```bash
# Complete repository reset
git stash
git clean -fdx
git reset --hard HEAD
npm install
cd frontend-v2 && npm install && npm run dev
```

### **Post-Recovery Verification**

After successful recovery:
```bash
# Verify pages load
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/dashboard
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/calendar

# Test hooks are working
.claude/scripts/validate-dependencies.sh frontend-v2/components/UnifiedCalendar.tsx
```

### **Documentation Updates**

When encountering new crash patterns:
1. **Document the symptoms** in this section
2. **Add recovery steps** with tested commands
3. **Update hook scripts** if prevention is possible
4. **Commit changes** to preserve institutional knowledge
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

## 🚀 Marketing Integration Guidelines (2025-07-02)

### OAuth Implementation Pattern
```python
# services/oauth_service.py
class OAuthService:
    """Centralized OAuth management for marketing integrations"""
    
    async def initiate_oauth(self, provider: str, user_id: int) -> dict:
        """Returns OAuth authorization URL and state"""
        pass
    
    async def handle_callback(self, provider: str, code: str, state: str) -> dict:
        """Processes OAuth callback and stores tokens"""
        pass
    
    async def refresh_token(self, provider: str, user_id: int) -> dict:
        """Refreshes expired OAuth tokens"""
        pass
```

### Review Management Pattern
```python
# services/review_service.py
class ReviewService:
    """Automated review fetching and response generation"""
    
    async def fetch_reviews(self, provider: str, location_id: str) -> List[Review]:
        """Fetches reviews from GMB, Yelp, etc."""
        pass
    
    async def generate_response(self, review: Review) -> str:
        """Generates SEO-optimized response based on templates"""
        pass
    
    async def post_response(self, review_id: str, response: str) -> bool:
        """Posts response back to review platform"""
        pass
```

### Conversion Tracking Pattern
```python
# services/tracking_service.py
class TrackingService:
    """Unified conversion tracking across platforms"""
    
    async def track_event(self, event_type: str, data: dict) -> None:
        """Sends conversion events to GTM, Meta Pixel, etc."""
        pass
    
    async def get_conversion_data(self, date_range: DateRange) -> dict:
        """Retrieves conversion analytics"""
        pass
```

### Testing Requirements
```python
# tests/integration/test_marketing_integrations.py
@pytest.mark.asyncio
async def test_oauth_flow():
    """Test complete OAuth flow with mock provider"""
    pass

async def test_review_response_generation():
    """Test SEO-optimized response templates"""
    pass

async def test_conversion_tracking():
    """Test event tracking accuracy"""
    pass
```

### Database Schema Updates
```sql
-- New tables for marketing features
CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    provider VARCHAR(50),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_templates (
    id SERIAL PRIMARY KEY,
    rating_range VARCHAR(10),
    template_type VARCHAR(50),
    template_text TEXT,
    seo_keywords TEXT[],
    active BOOLEAN DEFAULT true
);

CREATE TABLE conversion_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    user_id INTEGER,
    appointment_id INTEGER,
    revenue DECIMAL(10,2),
    metadata JSONB,
    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Common Fixes Applied

### Login API Field Mismatch (Fixed 2025-07-01)
The V2 backend now uses `email` field instead of `username` for login:
- **Schema**: `UserLogin` expects `{ email: string, password: string }`
- **Frontend**: Sends `{ email, password }` in login requests
- **Backend**: `authenticate_user` function uses email parameter

If you encounter login issues:
1. Ensure frontend sends `email` field (not `username`)
2. Clear browser cache and Next.js cache: `rm -rf .next`
3. Hard refresh browser: `Cmd+Shift+R` or `Ctrl+Shift+R`

### Bookings/Appointments Endpoint Confusion (Fixed 2025-07-03)
**CRITICAL**: The endpoint `/api/v1/bookings/my` does NOT exist and never has!

- **Common Error**: 422 Unprocessable Entity when calling `/bookings/my`
- **Root Cause**: Router interprets "my" as booking_id parameter
- **Correct Endpoints**:
  - `GET /api/v1/bookings/` - Get user's bookings (deprecated)
  - `GET /api/v1/appointments/` - Get user's appointments (preferred)
- **Migration Status**: Moving from "bookings" → "appointments" terminology

If you see 422 errors with `/bookings/my`:
1. Change to `/api/v1/bookings/` or `/api/v1/appointments/`
2. Check `ENDPOINT_MIGRATION_GUIDE.md` for full details
3. Always use `/appointments` endpoints for new code
4. Frontend `getMyBookings()` function already uses correct endpoint

## 🌍 Environment Management Guide (2025-07-03)

### Environment Overview
BookedBarber V2 uses a streamlined 3-environment setup:

| Environment | Frontend | Backend | Purpose | Database |
|-------------|----------|---------|---------|----------|
| **Development** | `localhost:3000` | `localhost:8000` | Daily development work | `6fb_booking.db` |
| **Cloud Staging** | `staging.bookedbarber.com` | `api-staging.bookedbarber.com` | Team demos & testing | PostgreSQL staging |
| **Production** | `bookedbarber.com` | `api.bookedbarber.com` | Live customer environment | PostgreSQL production |

### Environment Access for Claude Code

#### Development Environment (Default)
```bash
# Frontend
http://localhost:3000

# Backend API
http://localhost:8000
http://localhost:8000/docs  # API documentation

# Configuration
Environment: .env.development
Database: SQLite (6fb_booking.db)
Redis: Database 0
```

#### Cloud Staging Environment
```bash
# Frontend
https://staging.bookedbarber.com

# Backend API
https://api-staging.bookedbarber.com
https://api-staging.bookedbarber.com/docs

# Configuration
Environment: Cloud environment variables
Database: PostgreSQL staging cluster
Redis: ElastiCache staging
```

### Environment Switching Commands

#### Start Development (Default)
```bash
cd backend-v2

# Backend
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend-v2
npm run dev  # Runs on port 3000
```

For cloud staging, use the Render deployment at `staging.bookedbarber.com`

### Environment Management Scripts

#### Quick Environment Status
```bash
# Check which environments are running
npm run env

# Show port status
lsof -i :3000  # Development frontend
lsof -i :3001  # Staging frontend
lsof -i :8000  # Development backend
lsof -i :8001  # Staging backend
```

#### Development Scripts
```bash
# Start development environment
./scripts/start-dev.sh

# Reset staging data
./scripts/reset-staging.sh

# Switch to staging mode
./scripts/switch-to-staging.sh

# Switch back to development
./scripts/switch-to-dev.sh
```

### Environment Context Clues for Claude

#### When to Use Each Environment
1. **Use Development** when:
   - Working on new features
   - Debugging existing functionality
   - Daily development tasks
   - Running tests

2. **Use Staging (Local)** when:
   - Testing new features before demos
   - Validating database migrations
   - Testing integrations safely
   - Comparing old vs new functionality

3. **Use Staging (Cloud)** when:
   - Demonstrating features to stakeholders
   - Team collaboration and review
   - Client previews
   - Performance testing under real conditions

#### URL Reference for Claude
When Claude mentions URLs, always use the correct environment:

```bash
# ✅ Correct environment-specific URLs
Development: "localhost:3000" or "localhost:8000"
Cloud Staging: "staging.bookedbarber.com" or "api-staging.bookedbarber.com"
Production: "bookedbarber.com" or "api.bookedbarber.com"

# ❌ Avoid generic references
"localhost" (which port?)
"the app" (which environment?)
"the API" (which instance?)
```

### Environment Configuration Files

#### Environment Files Location
```bash
backend-v2/
├── .env                 # Development settings
├── .env.template        # Development template
├── .env.production.template  # Production template
└── config.py           # Configuration loader
```

#### Key Configuration Differences
```bash
# Development (Local)
PORT=8000
DATABASE_URL=sqlite:///./6fb_booking.db
REDIS_URL=redis://localhost:6379/0
DEBUG=true

# Production/Cloud Staging (Render)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DEBUG=false
```

## 🔧 Recent Infrastructure Fixes (2025-07-03)

### Middleware ASGI Compatibility Fixes
The following middleware issues were resolved to enable staging environment deployment:

#### MultiTenancyMiddleware Fix
- **Issue**: `TypeError: MultiTenancyMiddleware() takes no arguments`
- **Fix**: Added proper `__init__(self, app)` method and ASGI interface
- **Impact**: Enables location-based access control in staging environment

#### RequestValidationMiddleware Fix  
- **Issue**: `AttributeError: 'MutableHeaders' object has no attribute 'pop'`
- **Fix**: Changed `response.headers.pop("Server", None)` to `del response.headers["Server"]`
- **Impact**: Proper security header management in all environments

#### BlackoutDate Model Fix
- **Issue**: `AttributeError: module 'models' has no attribute 'BlackoutDate'`
- **Fix**: Resolved config module circular import and added missing Sentry configuration
- **Impact**: Enhanced recurring appointments service functionality

### Staging Environment Compatibility
All middleware now supports:
- ✅ Development environment (ports 3000/8000)
- ✅ Staging environment (ports 3001/8001)  
- ✅ Parallel operation without conflicts
- ✅ Environment-specific configuration loading

### Database Management

#### Database Separation
- **Development**: `6fb_booking.db` (SQLite)
- **Staging**: `staging_6fb_booking.db` (SQLite)
- **Cloud Staging**: PostgreSQL staging cluster
- **Production**: PostgreSQL production cluster

#### Migration Commands
```bash
# Development migrations
alembic upgrade head

# Development migrations
alembic upgrade head
```

### Troubleshooting Environment Issues

#### Port Conflicts
```bash
# Kill processes using staging ports
lsof -ti:3001 | xargs kill -9
lsof -ti:8001 | xargs kill -9

# Check what's using development ports
lsof -i :3000
lsof -i :8000
```

#### Environment Variable Issues
```bash
# Verify environment loading
cd backend-v2
python -c "from config import settings; print(f'Environment: {settings.environment}, Port: {settings.port}')"

```

#### Docker Environment Issues
```bash
# Check staging containers
docker-compose -f docker-compose.staging.yml ps

# View staging logs
```

### Staging Environment Troubleshooting

#### Common Staging Issues
```bash
# Middleware errors during startup
# Check staging backend logs
tail -f /Users/bossio/6fb-booking/backend-v2/staging_backend.log

# Port conflicts
lsof -ti:3001 | xargs kill -9  # Kill staging frontend
lsof -ti:8001 | xargs kill -9  # Kill staging backend

# Environment variable loading issues
python -c "from config import settings; print(settings.environment)"
```

### Best Practices for Environment Management

1. **Always specify environment** when giving instructions
2. **Use different ports** to avoid conflicts (3000/8000 vs 3001/8001)
3. **Keep environments isolated** (separate databases, Redis DBs)
4. **Test in staging first** before production deployment
5. **Document environment-specific configurations**
6. **Use environment-specific credentials** (test vs production keys)

## 🛡️ "DON'T BREAK WORKING THINGS" PROTECTION SYSTEM

### Core Principle
**Working systems must remain working.** Any change that breaks existing functionality is considered a critical failure, regardless of what new features it enables.

### 🚨 Critical Authentication Dependency Rules

#### Landing Page Independence (MANDATORY)
1. **Homepage (`app/page.tsx`) MUST NOT depend on authentication state**
   - No `useAuth` hooks in landing page components
   - No conditional rendering based on user login status
   - Must load completely even if backend is down
   - Use static CTAs as fallback, auth-aware CTAs as enhancement

2. **Error Boundary Requirements**
   - ALL authentication-dependent components MUST be wrapped in error boundaries
   - Error boundaries MUST provide static fallbacks
   - Never let auth failures crash entire pages

3. **Graceful Degradation Checklist**
   ```typescript
   // ✅ GOOD: Graceful degradation
   function AuthAwareCTA() {
     const { user, isLoading, error } = useAuth()
     
     // Show static CTA if auth fails
     if (error || !isLoading && !user) {
       return <StaticRegisterButton />
     }
     
     return user ? <DashboardButton /> : <RegisterButton />
   }
   
   // ❌ BAD: Crashes if auth fails
   function BadCTA() {
     const { user } = useAuth() // No error handling
     return user ? <Dashboard /> : <Login />
   }
   ```

#### Component Dependency Chain Rules

1. **Independent Component Design**
   - Components must work independently of external systems
   - Backend dependencies must have fallbacks
   - API failures must not crash UI components

2. **Critical Path Protection**
   - Registration flow MUST NOT depend on complex auth state
   - Login page MUST work even if other systems fail  
   - Homepage MUST load even if auth/analytics/marketing systems are down

3. **Change Impact Analysis (MANDATORY)**
   Before ANY modification to core components:
   - ✅ List all components that import this file
   - ✅ Identify all pages that use this component
   - ✅ Test each dependent page still works
   - ✅ Verify no authentication dependency loops

### 🔍 Automated Protection Hooks

The project uses Claude Hooks to automatically enforce these rules:

1. **`auth_dependency_validation`**: Prevents auth dependencies in landing pages
2. **`error_boundary_verification`**: Ensures error boundaries exist  
3. **`homepage_resilience_test`**: Tests homepage works when backend is down
4. **`component_dependency_check`**: Validates component independence

### 🚨 Emergency Recovery Protocol

If working functionality breaks:

1. **IMMEDIATE ACTION**: Revert the breaking change
   ```bash
   git checkout HEAD~1 -- path/to/broken/file
   ```

2. **ANALYZE**: Identify the dependency chain that caused the break

3. **FIX PROPERLY**: Implement with proper error boundaries and fallbacks

4. **TEST**: Verify the fix doesn't break anything else

### 🎯 Success Criteria

Before marking ANY task complete:
- ✅ All existing functionality still works
- ✅ Homepage loads independently  
- ✅ Registration flow works completely
- ✅ Login flow works completely
- ✅ No authentication dependency loops
- ✅ All automated hooks pass

### 📊 Component Risk Assessment

**High Risk (Change with extreme caution):**
- `app/page.tsx` (Homepage)
- `hooks/useAuth.ts` (Authentication)
- `components/ui/AuthCTAs.tsx` (Authentication CTAs)
- `components/ui/CTASystem.tsx` (Global CTA system)

**Medium Risk:**
- Dashboard components
- Registration components
- API client files

**Low Risk:**
- Individual feature pages
- Utility functions
- Static components

---
Last updated: 2025-07-04