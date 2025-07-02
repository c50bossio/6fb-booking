# BookedBarber V2 - Developer Onboarding: Hooks System

Welcome to the BookedBarber V2 development team! This guide will help you get started with our comprehensive hooks system that ensures code quality, security, and consistency across the project.

## 🚀 Quick Start (5 minutes)

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/6fb-booking.git
cd 6fb-booking

# Install hooks (one command!)
./hooks/install-hooks.sh

# Set up Claude Code hooks (optional but recommended)
./.claude/setup-claude-hooks.sh

# Verify installation
./hooks/test-hooks-system.sh
```

### 2. Your First Commit
```bash
# Create a feature branch
git checkout -b feature/your-first-feature

# Make changes in backend-v2/ or backend-v2/frontend-v2/
# (Never modify backend/ or frontend/ - those are V1!)

# Commit with conventional format
git add .
git commit -m "feat(booking): add customer notes field"

# Push to remote
git push origin feature/your-first-feature
```

## 📋 What Are Hooks?

Hooks are automated checks that run at different stages of your development workflow:

- **Pre-commit**: Before your changes are committed
- **Commit-msg**: When you write a commit message
- **Pre-push**: Before you push to remote
- **In CI/CD**: When you create a pull request

Think of them as your personal code quality assistant! 🤖

## 🎯 The 12 Hooks Explained

### 🛡️ Protection Hooks (Run First)

#### 1. **V2-Only Architecture** 
**When**: Before every commit
**What**: Ensures you only modify V2 directories
**Why**: We're migrating from V1 to V2, and V1 is deprecated

```bash
# ✅ Good paths
backend-v2/services/new_feature.py
backend-v2/frontend-v2/components/NewComponent.tsx

# ❌ Bad paths (will be blocked)
backend/services/old_feature.py
frontend/components/OldComponent.tsx
```

#### 2. **Branch Protection**
**When**: Before pushing
**What**: Prevents direct pushes to main/develop branches
**Why**: Protects production code from accidental changes

```bash
# ✅ Good branch names
feature/add-payment-refunds
bugfix/calendar-timezone-issue
hotfix/critical-auth-fix

# ❌ Bad branch names
my-changes
test
random-stuff
```

### 📝 Quality Hooks

#### 3. **Commit Message Validation**
**When**: When you commit
**What**: Enforces conventional commit format
**Why**: Automated changelog generation and clear history

**Format**: `type(scope): description`

```bash
# ✅ Good examples
feat(payment): add Stripe refund functionality
fix(calendar): resolve timezone conversion bug
docs(api): update payment endpoint documentation
chore(deps): update React to v18

# ❌ Bad examples
updated files
fix bug
WIP
asdfasdf
```

#### 4. **API Documentation**
**When**: Before committing API changes
**What**: Ensures all endpoints have proper documentation
**Why**: Self-documenting APIs for team collaboration

```python
# ✅ Good - Documented endpoint
@router.post("/appointments")
def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new appointment.
    
    Args:
        data: Appointment creation data
        current_user: Authenticated user
        
    Returns:
        Created appointment with confirmation details
    """
    pass

# ❌ Bad - Missing documentation
@router.post("/appointments")
def create_appointment(data: AppointmentCreate):
    pass  # Hook will flag this!
```

### 🔒 Security Hooks

#### 5. **Secrets Detection**
**When**: Before every commit
**What**: Scans for API keys, passwords, tokens
**Why**: Prevents accidental credential exposure

```python
# ❌ This will be blocked
STRIPE_KEY = "sk_live_4eC39HqLyjWDarjtT1zdp7dc"
DB_PASSWORD = "super_secret_password"

# ✅ Use environment variables instead
STRIPE_KEY = os.getenv("STRIPE_KEY")
DB_PASSWORD = os.getenv("DB_PASSWORD")
```

#### 6. **Dependency Security**
**When**: When changing package.json or requirements.txt
**What**: Scans for vulnerable dependencies
**Why**: Keeps our app secure from known vulnerabilities

### 🚀 Performance Hooks

#### 7. **Performance Monitoring**
**When**: Before committing frontend changes
**What**: Checks bundle size and performance metrics
**Why**: Keeps the app fast for users

**Limits**:
- Bundle size increase: Max +10%
- API response time: Max 2000ms
- Database queries: Max 500ms

### 🗄️ Database Hooks

#### 8. **Migration Validation**
**When**: When changing database models
**What**: Ensures migrations exist for schema changes
**Why**: Prevents database inconsistencies

```bash
# If you modify a model, create a migration
cd backend-v2
alembic revision -m "add user preferences table"
```

## 🎯 Common Workflows

### Starting a New Feature

1. **Create branch**
   ```bash
   git checkout -b feature/barber-availability-calendar
   ```

2. **Make changes**
   - Edit files only in `backend-v2/` or `backend-v2/frontend-v2/`
   - Add tests for new functionality
   - Update documentation if needed

3. **Commit frequently**
   ```bash
   git add .
   git commit -m "feat(calendar): add availability grid component"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/barber-availability-calendar
   ```

### Fixing a Bug

1. **Create bugfix branch**
   ```bash
   git checkout -b bugfix/appointment-overlap-issue
   ```

2. **Fix the issue**
   - Locate the bug in V2 directories
   - Write a test that reproduces the bug
   - Fix the code
   - Verify test passes

3. **Commit the fix**
   ```bash
   git commit -m "fix(booking): prevent double-booking same time slot"
   ```

### Handling Hook Failures

When a hook fails, it provides helpful guidance:

```bash
❌ Invalid commit message format!

Your message: "fixed stuff"
Expected format: type(scope): description

Valid types: feat, fix, docs, style, refactor, test, chore
Valid scopes: auth, booking, payment, calendar, analytics

Examples:
  feat(payment): add refund functionality
  fix(calendar): resolve timezone issue
```

Simply fix the issue and try again!

## 🚨 Emergency Procedures

For critical production fixes only:

```bash
# Bypass hooks (use sparingly!)
git commit -m "hotfix(auth): emergency fix for login issue" --no-verify

# Document why bypass was necessary
git commit -m "docs: emergency bypass for incident #123"
```

## 💡 Pro Tips

### 1. **Use Conventional Commits**
Makes your commits searchable and generates changelogs automatically:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `perf:` for performance improvements

### 2. **Commit Often**
- Small, focused commits are easier to review
- Hooks run faster on smaller changesets
- Easier to identify issues

### 3. **Read Hook Output**
- Hooks provide specific guidance when they fail
- Follow the suggestions to fix issues quickly
- Learn from the patterns

### 4. **Test Locally**
Before pushing, run:
```bash
./scripts/parallel-tests.sh  # Run all tests
npm run lint                 # Check code style
```

### 5. **Use Claude Code Integration**
If using Claude Code, hooks provide real-time feedback:
- Prevents issues before they happen
- Suggests fixes automatically
- Learns from your patterns

## 📚 Hook Reference

| Hook | Type | When | Purpose |
|------|------|------|---------|
| commit-msg | Git | On commit | Validate message format |
| pre-push | Git | Before push | Check branch rules |
| pre-commit-v2-only | Git | Before commit | Enforce V2 architecture |
| pre-commit-security | Git | Before commit | Scan dependencies |
| pre-commit-api-docs | Git | Before commit | Validate API docs |
| pre-commit-migrations | Git | Before commit | Check DB migrations |
| pre-commit-performance | Git | Before commit | Monitor performance |
| pre-commit-integration | Git | Before commit | Validate integrations |
| pre-commit-secrets | Git | Before commit | Detect secrets |
| pre-commit-compliance | Git | Before commit | GDPR/PCI compliance |
| pre-release | Git | Before release | Release validation |
| post-deploy | Git | After deploy | Deployment verification |

## 🤔 FAQ

### Q: Why did my commit fail?
**A**: Read the hook output - it provides specific guidance on what to fix.

### Q: Can I disable hooks temporarily?
**A**: Yes, but only for emergencies: `git commit --no-verify`

### Q: How do I update my hooks?
**A**: Run `./hooks/install-hooks.sh` again after pulling latest changes.

### Q: What if I accidentally commit to the wrong branch?
**A**: The pre-push hook will prevent pushing to protected branches.

### Q: How do I know which scope to use in commits?
**A**: Check the list in the error message or see: auth, booking, payment, calendar, analytics, integration, review, marketing

### Q: What's the difference between V1 and V2?
**A**: V2 is our new architecture. All new development happens in `backend-v2/` and `backend-v2/frontend-v2/`. V1 (`backend/` and `frontend/`) is deprecated.

## 🆘 Getting Help

1. **Hook fails and you're stuck?**
   - Read the error message carefully
   - Check this guide
   - Ask in #dev-help Slack channel

2. **Not sure about commit scope?**
   - Look at recent commits: `git log --oneline`
   - Ask your team lead
   - When in doubt, use the most specific scope

3. **Need to bypass for emergency?**
   - Get approval from team lead
   - Use `--no-verify` flag
   - Document why in next commit

## 🎉 You're Ready!

With hooks installed, you're ready to contribute to BookedBarber V2! The hooks will guide you toward writing high-quality, secure, and consistent code.

Remember:
- 🛡️ Hooks are your friend, not your enemy
- 📚 They teach best practices as you code
- 🚀 They keep our codebase clean and fast
- 🤝 They ensure consistency across the team

Happy coding! 🎊

---

*Last Updated: 2025-07-02*
*Version: 1.0.0*