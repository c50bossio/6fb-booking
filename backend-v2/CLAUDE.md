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

### Best Practices for Environment Management

1. **Always specify environment** when giving instructions
2. **Use different ports** to avoid conflicts (3000/8000 vs 3001/8001)
3. **Keep environments isolated** (separate databases, Redis DBs)
4. **Test in staging first** before production deployment
5. **Document environment-specific configurations**
6. **Use environment-specific credentials** (test vs production keys)

---
Last updated: 2025-07-03