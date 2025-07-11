# Pre-commit Hooks Quick Reference

## 🚀 Quick Start

```bash
# Install hooks (one time only)
./install-pre-commit-hooks.sh

# Hooks will now run automatically on git commit
```

## 🚫 What Gets Blocked

### Files That Will Be Rejected:

1. **Test files in root directory**
   - ❌ `/test_auth.py`
   - ✅ `/backend-v2/tests/test_auth.py`

2. **Files with bad prefixes**
   - ❌ `test-booking.js`, `demo-calendar.tsx`, `temporary-fix.py`
   - ✅ `booking.js`, `calendar.tsx`, `auth_fix.py`

3. **Database files**
   - ❌ `app.db`, `test.sqlite`, `database.db`
   - ✅ Use migrations and seed scripts instead

4. **Commits with 20+ files**
   - ❌ One giant commit with everything
   - ✅ Split into logical, reviewable commits

5. **Direct commits to main/master**
   - ❌ `git commit` on main branch
   - ✅ Create feature branch first

### Code Issues That Get Flagged:

- Multiple Calendar/Auth/Dashboard components
- Multiple authentication systems
- Duplicate API endpoints
- Trailing whitespace
- Missing newline at end of file
- Large files (>1MB)
- Potential secrets/passwords

## 🛠️ Common Commands

```bash
# Run all hooks manually
pre-commit run --all-files

# Run hooks on specific files
pre-commit run --files path/to/file.py

# Check what hooks will run
pre-commit run --dry-run

# Update hook versions
pre-commit autoupdate

# Temporarily skip hooks (EMERGENCY ONLY!)
git commit --no-verify
```

## 🔧 Fixing Common Issues

### "Too many files in commit"
```bash
# Unstage some files
git reset HEAD <file>

# Commit in batches
git add backend-v2/models/
git commit -m "feat: add new models"
git add backend-v2/tests/
git commit -m "test: add model tests"
```

### "Test file in root directory"
```bash
# Move to proper location
mv test_booking.py backend-v2/tests/
git add backend-v2/tests/test_booking.py
```

### "Duplicate component detected"
```bash
# Find duplicates
find . -name "*Calendar*.tsx" -type f

# Remove duplicates, keep best one
rm backend-v2/frontend-v2/src/components/old/Calendar.tsx
```

### "Database file detected"
```bash
# Remove from git
git rm --cached app.db

# Add to .gitignore
echo "*.db" >> .gitignore
```

## 📊 Hook Performance

Hooks are designed to be fast:
- Most complete in < 1 second
- Full scan takes < 10 seconds
- Run only on changed files by default

## 🆘 Getting Help

1. **Read the error message** - It tells you exactly what's wrong
2. **Check `hooks/README.md`** - Detailed documentation
3. **Run test script** - `./test-pre-commit-hooks.sh`
4. **Ask the team** - If you're genuinely stuck

## 💡 Pro Tips

1. **Run before staging**: `pre-commit run` to catch issues early
2. **Use feature branches**: Avoid the main branch protection
3. **Commit often**: Smaller commits = fewer conflicts
4. **Fix, don't bypass**: Address the root cause
5. **Update regularly**: Keep hooks current with `pre-commit autoupdate`

## ⚡ Emergency Bypass

**Only use in true emergencies:**

```bash
# Skip all hooks
git commit --no-verify -m "EMERGENCY: [reason]"

# Document why in commit message!
```

Remember: Hooks exist to help, not hinder. They catch issues that would otherwise make it to production!
