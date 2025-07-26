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

## 🚀 GITHUB CODESPACES DEVELOPMENT (RECOMMENDED)

### 🎯 **ELIMINATES ALL SERVER CRASHES AND PORT CONFLICTS**

**GitHub Codespaces is the recommended development environment for BookedBarber V2.** It completely eliminates the documented issues with server conflicts, port problems, and Docker management complexity.

### Quick Start with Codespaces

1. **Create Codespace**: Go to your repository → "Code" → "Codespaces" → "Create codespace"
2. **Automatic Setup**: The devcontainer configuration automatically installs all dependencies (~3-5 minutes)
3. **Start Development**: Run `./docker-dev-start.sh` or start services manually
4. **Access URLs**: Use auto-forwarded ports (e.g., `https://your-codespace-3000.app.github.dev`)

### Benefits Over Local Development

| Issue | Local Development | GitHub Codespaces |
|-------|------------------|------------------|
| **Server Conflicts** | ❌ Constant `EADDRINUSE` errors | ✅ Isolated cloud environment |
| **Multiple Next.js Processes** | ❌ Manual process management | ✅ Container isolation |
| **Docker Issues** | ❌ Local Docker conflicts | ✅ Professional Docker management |
| **Build Cache Corruption** | ❌ Manual cache cleanup | ✅ Persistent cloud storage |
| **Port Management** | ❌ Manual port forwarding | ✅ Automatic port forwarding |
| **Team Consistency** | ❌ "Works on my machine" | ✅ Identical environments |
| **Onboarding Time** | ❌ Hours of setup | ✅ 3-5 minutes |

### Codespaces Development Commands

```bash
# All your existing commands work identically in Codespaces:

# Docker development (recommended)
./docker-dev-start.sh

# Manual server startup
cd backend-v2
uvicorn main:app --reload &
cd frontend-v2
npm run dev &

# Testing (same as local)
pytest --cov=. --cov-report=term-missing
npm test

# All development workflows remain unchanged
```

### Environment Configuration

**Setup Process:**
1. **Repository Secrets**: Add API keys to GitHub → Settings → Codespaces → Secrets
2. **Template Available**: Use `.devcontainer/codespaces.env.template` as a guide
3. **Automatic CORS**: Codespaces domains are pre-configured in CORS settings

**Essential Secrets to Configure:**
```bash
JWT_SECRET_KEY          # Generate with: python -c 'import secrets; print(secrets.token_urlsafe(64))'
STRIPE_SECRET_KEY       # From Stripe Dashboard (test keys)
GOOGLE_CLIENT_SECRET    # From Google Cloud Console
SENDGRID_API_KEY        # From SendGrid Dashboard (optional)
TWILIO_AUTH_TOKEN      # From Twilio Console (optional)
```

### Validation & Testing

Run these commands in your Codespace to validate the setup:

```bash
# Validate Codespaces environment
./.devcontainer/validate-codespaces.sh

# Test database persistence
./.devcontainer/test-database-persistence.py

# Test external integrations
./.devcontainer/test-integrations.py
```

### Webhook Configuration for Codespaces

When using external services, update webhook URLs to point to your Codespace:

```bash
# Your Codespace URLs (auto-generated)
Frontend: https://your-codespace-name-3000.app.github.dev
Backend:  https://your-codespace-name-8000.app.github.dev

# Update these webhook endpoints:
Stripe:   https://your-codespace-name-8000.app.github.dev/api/v2/webhooks/stripe
Twilio:   https://your-codespace-name-8000.app.github.dev/api/v2/webhooks/twilio
Google:   https://your-codespace-name-8000.app.github.dev/api/v2/webhooks/google-calendar
```

### Cost & Performance

| Machine Type | Specs | Cost/Hour | Monthly Cost* | Recommended For |
|-------------|-------|-----------|---------------|-----------------|
| 2-core | 8GB RAM | $0.18 | ~$36 | Light development |
| **4-core** | **16GB RAM** | **$0.36** | **~$72** | **Full-stack development (recommended)** |
| 8-core | 32GB RAM | $0.72 | ~$144 | Heavy testing/building |

*Based on ~200 hours/month usage

### Migration from Local Development

**If you're currently using local development:**

1. **Commit your work**: `git add . && git commit -m "Pre-Codespaces checkpoint"`
2. **Create Codespace**: Repository → Code → Codespaces → Create
3. **Configure secrets**: Add your API keys to GitHub Codespaces secrets
4. **Test environment**: Run validation scripts to ensure everything works
5. **Continue development**: All your existing workflows work identically

**Recovery Process (if needed):**
- Your local environment remains unchanged
- You can switch back to local development at any time
- No changes to your codebase structure or workflow

### 🎯 **Result: Zero Development Environment Issues**

With GitHub Codespaces, you get:
- ✅ **No more server crashes** - Professional cloud infrastructure
- ✅ **No more port conflicts** - Isolated container environments  
- ✅ **No more Docker issues** - Managed Docker infrastructure
- ✅ **No more manual server management** - Automated environment provisioning
- ✅ **Consistent team environments** - Identical setup for all developers
- ✅ **Instant onboarding** - New developers productive in minutes
- ✅ **Professional reliability** - 99.9% uptime SLA

**For detailed setup instructions, see: `.devcontainer/CODESPACES_SETUP_GUIDE.md`**

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
- [ ] **All linting passes** (ESLint + TypeScript)

## 🚨 FRONTEND LINTING REQUIREMENTS

### Mandatory Commands (Never Skip Linting)
```bash
# Frontend Development (Required)
cd backend-v2/frontend-v2
npm run dev                    # Development with linting
npm run build                  # Production build with linting
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix linting issues

# TypeScript Checking (Debugging)
npx tsc --noEmit              # TypeScript-only compilation
npx tsc --noEmit --skipLibCheck # Skip library checks for debugging
```

### ❌ FORBIDDEN Frontend Commands
```bash
# NEVER use these commands
npm run build --skip-lint
npx next build --no-lint
ESLINT=false npm run build
NODE_ENV=production npm run build:no-lint
```

### Frontend Debugging Without Disabling Linting
1. **TypeScript errors**: Use `npx tsc --noEmit` to isolate compilation issues
2. **Import/dependency errors**: Fix missing files, don't skip linting
3. **Build cache issues**: Clear `.next` and `node_modules/.cache`, keep linting enabled
4. **Performance issues**: Use `npm run lint:fix` to auto-correct

### Frontend-Specific Linting Rules
- **React Hooks**: ESLint enforces hooks rules (dependencies, conditionals)
- **Accessibility**: Enforces WCAG standards and aria-label requirements
- **Performance**: Warns about inefficient patterns (unused imports, large bundles)
- **Security**: Catches XSS vulnerabilities and unsafe DOM manipulation
- **Next.js**: Enforces Next.js best practices (Image optimization, routing)

### Emergency Exception Process (Frontend)
Only disable frontend linting for:
1. **Production hotfix** (document in commit: "EMERGENCY: disable linting for hotfix #123")
2. **Third-party component integration** (use targeted disable on specific lines)
3. **Build system failure** (ESLint itself is broken)

**Remember: Frontend linting catches 80% of runtime errors before they reach users.**

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

## 🐳 MANDATORY DOCKER DEVELOPMENT WORKFLOW

**CRITICAL**: BookedBarber V2 development MUST use Docker containers. Local development mode is prohibited.

### 🚨 DOCKER-FIRST POLICY (MANDATORY)

**ALWAYS use Docker containers for development. NEVER run local uvicorn/npm servers.**

#### Required Docker Commands:
```bash
# 1. ALWAYS start development with Docker
docker-compose up -d

# 2. Check containers are running
docker ps

# 3. View logs
docker-compose logs backend     # Backend logs
docker-compose logs frontend   # Frontend logs
docker-compose logs --follow   # Live log streaming

# 4. Development workflow
docker-compose exec backend bash # Shell into backend container
docker-compose exec frontend bash # Shell into frontend container

# 5. Testing within Docker
docker-compose exec backend pytest                    # Run backend tests
docker-compose exec frontend npm test                 # Run frontend tests
docker-compose exec backend python utils/registry_manager.py check [feature]

# 6. Stop services
docker-compose down             # Stop and remove containers

# 7. Rebuild if needed
docker-compose up --build      # Rebuild and start containers
```

#### Forbidden Commands (DO NOT USE):
```bash
# ❌ NEVER use these local development commands
uvicorn main:app --reload
npm run dev
python main.py
./start-dev-clean.sh

# ❌ NEVER start servers on localhost directly
```

#### Docker Service URLs:
- **Frontend**: http://localhost:3000 (via Docker container)
- **Backend**: http://localhost:8000 (via Docker container)
- **Database**: PostgreSQL in Docker container
- **Redis**: Redis in Docker container

#### Quick Docker Health Check:
```bash
# Verify all containers are running
docker-compose ps

# Should show:
# - backend container (port 8000)
# - frontend container (port 3000)
# - database container (PostgreSQL)
# - redis container (Redis)
```

#### Docker-Specific Debugging:
```bash
# Container logs
docker-compose logs [service-name]

# Execute commands in containers
docker-compose exec backend curl http://localhost:8000/health
docker-compose exec frontend npm run build

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Emergency Recovery:
```bash
# If tests are failing after changes
git stash                        # Save current changes
pytest                           # Verify tests pass on clean state
git stash pop                    # Restore changes
pytest --lf                      # Run last failed tests only

# Docker-specific recovery
docker-compose down              # Stop all containers
docker-compose up --build       # Fresh rebuild
docker system prune             # Clean up Docker system (if needed)
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

## 🚨 MANDATORY V2-ONLY API POLICY

### **NEVER USE V1 APIs - V2 ONLY**
All API calls in this codebase MUST use `/api/v2/` endpoints. V1 endpoints are deprecated and cause authentication failures.

#### **Critical V2 Endpoints (Reference)**
```typescript
// Authentication
/api/v2/auth/login         // Login endpoint
/api/v2/auth/me           // User profile
/api/v2/auth/refresh      // Refresh token

// Core Data
/api/v2/appointments/     // User appointments
/api/v2/dashboard/client-metrics  // Dashboard metrics
/api/v2/analytics/dashboard/{id}  // Analytics data

// Tracking & Pixels
/api/v2/tracking/meta-conversions  // Meta pixel tracking
/api/v2/customer-pixels/public/{slug}  // Customer pixels

// Other Services
/api/v2/privacy/consent   // Privacy consent
/api/v2/payments/history  // Payment history
```

#### **How to Fix V1 → V2 Issues**
When encountering V1 endpoints:
1. **Search and replace**: `/api/v1/` → `/api/v2/`
2. **Test immediately**: Verify endpoint works
3. **Update tests**: Change test expectations to v2

#### **V1 Detection Commands**
```bash
# Find all V1 API calls
grep -r "/api/v1/" frontend-v2/ --include="*.ts" --include="*.tsx"

# Fix a specific file
sed -i 's|/api/v1/|/api/v2/|g' path/to/file.ts
```

## 🔧 Common Fixes Applied

### V1 → V2 API Migration (Fixed 2025-07-23)
**CRITICAL**: The authentication stack overflow was caused by API version mismatch:
- **Problem**: Login used `/api/v2/auth/login` but validation used `/api/v1/auth/me`
- **Solution**: All endpoints migrated to V2
- **Impact**: Eliminates infinite redirect loops in authentication

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
BookedBarber V2 supports multiple environments for safe development and testing:

| Environment | Frontend | Backend | Purpose | Database |
|-------------|----------|---------|---------|----------|
| **Development** | `localhost:3000` | `localhost:8000` | Daily development work | `6fb_booking.db` |
| **Staging (Local)** | `localhost:3001` | `localhost:8001` | Testing & validation | `staging_6fb_booking.db` |
| **Staging (Cloud)** | `staging.bookedbarber.com` | `api-staging.bookedbarber.com` | Team demos & collaboration | PostgreSQL staging |
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

#### Staging Environment (Local Testing)
```bash
# Frontend
http://localhost:3001

# Backend API  
http://localhost:8001
http://localhost:8001/docs  # API documentation

# Configuration
Environment: .env.staging
Database: SQLite (staging_6fb_booking.db)
Redis: Database 1
```

#### Staging Environment (Cloud)
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

#### Start Staging (Local)
```bash
cd backend-v2

# Backend
uvicorn main:app --reload --port 8001 --env-file .env.staging

# Frontend (separate terminal)
cd frontend-v2
npm run staging  # Runs on port 3001
```

#### Start Both Environments (Parallel)
```bash
# Method 1: Docker Compose
docker-compose -f docker-compose.staging.yml up -d

# Method 2: Manual parallel startup
cd backend-v2
uvicorn main:app --reload --port 8000 &  # Development
uvicorn main:app --reload --port 8001 --env-file .env.staging &  # Staging
cd frontend-v2
npm run dev &  # Development frontend (port 3000)
npm run staging &  # Staging frontend (port 3001)
```

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

#### Environment Control Scripts
```bash
# Start staging environment
./scripts/start-staging.sh

# Stop staging environment
./scripts/stop-staging.sh

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
Staging:     "localhost:3001" or "localhost:8001"
Cloud:       "staging.bookedbarber.com" or "api-staging.bookedbarber.com"

# ❌ Avoid generic references
"localhost" (which port?)
"the app" (which environment?)
"the API" (which instance?)
```

### Environment Configuration Files

#### Environment Files Location
```bash
backend-v2/
├── .env.development     # Development settings
├── .env.staging        # Local staging settings
├── .env.staging.template  # Staging template
├── .env.production.template  # Production template
└── config.py           # Configuration loader
```

#### Key Configuration Differences
```bash
# Development
PORT=8000
DATABASE_URL=sqlite:///./6fb_booking.db
REDIS_URL=redis://localhost:6379/0
DEBUG=true

# Staging
PORT=8001
DATABASE_URL=sqlite:///./staging_6fb_booking.db
REDIS_URL=redis://localhost:6379/1
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

# Staging migrations
ENV_FILE=.env.staging alembic upgrade head

# Reset staging database
rm staging_6fb_booking.db
ENV_FILE=.env.staging alembic upgrade head
python scripts/populate_staging_data.py
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

# Check staging environment
ENV_FILE=.env.staging python -c "from config import settings; print(f'Environment: {settings.environment}, Port: {settings.port}')"
```

#### Docker Environment Issues
```bash
# Check staging containers
docker-compose -f docker-compose.staging.yml ps

# View staging logs
docker-compose -f docker-compose.staging.yml logs

# Restart staging environment
docker-compose -f docker-compose.staging.yml restart
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
ENV_FILE=.env.staging python -c "from config import settings; print(settings.environment)"

# Database migration issues
ENV_FILE=.env.staging alembic upgrade head
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

## 📱 Frontend Page Architecture & User Roles

### Page Purpose & Audience Clarity

Understanding the correct purpose and audience for each page is critical to maintaining proper separation between client-facing tools and staff-facing tools.

#### **Calendar Page** (`/calendar`)
- **Audience**: Barbers, shop owners, managers (internal staff)
- **Purpose**: Staff calendar for appointment management and coordination
- **Features**: View all appointments, manage schedules, staff coordination
- **NOT for**: Client booking (that's handled by separate booking funnel)

#### **Booking Funnel** (Client-facing booking process)
- **Audience**: Customers booking appointments
- **Purpose**: Step-by-step booking process for clients
- **Flow**: Service selection → Time slot selection → Payment → Confirmation
- **Separate from**: Internal staff calendar tools

#### **My Schedule Page** (`/my-schedule`)
- **Audience**: Individual barbers
- **Purpose**: Personal availability management + view own appointments
- **Features**: Set working hours, manage time off, see personal bookings in unified view
- **Focus**: Individual barber's personal schedule management

#### **My Bookings Page** (`/bookings`)
- **Audience**: Barbers managing their appointments
- **Purpose**: Detailed appointment actions and management
- **Features**: Cancel, reschedule, view client details, appointment history
- **Focus**: Individual appointment management and modifications

### Architecture Principles

1. **Clear Separation**: Client tools vs Staff tools are completely separate
2. **Role-Based Access**: Each page serves specific user roles
3. **Single Responsibility**: Each page has one clear purpose
4. **No Overlap**: Avoid duplicating functionality across pages

### Navigation Structure
```
Staff Tools:
├── Calendar (all appointments view)
├── My Schedule (personal availability + bookings)
└── My Bookings (appointment management)

Client Tools:
└── Booking Funnel (separate from staff tools)
```

This architecture ensures barbers have the right tools for their workflow while keeping client booking separate and focused.

---
Last updated: 2025-07-26