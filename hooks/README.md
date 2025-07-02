# BookedBarber V2 - Development Workflow Hooks

This directory contains Git hooks that enforce development workflow standards for the BookedBarber V2 project.

## 🎯 Overview

These hooks implement Phase 1 Core Development Workflow with 4 critical validations:

1. **Commit Message Validation** - Enforces conventional commits format
2. **Branch Protection** - Prevents direct pushes to protected branches
3. **V2-Only Architecture** - Blocks modifications to deprecated V1 directories
4. **Dependency Security** - Scans for known vulnerabilities

## 🚀 Quick Start

```bash
# Install all hooks
./hooks/install-hooks.sh

# Or manually copy hooks
cp hooks/* .git/hooks/
chmod +x .git/hooks/*
```

## 📋 Hook Details

### 1. Commit Message Validation (`commit-msg`)

**Purpose**: Enforces conventional commits format for consistent commit history.

**Format**: `type(scope): description`

**Valid Types**:
- `feat` - New feature
- `fix` - Bug fix  
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Valid Scopes** (optional):
- `auth` - Authentication & authorization
- `booking` - Appointment booking system
- `payment` - Payment processing & Stripe
- `calendar` - Calendar integration
- `analytics` - Business analytics & metrics
- `integration` - Third-party integrations
- `review` - Review management system
- `marketing` - Marketing features & campaigns
- `ui` - User interface components
- `api` - API endpoints & routes
- `db` - Database & migrations
- `config` - Configuration changes
- `ci` - CI/CD pipeline
- `security` - Security improvements

**Examples**:
```bash
✅ feat(booking): add real-time availability check
✅ fix(payment): resolve Stripe webhook validation
✅ docs: update API documentation
✅ chore(ci): update GitHub Actions workflow
❌ Add new feature
❌ Fixed bug
❌ WIP: working on stuff
```

**Bypass**: `git commit --no-verify` (not recommended)

### 2. Branch Protection (`pre-push`)

**Purpose**: Protects main branches and enforces branch naming conventions.

**Protected Branches**:
- `main`/`master` - Production code
- `develop` - Integration branch
- `production` - Deployment branch

**Valid Branch Naming**:
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `release/version` - Release branches

**Validations**:
- ❌ Direct pushes to protected branches
- ❌ Force pushes to protected branches
- ❌ Invalid branch naming
- ⚠️ Force pushes to feature branches (warning)
- ℹ️ Out-of-date branch detection

**Examples**:
```bash
✅ feature/booking-v2-integration
✅ bugfix/payment-webhook-validation  
✅ hotfix/security-patch-auth
✅ release/v2.1.0
❌ my-feature
❌ fix_bug
❌ direct push to main
```

**Bypass**: `git push --no-verify` (not recommended)

### 3. V2-Only Architecture (`pre-commit-v2-only`)

**Purpose**: Prevents accidental modifications to deprecated V1 directories.

**Architecture Policy**:
- ✅ **ALLOWED**: `backend-v2/` (V2 Backend - FastAPI)
- ✅ **ALLOWED**: `backend-v2/frontend-v2/` (V2 Frontend - Next.js)
- ✅ **ALLOWED**: `scripts/` (Automation scripts)
- ✅ **ALLOWED**: `docs/` (Documentation)
- ✅ **ALLOWED**: `monitoring/` (Monitoring config)
- ✅ **ALLOWED**: `hooks/` (Git hooks)
- ❌ **BLOCKED**: `backend/` (V1 Backend - DEPRECATED)
- ❌ **BLOCKED**: `frontend/` (V1 Frontend - DEPRECATED)

**Why This Matters**:
- V1 codebase is deprecated and unmaintained
- All new features must use V2 architecture
- Prevents developer confusion and technical debt
- Ensures consistent development practices

**Migration Guide**:
```
V1 backend/   → V2 backend-v2/
V1 frontend/  → V2 backend-v2/frontend-v2/
```

**Bypass**: `git commit --no-verify` (discuss with team first)

### 4. Dependency Security (`pre-commit-security`)

**Purpose**: Scans dependencies for known security vulnerabilities.

**What It Checks**:
- **Python**: Uses `safety` or `pip-audit` to scan `requirements.txt`
- **Node.js**: Uses `npm audit` to scan `package.json`
- **Severity**: Blocks only HIGH and CRITICAL vulnerabilities
- **Smart Triggers**: Only runs when dependency files are modified

**Blocking Conditions**:
- High severity vulnerabilities
- Critical severity vulnerabilities  
- Known security exploits

**Non-Blocking (Warnings Only)**:
- Low severity vulnerabilities
- Moderate severity vulnerabilities
- Dependency update recommendations

**Required Tools**:
```bash
# Python security scanning
pip install safety pip-audit

# Node.js security scanning (included with npm)
npm install -g npm@latest
```

**Fix Workflow**:
```bash
# Review Python vulnerabilities
cd backend-v2 && safety check

# Review Node.js vulnerabilities  
cd backend-v2/frontend-v2 && npm audit

# Auto-fix npm issues
npm audit fix

# Manual fixes
pip install --upgrade <vulnerable-package>
npm install <package>@latest
```

**Bypass**: `git commit --no-verify` (fix vulnerabilities instead)

## 🔧 Installation & Usage

### Automatic Installation

```bash
# From project root
./hooks/install-hooks.sh
```

This script:
- Copies all hooks to `.git/hooks/`
- Makes them executable
- Creates a combined `pre-commit` hook
- Backs up existing hooks
- Provides installation summary

### Manual Installation

```bash
# Copy individual hooks
cp hooks/commit-msg .git/hooks/
cp hooks/pre-push .git/hooks/
cp hooks/pre-commit-v2-only .git/hooks/
cp hooks/pre-commit-security .git/hooks/

# Make executable
chmod +x .git/hooks/*
```

### Testing Hooks

```bash
# Test commit message validation
git commit --allow-empty -m "invalid format"  # Should fail
git commit --allow-empty -m "test: valid format"  # Should pass

# Test V2-only architecture
touch backend/test.py
git add backend/test.py
git commit -m "test: should fail"  # Should fail

# Test branch protection  
git push origin main  # Should fail (if not on main)

# Test security scanning
# Modify requirements.txt or package.json with vulnerable package
```

### Bypassing Hooks

```bash
# Bypass specific operations (not recommended)
git commit --no-verify
git push --no-verify

# Temporarily disable a hook
mv .git/hooks/commit-msg .git/hooks/commit-msg.disabled

# Re-enable
mv .git/hooks/commit-msg.disabled .git/hooks/commit-msg
```

## 🐛 Troubleshooting

### Common Issues

**Hook not running**:
```bash
# Check if hook exists and is executable
ls -la .git/hooks/
chmod +x .git/hooks/*
```

**Security tools missing**:
```bash
# Install Python security tools
pip install safety pip-audit

# Update npm (includes audit)
npm install -g npm@latest
```

**Permission errors**:
```bash
# Fix hook permissions
chmod +x hooks/*
chmod +x .git/hooks/*
```

**False positives**:
```bash
# Review the specific failure
git commit -v  # Shows detailed output

# Check hook logs
# Most hooks provide detailed error messages
```

### Hook Debugging

Each hook includes verbose logging. Set `DEBUG=1` for extra output:

```bash
DEBUG=1 git commit -m "test: debug mode"
```

### Getting Help

```bash
# View hook source for specific behavior
cat .git/hooks/commit-msg

# Check git hook documentation  
git help hooks

# View project-specific documentation
cat hooks/README.md
```

## 🔄 Maintenance

### Updating Hooks

```bash
# Pull latest hooks from repository
git pull origin main

# Reinstall hooks
./hooks/install-hooks.sh
```

### Customizing Hooks

1. **Modify source hooks** in `hooks/` directory
2. **Test changes** thoroughly
3. **Reinstall** with `./hooks/install-hooks.sh`
4. **Document changes** in this README
5. **Commit changes** to repository

### Team Deployment

```bash
# Add to team onboarding checklist
echo "./hooks/install-hooks.sh" >> scripts/setup-dev-environment.sh

# Include in documentation
# Update CONTRIBUTING.md with hook requirements
```

## 📊 Hook Statistics

Track hook effectiveness:

```bash
# Count hook interventions
grep -c "ERROR" .git/hooks/*.log 2>/dev/null || echo "No logs found"

# Most common violations
# Check git commit messages for patterns
git log --oneline --grep="bypass\|no-verify" --since="1 month ago"
```

## 🤝 Contributing

When modifying hooks:

1. **Test thoroughly** in isolated environment
2. **Follow shell scripting best practices**
3. **Maintain backward compatibility**
4. **Update documentation**
5. **Consider edge cases**

### Hook Development Guidelines

- Use `set -e` for fail-fast behavior
- Provide colored, helpful error messages
- Include bypass instructions (when appropriate)
- Handle timeouts and retries for network operations
- Log actions for debugging
- Exit with appropriate codes (0=success, 1=failure)

## 📚 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [BookedBarber V2 Architecture Guide](../docs/ARCHITECTURE.md)
- [Security Best Practices](../docs/SECURITY.md)

---

**Last Updated**: 2025-07-02  
**Version**: 1.0.0  
**Maintainer**: BookedBarber V2 Development Team