# 🔍 Pre-Work Testing Checklist

**Mandatory verification steps before starting ANY development task**

This checklist must be completed before writing any code to ensure a stable development environment and prevent testing issues.

---

## 🚨 **MANDATORY PRE-WORK STEPS**

### ✅ **Environment Verification**
- [ ] **Git status clean**: `git status` shows no uncommitted changes
- [ ] **Working directory clean**: No untracked files that could interfere with testing
- [ ] **Correct branch**: On appropriate feature branch or main development branch
- [ ] **Remote sync**: `git pull origin main` completed (if applicable)

### ✅ **Development Environment**
- [ ] **Python environment active**: Virtual environment activated in `backend-v2/`
- [ ] **Dependencies installed**: `pip install -r requirements.txt` completed
- [ ] **Node dependencies installed**: `npm install` in `backend-v2/frontend-v2/`
- [ ] **Environment variables**: `.env` files exist and configured properly

### ✅ **Database & Services**
- [ ] **Database running**: PostgreSQL (production) or SQLite (development) accessible
- [ ] **Database migrations**: `alembic upgrade head` completed without errors
- [ ] **Redis running**: If using Redis for caching/sessions
- [ ] **External services**: API keys for Stripe, SendGrid, Twilio configured

### ✅ **Development Servers**
- [ ] **Backend server**: `cd backend-v2 && uvicorn main:app --reload` running on port 8000
- [ ] **Frontend server**: `cd backend-v2/frontend-v2 && npm run dev` running on port 3000
- [ ] **No port conflicts**: `lsof -i :3000,8000` shows only expected services
- [ ] **Services responsive**: Backend `/health` and frontend homepage load correctly

### ✅ **Testing Infrastructure**
- [ ] **Test database**: Separate test database configured and accessible
- [ ] **Browser logs MCP**: Chrome running with `--remote-debugging-port=9222`
- [ ] **Browser logs connection**: `connect_to_browser` succeeds in Claude
- [ ] **Puppeteer available**: `node -e "require('puppeteer')"` succeeds
- [ ] **Testing dependencies**: All test packages installed and available

### ✅ **Code Quality Tools**
- [ ] **Linting works**: `cd backend-v2/frontend-v2 && npm run lint` passes
- [ ] **TypeScript check**: `cd backend-v2/frontend-v2 && npx tsc --noEmit` passes
- [ ] **Python linting**: `cd backend-v2 && ruff check .` or equivalent passes
- [ ] **Formatting consistent**: Code formatter (Prettier, Black) configured and working

### ✅ **Feature Preparation**
- [ ] **Requirements understood**: Task requirements are clear and documented
- [ ] **Feature research**: Checked that feature doesn't already exist
- [ ] **Test plan drafted**: Identified what needs to be tested
- [ ] **Dependencies identified**: Any new packages or services required
- [ ] **API endpoints planned**: If backend changes, endpoints designed

---

## 🔧 **AUTOMATED PRE-WORK SCRIPT**

Create a script to automate these checks:

```bash
#!/bin/bash
# pre-work-check.sh

echo "🚀 Running pre-work checks..."

# Git checks
echo "Checking git status..."
if ! git diff --quiet; then
    echo "❌ Uncommitted changes found. Please commit or stash."
    exit 1
fi

# Environment checks
echo "Checking development environment..."
cd backend-v2
if [ ! -f ".env" ]; then
    echo "❌ Backend .env file missing"
    exit 1
fi

cd frontend-v2
if [ ! -f ".env.local" ]; then
    echo "❌ Frontend .env.local file missing"
    exit 1
fi

# Dependency checks
echo "Checking dependencies..."
cd ..
pip list > /dev/null 2>&1 || { echo "❌ Python environment issue"; exit 1; }
cd frontend-v2
npm list > /dev/null 2>&1 || { echo "❌ Node dependencies issue"; exit 1; }

# Database checks
echo "Checking database..."
cd ..
python -c "from sqlalchemy import create_engine; from config.database import DATABASE_URL; create_engine(DATABASE_URL).connect()" || { echo "❌ Database connection failed"; exit 1; }

# Server checks
echo "Checking servers..."
curl -f -s http://localhost:8000/health > /dev/null || { echo "❌ Backend server not responding"; exit 1; }
curl -f -s http://localhost:3000 > /dev/null || { echo "❌ Frontend server not responding"; exit 1; }

# Testing checks
echo "Checking testing infrastructure..."
cd frontend-v2
npm run lint > /dev/null || { echo "❌ Linting failed"; exit 1; }
npx tsc --noEmit > /dev/null || { echo "❌ TypeScript check failed"; exit 1; }

echo "✅ All pre-work checks passed!"
echo "🎯 Ready to begin development"
```

---

## 📋 **VERIFICATION COMMANDS**

### Quick Health Check:
```bash
# Backend health
curl http://localhost:8000/health

# Frontend health  
curl http://localhost:3000

# Database connection
python -c "from config.database import engine; engine.connect()"

# Browser logs MCP
connect_to_browser
```

### Test Infrastructure Check:
```bash
# Run basic tests
cd backend-v2 && python -m pytest tests/unit/ -v --tb=short
cd backend-v2/frontend-v2 && npm test -- --passWithNoTests

# Puppeteer check
node -e "const puppeteer = require('puppeteer'); console.log('Puppeteer OK')"

# Linting check
cd backend-v2/frontend-v2 && npm run lint
cd backend-v2 && python -m flake8 . || ruff check .
```

### Browser Logs MCP Check:
```bash
# Start Chrome with debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb

# Test connection (in Claude)
connect_to_browser
get_browser_tabs
```

---

## ⚠️ **COMMON ISSUES & SOLUTIONS**

### Issue: Port Already in Use
```bash
# Find and kill conflicting processes
lsof -i :3000
lsof -i :8000
kill -9 <PID>

# Or use cleanup script
./.claude/scripts/cleanup-all-servers.sh
```

### Issue: Database Connection Failed
```bash
# Check database status
pg_ctl status  # For PostgreSQL
sqlite3 database.db ".tables"  # For SQLite

# Run migrations
cd backend-v2 && alembic upgrade head
```

### Issue: Missing Dependencies
```bash
# Reinstall backend dependencies
cd backend-v2 && pip install -r requirements.txt

# Reinstall frontend dependencies
cd backend-v2/frontend-v2 && npm install

# Clear caches if needed
npm cache clean --force
pip cache purge
```

### Issue: Environment Variables
```bash
# Check environment files exist
ls -la backend-v2/.env
ls -la backend-v2/frontend-v2/.env.local

# Copy from templates if needed
cp backend-v2/.env.template backend-v2/.env
cp backend-v2/frontend-v2/.env.local.example backend-v2/frontend-v2/.env.local
```

### Issue: Browser Logs MCP Not Working
```bash
# Check Chrome debugging port
lsof -i :9222

# Restart Chrome with debugging
pkill "Google Chrome"
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb

# Test MCP connection
pip install -r browser-logs-mcp-requirements.txt
python browser-logs-mcp-server.py --test
```

---

## 🎯 **SUCCESS CRITERIA**

You're ready to start development when:

- [ ] All checklist items above are verified ✅
- [ ] No error messages from any verification commands
- [ ] Both development servers running and responsive
- [ ] Browser logs MCP connection active
- [ ] Test suite can run without critical failures
- [ ] Linting passes without errors

---

## 📝 **DOCUMENTATION REQUIREMENTS**

Before starting development:

1. **Document the task** in your preferred system (GitHub issue, Notion, etc.)
2. **Identify test scenarios** for the feature you're building
3. **Plan API changes** if backend modifications are needed
4. **Consider accessibility** and responsive design requirements
5. **Think about error handling** and edge cases

---

## 🔄 **INTEGRATION WITH DEVELOPMENT WORKFLOW**

This checklist integrates with:

- **Claude Hooks**: Automated verification before code changes
- **Testing Templates**: Pre-configured test structures
- **Browser Logs MCP**: Real-time debugging capabilities
- **CI/CD Pipeline**: Ensures local environment matches deployment

---

**Remember: Time spent on pre-work verification saves hours of debugging later. Never skip these checks!**