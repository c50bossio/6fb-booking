# STRICT DEVELOPMENT RULES - MUST FOLLOW

## 🚫 NEVER COMMIT THESE FILES

1. **Test files in root**: Use `/tests` directory
2. **Database files**: `*.db`, `*.sqlite` 
3. **Log files**: `*.log`
4. **Test results**: `*_test_results.*`
5. **PID files**: `*.pid`
6. **Temporary HTML test files**: `test-*.html`

## ✅ CORRECT FILE LOCATIONS

### Test Files
- Backend tests: `/tests/backend-v2/`
- Frontend tests: `/tests/backend-v2/frontend-v2/`
- Integration tests: `/tests/integration/`
- E2E tests: `/tests/e2e/`

### Documentation
- Deployment guides: `/docs/deployment/`
- Setup guides: `/docs/setup/`
- Feature docs: `/docs/features/`
- API docs: `/docs/api/`

### Scripts
- Development scripts: `/scripts/development/`
- Deployment scripts: `/scripts/deployment/`
- Maintenance scripts: `/scripts/maintenance/`

### Data Files (git-ignored)
- Databases: `/data/`
- Logs: `/logs/`

## 🔧 BEFORE EVERY COMMIT

1. Run cleanup: `scripts/maintenance/daily-cleanup.sh`
2. Check git status: `git status`
3. If you see test files or logs, DON'T commit them

## 📝 WHEN CREATING NEW FEATURES

1. **DON'T** create test files in root
2. **DON'T** create new auth systems
3. **DON'T** create duplicate components
4. **DO** use existing components/services
5. **DO** follow the existing patterns

## 🛑 PRE-COMMIT HOOK WILL BLOCK

The pre-commit hook will prevent commits if you try to add:
- Test files in wrong locations
- Database files
- Log files
- PID files
- Test result files

## 🔄 DAILY MAINTENANCE

Run daily: `scripts/maintenance/daily-cleanup.sh`

This will clean up any accumulated cruft.

## ⚠️ IF CLEANUP DOESN'T STICK

1. Check if pre-commit hook exists: `ls -la .git/hooks/pre-commit`
2. Make sure it's executable: `chmod +x .git/hooks/pre-commit`
3. Run the permanent cleanup again: `scripts/permanent-cleanup.sh`

---

**Remember**: The codebase got messy because these rules weren't followed. Follow them now to keep it clean.