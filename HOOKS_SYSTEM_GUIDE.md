# BookedBarber V2 - Comprehensive Hooks System Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Hook Types](#hook-types)
5. [Usage Examples](#usage-examples)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Maintenance](#maintenance)

## Overview

The BookedBarber V2 Hooks System provides comprehensive automated validation, security scanning, and quality assurance throughout the development lifecycle. The system consists of 12 git hooks, Claude Code hooks integration, and GitHub Actions workflows working together to ensure code quality and security.

### Key Features
- 🛡️ **Security First**: Automated secrets detection, vulnerability scanning, and compliance validation
- 🚀 **Performance Monitoring**: Bundle size tracking, API response time validation, and performance regression detection
- 📚 **Documentation Enforcement**: API documentation validation and migration tracking
- 🔒 **Architecture Protection**: V2-only enforcement and duplicate code prevention
- 🤖 **AI Integration**: Claude Code hooks for real-time development assistance
- 📊 **Comprehensive Reporting**: GitHub Actions integration with automated issue creation

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Git Hooks │    │ Claude Code  │    │   GitHub     │       │
│  │   (Local)   │ <->│    Hooks     │ <->│   Actions    │       │
│  └─────────────┘    └──────────────┘    └──────────────┘       │
│         ↓                   ↓                     ↓              │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Validation & Quality Checks              │       │
│  │  • Commit Messages  • API Docs    • Performance     │       │
│  │  • Branch Rules     • Migrations  • Integration     │       │
│  │  • V2-Only         • Security     • Compliance      │       │
│  │  • Dependencies    • Secrets      • Testing         │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Hook Execution Flow

1. **Pre-Commit Phase**
   - V2-only architecture enforcement
   - Secrets detection
   - Dependency security scanning
   - Code formatting validation

2. **Commit Phase**
   - Message format validation
   - Conventional commits enforcement

3. **Pre-Push Phase**
   - Branch protection
   - Remote synchronization
   - Final validation checks

4. **CI/CD Phase**
   - GitHub Actions validation
   - Hook coverage testing
   - Performance monitoring
   - Issue management

## Installation

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/6fb-booking.git
cd 6fb-booking

# Install all hooks
./hooks/install-hooks.sh

# Set up Claude Code hooks
./claude/setup-claude-hooks.sh

# Verify installation
./hooks/test-hooks-system.sh
```

### Manual Installation

If you prefer to install hooks individually:

```bash
# Install specific hooks
ln -sf ../../hooks/commit-msg .git/hooks/commit-msg
ln -sf ../../hooks/pre-commit .git/hooks/pre-commit
ln -sf ../../hooks/pre-push .git/hooks/pre-push

# Make executable
chmod +x .git/hooks/*
```

## Hook Types

### Phase 1: Core Development Workflow Hooks

#### 1. Commit Message Validation (`commit-msg`)
**Purpose**: Enforces conventional commit format for consistent changelog generation

**Format**: `type(scope): description`

**Valid Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

**Valid Scopes**:
- `auth`, `booking`, `payment`, `calendar`, `analytics`, `integration`, `review`, `marketing`

**Example**:
```bash
git commit -m "feat(payment): add enhanced payout system with retail commissions"
```

#### 2. Branch Protection (`pre-push`)
**Purpose**: Prevents accidental pushes to protected branches and enforces naming conventions

**Features**:
- Blocks direct pushes to main/develop/production
- Enforces branch naming: `feature/`, `bugfix/`, `hotfix/`, `release/`
- Prevents force pushes
- Checks branch synchronization

**Example**:
```bash
# Good branch names
git checkout -b feature/enhanced-payouts
git checkout -b bugfix/calendar-sync-issue
git checkout -b hotfix/payment-processing-error
```

#### 3. V2-Only Architecture (`pre-commit-v2-only`)
**Purpose**: Ensures all development happens in V2 directories

**Protection**:
- Blocks modifications to `/backend/` and `/frontend/` (V1)
- Enforces `/backend-v2/` and `/backend-v2/frontend-v2/` usage
- Allows documentation and script updates

**Example Output**:
```
❌ V2-ONLY POLICY VIOLATION DETECTED!

You are attempting to modify deprecated V1 files:
  backend/api/endpoints/test.py

All development must happen in V2 directories:
  ✅ backend-v2/
  ✅ backend-v2/frontend-v2/
```

#### 4. Dependency Security (`pre-commit-security`)
**Purpose**: Scans for vulnerable dependencies before commit

**Features**:
- Python: Uses `safety` or `pip-audit`
- Node.js: Uses `npm audit`
- Only blocks HIGH and CRITICAL vulnerabilities
- Smart triggering based on dependency file changes

**Example**:
```bash
# Triggered when modifying:
- requirements.txt
- package.json
- package-lock.json
```

### Phase 2: Quality & Documentation Hooks

#### 5. API Documentation (`pre-commit-api-docs`)
**Purpose**: Ensures API changes include documentation updates

**Validation**:
- FastAPI endpoint docstring requirements
- OpenAPI schema currency
- Comprehensive parameter documentation
- Response model documentation

**Example**:
```python
@router.post("/payouts/enhanced")
def process_enhanced_payout(
    payout_data: PayoutCreate,
    include_retail: bool = Query(True, description="Include retail commissions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process enhanced payout for a barber including retail commissions.
    
    This endpoint processes payouts that include both service and retail
    commissions, utilizing Stripe Connect for ACH transfers.
    
    Args:
        payout_data: Payout creation data including barber ID and date range
        include_retail: Whether to include retail commissions in the payout
        current_user: Authenticated user (must be admin)
        db: Database session
        
    Returns:
        PayoutResponse: Detailed payout information including breakdowns
        
    Raises:
        HTTPException: For authorization or processing errors
    """
```

#### 6. Database Migrations (`pre-commit-migrations`)
**Purpose**: Ensures database schema changes have corresponding migrations

**Checks**:
- Model changes require Alembic migrations
- Migration file structure validation
- Destructive operation warnings (DROP, ALTER)
- Migration naming conventions

**Example**:
```bash
# When modifying models, create migration:
alembic revision -m "add retail commission fields to barber payments"
```

#### 7. Performance Regression (`pre-commit-performance`)
**Purpose**: Prevents performance degradation

**Metrics**:
- Frontend bundle size: Max +10% increase
- API response time: Max 2000ms, +200ms increase
- Database query time: Max 500ms
- Performance anti-pattern detection

**Example Output**:
```
⚡ Performance Check Results:

Frontend Bundle Size:
  Previous: 1.2 MB
  Current: 1.25 MB
  Change: +4.2% ✅ (threshold: +10%)

API Response Times:
  /api/v1/appointments: 145ms ✅
  /api/v1/payments: 1850ms ⚠️ (approaching limit)
```

#### 8. Integration Health (`pre-commit-integration`)
**Purpose**: Validates third-party service configurations

**Validations**:
- API key format verification
- Integration connectivity tests
- Credential security scanning
- Critical service availability

**Services Checked**:
- Stripe Connect
- Google Calendar
- SendGrid
- Twilio
- Google My Business

### Phase 3: Security & Compliance Hooks

#### 9. Advanced Secrets Detection (`pre-commit-secrets`)
**Purpose**: Enhanced scanning for secrets and PII

**Detection Patterns**:
- API keys (Stripe, Google, Twilio, SendGrid)
- Database URLs and credentials
- JWT secrets and tokens
- PII (SSN, credit cards, phone numbers in logs)
- Custom patterns for barbershop data

**Example**:
```
🔍 Advanced Secrets Scan Results:

CRITICAL - API Key Exposed:
  File: backend-v2/test.py:45
  Pattern: sk_live_[alphanumeric]
  Action: Remove immediately

WARNING - PII in Logs:
  File: backend-v2/services/booking.py:123
  Pattern: Phone number in log statement
  Recommendation: Use masked logging
```

#### 10. GDPR/PCI Compliance (`pre-commit-compliance`)
**Purpose**: Ensures data protection compliance

**Checks**:
- PII handling in logs and debug statements
- Data encryption usage validation
- Payment data handling (PCI DSS)
- Audit logging for sensitive operations
- GDPR compliance patterns (consent, retention)

**Example**:
```python
# Good - Masked logging
logger.info(f"Processing payment for customer {customer_id[:4]}****")

# Bad - PII in logs
logger.info(f"Processing payment for {customer_email}")
```

#### 11. Release Preparation (`pre-release`)
**Purpose**: Comprehensive pre-release validation

**Validations**:
- All tests pass (pytest, jest)
- Database migrations applied
- Environment configurations valid
- No debug code in production paths
- Version bumps and changelog updates
- Security scan results
- Performance benchmarks

**Example Output**:
```
🚀 Release Preparation Check

✅ Backend Tests: 156 passed
✅ Frontend Tests: 89 passed
✅ Migrations: All applied
✅ Environment: Production ready
✅ Security: No vulnerabilities
✅ Performance: Within thresholds
✅ Documentation: Updated

Ready for release v2.1.0!
```

#### 12. Deployment Verification (`post-deploy`)
**Purpose**: Post-deployment health validation

**Checks**:
- Health endpoints (/health, /api/health)
- Critical user flows (auth, booking, payments)
- Database connectivity
- External integrations
- Performance metrics
- Error rates

**Example**:
```
🏥 Post-Deployment Health Check

API Health:
  ✅ Backend: Healthy (response: 89ms)
  ✅ Frontend: Accessible
  ✅ Database: Connected (12 active connections)

Integrations:
  ✅ Stripe: Connected
  ✅ Google Calendar: Authenticated
  ✅ SendGrid: Operational
  ✅ Twilio: Active

User Flows:
  ✅ Login: Success (1.2s)
  ✅ Booking: Success (2.1s)
  ✅ Payment: Success (1.8s)

Deployment successful!
```

## Usage Examples

### Daily Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/commission-reporting

# 2. Make changes
# - Edit files in backend-v2/
# - Update frontend in backend-v2/frontend-v2/

# 3. Commit with conventional format
git add .
git commit -m "feat(commission): add detailed commission reporting dashboard"
# Hooks run automatically

# 4. Push to remote
git push origin feature/commission-reporting
# Branch protection hook validates

# 5. Create PR
# GitHub Actions run comprehensive validation
```

### Handling Hook Failures

```bash
# Example: Commit message validation failure
$ git commit -m "updated stuff"
❌ Invalid commit message format!

Your message: "updated stuff"
Expected format: type(scope): description

Valid types: feat, fix, docs, style, refactor, test, chore
Valid scopes: auth, booking, payment, calendar, analytics, integration, review, marketing

Examples:
  feat(payment): add refund functionality
  fix(calendar): resolve timezone issue
  docs(api): update endpoint documentation

# Fix and retry
$ git commit -m "fix(calendar): update timezone handling for daylight savings"
✅ Commit message is valid!
```

### Emergency Bypass

For urgent situations only:

```bash
# Bypass git hooks (use sparingly)
git commit -m "emergency: critical production fix" --no-verify

# Bypass Claude Code hooks
export CLAUDE_BYPASS_HOOKS=true
# ... make changes ...
unset CLAUDE_BYPASS_HOOKS

# Document why bypass was necessary
git commit -m "docs: explain emergency bypass for incident #123"
```

## Troubleshooting

### Common Issues

#### 1. Hook Not Executing
```bash
# Check hook is executable
ls -la .git/hooks/

# If not executable
chmod +x .git/hooks/*

# Reinstall hooks
./hooks/install-hooks.sh
```

#### 2. Performance Hook Timeout
```bash
# Increase timeout for slow systems
export HOOK_TIMEOUT=60

# Or skip performance checks temporarily
export SKIP_PERFORMANCE_CHECKS=true
```

#### 3. False Positive in Secrets Detection
```python
# Add inline comment to exclude
api_key = "sk_test_example"  # detect-secrets:ignore
```

#### 4. Migration Check Failures
```bash
# Ensure database is accessible
export DATABASE_URL="your_connection_string"

# Run migrations manually
cd backend-v2
alembic upgrade head
```

### Debug Mode

Enable detailed logging:

```bash
# For git hooks
export HOOK_DEBUG=true

# For Claude Code hooks
export CLAUDE_HOOKS_DEBUG=true
export HOOK_LOG_LEVEL=DEBUG

# Check logs
tail -f /Users/bossio/6fb-booking/.claude/hooks.log
```

## Best Practices

### 1. Commit Hygiene
- Make atomic commits (one feature/fix per commit)
- Write descriptive commit messages
- Include ticket/issue numbers when applicable
- Keep commits under 100 lines when possible

### 2. Branch Management
- Use descriptive branch names
- Keep branches short-lived (< 1 week)
- Rebase on main/develop regularly
- Delete branches after merging

### 3. Hook Compliance
- Don't bypass hooks without good reason
- Fix issues rather than disabling checks
- Report false positives to improve hooks
- Keep hooks updated

### 4. Performance Awareness
- Monitor bundle size trends
- Profile API endpoints regularly
- Optimize database queries
- Use caching strategically

### 5. Security First
- Never commit secrets (use environment variables)
- Validate all user inputs
- Use parameterized queries
- Keep dependencies updated

## Maintenance

### Regular Tasks

#### Weekly
- Review hook logs for patterns
- Update hook configurations
- Check for hook updates
- Monitor performance metrics

#### Monthly
- Audit bypass usage
- Update security patterns
- Review and update thresholds
- Performance baseline updates

#### Quarterly
- Hook system performance review
- Security pattern updates
- Team training on new hooks
- Documentation updates

### Updating Hooks

```bash
# Update individual hook
cp new-hooks/pre-commit-security hooks/pre-commit-security
chmod +x hooks/pre-commit-security

# Update all hooks
git pull origin main
./hooks/install-hooks.sh

# Test updates
./hooks/test-hooks-system.sh
```

### Performance Monitoring

Monitor hook execution times:

```bash
# View hook performance metrics
./hooks/analyze-performance.sh

# Example output:
Hook Performance Analysis
========================
commit-msg:         avg: 0.05s, max: 0.12s
pre-commit-v2-only: avg: 0.08s, max: 0.15s
pre-commit-security: avg: 2.3s, max: 5.1s
pre-push:           avg: 0.15s, max: 0.3s
```

### Team Onboarding

For new team members:

1. **Install hooks**: `./hooks/install-hooks.sh`
2. **Read documentation**: This guide + hook-specific docs
3. **Run test commits**: Practice with example changes
4. **Review patterns**: Study existing commit history
5. **Ask questions**: Use team channels for clarification

## Advanced Configuration

### Custom Hook Configuration

Create `.hookrc` for project-specific settings:

```bash
# .hookrc
export HOOK_TIMEOUT=45
export SKIP_PERFORMANCE_CHECKS=false
export SECURITY_SCAN_LEVEL=strict
export API_DOC_VALIDATION=true
export MIGRATION_AUTO_CHECK=true
```

### CI/CD Integration

GitHub Actions configuration is automatic, but can be customized:

```yaml
# .github/workflows/hooks-validation.yml
env:
  HOOK_VALIDATION_LEVEL: comprehensive
  PERFORMANCE_THRESHOLD_MULTIPLIER: 1.2
  SECURITY_SCAN_DEPTH: deep
```

### IDE Integration

#### VS Code
```json
// .vscode/settings.json
{
  "git.enableCommitSigning": true,
  "git.hooks.enabled": true,
  "editor.formatOnSave": true
}
```

#### JetBrains IDEs
Configure in Settings > Version Control > Git > Path to Git executable

---

## Conclusion

The BookedBarber V2 Hooks System provides comprehensive protection and quality assurance throughout the development lifecycle. By following this guide and best practices, teams can maintain high code quality, security, and performance standards while developing efficiently.

For questions or improvements, please open an issue in the repository or contact the development team.

---

Last Updated: 2025-07-02
Version: 1.0.0